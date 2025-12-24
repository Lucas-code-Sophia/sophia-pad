import { NextRequest, NextResponse } from "next/server"
import { buildEposXml, sampleTicket, sendToEpos, type EposTicket } from "@/lib/epos"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      target?: "bar" | "kitchen" | "suites"
      ip?: string
      ticket?: {
        title?: string
        lines?: Array<{ content: string; align?: "left" | "center" | "right"; bold?: boolean; underline?: boolean; width?: number; height?: number }>
        cut?: boolean
        beep?: boolean
      }
      timeoutMs?: number
    }

    const target = body.target ?? "kitchen"
    const ip = body.ip || (target === "bar" ? process.env.PRINTER_IP_BAR : process.env.PRINTER_IP_KITCHEN)

    if (!ip) {
      return NextResponse.json(
        { error: "Missing printer IP. Provide 'ip' in body or set PRINTER_IP_BAR / PRINTER_IP_KITCHEN in env." },
        { status: 400 }
      )
    }

    const incoming = body.ticket ?? sampleTicket(target)
    const ticket: EposTicket = {
      title: incoming.title,
      lines: (incoming as any).lines ?? [],
      cut: (incoming as any).cut ?? true,
      beep: (incoming as any).beep ?? false,
    }
    const xml = buildEposXml(ticket)

    const res = await sendToEpos(ip, xml, { timeoutMs: body.timeoutMs })

    return NextResponse.json({ ok: res.ok, status: res.status, response: res.body })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 })
  }
}
