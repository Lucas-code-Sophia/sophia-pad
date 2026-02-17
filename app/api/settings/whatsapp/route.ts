import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type WhatsAppSettings = {
  confirmation_enabled: boolean
  review_enabled: boolean
}

const DEFAULT_SETTINGS: WhatsAppSettings = {
  confirmation_enabled: false,
  review_enabled: false,
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_settings")
      .single()

    if (error && error.code !== "PGRST116") throw error

    const settings = (data?.setting_value as WhatsAppSettings) || DEFAULT_SETTINGS

    return NextResponse.json({
      confirmation_enabled: settings.confirmation_enabled ?? false,
      review_enabled: settings.review_enabled ?? false,
    })
  } catch (error) {
    console.error("[v0] Error fetching WhatsApp settings:", error)
    return NextResponse.json({ error: "Failed to fetch WhatsApp settings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<WhatsAppSettings> = await request.json()

    const supabase = await createClient()

    // Get current settings first
    const { data: existing } = await supabase
      .from("settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_settings")
      .single()

    const current = (existing?.setting_value as WhatsAppSettings) || DEFAULT_SETTINGS

    const updated: WhatsAppSettings = {
      confirmation_enabled: body.confirmation_enabled ?? current.confirmation_enabled,
      review_enabled: body.review_enabled ?? current.review_enabled,
    }

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          setting_key: "whatsapp_settings",
          setting_value: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      )

    if (error) throw error

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[v0] Error saving WhatsApp settings:", error)
    return NextResponse.json({ error: "Failed to save WhatsApp settings" }, { status: 500 })
  }
}

