import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Utiliser le service role pour contourner RLS
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: folders, error } = await supabase
      .from("planning_folders")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(folders)
  } catch (error) {
    console.error("[v0] Error fetching planning folders:", error)
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, date_start, date_end } = await request.json()
    
    // Utiliser le service role pour contourner RLS
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: folder, error } = await supabase
      .from("planning_folders")
      .insert({
        name,
        date_start,
        date_end,
        status: "draft",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(folder)
  } catch (error) {
    console.error("[v0] Error creating planning folder:", error)
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
  }
}
