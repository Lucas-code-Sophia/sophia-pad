import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const today = new Date().toISOString().split("T")[0]

    const { data: sales, error } = await supabase.from("sales_records").select("*").eq("sale_date", today)

    if (error) throw error

    const totalSales = sales?.reduce((sum, record) => sum + Number.parseFloat(record.total_amount), 0) || 0
    const totalTax = sales?.reduce((sum, record) => sum + Number.parseFloat(record.tax_amount), 0) || 0
    const orderCount = sales?.length || 0
    const averageTicket = orderCount > 0 ? totalSales / orderCount : 0

    return NextResponse.json({
      date: today,
      total_sales: totalSales,
      total_tax: totalTax,
      order_count: orderCount,
      average_ticket: averageTicket,
    })
  } catch (error) {
    console.error("[v0] Error fetching daily sales:", error)
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 })
  }
}
