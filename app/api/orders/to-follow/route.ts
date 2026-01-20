import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { tableId, serverId, items, orderId } = await request.json()
    const supabase = await createClient()

    let currentOrderId = orderId

    // If no existing order, create one and update table status
    if (!currentOrderId) {
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_id: tableId,
          server_id: serverId,
          status: "open",
        })
        .select()
        .single()

      if (orderError) {
        console.error("[v0] Error creating order:", orderError)
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
      }

      currentOrderId = newOrder.id

      // Update table status to occupied and record who opened it
      const { data: server } = await supabase.from("users").select("name").eq("id", serverId).single()
      await supabase.from("tables").update({ 
        status: "occupied",
        opened_by: serverId,
        opened_by_name: server?.name || null
      }).eq("id", tableId)
    }

    // Insert to_follow items in database (but don't fire them)
    const orderItems = items.map((item: any) => ({
      order_id: currentOrderId,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
      status: item.status, // to_follow_1 or to_follow_2
      notes: item.notes,
      fired_at: null, // Don't fire yet
      is_complimentary: item.isComplimentary || false,
      complimentary_reason: item.complimentaryReason,
      created_by_server_id: serverId, // Track which server added this
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

    if (itemsError) {
      console.error("[v0] Error inserting to_follow items:", itemsError)
      return NextResponse.json({ error: "Failed to insert to_follow items" }, { status: 500 })
    }

    return NextResponse.json({ success: true, orderId: currentOrderId })
  } catch (error) {
    console.error("[v0] Error in to_follow API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
