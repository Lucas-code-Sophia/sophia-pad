import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { VisualFloorPlan, VisualFloorPlanItem } from "@/lib/floor-plan-layouts"

type Payload = {
  layouts?: VisualFloorPlan[]
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

const sanitizeItem = (raw: unknown): VisualFloorPlanItem | null => {
  if (!raw || typeof raw !== "object") return null
  const item = raw as VisualFloorPlanItem
  if (!item.id || !item.type) return null
  if (item.type !== "table" && item.type !== "decoration") return null

  return {
    id: String(item.id),
    type: item.type,
    x: clamp(Number(item.x) || 0, 0, 100),
    y: clamp(Number(item.y) || 0, 0, 100),
    width: clamp(Number(item.width) || 5, 1, 100),
    height: clamp(Number(item.height) || 5, 1, 100),
    rotation: Number(item.rotation) || 0,
    ...(item.type === "table" && item.tableId ? { tableId: String(item.tableId) } : {}),
    ...(item.type === "decoration"
      ? {
          label: item.label ? String(item.label).slice(0, 50) : "",
          color: item.color ? String(item.color).slice(0, 20) : "#64748b",
        }
      : {}),
  }
}

const sanitizeLayouts = (value: unknown): VisualFloorPlan[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((layout) => {
      if (!layout || typeof layout !== "object") return null
      const raw = layout as VisualFloorPlan
      if (!raw.id || !raw.label) return null
      const items = Array.isArray(raw.items)
        ? (raw.items.map(sanitizeItem).filter(Boolean) as VisualFloorPlanItem[])
        : []
      return {
        id: String(raw.id),
        label: String(raw.label).slice(0, 100),
        items,
      }
    })
    .filter(Boolean) as VisualFloorPlan[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("settings")
      .select("setting_value")
      .eq("setting_key", "floor_plan_visual_layouts")
      .single()

    if (error && error.code !== "PGRST116") throw error

    const value = (data?.setting_value as Payload) || { layouts: [] }
    const layouts = sanitizeLayouts(value.layouts)
    return NextResponse.json({ layouts })
  } catch (error) {
    console.error("[v0] Error fetching visual floor plan layouts:", error)
    return NextResponse.json({ error: "Failed to fetch visual layouts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: Payload = await request.json()
    const layouts = sanitizeLayouts(body?.layouts)

    const supabase = await createClient()

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          setting_key: "floor_plan_visual_layouts",
          setting_value: { layouts },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving visual floor plan layouts:", error)
    return NextResponse.json({ error: "Failed to save visual layouts" }, { status: 500 })
  }
}


