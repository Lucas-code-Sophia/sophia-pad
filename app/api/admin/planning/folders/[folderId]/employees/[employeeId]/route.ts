import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; employeeId: string }> }
) {
  try {
    const { folderId, employeeId } = await params
    const { first_name, role } = await request.json()

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: employee, error } = await supabase
      .from("planning_employees")
      .update({
        first_name,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId)
      .eq("folder_id", folderId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(employee)
  } catch (error) {
    console.error("[v0] Error updating planning employee:", error)
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; employeeId: string }> }
) {
  try {
    const { folderId, employeeId } = await params

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from("planning_employees")
      .delete()
      .eq("id", employeeId)
      .eq("folder_id", folderId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting planning employee:", error)
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}
