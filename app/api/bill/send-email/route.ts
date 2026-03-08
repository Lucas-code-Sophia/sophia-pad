import { promises as fs } from "fs"
import path from "path"
import { NextResponse } from "next/server"

type Body = {
  to?: string
  subject?: string
  html?: string
  pdfLines?: string[]
  ticketType?: "addition" | "repas" | string
  tableNumber?: string
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const sanitizeLine = (value: string) => (value || "").replace(/\r?\n/g, " ").trim()

const wrapLine = (line: string, maxChars: number) => {
  const text = sanitizeLine(line)
  if (text.length <= maxChars) return [text]

  const words = text.split(" ")
  const wrapped: string[] = []
  let current = ""

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`
    } else {
      wrapped.push(current)
      current = word
    }
  }

  if (current) wrapped.push(current)
  return wrapped.length ? wrapped : [text.slice(0, maxChars)]
}

const buildTicketSvg = (lines: string[]) => {
  const rawLines = (lines || []).map((line) => sanitizeLine(line)).filter(Boolean)
  const wrapped = rawLines.flatMap((line) => wrapLine(line, 46)).slice(0, 320)

  const width = 420
  const ticketX = 18
  const ticketWidth = 384
  const lineHeight = 18
  const ticketPaddingX = 16
  const textStartY = 36
  const textLinesHeight = Math.max(1, wrapped.length) * lineHeight
  const ticketHeight = textStartY + textLinesHeight + 22
  const height = ticketHeight + 20

  const isSeparator = (line: string) => /^-+$/.test(line)

  const textNodes = wrapped
    .map((line, index) => {
      const y = textStartY + index * lineHeight
      if (isSeparator(line)) {
        return `<line x1="${ticketX + ticketPaddingX}" y1="${y - 6}" x2="${ticketX + ticketWidth - ticketPaddingX}" y2="${y - 6}" stroke="#8d99a8" stroke-dasharray="4 4" stroke-width="1" />`
      }

      const isTitle = index < 2 ||
        line.toUpperCase().includes("RESTAURANT SOPHIA") ||
        line.toUpperCase().includes("TICKET REPAS") ||
        line.toUpperCase().includes("TOTAL")
      const fontWeight = isTitle ? 700 : 400
      const color = isTitle ? "#111827" : "#1f2937"

      return `<text x="${ticketX + ticketPaddingX}" y="${y}" font-family="Courier New, Menlo, Monaco, monospace" font-size="15" font-weight="${fontWeight}" fill="${color}">${escapeHtml(
        line,
      )}</text>`
    })
    .join("\n")

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
  <rect x="${ticketX}" y="10" width="${ticketWidth}" height="${ticketHeight}" rx="4" fill="#ffffff" stroke="#d1d5db" stroke-width="1"/>
  ${textNodes}
</svg>`
}

const buildFriendlyEmailHtml = ({ logoDataUri }: { logoDataUri: string }) => {
  return `
    <div style="margin:0;padding:0;background:#daf6fc;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#daf6fc;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #c8e8f5;">
              <tr>
                <td style="background:linear-gradient(135deg,#daf6fc 0%,#bee9f7 100%);padding:26px 24px;text-align:center;">
                  <img src="${logoDataUri}" alt="SOPHIA" style="width:120px;max-width:120px;height:auto;display:block;margin:0 auto 12px auto;border-radius:12px;" />
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#081E3E;font-size:26px;font-weight:800;letter-spacing:0.2px;">SOPHIA</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f4b69;font-size:14px;margin-top:6px;">Restaurant - Cap-Ferret</div>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:17px;font-weight:700;">Bonjour,</p>
                  <p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:1.65;">
                    Merci pour votre visite chez <strong>SOPHIA</strong>.
                  </p>
                  <div style="margin:18px 0 0 0;padding:14px 16px;border-radius:12px;background:#eef9fe;border:1px solid #d3edf8;font-family:Arial,Helvetica,sans-serif;color:#0f4b69;font-size:14px;">
                    Toute l'équipe vous remercie et espère vous revoir très bientôt.
                  </div>
                  <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;color:#334155;font-size:15px;line-height:1.65;">
                    Si vous avez 30 secondes, vous pouvez laisser un avis ici :
                    <a href="https://g.page/r/CbOjHUpZBsNdEAE/review" target="_blank" rel="noopener noreferrer" style="color:#0284c7;font-weight:700;text-decoration:none;"> donner votre avis</a>.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 24px 22px 24px;border-top:1px solid #e2f2f9;font-family:Arial,Helvetica,sans-serif;color:#64748b;font-size:12px;text-align:center;">
                  Restaurant SOPHIA - 67 Boulevard de la plage, 33970 Cap-Ferret
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `
}

const loadLogoDataUri = async () => {
  const candidates = ["placeholder-logo.png", "icon-192.png", "icon.png"]
  for (const fileName of candidates) {
    try {
      const logoPath = path.join(process.cwd(), "public", fileName)
      const file = await fs.readFile(logoPath)
      const mime = fileName.endsWith(".png") ? "image/png" : "image/jpeg"
      return `data:${mime};base64,${file.toString("base64")}`
    } catch {
      // try next candidate
    }
  }
  return ""
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const to = (body.to || "").trim()
    const subject = (body.subject || "").trim()
    const html = (body.html || "").trim()
    const pdfLines = Array.isArray(body.pdfLines) ? body.pdfLines : []
    const ticketType = body.ticketType || "addition"
    const tableNumber = body.tableNumber || "-"

    if (!to || !isValidEmail(to)) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 })
    }

    if (!subject || !html) {
      return NextResponse.json({ error: "Contenu du ticket manquant" }, { status: 400 })
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configuration email manquante (RESEND_API_KEY)" },
        { status: 500 },
      )
    }

    const from = process.env.BILL_EMAIL_FROM || "SOPHIA <onboarding@resend.dev>"
    const replyTo = process.env.BILL_EMAIL_REPLY_TO || undefined
    const now = new Date()
    const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`
    const cleanTable = String(tableNumber).replace(/[^a-zA-Z0-9_-]/g, "")
    const pngFileName = `ticket-${ticketType}-table-${cleanTable || "NA"}-${dateStamp}.png`
    const finalPdfLines =
      pdfLines.length > 0
        ? pdfLines
        : [
            "RESTAURANT SOPHIA",
            `Table ${tableNumber}`,
            new Date().toLocaleString("fr-FR"),
            "------------------------------",
            "Ticket en piece jointe",
          ]
    const ticketSvg = buildTicketSvg(finalPdfLines)
    const sharpModule = await import("sharp")
    const pngBuffer = await sharpModule.default(Buffer.from(ticketSvg)).png({ compressionLevel: 9 }).toBuffer()
    const pngBase64 = pngBuffer.toString("base64")
    const logoDataUri = await loadLogoDataUri()
    const friendlyHtml = buildFriendlyEmailHtml({ logoDataUri })

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: friendlyHtml,
        attachments: [
          {
            content: pngBase64,
            filename: pngFileName,
            content_type: "image/png",
          },
        ],
        reply_to: replyTo,
      }),
    })

    const resendData = await resendResponse.json().catch(() => ({}))
    if (!resendResponse.ok) {
      const message =
        (resendData && typeof resendData === "object" && "message" in resendData && String(resendData.message)) ||
        "Impossible d'envoyer l'email"
      return NextResponse.json({ error: message }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      id: resendData?.id,
      to,
      ticketType,
      tableNumber,
    })
  } catch (error) {
    console.error("[v0] Error sending bill email:", error)
    return NextResponse.json({ error: "Erreur lors de l'envoi du ticket par email" }, { status: 500 })
  }
}
