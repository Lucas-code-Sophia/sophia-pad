"use client"

import { useEffect, useState } from "react"
import type { KitchenTicket } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Clock, Printer } from "lucide-react"

export default function BarPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
    // Refresh every 5 seconds
    const interval = setInterval(fetchTickets, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/kitchen/tickets?type=bar")
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const completeTicket = async (ticketId: string) => {
    try {
      await fetch(`/api/kitchen/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      await fetchTickets()
    } catch (error) {
      console.error("[v0] Error completing ticket:", error)
    }
  }

  const printTicket = (ticket: KitchenTicket) => {
    // Simulate printing
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket Bar - Table ${ticket.table_number}</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .item { margin: 10px 0; }
              .notes { font-style: italic; margin-left: 20px; }
              .time { text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; }
            </style>
          </head>
          <body>
            <h1>BAR - TABLE ${ticket.table_number}</h1>
            ${ticket.items
              .map(
                (item) => `
              <div class="item">
                <strong>${item.quantity}x ${item.name}</strong>
                ${item.notes ? `<div class="notes">Note: ${item.notes}</div>` : ""}
              </div>
            `,
              )
              .join("")}
            <div class="time">${new Date(ticket.created_at).toLocaleTimeString("fr-FR")}</div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const pendingTickets = tickets.filter((t) => t.status === "pending")
  const completedTickets = tickets.filter((t) => t.status === "completed")

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">Bar</h1>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Badge className="bg-blue-600 text-white text-sm sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2">
            {pendingTickets.length} en attente
          </Badge>
          <Badge className="bg-green-600 text-white text-sm sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2">
            {completedTickets.length} terminés
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Pending Tickets */}
        {pendingTickets.map((ticket) => (
          <Card key={ticket.id} className="bg-blue-900/30 border-blue-700 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Table {ticket.table_number}</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {new Date(ticket.created_at).toLocaleTimeString("fr-FR")}
                </p>
              </div>
              <Badge className="bg-blue-600 text-white text-xs sm:text-sm">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                En cours
              </Badge>
            </div>

            <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
              {ticket.items.map((item, index) => (
                <div key={index} className="bg-slate-900/50 p-2 sm:p-3 rounded">
                  <div className="flex items-start justify-between">
                    <span className="text-sm sm:text-base text-white font-semibold">
                      {item.quantity}x {item.name}
                    </span>
                  </div>
                  {item.notes && <p className="text-xs sm:text-sm text-yellow-400 mt-1 italic">Note: {item.notes}</p>}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => completeTicket(ticket.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
                size="sm"
              >
                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Terminé
              </Button>
              <Button
                onClick={() => printTicket(ticket)}
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-white"
              >
                <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </Card>
        ))}

        {/* Completed Tickets (last 6) */}
        {completedTickets.slice(0, 6).map((ticket) => (
          <Card key={ticket.id} className="bg-slate-800 border-slate-700 p-4 sm:p-6 opacity-60">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Table {ticket.table_number}</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {new Date(ticket.created_at).toLocaleTimeString("fr-FR")}
                </p>
              </div>
              <Badge className="bg-green-600 text-white text-xs sm:text-sm">
                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Terminé
              </Badge>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              {ticket.items.map((item, index) => (
                <div key={index} className="text-slate-400 text-xs sm:text-sm">
                  {item.quantity}x {item.name}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {pendingTickets.length === 0 && completedTickets.length === 0 && (
        <div className="text-center text-slate-500 mt-12 sm:mt-20">
          <p className="text-lg sm:text-xl">Aucun ticket pour le moment</p>
        </div>
      )}
    </div>
  )
}
