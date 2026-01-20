import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { orderId, items, serverId } = await request.json()
    const supabase = await createClient()

    if (!orderId || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Mettre à jour les articles existants au lieu de les réinsérer
    const updatePromises = items.map(async (item: any) => {
      if (item.quantity === 0) {
        // Supprimer l'article
        const { error } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", orderId)
          .eq("id", item.cartItemId)

        if (error) {
          console.error("[v0] Error deleting item:", error)
          throw error
        }
        return { deleted: true, id: item.cartItemId }
      } else {
        // Mettre à jour l'article
        const { data, error } = await supabase
          .from("order_items")
          .update({
            menu_item_id: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            status: item.status === "deleted" ? "deleted" : item.status,
            notes: item.notes,
            fired_at: item.status === "fired" ? new Date().toISOString() : null,
            is_complimentary: item.isComplimentary || false,
            complimentary_reason: item.complimentaryReason,
          })
          .eq("order_id", orderId)
          .eq("id", item.cartItemId)

        if (error) {
          console.error("[v0] Error updating item:", error)
          throw error
        }

        return data
      }
    })

    await Promise.all(updatePromises)

    console.log("[v0] fire-follow applied successfully:", items.length)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("[v0] Error in fire-follow API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
