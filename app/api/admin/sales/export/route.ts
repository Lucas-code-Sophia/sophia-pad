import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const today = new Date().toISOString().split("T")[0]

    const { data: sales, error } = await supabase
      .from("sales_records")
      .select("*, orders(table_id, tables(table_number))")
      .eq("sale_date", today)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Create CSV
    const headers = ["Date", "Heure", "Table", "Montant HT", "TVA", "Montant TTC"]
    const rows = sales?.map((sale) => {
      const date = new Date(sale.created_at)
      const amountHT = Number.parseFloat(sale.total_amount) - Number.parseFloat(sale.tax_amount)
      return [
        date.toLocaleDateString("fr-FR"),
        date.toLocaleTimeString("fr-FR"),
        sale.orders?.tables?.table_number || "N/A",
        amountHT.toFixed(2),
        Number.parseFloat(sale.tax_amount).toFixed(2),
        Number.parseFloat(sale.total_amount).toFixed(2),
      ]
    })

    const csv = [headers, ...(rows || [])].map((row) => row.join(",")).join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="ventes_${today}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error exporting sales:", error)
    return NextResponse.json({ error: "Failed to export sales" }, { status: 500 })
  }
}
