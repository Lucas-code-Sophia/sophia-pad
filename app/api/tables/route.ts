import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: tables, error } = await supabase.from("tables").select("*").eq("archived", false).order("table_number", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching tables:", error)
      return NextResponse.json({ error: error.message || "Failed to fetch tables" }, { status: 500 })
    }

    // Enrichir les tables occupées avec le nombre de couverts de la commande ouverte
    const occupiedTableIds = (tables || []).filter((t: any) => t.status === "occupied").map((t: any) => t.id)
    let coversMap = new Map<string, number>()
    if (occupiedTableIds.length > 0) {
      const { data: openOrders } = await supabase
        .from("orders")
        .select("table_id, covers")
        .in("table_id", occupiedTableIds)
        .eq("status", "open")

      for (const o of openOrders || []) {
        if (o.covers != null && o.covers > 0) {
          coversMap.set(o.table_id, o.covers)
        }
      }
    }

    const enrichedTables = (tables || []).map((t: any) => ({
      ...t,
      current_covers: coversMap.get(t.id) ?? null,
    }))

    return NextResponse.json(enrichedTables)
  } catch (error) {
    console.error("[v0] Error in tables API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: table, error } = await supabase
      .from("tables")
      .insert({
        table_number: body.table_number,
        seats: body.seats,
        location: body.location,
        position_x: body.position_x || 100,
        position_y: body.position_y || 100,
        status: body.status || "available",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating table:", error)
      return NextResponse.json({ error: error.message || "Failed to create table" }, { status: 500 })
    }

    return NextResponse.json(table)
  } catch (error) {
    console.error("[v0] Error in tables POST API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
