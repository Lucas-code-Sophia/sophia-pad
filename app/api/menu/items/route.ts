import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Vérifier et remettre en stock les articles expirés
    await supabase.rpc('auto_restock_items')

    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        *,
        menu_categories!menu_items_category_id_fkey (
          name
        )
      `)
      .order("name", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching menu items:", error)
      return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 })
    }

    // Transformer les données pour aplatir la structure
    const transformedData = data.map(item => ({
      ...item,
      category: item.menu_categories?.name || null
    }))

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("[v0] Error in menu items API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, price, tax_rate, category, routing, out_of_stock } = await request.json()
    const supabase = await createClient()

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

    const newItem: any = { 
      name, 
      price: Number.parseFloat(price), 
      tax_rate: Number.parseFloat(tax_rate), 
      routing,
      type: routing === "bar" ? "drink" : "food"
    }
    
    if (categoryId) {
      newItem.category_id = categoryId
    }

    if (out_of_stock !== undefined) {
      newItem.out_of_stock = out_of_stock
      newItem.out_of_stock_date = out_of_stock ? new Date().toISOString().split("T")[0] : null
    }

    const { data, error } = await supabase.from("menu_items").insert(newItem).select().single()

    if (error) {
      console.error("[v0] Error creating menu item:", error)
      return NextResponse.json({ error: "Failed to create item" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in menu create API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
