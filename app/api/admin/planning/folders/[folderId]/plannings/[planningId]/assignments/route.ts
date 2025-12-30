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

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map((v) => Number(v))
  const total = h * 60 + m + minutes
  const wrapped = ((total % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hh = String(Math.floor(wrapped / 60)).padStart(2, "0")
  const mm = String(wrapped % 60).padStart(2, "0")
  return `${hh}:${mm}`
}

function weekdayFromDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  // JS: 0=Sunday..6=Saturday -> convert Monday=0..Sunday=6
  return (d.getDay() + 6) % 7
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string }> }
) {
  try {
    const { folderId, planningId } = await params
    const supabase = getSupabase()

    // Ensure planning belongs to folder
    const { data: planning, error: planningError } = await supabase
      .from("planning_main")
      .select("id, folder_id")
      .eq("id", planningId)
      .eq("folder_id", folderId)
      .single()

    if (planningError) throw planningError

    const { data, error } = await supabase
      .from("planning_assignments")
      .select("*")
      .eq("planning_id", planning.id)
      .order("date", { ascending: true })
      .order("service", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error fetching assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string; planningId: string }> }
) {
  try {
    const { folderId, planningId } = await params
    const { date, service, employee_id, work_start, work_end } = await request.json()

    if (!date || !service || !employee_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (service !== "lunch" && service !== "dinner") {
      return NextResponse.json({ error: "Invalid service" }, { status: 400 })
    }

    const supabase = getSupabase()

    // Ensure planning belongs to folder
    const { data: planning, error: planningError } = await supabase
      .from("planning_main")
      .select("id, folder_id")
      .eq("id", planningId)
      .eq("folder_id", folderId)
      .single()

    if (planningError) throw planningError

    // Ensure employee belongs to folder
    const { data: employee, error: employeeError } = await supabase
      .from("planning_employees")
      .select("id")
      .eq("id", employee_id)
      .eq("folder_id", folderId)
      .single()

    if (employeeError) throw employeeError

    let computedStart: string | null = work_start ?? null
    let computedEnd: string | null = work_end ?? null

    // Default work hours from opening hours (optional; only when not provided)
    if (!computedStart || !computedEnd) {
      const weekday = weekdayFromDate(date)
      const { data: opening, error: openingError } = await supabase
        .from("planning_opening_hours")
        .select("service_type, lunch_start, lunch_end, dinner_start, dinner_end, continuous_start, continuous_end")
        .eq("folder_id", folderId)
        .eq("weekday", weekday)
        .maybeSingle()

      if (!openingError && opening) {
        let openStart: string | null = null
        let openEnd: string | null = null

        if (opening.service_type === "continuous") {
          openStart = opening.continuous_start
          openEnd = opening.continuous_end
        } else {
          if (service === "lunch") {
            openStart = opening.lunch_start
            openEnd = opening.lunch_end
          } else {
            openStart = opening.dinner_start
            openEnd = opening.dinner_end
          }
        }

        if (openStart && openEnd) {
          if (!computedStart) computedStart = addMinutes(openStart, -30)
          if (!computedEnd) computedEnd = addMinutes(openEnd, 30)
        }
      }
    }

    // Lightweight validation (block)
    if (computedStart && computedEnd && computedStart >= computedEnd) {
      return NextResponse.json({ error: "work_start must be < work_end" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("planning_assignments")
      .insert({
        planning_id: planning.id,
        date,
        service,
        employee_id: employee.id,
        work_start: computedStart,
        work_end: computedEnd,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error creating assignment:", error)
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}
