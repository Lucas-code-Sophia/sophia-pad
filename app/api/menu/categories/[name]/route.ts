import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: newName } = await request.json()
    const supabase = await createClient()
    const { name } = await params

    // Récupérer l'ID de la catégorie actuelle
    const { data: category, error: catError } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("name", decodeURIComponent(name))
      .single()

    if (catError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Vérifier si le nouveau nom existe déjà
    const { data: existing } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("name", newName.trim())
      .single()

    if (existing && existing.id !== category.id) {
      return NextResponse.json({ error: "Category name already exists" }, { status: 400 })
    }

    // Mettre à jour la catégorie
    const { error } = await supabase
      .from("menu_categories")
      .update({ name: newName.trim() })
      .eq("id", category.id)

    if (error) {
      console.error("[v0] Error updating category:", error)
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in category update API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const supabase = await createClient()
    const { name } = await params

    // Récupérer l'ID de la catégorie
    const { data: category, error: catError } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("name", decodeURIComponent(name))
      .single()

    if (catError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Mettre à jour tous les articles de cette catégorie pour les mettre à null
    await supabase
      .from("menu_items")
      .update({ category_id: null })
      .eq("category_id", category.id)

    // Supprimer la catégorie
    const { error } = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", category.id)

    if (error) {
      console.error("[v0] Error deleting category:", error)
      return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in category delete API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
