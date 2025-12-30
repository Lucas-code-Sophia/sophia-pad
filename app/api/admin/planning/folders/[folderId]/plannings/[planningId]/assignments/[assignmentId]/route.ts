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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string; assignmentId: string }> }
) {
  try {
    const { folderId, planningId, assignmentId } = await params
    const { work_start, work_end } = await request.json()

    const supabase = getSupabase()

    // Ensure planning belongs to folder
    const { data: planning, error: planningError } = await supabase
      .from("planning_main")
      .select("id, folder_id")
      .eq("id", planningId)
      .eq("folder_id", folderId)
      .single()

    if (planningError) throw planningError

    const start = work_start === "" ? null : work_start
    const end = work_end === "" ? null : work_end

    if (start && end && start >= end) {
      return NextResponse.json({ error: "work_start must be < work_end" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("planning_assignments")
      .update({
        work_start: start,
        work_end: end,
      })
      .eq("id", assignmentId)
      .eq("planning_id", planning.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error updating assignment:", error)
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string; assignmentId: string }> }
) {
  try {
    const { folderId, planningId, assignmentId } = await params
    const supabase = getSupabase()

    // Ensure planning belongs to folder
    const { data: planning, error: planningError } = await supabase
      .from("planning_main")
      .select("id, folder_id")
      .eq("id", planningId)
      .eq("folder_id", folderId)
      .single()

    if (planningError) throw planningError

    const { error } = await supabase
      .from("planning_assignments")
      .delete()
      .eq("id", assignmentId)
      .eq("planning_id", planning.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting assignment:", error)
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
  }
}
