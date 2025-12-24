import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", params.orderId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching payments:", error)
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
    }

    return NextResponse.json(payments)
  } catch (error) {
    console.error("[v0] Error in payments API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
