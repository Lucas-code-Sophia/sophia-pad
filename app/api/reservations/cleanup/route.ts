import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// Cancels past-day confirmed reservations and frees associated tables
export async function POST() {
  try {
    const supabase = await createServerClient()

    // Today in YYYY-MM-DD
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    const todayStr = `${yyyy}-${mm}-${dd}`

    // Fetch reservations strictly before today and still confirmed
    const { data: oldConfirmed, error: fetchError } = await supabase
      .from("reservations")
      .select("id, table_id")
      .lt("reservation_date", todayStr)
      .eq("status", "confirmed")

    if (fetchError) throw fetchError

    if (!oldConfirmed || oldConfirmed.length === 0) {
      return NextResponse.json({ updated: 0 })
    }

    const ids = oldConfirmed.map((r) => r.id)
    const tableIds = oldConfirmed.map((r) => r.table_id)

    // Cancel reservations
    const { error: updateResErr } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .in("id", ids)
    if (updateResErr) throw updateResErr

    // Free tables
    const { error: updateTblErr } = await supabase
      .from("tables")
      .update({ status: "available" })
      .in("id", tableIds)
    if (updateTblErr) throw updateTblErr

    return NextResponse.json({ updated: ids.length })
  } catch (error) {
    console.error("[v0] Error in reservations cleanup:", error)
    return NextResponse.json({ error: "Failed to cleanup reservations" }, { status: 500 })
  }
}
