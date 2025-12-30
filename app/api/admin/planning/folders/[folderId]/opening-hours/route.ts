import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: openingHours, error } = await supabase
      .from("planning_opening_hours")
      .select("*")
      .eq("folder_id", folderId)
      .order("weekday", { ascending: true })

    if (error) throw error

    return NextResponse.json(openingHours || [])
  } catch (error) {
    console.error("[v0] Error fetching opening hours:", error)
    return NextResponse.json({ error: "Failed to fetch opening hours" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; weekday: string }> }
) {
  try {
    const { folderId, weekday } = await params
    const updateData = await request.json()

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: openingHours, error } = await supabase
      .from("planning_opening_hours")
      .upsert({
        folder_id: folderId,
        weekday: parseInt(weekday),
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("folder_id", folderId)
      .eq("weekday", parseInt(weekday))
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(openingHours)
  } catch (error) {
    console.error("[v0] Error updating opening hours:", error)
    return NextResponse.json({ error: "Failed to update opening hours" }, { status: 500 })
  }
}
