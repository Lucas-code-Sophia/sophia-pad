import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "7days"
    const customStartDate = searchParams.get("startDate")
    const customEndDate = searchParams.get("endDate")

    const supabase = await createClient()

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    if (period === "custom" && customStartDate && customEndDate) {
      startDate.setTime(new Date(customStartDate).getTime())
      endDate.setTime(new Date(customEndDate).getTime())
    } else {
      switch (period) {
        case "7days":
          startDate.setDate(endDate.getDate() - 7)
          break
        case "30days":
          startDate.setDate(endDate.getDate() - 30)
          break
        case "3months":
          startDate.setMonth(endDate.getMonth() - 3)
          break
      }
    }

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // Fetch daily sales data
    const { data: dailySales } = await supabase
      .from("daily_sales")
      .select("*")
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true })

    // Group by date for chart
    const salesByDate = (dailySales || []).reduce((acc: any, sale: any) => {
      const date = sale.date
      if (!acc[date]) {
        acc[date] = { date, total: 0, orders: 0 }
      }
      acc[date].total += Number.parseFloat(sale.total_amount)
      acc[date].orders += 1
      return acc
    }, {})

    const salesData = Object.values(salesByDate)

    // Calculate stats
    const totalSales = (dailySales || []).reduce(
      (sum: number, sale: any) => sum + Number.parseFloat(sale.total_amount),
      0,
    )
    const totalOrders = (dailySales || []).length
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0

    // Calculate TVA (assuming 20% for most items, 10% for some)
    const totalTax = totalSales * 0.18 // Approximate

    // Fetch top dishes
    const { data: orderItems } = await supabase
      .from("order_items")
      .select(`
        menu_item_id,
        quantity,
        price,
        created_at
      `)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    const { data: menuItems } = await supabase.from("menu_items").select("*")

    const dishStats = (orderItems || []).reduce((acc: any, item: any) => {
      const menuItem = menuItems?.find((m: any) => m.id === item.menu_item_id)
      if (menuItem) {
        if (!acc[item.menu_item_id]) {
          acc[item.menu_item_id] = {
            name: menuItem.name,
            quantity: 0,
            revenue: 0,
          }
        }
        acc[item.menu_item_id].quantity += item.quantity
        acc[item.menu_item_id].revenue += item.quantity * Number.parseFloat(item.price)
      }
      return acc
    }, {})

    const topDishes = Object.values(dishStats)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10)

    // Fetch server stats
    const serverStatsMap = (dailySales || []).reduce((acc: any, sale: any) => {
      const serverName = sale.server_name || "Inconnu"
      if (!acc[serverName]) {
        acc[serverName] = {
          server_name: serverName,
          total_sales: 0,
          order_count: 0,
        }
      }
      acc[serverName].total_sales += Number.parseFloat(sale.total_amount)
      acc[serverName].order_count += 1
      return acc
    }, {})

    const serverStats = Object.values(serverStatsMap).map((server: any) => ({
      ...server,
      average_ticket: server.order_count > 0 ? server.total_sales / server.order_count : 0,
    }))

    return NextResponse.json({
      salesData,
      topDishes,
      serverStats,
      stats: {
        totalSales,
        totalOrders,
        averageTicket,
        totalTax,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching reports:", error)
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}
