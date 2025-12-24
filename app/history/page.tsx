"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { DailySalesRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, TrendingUp, Users, DollarSign, CreditCard, Banknote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ServerStats {
  server_id: string
  server_name: string
  total_revenue: number
  order_count: number
  tables: Array<{
    table_number: string
    amount: number
    payment_method: string
    created_at: string
  }>
}

interface DailySalesData {
  date: string
  sales: DailySalesRecord[]
  statistics: {
    totalRevenue: number
    orderCount: number
    averageTicket: number
    totalTax: number
  }
  serverStats: ServerStats[]
}

export default function HistoryPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  const [selectedDate, setSelectedDate] = useState(today)
  // </CHANGE>

  const [salesData, setSalesData] = useState<DailySalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedServer, setExpandedServer] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchSalesData()
    }
  }, [user, selectedDate])

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/daily-sales?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setSalesData(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching sales data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />
      case "card":
        return <CreditCard className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "cash":
        return "Espèces"
      case "card":
        return "Carte"
      default:
        return "Autre"
    }
  }

  const isAdmin = user?.role === "manager"
  // </CHANGE>

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-4">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Button
          onClick={() => router.push("/floor-plan")}
          variant="outline"
          size="sm"
          className="bg-slate-800 text-white border-slate-700"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Retour</span>
        </Button>
        <h1 className="text-xl sm:text-3xl font-bold text-white">Historique des encaissements</h1>
        <div className="w-0 sm:w-32" />
      </div>

      {/* Date Selector */}
      <div className="mb-4 sm:mb-6">
        <Card className="bg-slate-800 border-slate-700 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            <div className="flex-1 w-full">
              <Label htmlFor="date" className="text-white mb-2 block text-sm">
                Sélectionner une date
              </Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-sm"
                min={isAdmin ? undefined : yesterday}
                max={today}
              />
              {/* </CHANGE> */}
            </div>
          </div>
        </Card>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-green-600/20 rounded-lg">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-400">Ventes du jour</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {salesData?.statistics.totalRevenue.toFixed(2) || "0.00"} €
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-purple-600/20 rounded-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-400">TVA collectée</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {salesData?.statistics.totalTax.toFixed(2) || "0.00"} €
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-blue-600/20 rounded-lg">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-400">Nombre de tables</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{salesData?.statistics.orderCount || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-orange-600/20 rounded-lg">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-400">Ticket moyen</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {salesData?.statistics.averageTicket.toFixed(2) || "0.00"} €
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* </CHANGE> */}

      {isAdmin && (
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Statistiques par serveur</h2>
          <div className="space-y-2 sm:space-y-3">
            {salesData?.serverStats && salesData.serverStats.length > 0 ? (
              salesData.serverStats.map((server) => (
                <Card key={server.server_id} className="bg-slate-800 border-slate-700">
                  <button
                    onClick={() => setExpandedServer(expandedServer === server.server_id ? null : server.server_id)}
                    className="w-full p-3 sm:p-4 text-left hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="p-1.5 sm:p-2 bg-blue-600/20 rounded-lg flex-shrink-0">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm sm:text-lg truncate">{server.server_name}</p>
                          <p className="text-xs sm:text-sm text-slate-400">{server.order_count} tables encaissées</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg sm:text-2xl font-bold text-green-400">
                          {server.total_revenue.toFixed(2)} €
                        </p>
                        <p className="text-xs sm:text-sm text-slate-400">
                          Moy: {(server.total_revenue / server.order_count).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </button>

                  {expandedServer === server.server_id && (
                    <div className="border-t border-slate-700 p-3 sm:p-4 bg-slate-900/50">
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2 sm:mb-3">
                        Détail des tables
                      </h3>
                      <div className="space-y-2">
                        {server.tables.map((table, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 sm:p-3 bg-slate-800 rounded-lg gap-3"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <Badge className="bg-blue-600 text-white font-semibold text-xs whitespace-nowrap">
                                {table.table_number}
                              </Badge>
                              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300 min-w-0">
                                {getPaymentIcon(table.payment_method)}
                                <span className="text-xs sm:text-sm truncate">
                                  {getPaymentLabel(table.payment_method)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold text-white text-sm sm:text-base">
                                {Number(table.amount).toFixed(2)} €
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(table.created_at).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <Card className="bg-slate-800 border-slate-700 p-6 sm:p-8 text-center">
                <p className="text-slate-400 text-sm">Aucun encaissement pour cette date</p>
              </Card>
            )}
          </div>
        </div>
      )}
      {/* </CHANGE> */}

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Toutes les tables encaissées</h2>
        <Card className="bg-slate-800 border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-xs sm:text-sm">Heure</th>
                  <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-xs sm:text-sm">Table</th>
                  <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-xs sm:text-sm">Serveur</th>
                  <th className="text-left p-3 sm:p-4 text-slate-400 font-semibold text-xs sm:text-sm">Paiement</th>
                  <th className="text-right p-3 sm:p-4 text-slate-400 font-semibold text-xs sm:text-sm">Montant</th>
                </tr>
              </thead>
              <tbody>
                {salesData?.sales && salesData.sales.length > 0 ? (
                  salesData.sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-slate-700 hover:bg-slate-750">
                      <td className="p-3 sm:p-4 text-slate-300 text-xs sm:text-sm">
                        {new Date(sale.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 sm:p-4">
                        <Badge className="bg-blue-600 text-white text-xs">{sale.table_number}</Badge>
                      </td>
                      <td className="p-3 sm:p-4 text-white text-xs sm:text-sm">{sale.server_name}</td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300">
                          {getPaymentIcon(sale.payment_method)}
                          <span className="text-xs sm:text-sm">{getPaymentLabel(sale.payment_method)}</span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right font-semibold text-green-400 text-xs sm:text-sm">
                        {Number(sale.total_amount).toFixed(2)} €
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 sm:p-8 text-center text-slate-400 text-sm">
                      Aucune donnée disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
