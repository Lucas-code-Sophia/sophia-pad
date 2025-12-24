"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { Reservation, Table } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Plus, Phone, Users, Clock, CheckCircle, XCircle } from "lucide-react"
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

export default function ReservationsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddReservation, setShowAddReservation] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [newReservation, setNewReservation] = useState({
    table_id: "",
    customer_name: "",
    customer_phone: "",
    reservation_date: new Date().toISOString().split("T")[0],
    reservation_time: "19:00",
    party_size: 2,
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

  const fetchReservations = async () => {
    try {
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
          notes: "",
          created_by: user?.id || "",
        })
        fetchReservations()
        fetchTables()
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
      }
    } catch (error) {
      console.error("[v0] Error deleting reservation:", error)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-600"
      case "seated":
        return "bg-green-600"
      case "cancelled":
        return "bg-red-600"
      case "completed":
        return "bg-slate-600"
      default:
        return "bg-slate-600"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmée"
      case "seated":
        return "Installée"
      case "cancelled":
        return "Annulée"
      case "completed":
        return "Terminée"
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-4">
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
        <Dialog open={showAddReservation} onOpenChange={setShowAddReservation}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Nouvelle réservation</span>
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
                      {tables
                        .filter((t) => t.status === "available")
                        .map((table) => (
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

      <div className="mb-4 sm:mb-6">
        <Label className="text-white mb-2 block text-sm">Filtrer par date</Label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white max-w-full sm:max-w-xs text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {reservations.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 col-span-full">
            <CardContent className="p-6 sm:p-8 text-center">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Aucune réservation pour cette date</p>
            </CardContent>
          </Card>
        ) : (
          reservations.map((reservation) => (
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
                  <div
                    className={`px-2 py-1 rounded text-xs text-white whitespace-nowrap ${getStatusColor(reservation.status)}`}
                  >
                    {getStatusText(reservation.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>{reservation.reservation_time}</span>
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
                      Annuler
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
