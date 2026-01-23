import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeMenuButtonColor } from "@/lib/menu-colors"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    // Skip header row
    const dataLines = lines.slice(1)

    const parseStatus = (rawStatus?: string) => {
      if (!rawStatus) return true
      const normalized = rawStatus.trim().toLowerCase()
      if (["false", "0", "no", "non"].includes(normalized)) return false
      if (["true", "1", "yes", "oui"].includes(normalized)) return true
      return true
    }

    for (const line of dataLines) {
      const [name, price, taxRate, categoryName, routing, buttonColor, status] = line.split(",").map((s) => s.trim())

      if (!name || !price || !categoryName || !routing) continue

      // Find or create category
      let { data: category } = await supabase.from("menu_categories").select("id").eq("name", categoryName).single()

      if (!category) {
        const type = routing === "bar" ? "drink" : "food"
        const { data: newCategory } = await supabase
          .from("menu_categories")
          .insert({ name: categoryName, type, sort_order: 0 })
          .select()
          .single()

        category = newCategory
      }

      if (category) {
        // Insert menu item
        const newItem: Record<string, any> = {
          category_id: category.id,
          name,
          price: Number.parseFloat(price),
          tax_rate: Number.parseFloat(taxRate || "20"),
          type: routing === "bar" ? "drink" : "food",
          routing: routing as "kitchen" | "bar",
          status: parseStatus(status),
        }

        if (buttonColor !== undefined) {
          newItem.button_color = normalizeMenuButtonColor(buttonColor)
        }

        await supabase.from("menu_items").insert(newItem)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error importing menu:", error)
    return NextResponse.json({ error: "Failed to import menu" }, { status: 500 })
  }
}
