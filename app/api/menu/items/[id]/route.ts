import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeMenuButtonColor } from "@/lib/menu-colors"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, price, tax_rate, category, routing, out_of_stock, button_color, status, is_piatto_del_giorno } = await request.json()
    const supabase = await createClient()
    const { id } = await params // ← CORRECTION Next.js 15

    let categoryId = null
    if (category) {
      // Récupérer l'ID de la catégorie à partir du nom
      const { data: catData } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("name", category)
        .single()
      
      categoryId = catData?.id
    }

    const updateData: any = { name, price, tax_rate, routing }
    if (categoryId) {
      updateData.category_id = categoryId
    }

    if (out_of_stock !== undefined) {
      updateData.out_of_stock = out_of_stock
      updateData.out_of_stock_date = out_of_stock ? new Date().toISOString().split("T")[0] : null
    }

    if (button_color !== undefined) {
      updateData.button_color = normalizeMenuButtonColor(button_color)
    }

    if (status !== undefined) {
      updateData.status = Boolean(status)
    }

    if (is_piatto_del_giorno !== undefined) {
      updateData.is_piatto_del_giorno = Boolean(is_piatto_del_giorno)
    }

    const { error } = await supabase.from("menu_items").update(updateData).eq("id", id) // ← UTILISE id

    if (error) {
      console.error("[v0] Error updating menu item:", error)
      return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in menu update API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = await params // ← CORRECTION Next.js 15
    const { error } = await supabase.from("menu_items").delete().eq("id", id) // ← UTILISE id

    if (error) {
      console.error("[v0] Error deleting menu item:", error)
      return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in menu delete API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
