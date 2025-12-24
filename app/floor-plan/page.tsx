"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { Table } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LogOut, User, Settings, Plus, List, Calendar, Search, History } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FloorPlanPage() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTable, setShowAddTable] = useState(false)
  const [showTableList, setShowTableList] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newTable, setNewTable] = useState({
    table_number: "",
    seats: 2,
    location: "I" as "T" | "I" | "C",
  })

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchTables()
      // Refresh tables every 10 seconds
      const interval = setInterval(fetchTables, 10000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching tables:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableClick = (table: Table) => {
    if (table.status === "available") {
      router.push(`/order/${table.id}`)
    } else if (table.status === "occupied") {
      router.push(`/order/${table.id}`)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleAddTable = async () => {
    try {
      const response = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_number: `${newTable.location}${newTable.table_number}`,
          seats: newTable.seats,
          location: newTable.location,
          position_x: 100,
          position_y: 100,
          status: "available",
        }),
      })

      if (response.ok) {
        setShowAddTable(false)
        setNewTable({ table_number: "", seats: 2, location: "I" })
        fetchTables()
      }
    } catch (error) {
      console.error("[v0] Error adding table:", error)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const sortTablesByNumber = (tables: Table[]) => {
    return tables.sort((a, b) => {
      const numA = Number.parseInt(a.table_number.substring(1))
      const numB = Number.parseInt(b.table_number.substring(1))
      return numA - numB
    })
  }

  const filterTables = (tables: Table[]) => {
    if (!searchQuery) return tables
    return tables.filter((table) => table.table_number.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-600 hover:bg-green-700 border-green-500"
      case "occupied":
        return "bg-red-600 hover:bg-red-700 border-red-500"
      case "reserved":
        return "bg-yellow-600 hover:bg-yellow-700 border-yellow-500"
      default:
        return "bg-slate-600 hover:bg-slate-700 border-slate-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Libre"
      case "occupied":
        return "Occupée"
      case "reserved":
        return "Réservée"
      default:
        return status
    }
  }

  const terraceTablesTop = sortTablesByNumber(
    tables.filter((t) => t.location === "T" && Number.parseInt(t.table_number.substring(1)) <= 24),
  )
  const terraceTablesMiddle = sortTablesByNumber(
    tables.filter((t) => t.location === "T" && Number.parseInt(t.table_number.substring(1)) > 24),
  )
  const canapeeTables = sortTablesByNumber(tables.filter((t) => t.location === "C"))
  const interiorTables = sortTablesByNumber(tables.filter((t) => t.location === "I"))

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white">
            <User className="h-5 w-5 sm:h-6 sm:w-6" />
            <div>
              <p className="font-semibold text-sm sm:text-base">{user?.name}</p>
              <p className="text-xs sm:text-sm text-slate-400">{user?.role === "manager" ? "Manager" : "Serveur"}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-0">
          {user?.role === "manager" && (
            <Button
              onClick={() => router.push("/admin")}
              variant="outline"
              size="sm"
              className="bg-blue-600 text-white border-blue-500 hover:bg-blue-700 whitespace-nowrap text-xs sm:text-sm"
            >
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          )}
          <Button
            onClick={() => router.push("/reservations")}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap text-xs sm:text-sm"
          >
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Réservations</span>
          </Button>
          <Button
            onClick={() => router.push("/history")}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap text-xs sm:text-sm"
          >
            <History className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Historique</span>
          </Button>
          <Dialog
            open={showTableList}
            onOpenChange={(open) => {
              setShowTableList(open)
              if (!open) setSearchQuery("")
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap text-xs sm:text-sm">
                <List className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Liste</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Liste des tables et commandes</DialogTitle>
                <DialogDescription className="text-slate-400">Vue d'ensemble de toutes les tables</DialogDescription>
              </DialogHeader>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une table (ex: T1, I5, C2)..."
                    className="bg-slate-700 border-slate-600 pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filterTables(sortTablesByNumber([...tables])).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Aucune table trouvée pour "{searchQuery}"</div>
                ) : (
                  filterTables(sortTablesByNumber([...tables])).map((table) => (
                    <Card
                      key={table.id}
                      className={`p-4 cursor-pointer ${getStatusColor(table.status)} border-2`}
                      onClick={() => {
                        setShowTableList(false)
                        setSearchQuery("")
                        handleTableClick(table)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-lg sm:text-xl">{table.table_number}</div>
                          <div className="text-sm sm:text-base opacity-90">{table.seats} places</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm sm:text-base font-semibold">
                            {table.status === "available"
                              ? "Libre"
                              : table.status === "occupied"
                                ? "Occupée"
                                : "Réservée"}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 whitespace-nowrap text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajouter</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle table</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Créer une nouvelle table dans le plan de salle
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Localisation</Label>
                  <Select
                    value={newTable.location}
                    onValueChange={(value: "T" | "I" | "C") => setNewTable({ ...newTable, location: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="T">Terrasse (T)</SelectItem>
                      <SelectItem value="I">Intérieur (I)</SelectItem>
                      <SelectItem value="C">Canapé (C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Numéro de table</Label>
                  <Input
                    type="number"
                    value={newTable.table_number}
                    onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                    placeholder="Ex: 1, 2, 3..."
                  />
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Sera affiché comme: {newTable.location}
                    {newTable.table_number}
                  </p>
                </div>
                <div>
                  <Label>Nombre de places</Label>
                  <Input
                    type="number"
                    value={newTable.seats}
                    onChange={(e) => setNewTable({ ...newTable, seats: Number.parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600"
                    min="1"
                    max="20"
                  />
                </div>
                <Button onClick={handleAddTable} className="w-full bg-green-600 hover:bg-green-700">
                  Créer la table
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 whitespace-nowrap text-xs sm:text-sm"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Plan de salle</h1>
        <p className="text-xs sm:text-base text-slate-400">Sélectionnez une table pour prendre une commande</p>
      </div>

      {/* Legend */}
      <div className="mb-4 sm:mb-6 flex gap-3 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-green-600"></div>
          <span className="text-xs sm:text-sm text-slate-300">Libre</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-red-600"></div>
          <span className="text-xs sm:text-sm text-slate-300">Occupée</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-3 w-3 sm:h-4 sm:w-4 rounded bg-yellow-600"></div>
          <span className="text-xs sm:text-sm text-slate-300">Réservée</span>
        </div>
      </div>

      {/* Floor Plan */}
      <div className="space-y-4 sm:space-y-6">
        {/* Terrace Section - Top rows */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Terrasse</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
            {terraceTablesTop.slice(0, 24).map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`aspect-square rounded-lg border-2 transition-all ${getStatusColor(table.status)} text-white font-semibold shadow-lg flex items-center justify-center text-sm sm:text-xl`}
              >
                {table.table_number}
              </button>
            ))}
          </div>
        </div>

        {/* Middle section with Terrace and Canapé */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Canapé Section */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Canapé</h2>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {canapeeTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`h-20 sm:h-24 rounded-lg border-2 transition-all ${getStatusColor(table.status)} text-white font-semibold shadow-lg flex items-center justify-center text-base sm:text-xl`}
                >
                  {table.table_number}
                </button>
              ))}
            </div>
          </div>

          {/* Terrace Middle */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 sm:invisible">Terrasse (suite)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {terraceTablesMiddle.map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`aspect-square rounded-lg border-2 transition-all ${getStatusColor(table.status)} text-white font-semibold shadow-lg flex items-center justify-center text-sm sm:text-xl`}
                >
                  {table.table_number}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interior Section */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Intérieur</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
            {interiorTables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`aspect-square rounded-lg border-2 transition-all ${getStatusColor(table.status)} text-white font-semibold shadow-lg flex items-center justify-center text-sm sm:text-xl`}
              >
                {table.table_number}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-slate-800 border-slate-700 p-3 sm:p-4">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-500">
              {tables.filter((t) => t.status === "available").length}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">Tables libres</div>
          </div>
        </Card>
        <Card className="bg-slate-800 border-slate-700 p-3 sm:p-4">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-500">
              {tables.filter((t) => t.status === "occupied").length}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">Tables occupées</div>
          </div>
        </Card>
        <Card className="bg-slate-800 border-slate-700 p-3 sm:p-4">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-500">
              {tables.reduce((sum, t) => sum + (t.status === "occupied" ? t.seats : 0), 0)}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 mt-1">Couverts servis</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
