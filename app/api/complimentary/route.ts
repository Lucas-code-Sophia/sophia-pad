import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || new Date().toISOString().split("T")[0]
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0]

    const supabase = await createServerClient()

    // Fetch complimentary order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity,
        price,
        is_complimentary,
        complimentary_reason,
        created_at,
        order_id,
        menu_item_id,
        orders!inner(table_id, server_id),
        menu_items!inner(name)
      `)
      .eq("is_complimentary", true)
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .order("created_at", { ascending: false })

    if (itemsError) {
      console.error("[v0] Error fetching complimentary items:", itemsError)
      return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 })
    }

    // Fetch complimentary supplements
    const { data: supplements, error: supplementsError } = await supabase
      .from("supplements")
      .select(`
        id,
        name,
        amount,
        is_complimentary,
        complimentary_reason,
        created_at,
        order_id,
        orders!inner(table_id, server_id)
      `)
      .eq("is_complimentary", true)
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .order("created_at", { ascending: false })

    if (supplementsError) {
      console.error("[v0] Error fetching complimentary supplements:", supplementsError)
      return NextResponse.json({ error: "Failed to fetch supplements" }, { status: 500 })
    }

    // Get table and server info
    const tableIds = [
      ...new Set([
        ...(orderItems?.map((item: any) => item.orders.table_id) || []),
        ...(supplements?.map((sup: any) => sup.orders.table_id) || []),
      ]),
    ]

    const serverIds = [
      ...new Set([
        ...(orderItems?.map((item: any) => item.orders.server_id) || []),
        ...(supplements?.map((sup: any) => sup.orders.server_id) || []),
      ]),
    ]

    const { data: tables } = await supabase.from("tables").select("id, table_number").in("id", tableIds)
    const { data: servers } = await supabase.from("users").select("id, name").in("id", serverIds)

    const tableMap = new Map(tables?.map((t) => [t.id, t.table_number]) || [])
    const serverMap = new Map(servers?.map((s) => [s.id, s.name]) || [])

    // Format results
    const formattedItems = [
      ...(orderItems?.map((item: any) => ({
        id: item.id,
        type: "item" as const,
        name: item.menu_items.name,
        quantity: item.quantity,
        amount: item.price * item.quantity,
        reason: item.complimentary_reason,
        table_number: tableMap.get(item.orders.table_id) || "N/A",
        server_name: serverMap.get(item.orders.server_id) || "N/A",
        created_at: item.created_at,
      })) || []),
      ...(supplements?.map((sup: any) => ({
        id: sup.id,
        type: "supplement" as const,
        name: sup.name,
        amount: sup.amount,
        reason: sup.complimentary_reason,
        table_number: tableMap.get(sup.orders.table_id) || "N/A",
        server_name: serverMap.get(sup.orders.server_id) || "N/A",
        created_at: sup.created_at,
      })) || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(formattedItems)
  } catch (error) {
    console.error("[v0] Error in complimentary API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
