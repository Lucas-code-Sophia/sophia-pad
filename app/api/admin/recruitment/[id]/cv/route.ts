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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicantId } = await params
    
    if (!applicantId) {
      return NextResponse.json({ error: "Applicant ID required" }, { status: 400 })
    }

    // Utiliser le client admin si disponible (bypass RLS), sinon client normal
    const adminClient = getAdminClient()
    const supabase = adminClient || await createClient()
    
    // Récupérer les informations du candidat
    const { data: applicant, error: applicantError } = await supabase
      .from("applicants")
      .select("cv_file_path, cv_file_name")
      .eq("id", applicantId)
      .single()

    if (applicantError || !applicant) {
      console.error("[v0] Error fetching applicant:", applicantError)
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 })
    }

    if (!applicant.cv_file_path || !applicant.cv_file_name) {
      return NextResponse.json({ error: "No CV available for this applicant" }, { status: 404 })
    }

    // Télécharger le fichier avec une approche ultra-simple
    try {
      console.log("[v0] Attempting to download file:", applicant.cv_file_path)
      
      // Déterminer le Content-Type basé sur l'extension du fichier
      const getContentType = (fileName: string) => {
        const extension = fileName.toLowerCase().split('.').pop()
        switch (extension) {
          case 'pdf':
            return 'application/pdf'
          case 'doc':
            return 'application/msword'
          case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          default:
            return 'application/octet-stream'
        }
      }
      
      // Construire l'URL la plus simple possible
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const fileName = applicant.cv_file_path
      
      // URL directe du fichier dans le bucket public
      const directUrl = `${supabaseUrl}/storage/v1/object/public/cv/${fileName}`
      
      console.log("[v0] Direct URL:", directUrl)
      console.log("[v0] Direct URL length:", directUrl.length)
      
      // Télécharger le fichier
      const fileResponse = await fetch(directUrl)
      
      console.log("[v0] Response status:", fileResponse.status)
      
      if (!fileResponse.ok) {
        const errorText = await fileResponse.text()
        console.error("[v0] Direct download failed:", fileResponse.status, errorText)
        
        // Si ça échoue, essayer avec authentification
        console.log("[v0] Trying with auth...")
        const authUrl = `${supabaseUrl}/storage/v1/object/cv/${fileName}`
        const authResponse = await fetch(authUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          }
        })
        
        if (!authResponse.ok) {
          const authErrorText = await authResponse.text()
          console.error("[v0] Auth download also failed:", authResponse.status, authErrorText)
          return NextResponse.json({ 
            error: "File download failed", 
            details: `Public: HTTP ${fileResponse.status}, Auth: HTTP ${authResponse.status}`
          }, { status: 500 })
        }
        
        const authFileData = await authResponse.arrayBuffer()
        const authBuffer = Buffer.from(authFileData)
        
        return new NextResponse(authBuffer, {
          status: 200,
          headers: {
            'Content-Type': getContentType(applicant.cv_file_name),
            'Content-Disposition': `attachment; filename="${applicant.cv_file_name}"`,
            'Cache-Control': 'public, max-age=3600',
            'Content-Length': authBuffer.length.toString(),
          },
        })
      }

      const fileData = await fileResponse.arrayBuffer()
      const buffer = Buffer.from(fileData)

      console.log("[v0] File downloaded successfully, size:", buffer.length)

      // Retourner le fichier avec les headers appropriés
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': getContentType(applicant.cv_file_name),
          'Content-Disposition': `attachment; filename="${applicant.cv_file_name}"`,
          'Cache-Control': 'public, max-age=3600',
          'Content-Length': buffer.length.toString(),
        },
      })

    } catch (error) {
      console.error("[v0] Error serving file:", error)
      return NextResponse.json({ 
        error: "Failed to serve file", 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[v0] Error in GET /api/admin/recruitment/[id]/cv:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
