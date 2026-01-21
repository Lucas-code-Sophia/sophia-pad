import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type SettlementLine = {
  employee_name: string
  services_count: number
  amount: number
}

export async function POST(request: Request) {
  try {
    const { weekStart, weekEnd, totalTips, totalCash, totalCard, status, lines, createdBy } = await request.json()

    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: "Missing weekStart or weekEnd" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: settlement, error: settlementError } = await supabase
      .from("tip_settlements")
      .upsert(
        {
          week_start: weekStart,
          week_end: weekEnd,
          total_tips: Number(totalTips) || 0,
          total_cash: Number(totalCash) || 0,
          total_card: Number(totalCard) || 0,
          status: status === "done" ? "done" : "draft",
          created_by: createdBy || null,
          settled_at: status === "done" ? new Date().toISOString() : null,
        },
        { onConflict: "week_start" },
      )
      .select("id")
      .single()

    if (settlementError || !settlement) {
      console.error("[v0] Error upserting tip settlement:", settlementError)
      return NextResponse.json({ error: "Failed to save settlement" }, { status: 500 })
    }

    await supabase.from("tip_settlement_lines").delete().eq("settlement_id", settlement.id)

    const sanitizedLines = Array.isArray(lines) ? lines : []
    if (sanitizedLines.length > 0) {
      const records = sanitizedLines
        .filter((line: SettlementLine) => line.employee_name && line.services_count > 0)
        .map((line: SettlementLine) => ({
          settlement_id: settlement.id,
          employee_name: line.employee_name,
          services_count: line.services_count,
          amount: line.amount,
        }))

      if (records.length > 0) {
        const { error: linesError } = await supabase.from("tip_settlement_lines").insert(records)
        if (linesError) {
          console.error("[v0] Error inserting settlement lines:", linesError)
          return NextResponse.json({ error: "Failed to save settlement lines" }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true, id: settlement.id })
  } catch (error) {
    console.error("[v0] Error saving tip settlement:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
