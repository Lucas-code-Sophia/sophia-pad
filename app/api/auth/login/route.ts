export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      console.error("[v0] Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }

    const supabase = createSupabaseClient(url, serviceKey)

    const { data: user, error } = await supabase.from("users").select("*").eq("pin", pin).single()

    if (error || !user) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 })
    }

    if (user.disabled) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 })
    }

    // Don't send the PIN back to the client
    const { pin: _, ...userWithoutPin } = user

    return NextResponse.json(userWithoutPin)
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
