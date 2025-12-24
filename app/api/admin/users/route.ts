import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, role, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(users)
  } catch (error) {
    console.error("[v0] Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validation du PIN (6 chiffres)
    if (!body.pin || body.pin.length !== 6 || !/^\d{6}$/.test(body.pin)) {
      return NextResponse.json({ error: "Le code PIN doit contenir exactement 6 chiffres" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("users")
      .insert({
        name: body.name,
        pin: body.pin,
        role: body.role,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
