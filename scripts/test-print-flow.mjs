import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"

const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
    const [key, ...rest] = trimmed.split("=")
    const value = rest.join("=").trim()
    if (key && !(key in process.env)) process.env[key] = value
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const keepData = process.env.KEEP_TEST_DATA === "1"

if (!url || !key) {
  console.error("Missing SUPABASE env vars")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const nowIso = () => new Date().toISOString()

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const uniqueSuffix = `${Date.now()}`.slice(-6)
const testTag = `TEST-PRINT-${uniqueSuffix}`

let testUserId = null
let testTableId = null
let testOrderId = null
let createdItemIds = []
let createdTicketIds = []

async function cleanup() {
  if (keepData) {
    console.log("KEEP_TEST_DATA=1 → cleanup skipped.")
    return
  }
  if (createdTicketIds.length > 0) {
    await supabase.from("kitchen_tickets").delete().in("id", createdTicketIds)
  }
  if (createdItemIds.length > 0) {
    await supabase.from("order_items").delete().in("id", createdItemIds)
  }
  if (testOrderId) {
    await supabase.from("orders").delete().eq("id", testOrderId)
  }
  if (testTableId) {
    await supabase.from("tables").delete().eq("id", testTableId)
  }
  if (testUserId) {
    await supabase.from("users").delete().eq("id", testUserId)
  }
}

async function runPrintLogic({ orderId, tableId, firedItems }) {
  if (!firedItems || firedItems.length === 0) return { insertedTickets: [] }

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("table_number")
    .eq("id", tableId)
    .single()
  if (tableError) throw tableError

  const firedExistingIds = firedItems
    .map((item) => item.cartItemId)
    .filter((id) => typeof id === "string" && !id.startsWith("temp-"))

  const firedExistingPrintData = firedExistingIds.length
    ? (await supabase.from("order_items").select("id, printed_fired_at").in("id", firedExistingIds)).data || []
    : []

  const printableFiredIds = new Set(
    firedExistingPrintData.filter((row) => !row.printed_fired_at).map((row) => row.id),
  )

  const firedItemsToPrint = firedItems.filter((item) => {
    const id = item.cartItemId
    if (typeof id !== "string") return true
    if (id.startsWith("temp-")) return true
    return printableFiredIds.has(id)
  })

  const followItemsToPrint = (
    await supabase
      .from("order_items")
      .select("id, menu_item_id, quantity, notes, status")
      .eq("order_id", orderId)
      .in("status", ["to_follow_1", "to_follow_2"])
      .is("printed_plan_at", null)
  ).data || []

  if (firedItemsToPrint.length === 0 && followItemsToPrint.length === 0) {
    return { insertedTickets: [] }
  }

  const menuItemIds = Array.from(
    new Set([
      ...firedItemsToPrint.map((i) => i.menuItemId),
      ...followItemsToPrint.map((i) => i.menu_item_id),
    ]),
  )

  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, name, type")
    .in("id", menuItemIds)
  if (menuError) throw menuError

  const kitchenItems = []
  const barItems = []

  const pushTicketItem = ({ menuItemId, quantity, notes, phase }) => {
    const menuItem = menuItems?.find((m) => m.id === menuItemId)
    if (!menuItem) return
    const ticketItem = { name: menuItem.name, quantity, notes, phase }
    if (menuItem.type === "food") kitchenItems.push(ticketItem)
    else barItems.push(ticketItem)
  }

  firedItemsToPrint.forEach((item) =>
    pushTicketItem({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      notes: item.notes,
      phase: "direct",
    }),
  )

  followItemsToPrint.forEach((item) =>
    pushTicketItem({
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      notes: item.notes,
      phase: item.status === "to_follow_1" ? "to_follow_1" : "to_follow_2",
    }),
  )

  const tickets = []
  if (kitchenItems.length > 0) {
    tickets.push({
      order_id: orderId,
      table_number: table.table_number,
      type: "kitchen",
      items: kitchenItems,
      status: "pending",
    })
  }
  if (barItems.length > 0) {
    tickets.push({
      order_id: orderId,
      table_number: table.table_number,
      type: "bar",
      items: barItems,
      status: "pending",
    })
  }

  const { data: insertedTickets, error: ticketError } = await supabase
    .from("kitchen_tickets")
    .insert(tickets)
    .select("id")
  if (ticketError) throw ticketError

  const now = nowIso()

  if (followItemsToPrint.length > 0) {
    const followIds = followItemsToPrint.map((i) => i.id)
    await supabase.from("order_items").update({ printed_plan_at: now }).in("id", followIds)
  }

  const firedExistingPrintedIds = firedItemsToPrint
    .map((item) => item.cartItemId)
    .filter((id) => typeof id === "string" && !id.startsWith("temp-"))

  const firedTempPrintedIds = firedItemsToPrint
    .map((item) => item.cartItemId)
    .filter((id) => typeof id === "string" && id.startsWith("temp-"))

  if (firedExistingPrintedIds.length > 0) {
    await supabase.from("order_items").update({ printed_fired_at: now }).in("id", firedExistingPrintedIds)
  }

  if (firedTempPrintedIds.length > 0) {
    await supabase
      .from("order_items")
      .update({ printed_fired_at: now })
      .eq("order_id", orderId)
      .in("cart_item_id", firedTempPrintedIds)
  }

  return { insertedTickets: insertedTickets || [] }
}

async function main() {
  try {
    console.log("=== TEST PRINT FLOW ===")
    console.log("Supabase URL:", url)
    console.log("Keep data:", keepData)
    const pin = String(Math.floor(100000 + Math.random() * 900000))
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({ name: `Test Print ${uniqueSuffix}`, pin, role: "manager" })
      .select("id, name")
      .single()
    if (userError) throw userError
    testUserId = user.id
    console.log("User:", user)

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .insert({
        table_number: testTag,
        seats: 2,
        position_x: 0,
        position_y: 0,
        status: "occupied",
        location: "T",
        opened_by: user.id,
        opened_by_name: user.name,
      })
      .select("id, table_number")
      .single()
    if (tableError) throw tableError
    testTableId = table.id
    console.log("Table:", table)

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ table_id: table.id, server_id: user.id, status: "open" })
      .select("id")
      .single()
    if (orderError) throw orderError
    testOrderId = order.id
    console.log("Order:", order)

    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, type")
      .limit(10)
    if (menuError) throw menuError
    const food = menuItems.find((m) => m.type === "food") || menuItems[0]
    const drink = menuItems.find((m) => m.type === "drink") || menuItems[1] || menuItems[0]
    assert(food && drink, "Menu items not found")
    console.log("Menu items:", { food, drink })

    const { data: followRows, error: followError } = await supabase
      .from("order_items")
      .insert([
        {
          order_id: order.id,
          menu_item_id: food.id,
          quantity: 1,
          price: 10,
          status: "to_follow_1",
          notes: "TEST FOLLOW 1",
        },
        {
          order_id: order.id,
          menu_item_id: drink.id,
          quantity: 1,
          price: 6,
          status: "to_follow_2",
          notes: "TEST FOLLOW 2",
        },
      ])
      .select("id")
    if (followError) throw followError
    createdItemIds.push(...followRows.map((r) => r.id))
    console.log("Inserted to_follow items:", followRows)

    const { data: firedRow, error: firedError } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        menu_item_id: food.id,
        quantity: 2,
        price: 14,
        status: "fired",
        notes: "TEST DIRECT",
      })
      .select("id, menu_item_id, quantity, notes")
      .single()
    if (firedError) throw firedError
    createdItemIds.push(firedRow.id)
    console.log("Inserted fired item:", firedRow)

    const beforeTickets = await supabase.from("kitchen_tickets").select("id").eq("order_id", order.id)
    console.log("Tickets before Step A:", beforeTickets.data?.length || 0)

    const stepA = await runPrintLogic({
      orderId: order.id,
      tableId: table.id,
      firedItems: [
        {
          cartItemId: firedRow.id,
          menuItemId: firedRow.menu_item_id,
          quantity: firedRow.quantity,
          notes: firedRow.notes,
        },
      ],
    })

    createdTicketIds.push(...stepA.insertedTickets.map((t) => t.id))
    console.log("Step A inserted tickets:", stepA.insertedTickets.length)

    const afterStepA = await supabase
      .from("order_items")
      .select("id, status, printed_plan_at, printed_fired_at")
      .in("id", createdItemIds)

    assert(stepA.insertedTickets.length > 0, "Step A: no tickets inserted")
    console.log("Order items after Step A:", afterStepA.data)

    const beforeStepBCount = (await supabase.from("kitchen_tickets").select("id").eq("order_id", order.id)).data
      .length
    console.log("Tickets before Step B:", beforeStepBCount)

    const stepB = await runPrintLogic({
      orderId: order.id,
      tableId: table.id,
      firedItems: [
        {
          cartItemId: firedRow.id,
          menuItemId: firedRow.menu_item_id,
          quantity: firedRow.quantity,
          notes: firedRow.notes,
        },
      ],
    })

    const afterStepBCount = (await supabase.from("kitchen_tickets").select("id").eq("order_id", order.id)).data
      .length
    console.log("Step B inserted tickets:", stepB.insertedTickets.length)
    console.log("Tickets after Step B:", afterStepBCount)

    assert(stepB.insertedTickets.length === 0, "Step B: should not insert new tickets")
    assert(afterStepBCount === beforeStepBCount, "Step B: ticket count changed")

    const followToFireId = followRows[0].id
    await supabase.from("order_items").update({ status: "fired", fired_at: nowIso() }).eq("id", followToFireId)
    console.log("Updated to_follow → fired:", followToFireId)

    const { data: followToFireRow } = await supabase
      .from("order_items")
      .select("id, menu_item_id, quantity, notes")
      .eq("id", followToFireId)
      .single()

    const stepC = await runPrintLogic({
      orderId: order.id,
      tableId: table.id,
      firedItems: [
        {
          cartItemId: followToFireRow.id,
          menuItemId: followToFireRow.menu_item_id,
          quantity: followToFireRow.quantity,
          notes: followToFireRow.notes,
        },
      ],
    })

    createdTicketIds.push(...stepC.insertedTickets.map((t) => t.id))
    console.log("Step C inserted tickets:", stepC.insertedTickets.length)

    const afterStepC = await supabase
      .from("order_items")
      .select("id, status, printed_plan_at, printed_fired_at")
      .in("id", createdItemIds)

    assert(stepC.insertedTickets.length > 0, "Step C: no tickets inserted for fired follow item")

    console.log("OK: Step A tickets:", stepA.insertedTickets.length)
    console.log("OK: Step B tickets:", stepB.insertedTickets.length)
    console.log("OK: Step C tickets:", stepC.insertedTickets.length)
    console.log("Order items after Step C:", afterStepC.data)
  } finally {
    await cleanup()
  }
}

main().catch(async (err) => {
  console.error("TEST FAILED:", err)
  await cleanup()
  process.exit(1)
})
