import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from("menu_categories")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error("[v0] Error in categories API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, type = "food" } = await request.json()
    const supabase = await createClient()

    // Vérifier si la catégorie existe déjà
    const { data: existing } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("name", name.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    // Récupérer le plus grand sort_order
    const { data: maxOrder } = await supabase
      .from("menu_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single()

    const sortOrder = maxOrder ? maxOrder.sort_order + 1 : 1

    const { data, error } = await supabase
      .from("menu_categories")
      .insert({
        name: name.trim(),
        type,
        sort_order: sortOrder
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating category:", error)
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in category creation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
