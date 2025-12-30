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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string }> }
) {
  try {
    const { folderId, planningId } = await params
    const { target_folder_id } = await request.json().catch(() => ({}))

    const supabase = getSupabase()

    // Fetch original planning
    const { data: original, error: originalError } = await supabase
      .from("planning_main")
      .select("*")
      .eq("id", planningId)
      .eq("folder_id", folderId)
      .single()

    if (originalError) throw originalError

    const targetFolderId = target_folder_id || folderId

    const { data: newPlanning, error: newPlanningError } = await supabase
      .from("planning_main")
      .insert({
        folder_id: targetFolderId,
        title: `Copie de ${original.title}`,
        week_start: original.week_start,
        week_end: original.week_end,
        status: "draft",
      })
      .select()
      .single()

    if (newPlanningError) throw newPlanningError

    // Copy assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("planning_assignments")
      .select("date, service, employee_id, work_start, work_end")
      .eq("planning_id", original.id)

    if (assignmentsError) throw assignmentsError

    if (assignments && assignments.length > 0) {
      const rows = assignments.map((a) => ({
        planning_id: newPlanning.id,
        date: a.date,
        service: a.service,
        employee_id: a.employee_id,
        work_start: a.work_start,
        work_end: a.work_end,
      }))

      const { error: insertError } = await supabase.from("planning_assignments").insert(rows)
      if (insertError) throw insertError
    }

    return NextResponse.json(newPlanning)
  } catch (error) {
    console.error("[v0] Error duplicating planning:", error)
    return NextResponse.json({ error: "Failed to duplicate planning" }, { status: 500 })
  }
}
