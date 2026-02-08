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
    } else if (period === "today") {
      // Aujourd'hui : même jour pour début et fin
      // Pas besoin de modifier les dates, on utilise today
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

    const startDateStr = period === "today" ? new Date().toISOString().split("T")[0] : startDate.toISOString().split("T")[0]
    const endDateStr = period === "today" ? new Date().toISOString().split("T")[0] : endDate.toISOString().split("T")[0]

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
        acc[date] = { date, total: 0, orders: 0, complimentary: 0, complimentaryCount: 0 }
      }
      acc[date].total += Number.parseFloat(sale.total_amount)
      acc[date].orders += 1
      acc[date].complimentary += Number.parseFloat(sale.complimentary_amount || 0)
      acc[date].complimentaryCount += parseInt(sale.complimentary_count || 0)
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
    const cashOrders = (dailySales || []).filter((sale: any) => sale.payment_method === "cash").length
    const cardOrders = (dailySales || []).filter((sale: any) => sale.payment_method === "card").length
    const otherOrders = (dailySales || []).filter(
      (sale: any) => sale.payment_method && !["cash", "card"].includes(sale.payment_method),
    ).length

    const cashAmount = (dailySales || [])
      .filter((sale: any) => sale.payment_method === "cash")
      .reduce((sum: number, sale: any) => sum + Number.parseFloat(sale.total_amount), 0)
    const cardAmount = (dailySales || [])
      .filter((sale: any) => sale.payment_method === "card")
      .reduce((sum: number, sale: any) => sum + Number.parseFloat(sale.total_amount), 0)
    const otherAmount = (dailySales || [])
      .filter((sale: any) => sale.payment_method && !["cash", "card"].includes(sale.payment_method))
      .reduce((sum: number, sale: any) => sum + Number.parseFloat(sale.total_amount), 0)

    // Calculate complimentary stats
    const totalComplimentaryAmount = (dailySales || []).reduce(
      (sum: number, sale: any) => sum + Number.parseFloat(sale.complimentary_amount || 0),
      0,
    )
    const totalComplimentaryCount = (dailySales || []).reduce(
      (sum: number, sale: any) => sum + parseInt(sale.complimentary_count || 0),
      0,
    )

    // Calculate TVA precisely from item tax rates
    const orderIds = (dailySales || []).map((sale: any) => sale.order_id).filter(Boolean)
    const orderIdToServer = new Map(
      (dailySales || []).map((sale: any) => [sale.order_id, sale.server_name || "Inconnu"]),
    )

    let totalTax = 0
    let rate10Sales = 0
    let rate20Sales = 0
    const taxByServer: Record<string, number> = {}

    if (orderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("order_id, menu_item_id, quantity, price, is_complimentary")
        .in("order_id", orderIds)

      const menuItemIds = Array.from(new Set((orderItems || []).map((item: any) => item.menu_item_id).filter(Boolean)))

      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("id, tax_rate")
        .in("id", menuItemIds)

      const menuItemTaxMap = new Map((menuItems || []).map((item: any) => [item.id, Number(item.tax_rate) || 0]))

      for (const item of orderItems || []) {
        if (item.is_complimentary) continue
        const rate = menuItemTaxMap.get(item.menu_item_id) || 0
        const lineTotal = Number(item.price) * Number(item.quantity || 0)
        const lineTax = rate > 0 ? lineTotal - lineTotal / (1 + rate / 100) : 0

        totalTax += lineTax
        const serverName = orderIdToServer.get(item.order_id) || "Inconnu"
        taxByServer[serverName] = (taxByServer[serverName] || 0) + lineTax
        if (rate === 10) rate10Sales += lineTotal
        if (rate === 20) rate20Sales += lineTotal
      }

      const { data: supplements } = await supabase
        .from("supplements")
        .select("order_id, amount, tax_rate, is_complimentary")
        .in("order_id", orderIds)

      for (const sup of supplements || []) {
        if (sup.is_complimentary) continue
        const rate = Number(sup.tax_rate ?? 10)
        const lineTotal = Number(sup.amount) || 0
        const lineTax = rate > 0 ? lineTotal - lineTotal / (1 + rate / 100) : 0

        totalTax += lineTax
        const serverName = orderIdToServer.get(sup.order_id) || "Inconnu"
        taxByServer[serverName] = (taxByServer[serverName] || 0) + lineTax
        if (rate === 10) rate10Sales += lineTotal
        if (rate === 20) rate20Sales += lineTotal
      }
    }

    const totalSalesHT = totalSales - totalTax
    const taxRate10Share = totalSales > 0 ? (rate10Sales / totalSales) * 100 : 0
    const taxRate20Share = totalSales > 0 ? (rate20Sales / totalSales) * 100 : 0

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
          complimentary_amount: 0,
          complimentary_count: 0,
        }
      }
      acc[serverName].total_sales += Number.parseFloat(sale.total_amount)
      acc[serverName].order_count += 1
      acc[serverName].complimentary_amount += Number.parseFloat(sale.complimentary_amount || 0)
      acc[serverName].complimentary_count += parseInt(sale.complimentary_count || 0)
      return acc
    }, {})

    const serverStats = Object.values(serverStatsMap).map((server: any) => ({
      ...server,
      total_sales_ht: server.total_sales - (taxByServer[server.server_name] || 0),
      average_ticket: server.order_count > 0 ? server.total_sales / server.order_count : 0,
      complimentary_percentage: server.total_sales > 0 ? (server.complimentary_amount / server.total_sales) * 100 : 0,
    }))

    return NextResponse.json({
      salesData,
      topDishes,
      serverStats,
      stats: {
        totalSales,
        totalSalesHT,
        totalOrders,
        averageTicket,
        totalTax,
        taxRate10Share,
        taxRate20Share,
        totalComplimentaryAmount,
        totalComplimentaryCount,
        complimentaryPercentage: totalSales > 0 ? (totalComplimentaryAmount / totalSales) * 100 : 0,
        paymentMix: {
          volume: {
            cash: totalOrders > 0 ? (cashOrders / totalOrders) * 100 : 0,
            card: totalOrders > 0 ? (cardOrders / totalOrders) * 100 : 0,
            other: totalOrders > 0 ? (otherOrders / totalOrders) * 100 : 0,
          },
          value: {
            cash: totalSales > 0 ? (cashAmount / totalSales) * 100 : 0,
            card: totalSales > 0 ? (cardAmount / totalSales) * 100 : 0,
            other: totalSales > 0 ? (otherAmount / totalSales) * 100 : 0,
          },
        },
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching reports:", error)
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}
