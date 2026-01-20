"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, Calendar, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

type TipsResponse = {
  weeklyTotal: number
  averagePerTable: number
  tablesServed: number
  weeklyChange: number
  totalTips: number
  dailyBreakdown: Array<{ date: string; amount: number; tables: number; servers: Array<{ name: string; amount: number }> }>
  recentEntries: Array<{ created_at: string; amount: number; table_number: string; server_name: string }>
}

const weekOptions = [
  { id: "current", label: "Cette semaine" },
  { id: "last", label: "Semaine dernière" },
  { id: "last2", label: "Semaine -2" },
]

export default function TipsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [week, setWeek] = useState("current")
  const [tips, setTips] = useState<TipsResponse | null>(null)

  useEffect(() => {
    const fetchTips = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/tips?week=${week}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || "Échec du chargement")
        }
        const data = (await res.json()) as TipsResponse
        setTips(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue")
      } finally {
        setLoading(false)
      }
    }

    fetchTips()
  }, [week])

  const weeklyChangeLabel = useMemo(() => {
    if (!tips) return ""
    const change = tips.weeklyChange
    if (change === 0) return "Stable"
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
  }, [tips])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <Card className="bg-slate-800 border-slate-700 max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Pourboires</CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p>Impossible de charger les pourboires.</p>
            <p className="text-sm text-slate-400">{error}</p>
            <Button onClick={() => setWeek("current")} className="bg-blue-600 hover:bg-blue-700">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Button
          onClick={() => router.push("/admin")}
          variant="outline"
          size="sm"
          className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Retour</span>
        </Button>
        <h1 className="text-xl sm:text-3xl font-bold text-white">Pourboires</h1>
        <div className="flex gap-2">
          {weekOptions.map((option) => (
            <Button
              key={option.id}
              size="sm"
              variant={week === option.id ? "default" : "outline"}
              className={
                week === option.id
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
              }
              onClick={() => setWeek(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-emerald-600/20 rounded-lg">
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">Total semaine</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{tips?.weeklyTotal.toFixed(2)} €</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-blue-600/20 rounded-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">Moyenne / table</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{tips?.averagePerTable.toFixed(2)} €</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-purple-600/20 rounded-lg">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">Évolution</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{weeklyChangeLabel}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            Détail par jour
          </h2>
          <div className="space-y-2">
            {tips?.dailyBreakdown.length ? (
              tips.dailyBreakdown.map((day) => (
                <div
                  key={day.date}
                  className="bg-slate-900/60 border border-slate-700 rounded p-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-white text-sm sm:text-base">{day.date}</p>
                      <p className="text-xs text-slate-400">{day.tables} table{day.tables > 1 ? "s" : ""}</p>
                    </div>
                    {day.servers.length > 1 && (
                      <div className="text-emerald-400 font-semibold">{day.amount.toFixed(2)} €</div>
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    {day.servers.map((server) => (
                      <div key={server.name} className="flex justify-between text-xs sm:text-sm text-slate-300">
                        <span>{server.name}</span>
                        <span className="text-emerald-300">{server.amount.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">Aucun pourboire enregistré pour cette période.</p>
            )}
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Total historique</h2>
          <div className="bg-slate-900/70 border border-slate-700 rounded p-4 text-center">
            <p className="text-slate-400 text-sm">Pourboires cumulés</p>
            <p className="text-3xl font-bold text-emerald-400 mt-2">{tips?.totalTips.toFixed(2)} €</p>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Tables servies sur la période: <span className="text-slate-200">{tips?.tablesServed || 0}</span>
          </div>
        </Card>
      </div>

      <div className="mt-4 sm:mt-6">
        <Card className="bg-slate-800 border-slate-700 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Derniers pourboires</h2>
          <div className="space-y-2">
            {tips?.recentEntries.length ? (
              tips.recentEntries.map((entry) => (
                <div
                  key={`${entry.created_at}-${entry.table_number}-${entry.server_name}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-900/60 border border-slate-700 rounded p-3"
                >
                  <div>
                    <p className="text-white text-sm sm:text-base">
                      {entry.server_name} • Table {entry.table_number || "?"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-emerald-400 font-semibold">{entry.amount.toFixed(2)} €</div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">Aucun pourboire enregistré pour cette période.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
