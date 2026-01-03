import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"

// Créer un client admin avec service role key si disponible
const getAdminClient = () => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Utiliser le client admin si disponible (bypass RLS), sinon client normal
    const adminClient = getAdminClient()
    const supabase = adminClient || await createClient()
    
    const { status, notes } = await request.json()

    const { data, error } = await supabase
      .from("applicants")
      .update({ status, notes })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating candidate:", error)
      return NextResponse.json({ error: "Failed to update candidate", details: error }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in PATCH /api/admin/recruitment/[id]:", error)
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Utiliser le client admin si disponible (bypass RLS), sinon client normal
    const adminClient = getAdminClient()
    const supabase = adminClient || await createClient()

    const { error } = await supabase
      .from("applicants")
      .delete()
      .eq("id", params.id)

    if (error) {
      console.error("[v0] Error deleting candidate:", error)
      return NextResponse.json({ error: "Failed to delete candidate", details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/admin/recruitment/[id]:", error)
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })
  }
}
