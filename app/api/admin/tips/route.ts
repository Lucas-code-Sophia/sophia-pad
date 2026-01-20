import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface Payment {
  tip_amount: number | null
  created_at: string
  recorded_by?: string | null
  orders: {
    table_id: string
    tables?: {
      table_number: string | null
    } | null
  } | null
  users?: {
    name: string | null
  } | null
}

interface DailyBreakdown {
  date: string
  amount: number
  tables: Set<string>
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get("week") || "current"

    const supabase = await createClient()

    // Calculer les dates de la semaine
    const now = new Date()
    const currentDay = now.getDay()
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
    
    let weekStart: Date
    let weekEnd: Date

    if (week === "current") {
      weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
    } else if (week === "last") {
      weekStart = new Date(now.setDate(diff - 7))
      weekStart.setHours(0, 0, 0, 0)
      weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
    } else if (week === "last2") {
      weekStart = new Date(now.setDate(diff - 14))
      weekStart.setHours(0, 0, 0, 0)
      weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
    } else {
      return NextResponse.json({ error: "Invalid week parameter" }, { status: 400 })
    }

    // Récupérer les paiements avec des pourboires
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        tip_amount,
        created_at,
        recorded_by,
        orders!inner(
          table_id,
          tables(
            table_number
          )
        ),
        users:users!payments_recorded_by_fkey(
          name
        )
      `)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString())
      .not("tip_amount", "is", null)
      .gt("tip_amount", 0)
      .order("created_at", { ascending: true })

    if (paymentsError) {
      console.error("Error fetching tips:", paymentsError)
      return NextResponse.json({ error: "Failed to fetch tips" }, { status: 500 })
    }

    // Calculer les statistiques
    const weeklyTotal = payments.reduce((sum: number, payment: any) => sum + (payment.tip_amount || 0), 0)
    const uniqueTables = new Set(payments.map((p: any) => p.orders?.table_id).filter(Boolean)).size
    const averagePerTable = uniqueTables > 0 ? weeklyTotal / uniqueTables : 0

    // Récupérer les données de la semaine dernière pour comparaison
    let lastWeekTotal = 0
    if (week === "current") {
      const lastWeekStart = new Date(weekStart)
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)
      const lastWeekEnd = new Date(weekEnd)
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 7)

      const { data: lastWeekPayments } = await supabase
        .from("payments")
        .select("tip_amount")
        .gte("created_at", lastWeekStart.toISOString())
        .lte("created_at", lastWeekEnd.toISOString())
        .not("tip_amount", "is", null)
        .gt("tip_amount", 0)

      lastWeekTotal = lastWeekPayments?.reduce((sum: number, p: any) => sum + (p.tip_amount || 0), 0) || 0
    }

    const weeklyChange = lastWeekTotal > 0 ? ((weeklyTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

    // Grouper par jour
    const dailyBreakdown: any[] = []
    payments.forEach((payment: Payment) => {
      const date = new Date(payment.created_at).toLocaleDateString('fr-FR', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })

      const existingDay = dailyBreakdown.find((d: any) => d.date === date)
      const serverName = payment.users?.name || "Inconnu"
      if (existingDay) {
        existingDay.amount += payment.tip_amount || 0
        if (payment.orders?.table_id) {
          existingDay.tables.add(payment.orders.table_id)
        }
        const serverEntry = existingDay.servers.find((s: any) => s.name === serverName)
        if (serverEntry) {
          serverEntry.amount += payment.tip_amount || 0
        } else {
          existingDay.servers.push({ name: serverName, amount: payment.tip_amount || 0 })
        }
      } else {
        dailyBreakdown.push({
          date,
          amount: payment.tip_amount || 0,
          tables: new Set(payment.orders?.table_id ? [payment.orders.table_id] : []),
          servers: [{ name: serverName, amount: payment.tip_amount || 0 }]
        })
      }
    })

    // Convertir les Sets en nombres
    // Total général de tous les pourboires
    const { data: allPayments } = await supabase
      .from("payments")
      .select("tip_amount")
      .not("tip_amount", "is", null)
      .gt("tip_amount", 0)

    const totalTips = allPayments?.reduce((sum: number, p: any) => sum + (p.tip_amount || 0), 0) || 0

    // Convertir les Sets en nombres pour le JSON
    const dailyBreakdownForJson = dailyBreakdown.map((day: any) => ({
      date: day.date,
      amount: day.amount,
      tables: day.tables.size,
      servers: day.servers,
    }))

    const recentEntries = payments
      .map((payment: Payment) => ({
        created_at: payment.created_at,
        amount: payment.tip_amount || 0,
        table_number: payment.orders?.tables?.table_number || "",
        server_name: payment.users?.name || "Inconnu",
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 25)

    return NextResponse.json({
      weeklyTotal,
      averagePerTable,
      tablesServed: uniqueTables,
      weeklyChange,
      totalTips,
      dailyBreakdown: dailyBreakdownForJson,
      recentEntries,
    })

  } catch (error) {
    console.error("Error in tips API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
