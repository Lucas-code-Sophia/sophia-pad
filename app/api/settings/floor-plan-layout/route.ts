import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_FLOOR_PLAN_LAYOUT } from "@/lib/floor-plan-layouts"

type LayoutPayload = {
  active_layout?: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("settings")
      .select("setting_value")
      .eq("setting_key", "floor_plan_layout")
      .single()

    if (error && error.code !== "PGRST116") throw error

    const rawValue = (data?.setting_value as LayoutPayload) || {
      active_layout: DEFAULT_FLOOR_PLAN_LAYOUT,
    }
    const nextLayout = rawValue.active_layout || DEFAULT_FLOOR_PLAN_LAYOUT
    return NextResponse.json({ active_layout: nextLayout })
  } catch (error) {
    console.error("[v0] Error fetching floor plan layout:", error)
    return NextResponse.json({ error: "Failed to fetch floor plan layout" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: LayoutPayload = await request.json()
    const active_layout = String(body?.active_layout || DEFAULT_FLOOR_PLAN_LAYOUT)

    const supabase = await createClient()

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          setting_key: "floor_plan_layout",
          setting_value: { active_layout },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving floor plan layout:", error)
    return NextResponse.json({ error: "Failed to save floor plan layout" }, { status: 500 })
  }
}
