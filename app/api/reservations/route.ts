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

    // Update table status to reserved
    await supabase.from("tables").update({ status: "reserved" }).eq("id", body.table_id)

    const { data, error } = await supabase.from("reservations").insert(body).select().single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error creating reservation:", error)
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 })
  }
}
