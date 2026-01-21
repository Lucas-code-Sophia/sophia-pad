import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    const { tableId } = await params
    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("table_id", tableId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (orderError) {
      console.error("[v0] Error fetching order:", orderError)
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
    }

    if (!order) {
      return NextResponse.json(null)
    }

    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true })

    if (itemsError) {
      console.error("[v0] Error fetching order items:", itemsError)
      return NextResponse.json({ error: "Failed to fetch order items" }, { status: 500 })
    }

    return NextResponse.json(
      { order, items },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error in order API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
