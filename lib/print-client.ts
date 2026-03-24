"use client"

import { buildEposXml, sampleTicket, sendToEpos, type EposTicket } from "@/lib/epos"

export type PrintKind = "bar" | "kitchen" | "suites" | "caisse"
export type PrintMode = "server" | "direct_epos" | "airprint"

type PrintSettings = {
  kitchen_ip: string
  bar_ip: string
  caisse_ip: string
  print_mode: PrintMode
}

export type PrintResult = {
  ok: boolean
  mode: PrintMode
  message?: string
}

const normalizePrintMode = (value: unknown): PrintMode => {
  if (value === "direct_epos") return "direct_epos"
  if (value === "airprint") return "airprint"
  return "server"
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const buildAirPrintHtml = (ticket: EposTicket) => {
  const linesHtml = ticket.lines
    .map((line) => {
      const alignClass = line.align === "center" ? "center" : line.align === "right" ? "right" : "left"
      const weightClass = line.bold ? "bold" : ""
      return `<div class="line ${alignClass} ${weightClass}">${escapeHtml(line.content)}</div>`
    })
    .join("")

  const title = ticket.title ? `<h1>${escapeHtml(ticket.title)}</h1>` : ""

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Impression Ticket</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        color: #111827;
      }
      .ticket {
        width: 72mm;
        margin: 0 auto;
        font-size: 13px;
        line-height: 1.4;
        white-space: pre-wrap;
      }
      .actions {
        width: 72mm;
        margin: 0 auto 8px auto;
        text-align: center;
      }
      .actions p {
        margin: 6px 0 0 0;
        font-size: 12px;
        color: #475569;
      }
      .actions button {
        border: 0;
        background: #1d4ed8;
        color: white;
        font-size: 14px;
        font-weight: 600;
        border-radius: 8px;
        padding: 10px 14px;
      }
      h1 {
        margin: 0 0 8px 0;
        font-size: 16px;
        text-align: center;
      }
      .line { margin: 0; }
      .line.left { text-align: left; }
      .line.center { text-align: center; }
      .line.right { text-align: right; }
      .line.bold { font-weight: 700; }
    </style>
  </head>
  <body>
    <section class="actions">
      <button type="button" onclick="window.print()">Imprimer</button>
      <p>Si rien ne s'ouvre automatiquement, touche "Imprimer".</p>
    </section>
    <main class="ticket">
      ${title}
      ${linesHtml}
    </main>
    <script>
      (function () {
        function tryPrint() {
          try {
            window.focus();
            window.print();
          } catch (e) {}
        }
        setTimeout(tryPrint, 200);
      })();
      window.onafterprint = function () {
        try { window.close(); } catch (e) {}
      };
    </script>
  </body>
</html>`
}

const fetchPrintSettings = async (): Promise<PrintSettings> => {
  const response = await fetch("/api/admin/print-settings", {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Impossible de charger les paramètres d'impression")
  }

  const json = await response.json()
  return {
    kitchen_ip: String(json?.kitchen_ip || ""),
    bar_ip: String(json?.bar_ip || ""),
    caisse_ip: String(json?.caisse_ip || ""),
    print_mode: normalizePrintMode(json?.print_mode),
  }
}

const runServerPrint = async (kind: PrintKind, ticket: EposTicket): Promise<PrintResult> => {
  const response = await fetch("/api/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, ticket }),
  })
  const json = await response.json().catch(() => ({}))

  if (!response.ok || json?.ok === false) {
    return {
      ok: false,
      mode: "server",
      message: String(json?.error || "Échec impression serveur"),
    }
  }

  return { ok: true, mode: "server" }
}

const runDirectEposPrint = async (ip: string, ticket: EposTicket): Promise<PrintResult> => {
  if (!ip) {
    return { ok: false, mode: "direct_epos", message: "IP imprimante manquante" }
  }

  try {
    const xml = buildEposXml(ticket)
    const response = await sendToEpos(ip, xml)
    if (!response.ok) {
      return {
        ok: false,
        mode: "direct_epos",
        message: `Imprimante non joignable (${response.status})`,
      }
    }

    return { ok: true, mode: "direct_epos" }
  } catch (error) {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:"
    const baseMessage = error instanceof Error ? error.message : "Échec impression directe"
    const message = isHttps
      ? "Le navigateur bloque l'accès HTTP local depuis HTTPS (mode direct Epson)."
      : baseMessage

    return { ok: false, mode: "direct_epos", message }
  }
}

const runAirPrint = async (ticket: EposTicket, preOpenedPopup?: Window | null): Promise<PrintResult> => {
  if (typeof window === "undefined") {
    return { ok: false, mode: "airprint", message: "AirPrint indisponible sur ce terminal" }
  }

  const popup = preOpenedPopup ?? window.open("about:blank", "_blank")
  if (!popup) {
    return { ok: false, mode: "airprint", message: "Autorise les popups pour lancer AirPrint" }
  }

  try {
    popup.document.open()
    popup.document.write(buildAirPrintHtml(ticket))
    popup.document.close()
    popup.focus()
  } catch {
    return {
      ok: false,
      mode: "airprint",
      message: "Impossible d'ouvrir la fenetre AirPrint. Utilise Safari et autorise les popups.",
    }
  }

  return { ok: true, mode: "airprint" }
}

type PrintTicketParams = {
  kind: PrintKind
  ticket?: EposTicket
  modeOverride?: PrintMode
  ipOverride?: string
}

export async function printTicketWithConfiguredMode(params: PrintTicketParams): Promise<PrintResult> {
  const { kind, modeOverride, ipOverride } = params
  const ticket = params.ticket || sampleTicket(kind)
  let preOpenedAirPrintPopup: Window | null = null

  // On iOS, popup must be opened synchronously in user gesture context.
  if (modeOverride === "airprint" && typeof window !== "undefined") {
    preOpenedAirPrintPopup = window.open("about:blank", "_blank")
    if (!preOpenedAirPrintPopup) {
      return { ok: false, mode: "airprint", message: "Autorise les popups pour lancer AirPrint" }
    }
  }

  let settings: PrintSettings = { kitchen_ip: "", bar_ip: "", caisse_ip: "", print_mode: "server" }
  try {
    settings = await fetchPrintSettings()
  } catch {
    // Fallback server mode if settings endpoint is unavailable
  }

  const mode = modeOverride || settings.print_mode
  const ipFromSettings =
    kind === "bar" ? settings.bar_ip : kind === "caisse" || kind === "suites" ? settings.caisse_ip : settings.kitchen_ip
  const resolvedIp = ipOverride || ipFromSettings

  if (mode === "airprint") {
    return runAirPrint(ticket, preOpenedAirPrintPopup)
  }

  if (preOpenedAirPrintPopup && !preOpenedAirPrintPopup.closed) {
    preOpenedAirPrintPopup.close()
  }

  if (mode === "direct_epos") {
    return runDirectEposPrint(resolvedIp, ticket)
  }

  return runServerPrint(kind, ticket)
}
