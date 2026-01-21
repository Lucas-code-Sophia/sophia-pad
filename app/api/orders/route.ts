import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { tableId, serverId, items, supplements, orderId } = await request.json()
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
    else {
      // Ensure table is marked occupied if items are added to an existing order
      const { data: tableData } = await supabase.from("tables").select("status").eq("id", tableId).single()
      if (tableData?.status !== "occupied") {
        const { data: server } = await supabase.from("users").select("name").eq("id", serverId).single()
        await supabase.from("tables").update({
          status: "occupied",
          opened_by: serverId,
          opened_by_name: server?.name || null
        }).eq("id", tableId)
      }
    }

    // Gérer les articles existants et nouveaux séparément
    const existingItems = items.filter((item: any) => !item.cartItemId.startsWith('temp-'))
    const newItems = items.filter((item: any) => item.cartItemId.startsWith('temp-'))

    // Mettre à jour les articles existants
    const updatePromises = existingItems.map(async (item: any) => {
      const { data, error } = await supabase
        .from("order_items")
        .update({
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          status: item.status,
          notes: item.notes,
          fired_at: item.status === "fired" ? new Date().toISOString() : null,
          is_complimentary: item.isComplimentary || false,
          complimentary_reason: item.complimentaryReason,
        })
        .eq("order_id", currentOrderId)
        .eq("id", item.cartItemId)

      if (error) {
        console.error("[v0] Error updating item:", error)
        throw error
      }

      return data
    })

    // Insérer les nouveaux articles
    const insertPromises = newItems.map(async (item: any) => {
      const { data, error } = await supabase
        .from("order_items")
        .insert({
          order_id: currentOrderId,
          menu_item_id: item.menuItemId,
          cart_item_id: item.cartItemId,
          quantity: item.quantity,
          price: item.price,
          status: item.status,
          notes: item.notes,
          fired_at: item.status === "fired" ? new Date().toISOString() : null,
          is_complimentary: item.isComplimentary || false,
          complimentary_reason: item.complimentaryReason,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error inserting new item:", error)
        throw error
      }

      return data
    })

    await Promise.all([...updatePromises, ...insertPromises])

    if (supplements && supplements.length > 0) {
      const supplementRecords = supplements.map((sup: any) => ({
        order_id: currentOrderId,
        name: sup.name,
        amount: sup.amount,
        notes: sup.notes,
        is_complimentary: sup.isComplimentary || false,
        complimentary_reason: sup.complimentaryReason,
      }))

      const { error: supplementsError } = await supabase.from("supplements").insert(supplementRecords)

      if (supplementsError) {
        console.error("[v0] Error inserting supplements:", supplementsError)
        return NextResponse.json({ error: "Failed to insert supplements" }, { status: 500 })
      }
    }

    // Create kitchen tickets ONLY for fired items (pas pour les "à suivre")
    const firedItems = items.filter((item: any) => item.status === "fired")
    if (firedItems.length > 0) {
      // Get table number
      const { data: table } = await supabase.from("tables").select("table_number").eq("id", tableId).single()

      // Get menu items details
      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("*")
        .in(
          "id",
          firedItems.map((i: any) => i.menuItemId),
        )

      // Group by type (kitchen/bar)
      const kitchenItems: any[] = []
      const barItems: any[] = []

      firedItems.forEach((item: any) => {
        const menuItem = menuItems?.find((m) => m.id === item.menuItemId)
        if (menuItem) {
          const ticketItem = {
            name: menuItem.name,
            quantity: item.quantity,
            notes: item.notes,
          }
          if (menuItem.type === "food") {
            kitchenItems.push(ticketItem)
          } else {
            barItems.push(ticketItem)
          }
        }
      })

      // Create tickets
      const tickets = []
      if (kitchenItems.length > 0) {
        tickets.push({
          order_id: currentOrderId,
          table_number: table?.table_number,
          type: "kitchen",
          items: kitchenItems,
          status: "pending",
        })
      }
      if (barItems.length > 0) {
        tickets.push({
          order_id: currentOrderId,
          table_number: table?.table_number,
          type: "bar",
          items: barItems,
          status: "pending",
        })
      }

      if (tickets.length > 0) {
        await supabase.from("kitchen_tickets").insert(tickets)
      }
    }

    return NextResponse.json({ success: true, orderId: currentOrderId })
  } catch (error) {
    console.error("[v0] Error in orders API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
