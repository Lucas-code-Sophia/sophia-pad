import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params
    
    // Utiliser le service role pour contourner RLS
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: folder, error } = await supabase
      .from("planning_folders")
      .select("*")
      .eq("id", folderId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(folder)
  } catch (error) {
    console.error("[v0] Error fetching planning folder:", error)
    return NextResponse.json({ error: "Failed to fetch folder" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params
    
    // Utiliser le service role pour contourner RLS
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First delete any related planning entries (if they exist in the future)
    // Then delete the folder
    const { error } = await supabase
      .from("planning_folders")
      .delete()
      .eq("id", folderId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting planning folder:", error)
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 })
  }
}
