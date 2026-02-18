import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createServerClient()

    // Get the reservation to find the table
    const { data: reservation } = await supabase
      .from("reservations")
      .select("table_id, reservation_date, reservation_time, duration_minutes")
      .eq("id", id)
      .single()

    // Overlap validation if time/date/table is changed
    const targetTable = body.table_id ?? reservation?.table_id
    const targetDate = body.reservation_date ?? reservation?.reservation_date
    const targetTime = body.reservation_time ?? reservation?.reservation_time

    if (targetTable && targetDate && targetTime) {
      const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map((x: string) => Number.parseInt(x, 10))
        return h * 60 + m
      }

      const { data: existing, error: fetchErr } = await supabase
        .from("reservations")
        .select("id, reservation_time, status, duration_minutes")
        .eq("table_id", targetTable)
        .eq("reservation_date", targetDate)
        .neq("id", id)
        .in("status", ["pending", "confirmed", "seated"]) // only active bookings block

      if (fetchErr) throw fetchErr

      const newStart = toMinutes(targetTime as string)
      const newDuration: number = Number.isFinite(body.duration_minutes)
        ? Number(body.duration_minutes)
        : Number.isFinite(reservation?.duration_minutes as any)
          ? Number(reservation?.duration_minutes)
          : 1
      const overlaps = (existing || []).some((r) => {
        const start = toMinutes(r.reservation_time as string)
        const end = start + (Number.isFinite(r.duration_minutes) ? Number(r.duration_minutes) : 1)
        const newEnd = newStart + newDuration
        return !(newEnd <= start || newStart >= end)
      })

      if (overlaps) {
        return NextResponse.json(
          { error: "Réservation en conflit: créneau déjà occupé pour cette table." },
          { status: 400 },
        )
      }
    }

    // If cancelling or completing, update table status
    if (body.status === "cancelled" || body.status === "completed") {
      if (reservation) {
        await supabase.from("tables").update({ status: "available", opened_by: null, opened_by_name: null }).eq("id", reservation.table_id)
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
      await supabase.from("tables").update({ status: "available", opened_by: null, opened_by_name: null }).eq("id", reservation.table_id)
    }

    const { error } = await supabase.from("reservations").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting reservation:", error)
    return NextResponse.json({ error: "Failed to delete reservation" }, { status: 500 })
  }
}
