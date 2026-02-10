"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { Reservation, Table } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Plus, Phone, Users, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"

type ServiceFilter = "all" | "midi" | "soir"

interface CalendarCounts {
  [date: string]: { midi: number; soir: number; total: number }
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
]

export default function ReservationsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddReservation, setShowAddReservation] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all")

  // Calendar state
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1) // 1-based
  const [calendarCounts, setCalendarCounts] = useState<CalendarCounts>({})
  const [calendarLoading, setCalendarLoading] = useState(false)

  const [newReservation, setNewReservation] = useState({
    table_id: "",
    customer_name: "",
    customer_phone: "",
    reservation_date: new Date().toISOString().split("T")[0],
    reservation_time: "19:00",
    party_size: 2,
    duration_minutes: 120,
    notes: "",
    created_by: "",
  })

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchReservations()
      fetchTables()
      setNewReservation((prev) => ({ ...prev, created_by: user.id }))
    }
  }, [user, selectedDate])

  useEffect(() => {
    if (user) {
      fetchCalendarCounts()
    }
  }, [user, calendarYear, calendarMonth])

  const fetchReservations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reservations?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setReservations(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching reservations:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/tables")
      if (response.ok) {
        const data = await response.json()
        setTables(data.sort((a: Table, b: Table) => a.table_number.localeCompare(b.table_number)))
      }
    } catch (error) {
      console.error("[v0] Error fetching tables:", error)
    }
  }

  const fetchCalendarCounts = async () => {
    try {
      setCalendarLoading(true)
      const response = await fetch(`/api/reservations/calendar?year=${calendarYear}&month=${calendarMonth}`)
      if (response.ok) {
        const data = await response.json()
        setCalendarCounts(data.counts || {})
      }
    } catch (error) {
      console.error("[v0] Error fetching calendar:", error)
    } finally {
      setCalendarLoading(false)
    }
  }

  const handleAddReservation = async () => {
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReservation),
      })

      if (response.ok) {
        setShowAddReservation(false)
        setNewReservation({
          table_id: "",
          customer_name: "",
          customer_phone: "",
          reservation_date: new Date().toISOString().split("T")[0],
          reservation_time: "19:00",
          party_size: 2,
          duration_minutes: 120,
          notes: "",
          created_by: user?.id || "",
        })
        fetchReservations()
        fetchTables()
        fetchCalendarCounts()
      }
    } catch (error) {
      console.error("[v0] Error adding reservation:", error)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        fetchReservations()
        fetchTables()
        fetchCalendarCounts()
      }
    } catch (error) {
      console.error("[v0] Error updating reservation:", error)
    }
  }

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")) return

    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchReservations()
        fetchTables()
        fetchCalendarCounts()
      }
    } catch (error) {
      console.error("[v0] Error deleting reservation:", error)
    }
  }

  // Calendar helpers
  const goToPrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12)
      setCalendarYear((y) => y - 1)
    } else {
      setCalendarMonth((m) => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1)
      setCalendarYear((y) => y + 1)
    } else {
      setCalendarMonth((m) => m + 1)
    }
  }

  const goToToday = () => {
    const now = new Date()
    setCalendarYear(now.getFullYear())
    setCalendarMonth(now.getMonth() + 1)
    setSelectedDate(now.toISOString().split("T")[0])
  }

  const selectDay = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedDate(dateStr)
  }

  // Build calendar grid
  const buildCalendarDays = () => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth - 1, 1)
    const lastDayOfMonth = new Date(calendarYear, calendarMonth, 0)
    const totalDays = lastDayOfMonth.getDate()

    // Monday = 0 in our grid (JS: getDay() returns 0=Sun, 1=Mon...)
    let startDow = firstDayOfMonth.getDay() - 1 // Convert to Mon=0
    if (startDow < 0) startDow = 6 // Sunday → 6

    const cells: (number | null)[] = []
    // Fill blank leading cells
    for (let i = 0; i < startDow; i++) cells.push(null)
    // Fill day cells
    for (let d = 1; d <= totalDays; d++) cells.push(d)
    // Fill trailing blanks to complete the last row
    while (cells.length % 7 !== 0) cells.push(null)

    return cells
  }

  const getCountForDay = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return calendarCounts[dateStr] || { midi: 0, soir: 0, total: 0 }
  }

  const isToday = (day: number) => {
    const now = new Date()
    return day === now.getDate() && calendarMonth === now.getMonth() + 1 && calendarYear === now.getFullYear()
  }

  const isSelected = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return dateStr === selectedDate
  }

  // Filter reservations by service
  const filteredReservations = reservations.filter((r) => {
    if (serviceFilter === "all") return true
    const time = (r.reservation_time || "").slice(0, 5)
    if (serviceFilter === "midi") return time >= "10:00" && time <= "15:59"
    if (serviceFilter === "soir") return time >= "16:00" && time <= "23:59"
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-blue-600"
      case "seated": return "bg-green-600"
      case "cancelled": return "bg-red-600"
      case "completed": return "bg-slate-600"
      default: return "bg-slate-600"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed": return "Confirmée"
      case "seated": return "Installée"
      case "cancelled": return "Annulée"
      case "completed": return "Terminée"
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const calendarDays = buildCalendarDays()

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-4">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Button
            onClick={() => router.push("/floor-plan")}
            variant="outline"
            size="sm"
            className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Retour</span>
          </Button>
          <h1 className="text-xl sm:text-3xl font-bold text-white">Réservations</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Service filter */}
          <div className="flex bg-slate-800 rounded-lg border border-slate-700 p-0.5">
            <button
              onClick={() => setServiceFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                serviceFilter === "all" ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setServiceFilter("midi")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                serviceFilter === "midi" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Sun className="h-3 w-3" /> Midi
            </button>
            <button
              onClick={() => setServiceFilter("soir")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                serviceFilter === "soir" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Moon className="h-3 w-3" /> Soir
            </button>
          </div>

          <Dialog open={showAddReservation} onOpenChange={setShowAddReservation}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Nouvelle</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Créer une réservation</DialogTitle>
                <DialogDescription className="text-slate-400 text-sm">Ajouter une nouvelle réservation</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <Label className="text-sm">Nom du client</Label>
                  <Input
                    value={newReservation.customer_name}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-sm"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <Label className="text-sm">Téléphone</Label>
                  <Input
                    value={newReservation.customer_phone}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_phone: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-sm"
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <Label className="text-sm">Date</Label>
                    <Input
                      type="date"
                      value={newReservation.reservation_date}
                      onChange={(e) => setNewReservation({ ...newReservation, reservation_date: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Heure</Label>
                    <Input
                      type="time"
                      value={newReservation.reservation_time}
                      onChange={(e) => setNewReservation({ ...newReservation, reservation_time: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Durée (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="5"
                    value={newReservation.duration_minutes}
                    onChange={(e) =>
                      setNewReservation({ ...newReservation, duration_minutes: Number.parseInt(e.target.value || "0") })
                    }
                    className="bg-slate-700 border-slate-600 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <Label className="text-sm">Nombre de personnes</Label>
                    <Input
                      type="number"
                      value={newReservation.party_size}
                      onChange={(e) =>
                        setNewReservation({ ...newReservation, party_size: Number.parseInt(e.target.value) })
                      }
                      className="bg-slate-700 border-slate-600 text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Table</Label>
                    <Select
                      value={newReservation.table_id}
                      onValueChange={(value) => setNewReservation({ ...newReservation, table_id: value })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-sm">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id} className="text-sm">
                            {table.table_number} ({table.seats} places)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Notes</Label>
                  <Textarea
                    value={newReservation.notes}
                    onChange={(e) => setNewReservation({ ...newReservation, notes: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-sm"
                    placeholder="Allergies, demandes spéciales..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleAddReservation} className="w-full bg-green-600 hover:bg-green-700 text-sm">
                  Créer la réservation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar */}
      <Card className="bg-slate-800 border-slate-700 mb-4 sm:mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="text-slate-400 hover:text-white hover:bg-slate-700">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <h2 className="text-white font-semibold text-base sm:text-lg">
                {MONTHS_FR[calendarMonth - 1]} {calendarYear}
              </h2>
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs bg-slate-700 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600">
                Aujourd'hui
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={goToNextMonth} className="text-slate-400 hover:text-white hover:bg-slate-700">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_FR.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`blank-${idx}`} className="h-12 sm:h-16" />
              }

              const counts = getCountForDay(day)
              const today = isToday(day)
              const selected = isSelected(day)
              const hasReservations = counts.total > 0

              // Determine what count to show based on service filter
              const displayCount = serviceFilter === "midi" ? counts.midi
                : serviceFilter === "soir" ? counts.soir
                : counts.total

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => selectDay(day)}
                  className={`h-12 sm:h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-sm relative
                    ${selected
                      ? "bg-blue-600 text-white ring-2 ring-blue-400"
                      : today
                        ? "bg-slate-700 text-white ring-1 ring-emerald-500"
                        : "hover:bg-slate-700/60 text-slate-300"
                    }
                  `}
                >
                  <span className={`text-xs sm:text-sm font-medium ${today && !selected ? "text-emerald-400" : ""}`}>
                    {day}
                  </span>
                  {hasReservations && (
                    <div className="flex items-center gap-0.5">
                      {(serviceFilter === "all" || serviceFilter === "midi") && counts.midi > 0 && (
                        <span className={`text-[10px] px-1 rounded-full font-medium ${
                          selected ? "bg-amber-400/30 text-amber-200" : "bg-amber-600/30 text-amber-400"
                        }`}>
                          {counts.midi}
                        </span>
                      )}
                      {(serviceFilter === "all" || serviceFilter === "soir") && counts.soir > 0 && (
                        <span className={`text-[10px] px-1 rounded-full font-medium ${
                          selected ? "bg-indigo-400/30 text-indigo-200" : "bg-indigo-600/30 text-indigo-400"
                        }`}>
                          {counts.soir}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full bg-amber-600/30 border border-amber-500/40" />
              Midi
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full bg-indigo-600/30 border border-indigo-500/40" />
              Soir
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full bg-emerald-600/50 border border-emerald-500/40" />
              Aujourd'hui
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date heading for list */}
      {(() => {
        const midiCouverts = reservations
          .filter((r) => r.status !== "cancelled" && (r.reservation_time || "").slice(0, 5) >= "10:00" && (r.reservation_time || "").slice(0, 5) <= "15:59")
          .reduce((sum, r) => sum + (r.party_size || 0), 0)
        const soirCouverts = reservations
          .filter((r) => r.status !== "cancelled" && (r.reservation_time || "").slice(0, 5) >= "16:00")
          .reduce((sum, r) => sum + (r.party_size || 0), 0)
        const totalCouverts = midiCouverts + soirCouverts

        return (
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="text-white font-semibold text-sm sm:text-base">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {serviceFilter !== "all" && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  serviceFilter === "midi" ? "bg-amber-600/20 text-amber-400" : "bg-indigo-600/20 text-indigo-400"
                }`}>
                  {serviceFilter === "midi" ? "☀ Midi" : "🌙 Soir"}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="text-slate-400">
                {filteredReservations.length} résa{filteredReservations.length !== 1 ? "s" : ""}
              </span>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-2">
                <span className="text-amber-400" title="Couverts midi">
                  ☀ {midiCouverts}
                </span>
                <span className="text-indigo-400" title="Couverts soir">
                  🌙 {soirCouverts}
                </span>
                <span className="text-slate-300 font-medium" title="Total couverts">
                  = {totalCouverts} couv.
                </span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Reservation list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          <Card className="bg-slate-800 border-slate-700 col-span-full">
            <CardContent className="p-6 text-center">
              <p className="text-slate-400 text-sm">Chargement...</p>
            </CardContent>
          </Card>
        ) : filteredReservations.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 col-span-full">
            <CardContent className="p-6 sm:p-8 text-center">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                Aucune réservation {serviceFilter === "midi" ? "le midi" : serviceFilter === "soir" ? "le soir" : ""} pour cette date
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-white text-base sm:text-lg truncate">
                      {reservation.customer_name}
                    </CardTitle>
                    <CardDescription className="text-slate-400 flex items-center gap-1 mt-1 text-xs sm:text-sm">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{reservation.customer_phone || "Non renseigné"}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(reservation.reservation_time || "").slice(0, 5) <= "15:59" ? (
                      <Sun className="h-3 w-3 text-amber-400" />
                    ) : (
                      <Moon className="h-3 w-3 text-indigo-400" />
                    )}
                    <div
                      className={`px-2 py-1 rounded text-xs text-white whitespace-nowrap ${getStatusColor(reservation.status)}`}
                    >
                      {getStatusText(reservation.status)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>{reservation.reservation_time}</span>
                  {reservation.duration_minutes && (
                    <span className="text-slate-500 text-xs">({reservation.duration_minutes} min)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>{reservation.party_size} personnes</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>Table {(reservation as any).tables?.table_number || "N/A"}</span>
                </div>
                {reservation.notes && (
                  <div className="text-xs sm:text-sm text-slate-400 bg-slate-700 p-2 rounded break-words">
                    {reservation.notes}
                  </div>
                )}
                {reservation.status === "confirmed" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(reservation.id, "seated")}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                    >
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Installer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(reservation.id, "cancelled")}
                      className="flex-1 bg-red-900/30 hover:bg-red-900/50 border-red-700 text-red-400 text-xs sm:text-sm"
                    >
                      <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      No-show
                    </Button>
                  </div>
                )}
                {reservation.status === "seated" && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(reservation.id, "completed")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                  >
                    Terminer
                  </Button>
                )}
                {(reservation.status === "cancelled" || reservation.status === "completed") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteReservation(reservation.id)}
                    className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600 text-xs sm:text-sm"
                  >
                    Supprimer
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

