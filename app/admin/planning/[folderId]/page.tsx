"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Calendar, Users, Clock, Settings, Plus, Trash2, Edit2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { PlanningFolder } from "@/lib/types"

interface PlanningEmployee {
  id: string
  folder_id: string
  first_name: string
  role: string
  created_at: string
  updated_at: string
}

interface PlanningOpeningHours {
  id: string
  folder_id: string
  weekday: number
  service_type: "separated" | "continuous"
  lunch_start: string | null
  lunch_end: string | null
  dinner_start: string | null
  dinner_end: string | null
  continuous_start: string | null
  continuous_end: string | null
  created_at: string
  updated_at: string
}

const WEEKDAYS = [
  { id: 0, name: "Lundi", short: "Lun" },
  { id: 1, name: "Mardi", short: "Mar" },
  { id: 2, name: "Mercredi", short: "Mer" },
  { id: 3, name: "Jeudi", short: "Jeu" },
  { id: 4, name: "Vendredi", short: "Ven" },
  { id: 5, name: "Samedi", short: "Sam" },
  { id: 6, name: "Dimanche", short: "Dim" },
]

const ROLES = ["bar", "salle", "cuisine", "manager"]

export default function PlanningFolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [folder, setFolder] = useState<PlanningFolder | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<PlanningEmployee[]>([])
  const [openingHours, setOpeningHours] = useState<PlanningOpeningHours[]>([])
  const [openingHoursDraft, setOpeningHoursDraft] = useState<Record<number, Partial<PlanningOpeningHours>>>({})
  const [openingHoursDirty, setOpeningHoursDirty] = useState(false)
  const [savingOpeningHours, setSavingOpeningHours] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ first_name: "", role: "salle" })
  const [editingEmployee, setEditingEmployee] = useState<PlanningEmployee | null>(null)
  const [showAddEmployee, setShowAddEmployee] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const getFolderId = async () => {
      const { folderId: id } = await params
      setFolderId(id)
    }
    getFolderId()
  }, [params])

  useEffect(() => {
    if (user?.role === "manager" && folderId) {
      fetchFolder()
      fetchEmployees()
      fetchOpeningHours()
    }
  }, [user, folderId])

  const fetchFolder = async () => {
    try {
      const response = await fetch(`/api/admin/planning/folders/${folderId}`)
      if (response.ok) {
        const data = await response.json()
        setFolder(data)
      } else if (response.status === 404) {
        router.push("/admin/planning")
      }
    } catch (error) {
      console.error("[v0] Error fetching folder:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/admin/planning/folders/${folderId}/employees`)
      if (response.ok) {
        const data = await response.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching employees:", error)
    }
  }

  const fetchOpeningHours = async () => {
    try {
      const response = await fetch(`/api/admin/planning/folders/${folderId}/opening-hours`)
      if (response.ok) {
        const data = await response.json()
        setOpeningHours(data)
        setOpeningHoursDraft({})
        setOpeningHoursDirty(false)
      }
    } catch (error) {
      console.error("[v0] Error fetching opening hours:", error)
    }
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.first_name.trim()) {
      alert("Veuillez entrer un prénom")
      return
    }

    try {
      const response = await fetch(`/api/admin/planning/folders/${folderId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      })

      if (response.ok) {
        setNewEmployee({ first_name: "", role: "salle" })
        setShowAddEmployee(false)
        fetchEmployees()
      } else {
        alert("Erreur lors de l'ajout du salarié")
      }
    } catch (error) {
      console.error("[v0] Error adding employee:", error)
      alert("Erreur lors de l'ajout du salarié")
    }
  }

  const handleUpdateEmployee = async (employee: PlanningEmployee) => {
    try {
      const response = await fetch(`/api/admin/planning/folders/${folderId}/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: employee.first_name, role: employee.role }),
      })

      if (response.ok) {
        setEditingEmployee(null)
        fetchEmployees()
      } else {
        alert("Erreur lors de la mise à jour du salarié")
      }
    } catch (error) {
      console.error("[v0] Error updating employee:", error)
      alert("Erreur lors de la mise à jour du salarié")
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce salarié ?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/planning/folders/${folderId}/employees/${employeeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchEmployees()
      } else {
        alert("Erreur lors de la suppression du salarié")
      }
    } catch (error) {
      console.error("[v0] Error deleting employee:", error)
      alert("Erreur lors de la suppression du salarié")
    }
  }

  const getHoursForWeekday = (weekday: number) => {
    const base = openingHours.find((h) => h.weekday === weekday)
    const draft = openingHoursDraft[weekday]
    if (!base) {
      return {
        id: "",
        folder_id: folderId || "",
        weekday,
        service_type: "separated" as const,
        lunch_start: null,
        lunch_end: null,
        dinner_start: null,
        dinner_end: null,
        continuous_start: null,
        continuous_end: null,
        created_at: "",
        updated_at: "",
        ...(draft || {}),
      } as PlanningOpeningHours
    }

    return { ...base, ...(draft || {}) }
  }

  const updateOpeningHoursDraft = (weekday: number, field: string, value: string | boolean) => {
    const current = getHoursForWeekday(weekday)
    const next: Partial<PlanningOpeningHours> = { ...current }

    if (field === "lunch_enabled") {
      if (value) {
        next.lunch_start = current.lunch_start || "12:00"
        next.lunch_end = current.lunch_end || "14:00"
      } else {
        next.lunch_start = null
        next.lunch_end = null
      }
    } else if (field === "dinner_enabled") {
      if (value) {
        next.dinner_start = current.dinner_start || "19:00"
        next.dinner_end = current.dinner_end || "22:00"
      } else {
        next.dinner_start = null
        next.dinner_end = null
      }
    } else if (field === "continuous_enabled") {
      if (value) {
        next.continuous_start = current.continuous_start || "11:00"
        next.continuous_end = current.continuous_end || "23:00"
      } else {
        next.continuous_start = null
        next.continuous_end = null
      }
    } else if (field === "service_type") {
      next.service_type = value as "separated" | "continuous"
      // Quand on change de mode, on garde seulement les champs du mode.
      if (next.service_type === "continuous") {
        next.lunch_start = null
        next.lunch_end = null
        next.dinner_start = null
        next.dinner_end = null
      } else {
        next.continuous_start = null
        next.continuous_end = null
      }
    } else if (field === "lunch_start") {
      next.lunch_start = value as string
    } else if (field === "lunch_end") {
      next.lunch_end = value as string
    } else if (field === "dinner_start") {
      next.dinner_start = value as string
    } else if (field === "dinner_end") {
      next.dinner_end = value as string
    } else if (field === "continuous_start") {
      next.continuous_start = value as string
    } else if (field === "continuous_end") {
      next.continuous_end = value as string
    }

    setOpeningHoursDraft((prev) => ({
      ...prev,
      [weekday]: {
        ...prev[weekday],
        ...next,
      },
    }))
    setOpeningHoursDirty(true)
  }

  const saveOpeningHours = async () => {
    if (!folderId) return
    if (!openingHoursDirty) return

    try {
      setSavingOpeningHours(true)

      const weekdaysToSave = Object.keys(openingHoursDraft).map((k) => Number(k))
      for (const weekday of weekdaysToSave) {
        const hours = getHoursForWeekday(weekday)

        const payload = {
          service_type: hours.service_type,
          lunch_start: hours.lunch_start || null,
          lunch_end: hours.lunch_end || null,
          dinner_start: hours.dinner_start || null,
          dinner_end: hours.dinner_end || null,
          continuous_start: hours.continuous_start || null,
          continuous_end: hours.continuous_end || null,
        }

        const response = await fetch(`/api/admin/planning/folders/${folderId}/opening-hours/${weekday}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error("save_failed")
        }
      }

      await fetchOpeningHours()
    } catch (error) {
      console.error("[v0] Error saving opening hours:", error)
      alert("Erreur lors de la sauvegarde des horaires")
    } finally {
      setSavingOpeningHours(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  if (!user || user.role !== "manager") {
    return null
  }

  if (!folder) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-white text-xl mb-4">Dossier non trouvé</h2>
            <Button onClick={() => router.push("/admin/planning")} className="bg-blue-600 hover:bg-blue-700">
              Retour à la liste des dossiers
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const daysCount = Math.ceil((new Date(folder.date_end).getTime() - new Date(folder.date_start).getTime()) / (1000 * 60 * 60 * 24)) + 1

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/planning")}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{folder.name}</h1>
              <p className="text-slate-400">Gestion du dossier de planning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push(`/admin/planning/${folderId}/plannings`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Plannings
            </Button>
          <Badge
            variant={folder.status === "validated" ? "default" : "secondary"}
            className={folder.status === "validated" ? "bg-green-600" : "bg-slate-600"}
          >
            {folder.status === "validated" ? "Validé" : "Brouillon"}
          </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Période</CardTitle>
              <Calendar className="h-4 w-4 text-blue-400 ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{daysCount} jours</div>
              <p className="text-xs text-slate-400 mt-1">
                Du {formatDate(folder.date_start)} au {formatDate(folder.date_end)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Salariés</CardTitle>
              <Users className="h-4 w-4 text-green-400 ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{employees.length}</div>
              <p className="text-xs text-slate-400 mt-1">Personnes dans le dossier</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Statut</CardTitle>
              <Clock className="h-4 w-4 text-purple-400 ml-auto" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {folder.status === "validated" ? "Validé" : "Brouillon"}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Créé le {new Date(folder.created_at).toLocaleDateString("fr-FR")}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
            <TabsTrigger value="employees" className="data-[state=active]:bg-slate-700 text-white">
              <Users className="h-4 w-4 mr-2" />
              Salariés
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700 text-white">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Salariés du dossier</CardTitle>
                    <CardDescription className="text-slate-400">
                      Gérez les salariés rattachés à ce dossier de planning
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowAddEmployee(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un salarié
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddEmployee && (
                  <div className="mb-6 p-4 bg-slate-700 rounded-lg space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new-employee-name" className="text-white">Prénom</Label>
                        <Input
                          id="new-employee-name"
                          value={newEmployee.first_name}
                          onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                          placeholder="Prénom du salarié"
                          className="bg-slate-600 border-slate-500 text-white placeholder-slate-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-employee-role" className="text-white">Rôle</Label>
                        <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}>
                          <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role} className="text-white">
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleAddEmployee}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Ajouter
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddEmployee(false)
                          setNewEmployee({ first_name: "", role: "salle" })
                        }}
                        className="border-slate-600 text-white hover:bg-slate-700"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                {employees.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-white text-lg font-semibold mb-2">Aucun salarié</h3>
                    <p className="text-slate-400 mb-4">
                      Ajoutez des salariés pour commencer à gérer le planning
                    </p>
                    <Button
                      onClick={() => setShowAddEmployee(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un salarié
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                        {editingEmployee?.id === employee.id ? (
                          <div className="flex items-center space-x-4 flex-1">
                            <Input
                              value={editingEmployee.first_name}
                              onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })}
                              className="bg-slate-600 border-slate-500 text-white"
                            />
                            <Select value={editingEmployee.role} onValueChange={(value) => setEditingEmployee({ ...editingEmployee, role: value })}>
                              <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                {ROLES.map((role) => (
                                  <SelectItem key={role} value={role} className="text-white">
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateEmployee(editingEmployee)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Sauvegarder
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingEmployee(null)}
                              className="border-slate-600 text-white hover:bg-slate-700"
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center space-x-4">
                              <div>
                                <div className="text-white font-medium">{employee.first_name}</div>
                                <div className="text-slate-400 text-sm capitalize">{employee.role}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingEmployee(employee)}
                                className="border-slate-600 text-white hover:bg-slate-700"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteEmployee(employee.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Horaires d'ouverture</CardTitle>
                    <CardDescription className="text-slate-400">
                      Définissez les plages horaires pour chaque jour de la période
                    </CardDescription>
                  </div>
                  <Button
                    onClick={saveOpeningHours}
                    disabled={!openingHoursDirty || savingOpeningHours}
                    className={
                      openingHoursDirty
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-slate-600 hover:bg-slate-600 cursor-not-allowed"
                    }
                  >
                    {savingOpeningHours ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {WEEKDAYS.map((weekday) => {
                    const hours = getHoursForWeekday(weekday.id)
                    const serviceType = hours.service_type || "separated"
                    const hasLunch = serviceType === "separated" && !!hours.lunch_start && !!hours.lunch_end
                    const hasDinner = serviceType === "separated" && !!hours.dinner_start && !!hours.dinner_end
                    const hasContinuous = serviceType === "continuous" && !!hours.continuous_start && !!hours.continuous_end

                    return (
                      <div key={weekday.id} className="p-4 bg-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white font-medium">{weekday.name}</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <Label className="text-white">Type de service</Label>
                            <RadioGroup
                              value={serviceType}
                              onValueChange={(value) => 
                                updateOpeningHoursDraft(
                                  weekday.id, 
                                  'service_type', 
                                  value
                                )
                              }
                              className="flex space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="separated" id={`${weekday.id}-separated`} className="text-white" />
                                <Label htmlFor={`${weekday.id}-separated`} className="text-white">Séparé</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="continuous" id={`${weekday.id}-continuous`} className="text-white" />
                                <Label htmlFor={`${weekday.id}-continuous`} className="text-white">Continu</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {serviceType === "separated" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={hasLunch}
                                    onCheckedChange={(checked) => 
                                      updateOpeningHoursDraft(
                                        weekday.id, 
                                        'lunch_enabled', 
                                        checked
                                      )
                                    }
                                  />
                                  <Label className="text-white">Service midi</Label>
                                </div>
                                {hasLunch && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-white text-sm">Début</Label>
                                      <Input
                                        type="time"
                                        value={hours.lunch_start || ""}
                                        onChange={(e) => 
                                          updateOpeningHoursDraft(
                                            weekday.id, 
                                            'lunch_start', 
                                            e.target.value
                                          )
                                        }
                                        className="bg-slate-600 border-slate-500 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-white text-sm">Fin</Label>
                                      <Input
                                        type="time"
                                        value={hours.lunch_end || ""}
                                        onChange={(e) => 
                                          updateOpeningHoursDraft(
                                            weekday.id, 
                                            'lunch_end', 
                                            e.target.value
                                          )
                                        }
                                        className="bg-slate-600 border-slate-500 text-white"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={hasDinner}
                                    onCheckedChange={(checked) => 
                                      updateOpeningHoursDraft(
                                        weekday.id, 
                                        'dinner_enabled', 
                                        checked
                                      )
                                    }
                                  />
                                  <Label className="text-white">Service soir</Label>
                                </div>
                                {hasDinner && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-white text-sm">Début</Label>
                                      <Input
                                        type="time"
                                        value={hours.dinner_start || ""}
                                        onChange={(e) => 
                                          updateOpeningHoursDraft(
                                            weekday.id, 
                                            'dinner_start', 
                                            e.target.value
                                          )
                                        }
                                        className="bg-slate-600 border-slate-500 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-white text-sm">Fin</Label>
                                      <Input
                                        type="time"
                                        value={hours.dinner_end || ""}
                                        onChange={(e) => 
                                          updateOpeningHoursDraft(
                                            weekday.id, 
                                            'dinner_end', 
                                            e.target.value
                                          )
                                        }
                                        className="bg-slate-600 border-slate-500 text-white"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={hasContinuous}
                                  onCheckedChange={(checked) => 
                                    updateOpeningHoursDraft(
                                      weekday.id, 
                                      'continuous_enabled', 
                                      checked
                                    )
                                  }
                                />
                                <Label className="text-white">Service continu</Label>
                              </div>
                              {hasContinuous && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-white text-sm">Début</Label>
                                    <Input
                                      type="time"
                                      value={hours.continuous_start || ""}
                                      onChange={(e) => 
                                        updateOpeningHoursDraft(
                                          weekday.id, 
                                          'continuous_start', 
                                          e.target.value
                                        )
                                      }
                                      className="bg-slate-600 border-slate-500 text-white"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-white text-sm">Fin</Label>
                                    <Input
                                      type="time"
                                      value={hours.continuous_end || ""}
                                      onChange={(e) => 
                                        updateOpeningHoursDraft(
                                          weekday.id, 
                                          'continuous_end', 
                                          e.target.value
                                        )
                                      }
                                      className="bg-slate-600 border-slate-500 text-white"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
