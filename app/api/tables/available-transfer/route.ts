import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map((x) => Number.parseInt(x, 10))
  return h * 60 + m
}

const formatDate = (d: Date) => d.toISOString().split("T")[0]

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const fromTableId = searchParams.get("fromTableId")

    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("id, table_number, seats, status")
      .eq("archived", false)
      .eq("status", "available")
      .order("table_number", { ascending: true })

    if (tablesError) {
      console.error("[v0] Error fetching tables:", tablesError)
      return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 })
    }

    const availableTables = (tables || []).filter((t) => t.id !== fromTableId)
    if (availableTables.length === 0) {
      return NextResponse.json([])
    }

    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const windowMinutes = 90
    const endMinutes = nowMinutes + windowMinutes
    const today = formatDate(now)
    const tomorrow = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))

    const tableIds = availableTables.map((t) => t.id)

    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select("table_id, reservation_date, reservation_time, status")
      .in("table_id", tableIds)
      .in("status", ["pending", "confirmed"])
      .in("reservation_date", endMinutes > 1440 ? [today, tomorrow] : [today])

    if (resError) {
      console.error("[v0] Error fetching reservations:", resError)
      return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 })
    }

    const blocked = new Set<string>()
    for (const r of reservations || []) {
      const minutes = toMinutes(r.reservation_time)
      if (r.reservation_date === today) {
        if (endMinutes <= 1440) {
          if (minutes >= nowMinutes && minutes <= endMinutes) blocked.add(r.table_id)
        } else {
          if (minutes >= nowMinutes) blocked.add(r.table_id)
        }
      } else if (r.reservation_date === tomorrow && endMinutes > 1440) {
        const nextDayEnd = endMinutes - 1440
        if (minutes <= nextDayEnd) blocked.add(r.table_id)
      }
    }

    const filtered = availableTables.filter((t) => !blocked.has(t.id))
    return NextResponse.json(filtered)
  } catch (error) {
    console.error("[v0] Error in available transfer tables API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
