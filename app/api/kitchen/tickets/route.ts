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

    if (!tickets || tickets.length === 0) {
      return NextResponse.json(tickets)
    }

    const orderIds = Array.from(new Set(tickets.map((t: any) => t.order_id).filter(Boolean)))

    let orderServerMap = new Map<string, string>()
    let orderCoversMap = new Map<string, number | null>()
    if (orderIds.length > 0) {
      const { data: ordersData } = await supabase.from("orders").select("id, server_id, covers").in("id", orderIds)
      const serverIds = Array.from(new Set((ordersData || []).map((o: any) => o.server_id).filter(Boolean)))

      let serverNameMap = new Map<string, string>()
      if (serverIds.length > 0) {
        const { data: servers } = await supabase.from("users").select("id, name").in("id", serverIds)
        serverNameMap = new Map((servers || []).map((u: any) => [u.id, u.name]))
      }

      orderServerMap = new Map(
        (ordersData || []).map((o: any) => [o.id, serverNameMap.get(o.server_id) || ""]),
      )
      orderCoversMap = new Map(
        (ordersData || []).map((o: any) => [o.id, o.covers]),
      )
    }

    const enriched = tickets.map((t: any) => ({
      ...t,
      server_name: orderServerMap.get(t.order_id) || "",
      covers: orderCoversMap.get(t.order_id) ?? null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("[v0] Error in tickets API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
