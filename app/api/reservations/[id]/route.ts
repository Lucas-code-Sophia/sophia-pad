import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createServerClient()

    // Get the reservation to find the table
    const { data: reservation } = await supabase.from("reservations").select("table_id").eq("id", id).single()

    // If cancelling or completing, update table status
    if (body.status === "cancelled" || body.status === "completed") {
      if (reservation) {
        await supabase.from("tables").update({ status: "available" }).eq("id", reservation.table_id)
      }
    } else if (body.status === "seated") {
      if (reservation) {
        await supabase.from("tables").update({ status: "occupied" }).eq("id", reservation.table_id)
      }
    }

    const { data, error } = await supabase.from("reservations").update(body).eq("id", id).select().single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error updating reservation:", error)
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    // Get the reservation to find the table
    const { data: reservation } = await supabase.from("reservations").select("table_id").eq("id", id).single()

    // Update table status to available
    if (reservation) {
      await supabase.from("tables").update({ status: "available" }).eq("id", reservation.table_id)
    }

    const { error } = await supabase.from("reservations").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting reservation:", error)
    return NextResponse.json({ error: "Failed to delete reservation" }, { status: 500 })
  }
}
