import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    let query = supabase
      .from("reservations")
      .select("*, tables(table_number)")
      .order("reservation_time", { ascending: true })

    if (date) {
      query = query.eq("reservation_date", date)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error fetching reservations:", error)
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createServerClient()

    // Overlap validation: prevent overlapping reservations for same table & date
    // Default slot length = 1 minute; can be overridden by body.duration_minutes
    const NEW_SLOT_MINUTES: number = Number.isFinite(body.duration_minutes)
      ? Number(body.duration_minutes)
      : 1
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map((x: string) => Number.parseInt(x, 10))
      return h * 60 + m
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("reservations")
      .select("id, reservation_time, status, duration_minutes")
      .eq("table_id", body.table_id)
      .eq("reservation_date", body.reservation_date)
      .in("status", ["confirmed", "seated"]) // only active bookings block

    if (fetchErr) throw fetchErr

    const newStart = toMinutes(body.reservation_time as string)
    const overlaps = (existing || []).some((r) => {
      const start = toMinutes(r.reservation_time as string)
      // consider each reservation a SLOT_MINUTES window; overlap if windows intersect
      const end = start + (Number.isFinite(r.duration_minutes) ? Number(r.duration_minutes) : 1)
      const newEnd = newStart + NEW_SLOT_MINUTES
      return !(newEnd <= start || newStart >= end)
    })

    if (overlaps) {
      return NextResponse.json(
        { error: "Réservation en conflit: créneau déjà occupé pour cette table." },
        { status: 400 },
      )
    }

    // Update table status to reserved
    await supabase.from("tables").update({ status: "reserved" }).eq("id", body.table_id)

    // Sanitize UUID fields: convert empty strings to null
    const sanitizedBody = { ...body, duration_minutes: NEW_SLOT_MINUTES }
    if (!sanitizedBody.created_by) sanitizedBody.created_by = null
    if (!sanitizedBody.table_id) {
      return NextResponse.json({ error: "table_id est requis" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert(sanitizedBody)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error creating reservation:", error)
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 })
  }
}
