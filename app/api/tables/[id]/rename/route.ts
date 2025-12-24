import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { table_number } = await request.json()
    const supabase = await createServerClient()

    const { data, error } = await supabase.from("tables").update({ table_number }).eq("id", id).select().single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error renaming table:", error)
    return NextResponse.json({ error: "Failed to rename table" }, { status: 500 })
  }
}
