import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env")
  }

  return createSupabaseClient(url, serviceKey)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("planning_main")
      .select("*")
      .eq("folder_id", folderId)
      .order("week_start", { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error fetching plannings:", error)
    return NextResponse.json({ error: "Failed to fetch plannings" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params
    const { title, week_start, week_end } = await request.json()

    if (!title || !week_start || !week_end) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("planning_main")
      .insert({
        folder_id: folderId,
        title,
        week_start,
        week_end,
        status: "draft",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error creating planning:", error)
    return NextResponse.json({ error: "Failed to create planning" }, { status: 500 })
  }
}
