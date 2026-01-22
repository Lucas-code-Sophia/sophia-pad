import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { order } = await request.json()
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const supabase = await createClient()
    const updates = order.map((entry: { id: string; sort_order: number }) =>
      supabase.from("menu_categories").update({ sort_order: entry.sort_order }).eq("id", entry.id),
    )

    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) {
      console.error("[v0] Error reordering categories:", failed.error)
      return NextResponse.json({ error: "Failed to reorder categories" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in category reorder API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
