import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// Service time boundaries (in "HH:MM" format for comparison)
const MIDI_START = "10:00"
const MIDI_END = "15:59"
const SOIR_START = "16:00"
const SOIR_END = "23:59"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get("year")) || new Date().getFullYear()
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1

    // Build date range for the full month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

    const { data, error } = await supabase
      .from("reservations")
      .select("reservation_date, reservation_time, status")
      .gte("reservation_date", startDate)
      .lte("reservation_date", endDate)
      .in("status", ["pending", "confirmed", "seated"]) // Only active reservations

    if (error) throw error

    // Group by date and compute counts per service
    const counts: Record<string, { midi: number; soir: number; total: number }> = {}

    for (const row of data || []) {
      const date = row.reservation_date
      if (!counts[date]) {
        counts[date] = { midi: 0, soir: 0, total: 0 }
      }

      const time = (row.reservation_time || "").slice(0, 5) // "HH:MM"
      if (time >= MIDI_START && time <= MIDI_END) {
        counts[date].midi += 1
      } else if (time >= SOIR_START && time <= SOIR_END) {
        counts[date].soir += 1
      }
      counts[date].total += 1
    }

    return NextResponse.json({ counts, year, month })
  } catch (error) {
    console.error("[v0] Error fetching calendar data:", error)
    return NextResponse.json({ error: "Failed to fetch calendar data" }, { status: 500 })
  }
}

