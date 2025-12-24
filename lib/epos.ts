export type EposTextLine = {
  content: string
  align?: "left" | "center" | "right"
  bold?: boolean
  underline?: boolean
  width?: number
  height?: number
}

export type EposTicket = {
  title?: string
  lines: EposTextLine[]
  cut?: boolean
  beep?: boolean
}

// Build minimal ePOS-Print XML payload for TM-m30III
export function buildEposXml(ticket: EposTicket): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const header = `<?xml version="1.0" encoding="utf-8"?>\n<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">`
  const footer = `</epos-print>`

  const parts: string[] = []

  if (ticket.title) {
    parts.push(
      `<text align="center" width="2" height="2">${esc(ticket.title)}</text>`,
      `<feed line="1" />`
    )
  }

  for (const line of ticket.lines) {
    const align = line.align ?? "left"
    const bold = line.bold ? "true" : "false"
    const underline = line.underline ? "1" : "0"
    const width = line.width ?? 1
    const height = line.height ?? 1
    parts.push(
      `<text align="${align}" emphasized="${bold}" underline="${underline}" width="${width}" height="${height}">${esc(line.content)}</text>`
    )
  }

  // small spacing before cut
  parts.push(`<feed line="3" />`)

  if (ticket.beep) parts.push(`<sound pattern="0" />`)
  if (ticket.cut) parts.push(`<cut type="feed" />`)

  return `${header}\n${parts.join("\n")}\n${footer}`
}

export async function sendToEpos(ip: string, xml: string, opts?: { timeoutMs?: number }): Promise<{ ok: boolean; status: number; body: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 7000)
  try {
    const res = await fetch(`http://${ip}/cgi-bin/epos/service.cgi`, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
      body: xml,
      signal: controller.signal,
    })
    const text = await res.text()
    return { ok: res.ok, status: res.status, body: text }
  } finally {
    clearTimeout(timeout)
  }
}

export function sampleTicket(kind: "bar" | "kitchen" | "suites"): EposTicket {
  const now = new Date().toLocaleString("fr-FR")
  const title = kind === "bar" ? "BAR" : kind === "kitchen" ? "CUISINE" : "SUIVANTS"
  return {
    title,
    lines: [
      { content: `Test d'impression - ${now}`, align: "center" },
      { content: "Table 12", align: "center", bold: true },
      { content: "-------------------------------", align: "center" },
      { content: "2x Mojito", align: "left", bold: kind === "bar" },
      { content: "1x Burger Classic", align: "left", bold: kind !== "bar" },
      { content: "Note: sans oignon", align: "left", underline: true },
      { content: "-------------------------------", align: "center" },
      { content: "Merci !", align: "center" },
    ],
    cut: true,
    beep: true,
  }
}
