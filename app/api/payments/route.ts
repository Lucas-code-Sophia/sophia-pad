import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, paymentMethod, tableId, splitMode, itemQuantities, discount } = await request.json()
    const supabase = await createServerClient()

    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        amount,
        payment_method: paymentMethod,
        metadata: { splitMode, itemQuantities, discount },
      })
      .select()
      .single()

    if (paymentError) {
      console.error("[v0] Error recording payment:", paymentError)
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
    }

    if (splitMode === "items" && itemQuantities) {
      const paymentItems = []
      for (const [orderItemId, quantity] of Object.entries(itemQuantities)) {
        if (quantity > 0) {
          // Get the item price
          const { data: orderItem } = await supabase.from("order_items").select("price").eq("id", orderItemId).single()

          if (orderItem) {
            paymentItems.push({
              payment_id: paymentData.id,
              order_item_id: orderItemId,
              quantity: Number(quantity),
              amount: orderItem.price * Number(quantity),
            })
          }
        }
      }

      if (paymentItems.length > 0) {
        await supabase.from("payment_items").insert(paymentItems)
      }
    }

    // Get total payments for this order
    const { data: payments } = await supabase.from("payments").select("amount").eq("order_id", orderId)

    // Get order total
    const { data: orderItems } = await supabase.from("order_items").select("price, quantity").eq("order_id", orderId)

    const { data: supplements } = await supabase
      .from("supplements")
      .select("amount, is_complimentary")
      .eq("order_id", orderId)

    const itemsTotal = orderItems?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
    const supplementsTotal = supplements?.reduce((sum, sup) => sum + (sup.is_complimentary ? 0 : sup.amount), 0) || 0
    const orderTotal = itemsTotal + supplementsTotal

    const paidTotal = payments?.reduce((sum, payment) => sum + Number.parseFloat(payment.amount.toString()), 0) || 0
    const remainingAmount = orderTotal - paidTotal

    const isFullyPaid = remainingAmount <= 0.01 // Allow for small rounding errors

    if (isFullyPaid) {
      await supabase.from("orders").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", orderId)
      await supabase.from("tables").update({ status: "available" }).eq("id", tableId)

      const { data: orderData } = await supabase.from("orders").select("server_id, table_id, created_at").eq("id", orderId).single()

      const { data: serverData } = await supabase.from("users").select("name").eq("id", orderData?.server_id).single()

      const { data: tableData } = await supabase.from("tables").select("table_number").eq("id", tableId).single()

      // Use the order creation date for sales records
      const saleDate = orderData?.created_at ? new Date(orderData.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]

      await supabase.from("daily_sales").insert({
        date: saleDate,
        table_id: tableId,
        table_number: tableData?.table_number || "",
        order_id: orderId,
        server_id: orderData?.server_id,
        server_name: serverData?.name || "",
        total_amount: orderTotal,
        payment_method: paymentMethod,
      })
    }

    return NextResponse.json({
      success: true,
      isFullyPaid,
      paidTotal,
      remainingAmount: Math.max(0, remainingAmount),
      orderTotal,
    })
  } catch (error) {
    console.error("[v0] Error in payments API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching payments:", error)
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
    }

    const paymentsWithItems = await Promise.all(
      payments.map(async (payment) => {
        const { data: items } = await supabase.from("payment_items").select("*").eq("payment_id", payment.id)

        return {
          ...payment,
          items: items || [],
        }
      }),
    )

    return NextResponse.json(paymentsWithItems)
  } catch (error) {
    console.error("[v0] Error in payments GET API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
