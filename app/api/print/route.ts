import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildEposXml, sendToEpos, sampleTicket } from "@/lib/epos"

type Body = {
  kind: "kitchen" | "bar" | "suites"
  ip?: string
  dryRun?: boolean
  ticket?: {
    title?: string
    lines?: Array<{ content: string; align?: "left" | "center" | "right"; bold?: boolean; underline?: boolean; width?: number; height?: number }>
    cut?: boolean
    beep?: boolean
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const kind = body.kind

    if (!kind) {
      return NextResponse.json({ error: "Missing kind" }, { status: 400 })
    }

    const dryRun = body.dryRun === true

    let targetIp = body.ip
    if (!targetIp) {
      const supabase = await createClient()
      const { data } = await supabase
        .from("settings")
        .select("setting_value")
        .eq("setting_key", "printer_ips")
        .single()
      const value = (data?.setting_value as any) || {}
      targetIp = kind === "bar" ? value.bar_ip : value.kitchen_ip
    }

    if (!targetIp && !dryRun) {
      return NextResponse.json({ error: "Printer IP not configured" }, { status: 400 })
    }

    const ticket = body.ticket
      ? { title: body.ticket.title, lines: body.ticket.lines || [], cut: body.ticket.cut, beep: body.ticket.beep }
      : sampleTicket(kind)

    const xml = buildEposXml(ticket)
    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, xml, ticket })
    }
    const res = await sendToEpos(targetIp, xml)

    return NextResponse.json({ ok: res.ok, status: res.status, body: res.body })
  } catch (error) {
    console.error("[v0] Error printing:", error)
    return NextResponse.json({ error: "Failed to print" }, { status: 500 })
  }
}
