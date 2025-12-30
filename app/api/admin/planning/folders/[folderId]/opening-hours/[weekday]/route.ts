import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; weekday: string }> }
) {
  try {
    const { folderId, weekday } = await params
    const updateData = await request.json()

    const allowedKeys = [
      "service_type",
      "lunch_start",
      "lunch_end",
      "dinner_start",
      "dinner_end",
      "continuous_start",
      "continuous_end",
    ] as const

    const sanitized: Record<string, string | null> = {}
    for (const key of allowedKeys) {
      const value = updateData?.[key]
      if (value === "") {
        sanitized[key] = null
      } else if (value === null || value === undefined) {
        sanitized[key] = null
      } else {
        sanitized[key] = String(value)
      }
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: openingHours, error } = await supabase
      .from("planning_opening_hours")
      .upsert({
        folder_id: folderId,
        weekday: parseInt(weekday),
        ...sanitized,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(openingHours)
  } catch (error) {
    console.error("[v0] Error updating opening hours:", error)
    return NextResponse.json({ error: "Failed to update opening hours" }, { status: 500 })
  }
}
