import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    // Reset items that were marked out of stock on a previous day
    const { error } = await supabase
      .from("menu_items")
      .update({ out_of_stock: false, out_of_stock_date: null })
      .eq("out_of_stock", true)
      .lt("out_of_stock_date", today)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error resetting stock:", error)
    return NextResponse.json({ error: "Failed to reset stock" }, { status: 500 })
  }
}
