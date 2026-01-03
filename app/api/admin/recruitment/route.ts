import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { Applicant } from "@/lib/types"

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

export async function GET(request: NextRequest) {
  try {
    // Utiliser le client admin si disponible (bypass RLS), sinon client normal
    const adminClient = getAdminClient()
    const supabase = adminClient || await createClient()
    
    console.log("[DEBUG] Using admin client:", !!adminClient)
    
    // Tenter la requête avec plus de détails
    const { data, error, count } = await supabase
      .from("applicants")
      .select("*", { count: 'exact' })
      .order("created_at", { ascending: false })

    console.log("[DEBUG] Query result:")
    console.log("- Data length:", data?.length || 0)
    console.log("- Count:", count)
    console.log("- Error:", error)
    console.log("- Full data:", data)

    if (error) {
      console.error("[v0] Error fetching candidates:", error)
      return NextResponse.json({ 
        error: "Failed to fetch candidates", 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    return NextResponse.json({ 
      data: data || [],
      count: count || 0,
      debug: {
        usingAdminClient: !!adminClient,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    })
  } catch (error) {
    console.error("[v0] Error in GET /api/admin/recruitment:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Utiliser le client admin si disponible (bypass RLS), sinon client normal
    const adminClient = getAdminClient()
    const supabase = adminClient || await createClient()
    
    const formData = await request.formData()

    // Extract form data
    const first_name = formData.get("first_name") as string
    const last_name = formData.get("last_name") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const position = formData.get("position") as string
    const start_date = formData.get("start_date") as string
    const end_date = formData.get("end_date") as string
    const notes = formData.get("notes") as string
    const cv_file = formData.get("cv_file") as File

    // Validate required fields
    if (!first_name || !last_name || !email || !phone || !position) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Convert CV to base64 if provided
    let cv_base64 = ""
    let cv_file_name = ""
    
    if (cv_file) {
      const bytes = await cv_file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      cv_base64 = buffer.toString("base64")
      cv_file_name = cv_file.name
    }

    // Create candidate record
    const candidateData = {
      first_name,
      last_name,
      email,
      phone,
      position,
      start_date: start_date || null,
      end_date: end_date || null,
      notes: notes || "",
      cv_file_name,
      cv_base64,
      status: "NEW" as const,
      ai_summary: null,
      ai_score: null,
    }

    const { data, error } = await supabase
      .from("applicants")
      .insert([candidateData])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating candidate:", error)
      return NextResponse.json({ error: "Failed to create candidate", details: error }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error in POST /api/admin/recruitment:", error)
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })
  }
}
