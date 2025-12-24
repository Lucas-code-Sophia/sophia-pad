"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Gift, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ComplimentaryItem {
  id: string
  type: "item" | "supplement"
  name: string
  quantity?: number
  amount: number
  reason?: string
  table_number: string
  server_name: string
  created_at: string
}

export default function ComplimentaryPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<ComplimentaryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && user.role === "manager") {
      fetchComplimentaryItems()
    }
  }, [user, startDate, endDate])

  const fetchComplimentaryItems = async () => {
    try {
      const response = await fetch(`/api/complimentary?startDate=${startDate}&endDate=${endDate}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching complimentary items:", error)
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

  const totalValue = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4">
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <Button
          onClick={() => router.push("/admin")}
          variant="outline"
          size="sm"
          className="bg-slate-800 text-white border-slate-700"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Retour</span>
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Gift className="h-5 w-5 sm:h-6 sm:w-6" />
            Articles Offerts
          </h1>
        </div>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card className="bg-slate-800 border-slate-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-green-900/30 rounded-lg">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">Total articles</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{items.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-red-900/30 rounded-lg">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-400">Valeur totale</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{totalValue.toFixed(2)} €</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700 p-3 sm:p-6 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="startDate" className="text-white mb-2 block text-sm">
              Date de début
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div>
            <Label htmlFor="endDate" className="text-white mb-2 block text-sm">
              Date de fin
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700 p-3 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Historique des articles offerts</h2>

        {items.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Gift className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto mb-3 sm:mb-4" />
            <p className="text-slate-400 text-sm sm:text-base">Aucun article offert pour cette période</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-slate-900 p-3 sm:p-4 rounded-lg border border-green-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600 text-xs">
                      <Gift className="h-3 w-3 mr-1" />
                      Offert
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {item.type === "item" ? "Article" : "Supplément"}
                    </Badge>
                  </div>
                  <span className="text-xs sm:text-sm text-slate-400">
                    {new Date(item.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base">
                      {item.quantity && `${item.quantity}x `}
                      {item.name}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Table {item.table_number} • {item.server_name}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-base sm:text-lg font-bold text-red-400 line-through">
                      {item.amount.toFixed(2)} €
                    </p>
                    {item.reason && <p className="text-xs sm:text-sm text-green-400 italic mt-1">{item.reason}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
