import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: items, error } = await supabase.from("menu_items").select("*").order("name", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching menu items:", error)
      return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 })
    }

    const today = new Date().toISOString().split("T")[0]
    const itemsToReset =
      items?.filter((item) => item.out_of_stock && item.out_of_stock_date && item.out_of_stock_date < today) || []

    if (itemsToReset.length > 0) {
      await Promise.all(
        itemsToReset.map((item) =>
          supabase.from("menu_items").update({ out_of_stock: false, out_of_stock_date: null }).eq("id", item.id),
        ),
      )

      // Refetch items after reset
      const { data: updatedItems } = await supabase.from("menu_items").select("*").order("name", { ascending: true })
      return NextResponse.json(updatedItems)
    }

    return NextResponse.json(items)
  } catch (error) {
    console.error("[v0] Error in menu items API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
