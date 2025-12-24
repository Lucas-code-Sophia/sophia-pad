import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    const supabase = await createClient()

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
