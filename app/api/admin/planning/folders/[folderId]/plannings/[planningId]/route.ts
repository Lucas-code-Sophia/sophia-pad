import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env")
  }

  return createSupabaseClient(url, serviceKey)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string }> }
) {
  try {
    const { folderId, planningId } = await params
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("planning_main")
      .select("*")
      .eq("id", planningId)
      .eq("folder_id", folderId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error fetching planning:", error)
    return NextResponse.json({ error: "Failed to fetch planning" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string }> }
) {
  try {
    const { folderId, planningId } = await params
    const { title, status, week_start, week_end } = await request.json()

    const payload: Record<string, unknown> = {}
    if (title !== undefined) payload.title = title
    if (status !== undefined) payload.status = status
    if (week_start !== undefined) payload.week_start = week_start
    if (week_end !== undefined) payload.week_end = week_end
    payload.updated_at = new Date().toISOString()

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("planning_main")
      .update(payload)
      .eq("id", planningId)
      .eq("folder_id", folderId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error updating planning:", error)
    return NextResponse.json({ error: "Failed to update planning" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string }> }
) {
  try {
    const { folderId, planningId } = await params
    const supabase = getSupabase()

    const { error } = await supabase
      .from("planning_main")
      .delete()
      .eq("id", planningId)
      .eq("folder_id", folderId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting planning:", error)
    return NextResponse.json({ error: "Failed to delete planning" }, { status: 500 })
  }
}
