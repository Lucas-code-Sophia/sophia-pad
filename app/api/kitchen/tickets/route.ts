import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type")

    const supabase = await createClient()

    let query = supabase.from("kitchen_tickets").select("*").order("created_at", { ascending: false })

    if (type) {
      query = query.eq("type", type)
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error("[v0] Error fetching tickets:", error)
      return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 })
    }

    return NextResponse.json(tickets)
  } catch (error) {
    console.error("[v0] Error in tickets API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
