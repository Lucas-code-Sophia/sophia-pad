import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, pin } = await request.json()
    const supabase = await createClient()

    // Validation du PIN si fourni (6 chiffres)
    if (pin && (pin.length !== 6 || !/^\d{6}$/.test(pin))) {
      return NextResponse.json({ error: "Le code PIN doit contenir exactement 6 chiffres" }, { status: 400 })
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (pin) updateData.pin = pin

    const { error } = await supabase.from("users").update(updateData).eq("id", params.id)

    if (error) {
      console.error("[v0] Error updating user:", error)
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in user update API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("users").delete().eq("id", params.id)

    if (error) {
      console.error("[v0] Error deleting user:", error)
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in user delete API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
