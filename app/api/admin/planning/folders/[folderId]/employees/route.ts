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

    const { data: employees, error } = await supabase
      .from("planning_employees")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(employees || [])
  } catch (error) {
    console.error("[v0] Error fetching planning employees:", error)
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params
    const { first_name, role } = await request.json()

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: employee, error } = await supabase
      .from("planning_employees")
      .insert({
        folder_id: folderId,
        first_name,
        role,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(employee)
  } catch (error) {
    console.error("[v0] Error creating planning employee:", error)
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}
