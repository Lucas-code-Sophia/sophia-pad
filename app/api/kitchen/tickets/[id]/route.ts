import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: ticket, error } = await supabase.from("kitchen_tickets").update(body).eq("id", id).select().single()

    if (error) {
      console.error("[v0] Error updating ticket:", error)
      return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error("[v0] Error in ticket update API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
