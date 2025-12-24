import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// GET /api/reservations/by-table?tableId=...&date=YYYY-MM-DD
// - If date is provided: returns all reservations for the table on that date ordered by time
// - Else: returns the most recent CONFIRMED reservation for the table
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get("tableId")
    const date = searchParams.get("date")
    if (!tableId) return NextResponse.json({ error: "Missing tableId" }, { status: 400 })

    const supabase = await createServerClient()

    if (date) {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("table_id", tableId)
        .eq("reservation_date", date)
        .order("reservation_time", { ascending: true })

      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Fallback: most recent confirmed reservation
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("table_id", tableId)
      .eq("status", "confirmed")
      .order("reservation_date", { ascending: false })
      .order("reservation_time", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json(data || null)
  } catch (error) {
    console.error("[v0] Error fetching reservation by table:", error)
    return NextResponse.json({ error: "Failed to fetch reservation by table" }, { status: 500 })
  }
}
