import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map((x) => Number.parseInt(x, 10))
  return h * 60 + m
}

const formatDate = (d: Date) => d.toISOString().split("T")[0]

const hasReservationInNext90 = async (supabase: any, tableId: string) => {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const endMinutes = nowMinutes + 90
  const today = formatDate(now)
  const tomorrow = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))

  const dates = endMinutes > 1440 ? [today, tomorrow] : [today]
  const { data, error } = await supabase
    .from("reservations")
    .select("reservation_date, reservation_time, status")
    .eq("table_id", tableId)
    .eq("status", "confirmed")
    .in("reservation_date", dates)

  if (error) {
    throw error
  }

  return (data || []).some((r: any) => {
    const minutes = toMinutes(r.reservation_time)
    if (r.reservation_date === today) {
      if (endMinutes <= 1440) {
        return minutes >= nowMinutes && minutes <= endMinutes
      }
      return minutes >= nowMinutes
    }
    if (r.reservation_date === tomorrow && endMinutes > 1440) {
      return minutes <= endMinutes - 1440
    }
    return false
  })
}

export async function POST(request: Request) {
  try {
    const { orderId, fromTableId, toTableId, serverId } = await request.json()
    if (!orderId || !fromTableId || !toTableId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, table_id, status")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status !== "open") {
      return NextResponse.json({ error: "Order is not open" }, { status: 400 })
    }

    if (order.table_id !== fromTableId) {
      return NextResponse.json({ error: "Order does not belong to this table" }, { status: 400 })
    }

    const { data: targetTable, error: targetError } = await supabase
      .from("tables")
      .select("id, status")
      .eq("id", toTableId)
      .single()

    if (targetError || !targetTable) {
      return NextResponse.json({ error: "Target table not found" }, { status: 404 })
    }

    if (targetTable.status !== "available") {
      return NextResponse.json({ error: "Target table is not available" }, { status: 400 })
    }

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("table_id", toTableId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json({ error: "Target table already has an open order" }, { status: 400 })
    }

    const hasUpcoming = await hasReservationInNext90(supabase, toTableId)
    if (hasUpcoming) {
      return NextResponse.json({ error: "Target table has a reservation soon" }, { status: 400 })
    }

    const { data: server } = await supabase.from("users").select("name").eq("id", serverId).single()

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({ table_id: toTableId })
      .eq("id", orderId)

    if (updateOrderError) {
      console.error("[v0] Error updating order table:", updateOrderError)
      return NextResponse.json({ error: "Failed to transfer order" }, { status: 500 })
    }

    await supabase.from("tables").update({ status: "available", opened_by: null, opened_by_name: null }).eq("id", fromTableId)
    await supabase
      .from("tables")
      .update({ status: "occupied", opened_by: serverId || null, opened_by_name: server?.name || null })
      .eq("id", toTableId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in order transfer API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
