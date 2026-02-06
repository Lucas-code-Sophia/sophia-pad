import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isTableLocation, type FloorPlanLayout } from "@/lib/floor-plan-layouts"

type LayoutPayload = {
  layouts?: FloorPlanLayout[]
}

const sanitizeLayouts = (value: unknown): FloorPlanLayout[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((layout) => {
      if (!layout || typeof layout !== "object") return null
      const raw = layout as FloorPlanLayout
      if (!raw.id || !raw.label || !raw.description || !Array.isArray(raw.zones)) return null

      const zones = raw.zones
        .map((zone) => {
          if (!zone || typeof zone !== "object") return null
          const z = zone as FloorPlanLayout["zones"][number]
          if (!z.id || !z.title || !Array.isArray(z.locations)) return null
          const locations = z.locations.filter((loc) => isTableLocation(loc))
          if (locations.length === 0) return null
          const mobile = Number(z.layout?.columns?.mobile)
          const desktop = Number(z.layout?.columns?.desktop)
          const safeMobile = Number.isFinite(mobile) && mobile >= 1 && mobile <= 8 ? mobile : 4
          const safeDesktop = Number.isFinite(desktop) && desktop >= 1 && desktop <= 8 ? desktop : 8
          const aspect = z.layout?.aspect === "rect" ? "rect" : "square"
          return {
            id: String(z.id),
            title: String(z.title),
            locations,
            layout: {
              columns: { mobile: safeMobile, desktop: safeDesktop },
              aspect,
            },
          }
        })
        .filter(Boolean) as FloorPlanLayout["zones"]

      if (zones.length === 0) return null

      return {
        id: String(raw.id),
        label: String(raw.label),
        description: String(raw.description),
        zones,
      }
    })
    .filter(Boolean) as FloorPlanLayout[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("settings")
      .select("setting_value")
      .eq("setting_key", "floor_plan_layouts")
      .single()

    if (error && error.code !== "PGRST116") throw error

    const value = (data?.setting_value as LayoutPayload) || { layouts: [] }
    const layouts = sanitizeLayouts(value.layouts)
    return NextResponse.json({ layouts })
  } catch (error) {
    console.error("[v0] Error fetching floor plan layouts:", error)
    return NextResponse.json({ error: "Failed to fetch floor plan layouts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: LayoutPayload = await request.json()
    const layouts = sanitizeLayouts(body?.layouts)

    const supabase = await createClient()

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          setting_key: "floor_plan_layouts",
          setting_value: { layouts },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving floor plan layouts:", error)
    return NextResponse.json({ error: "Failed to save floor plan layouts" }, { status: 500 })
  }
}
