import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { UserFloorPlanAssignments } from "@/lib/floor-plan-layouts"

type Payload = Partial<UserFloorPlanAssignments>

const sanitize = (raw: unknown): UserFloorPlanAssignments => {
  const defaults: UserFloorPlanAssignments = {
    assignments: {},
    default_layout: "",
  }
  if (!raw || typeof raw !== "object") return defaults
  const obj = raw as Payload

  const assignments: Record<string, string> = {}
  if (obj.assignments && typeof obj.assignments === "object") {
    for (const [userId, layoutId] of Object.entries(obj.assignments)) {
      if (typeof userId === "string" && typeof layoutId === "string") {
        assignments[userId] = layoutId
      }
    }
  }

  return {
    assignments,
    default_layout: typeof obj.default_layout === "string" ? obj.default_layout : "",
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("settings")
      .select("setting_value")
      .eq("setting_key", "user_floor_plan_assignments")
      .single()

    if (error && error.code !== "PGRST116") throw error

    const value = sanitize(data?.setting_value)
    return NextResponse.json(value)
  } catch (error) {
    console.error("[v0] Error fetching user floor plan assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: Payload = await request.json()
    const value = sanitize(body)

    const supabase = await createClient()

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          setting_key: "user_floor_plan_assignments",
          setting_value: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving user floor plan assignments:", error)
    return NextResponse.json({ error: "Failed to save assignments" }, { status: 500 })
  }
}


