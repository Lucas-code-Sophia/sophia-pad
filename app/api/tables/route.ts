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

    return NextResponse.json(tables)
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
