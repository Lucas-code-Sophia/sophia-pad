import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { tableId } = await request.json()
    if (!tableId) {
      return NextResponse.json({ error: "Missing tableId" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: order } = await supabase
      .from("orders")
      .select("id, table_id")
      .eq("table_id", tableId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: "No open order" }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", order.id)
      .limit(1)

    if (itemsError) {
      return NextResponse.json({ error: "Failed to check order items" }, { status: 500 })
    }

    if (items && items.length > 0) {
      return NextResponse.json({ error: "Order is not empty" }, { status: 400 })
    }

    await supabase
      .from("tables")
      .update({ status: "available", opened_by: null, opened_by_name: null })
      .eq("id", order.table_id)

    await supabase.from("orders").delete().eq("id", order.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error closing empty order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
