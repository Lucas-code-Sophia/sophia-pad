"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { TimeInput } from "@/components/ui/time-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Trash2, Plus, Copy, Clock, Users, Download } from "lucide-react"
import type { PlanningAssignment, PlanningFolder, PlanningMain } from "@/lib/types"
import * as XLSX from 'xlsx'

type EmployeeRow = {
  id: string
  folder_id: string
  first_name: string
  role: string
}

type OpeningHoursRow = {
  folder_id: string
  weekday: number
  service_type: "separated" | "continuous"
  lunch_start: string | null
  lunch_end: string | null
  dinner_start: string | null
  dinner_end: string | null
  continuous_start: string | null
  continuous_end: string | null
}

function toWeekdayIndex(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`)
  return (d.getDay() + 6) % 7
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map((v) => Number(v))
  return h * 60 + m
}

function minutesToHoursMinutes(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h${String(m).padStart(2, "0")}`
}

function durationMinutes(start: string | null, end: string | null) {
  if (!start || !end) return 0
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start))
}

export default function PlanningWeekPage({ params }: { params: Promise<{ folderId: string; planningId: string }> }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [folderId, setFolderId] = useState<string | null>(null)
  const [planningId, setPlanningId] = useState<string | null>(null)

  const [folder, setFolder] = useState<PlanningFolder | null>(null)
  const [planning, setPlanning] = useState<PlanningMain | null>(null)
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [openingHours, setOpeningHours] = useState<OpeningHoursRow[]>([])
  const [assignments, setAssignments] = useState<PlanningAssignment[]>([])

  const [loading, setLoading] = useState(true)

  const [addEmployeeByKey, setAddEmployeeByKey] = useState<Record<string, string>>({})

  const [edits, setEdits] = useState<Record<string, { work_start: string | null; work_end: string | null; dirty: boolean }>>({})

  const [duplicating, setDuplicating] = useState(false)
  const [foldersList, setFoldersList] = useState<PlanningFolder[]>([])
  const [targetFolderId, setTargetFolderId] = useState<string>("")
  const [copiedSchedule, setCopiedSchedule] = useState<{ [key: string]: { lunch_start: string | null; lunch_end: string | null; dinner_start: string | null; dinner_end: string | null } } | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  const copyDaySchedule = (date: string) => {
    const lunchKey = `${date}_lunch`
    const dinnerKey = `${date}_dinner`
    const lunchAssignments = (assignmentsByKey[lunchKey] || [])
    const dinnerAssignments = (assignmentsByKey[dinnerKey] || [])
    
    const schedule: { [key: string]: { lunch_start: string | null; lunch_end: string | null; dinner_start: string | null; dinner_end: string | null } } = {}
    
    lunchAssignments.forEach(a => {
      schedule[a.employee_id] = {
        ...schedule[a.employee_id],
        lunch_start: a.work_start,
        lunch_end: a.work_end,
      }
    })
    
    dinnerAssignments.forEach(a => {
      schedule[a.employee_id] = {
        ...schedule[a.employee_id],
        dinner_start: a.work_start,
        dinner_end: a.work_end,
      }
    })
    
    setCopiedSchedule(schedule)
  }

  const exportToExcel = () => {
    // Créer le workbook
    const wb = XLSX.utils.book_new()
    
    // Préparer les données pour le tableau principal
    const mainData: any[] = []
    
    // En-têtes
    const headers = ['Salarié', 'Rôle', ...weekDays, 'Total semaine']
    mainData.push(headers)
    
    // Données des salariés
    employeesSorted.forEach(emp => {
      const row = [emp.first_name, emp.role]
      
      weekDays.forEach((day, idx) => {
        const date = weekDates[idx]
        const lunchKey = `${date}_lunch`
        const dinnerKey = `${date}_dinner`
        const lunchAssignments = (assignmentsByKey[lunchKey] || []).filter(a => a.employee_id === emp.id)
        const dinnerAssignments = (assignmentsByKey[dinnerKey] || []).filter(a => a.employee_id === emp.id)
        
        let cellText = ''
        
        lunchAssignments.forEach(a => {
          const m = mergedAssignment(a)
          if (m.work_start && m.work_end) {
            cellText += `Midi : ${m.work_start} - ${m.work_end}\n`
          }
        })
        
        dinnerAssignments.forEach(a => {
          const m = mergedAssignment(a)
          if (m.work_start && m.work_end) {
            cellText += `Soir : ${m.work_start} - ${m.work_end}\n`
          }
        })
        
        if (!cellText) {
          cellText = 'Repos'
        } else {
          // Enlever le dernier \n
          cellText = cellText.trim()
        }
        
        row.push(cellText)
      })
      
      // Total
      const totalMinutes = weeklyRecap.find(r => r.employee.id === emp.id)?.minutes || 0
      row.push(minutesToHoursMinutes(totalMinutes))
      
      mainData.push(row)
    })
    
    // Créer la feuille principale
    const wsMain = XLSX.utils.aoa_to_sheet(mainData)
    
    // Style de la feuille principale
    const range = XLSX.utils.decode_range(wsMain['!ref'] || 'A1')
    
    // Largeur des colonnes (en unités Excel, ~7 pixels par unité)
    const colWidths = [
      { wch: 15 }, // Salarié
      { wch: 10 }, // Rôle
      ...weekDays.map(() => ({ wch: 36 })), // Jours (250px ≈ 36 unités Excel)
      { wch: 12 }  // Total
    ]
    wsMain['!cols'] = colWidths
    
    // Hauteur des lignes (en points, 1 point ≈ 1.33 pixels)
    const rowHeights: any[] = []
    for (let row = 0; row <= employeesSorted.length; row++) {
      rowHeights[row] = { hpt: 40 } // 54px ≈ 40 points
    }
    wsMain['!rows'] = rowHeights
    
    // Style pour les en-têtes
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!wsMain[cellAddress]) wsMain[cellAddress] = {}
      wsMain[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true }
      }
    }
    
    // Style pour les noms de salariés
    for (let row = 1; row <= range.e.r; row++) {
      // Nom du salarié (colonne A)
      const nameCellAddress = XLSX.utils.encode_cell({ r: row, c: 0 })
      if (!wsMain[nameCellAddress]) wsMain[nameCellAddress] = {}
      wsMain[nameCellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "F3F4F6" } },
        alignment: { horizontal: "left", vertical: "center" }
      }
      
      // Rôle (colonne B)
      const roleCellAddress = XLSX.utils.encode_cell({ r: row, c: 1 })
      if (!wsMain[roleCellAddress]) wsMain[roleCellAddress] = {}
      wsMain[roleCellAddress].s = {
        alignment: { horizontal: "center", vertical: "center" }
      }
      
      // Colonnes de jours (C à I) - FORCER wrapText pour toutes les cellules
      for (let col = 2; col <= range.e.c - 1; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (!wsMain[cellAddress]) wsMain[cellAddress] = {}
        
        // Appliquer wrapText même si la cellule est vide ou contient "Repos"
        wsMain[cellAddress].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true }
        }
      }
      
      // Total (dernière colonne)
      const totalCellAddress = XLSX.utils.encode_cell({ r: row, c: range.e.c })
      if (!wsMain[totalCellAddress]) wsMain[totalCellAddress] = {}
      wsMain[totalCellAddress].s = {
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center" }
      }
    }
    
    // Ajouter la feuille principale
    XLSX.utils.book_append_sheet(wb, wsMain, 'Planning Hebdomadaire')
    
    // Créer une feuille de résumé
    const summaryData = [
      ['Informations du Planning'],
      [],
      ['Dossier', folder?.name || ''],
      ['Planning', planning?.title || ''],
      ['Période', `${planning?.week_start || ''} au ${planning?.week_end || ''}`],
      ['Statut', planning?.status === 'validated' ? 'Validé' : 'Brouillon'],
      [],
      ['Récapitulatif des Heures'],
      ['Salarié', 'Rôle', 'Total heures'],
      ...weeklyRecap.map(r => [
        r.employee.first_name,
        r.employee.role,
        minutesToHoursMinutes(r.minutes)
      ])
    ]
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    wsSummary['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 }
    ]
    
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé')
    
    // Générer le nom du fichier
    const fileName = `Planning_${planning?.title || 'sans-titre'}_${new Date().toISOString().split('T')[0]}.xlsx`
    
    // Télécharger le fichier
    XLSX.writeFile(wb, fileName)
  }

  const pasteDaySchedule = (targetDate: string) => {
    if (!copiedSchedule) return
    
    employees.forEach(emp => {
      const schedule = copiedSchedule[emp.id]
      if (!schedule) return
      
      if (schedule.lunch_start && schedule.lunch_end) {
        addAssignment(targetDate, "lunch", emp.id).then(() => {
          setTimeout(() => {
            const newAssignments = assignments.filter(a => 
              a.date === targetDate && 
              a.service === "lunch" && 
              a.employee_id === emp.id
            )
            if (newAssignments.length > 0) {
              updateEdit(newAssignments[0].id, "work_start", schedule.lunch_start!)
              updateEdit(newAssignments[0].id, "work_end", schedule.lunch_end!)
              saveAssignment(newAssignments[0].id)
            }
          }, 100)
        })
      }
      
      if (schedule.dinner_start && schedule.dinner_end) {
        addAssignment(targetDate, "dinner", emp.id).then(() => {
          setTimeout(() => {
            const newAssignments = assignments.filter(a => 
              a.date === targetDate && 
              a.service === "dinner" && 
              a.employee_id === emp.id
            )
            if (newAssignments.length > 0) {
              updateEdit(newAssignments[0].id, "work_start", schedule.dinner_start!)
              updateEdit(newAssignments[0].id, "work_end", schedule.dinner_end!)
              saveAssignment(newAssignments[0].id)
            }
          }, 100)
        })
      }
    })
  }

  useEffect(() => {
    ;(async () => {
      const { folderId, planningId } = await params
      setFolderId(folderId)
      setPlanningId(planningId)
    })()
  }, [params])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  const fetchAll = async (fid: string, pid: string) => {
    try {
      setLoading(true)
      const [folderRes, planningRes, employeesRes, openingRes, assignmentsRes, foldersRes] = await Promise.all([
        fetch(`/api/admin/planning/folders/${fid}`),
        fetch(`/api/admin/planning/folders/${fid}/plannings/${pid}`),
        fetch(`/api/admin/planning/folders/${fid}/employees`),
        fetch(`/api/admin/planning/folders/${fid}/opening-hours`),
        fetch(`/api/admin/planning/folders/${fid}/plannings/${pid}/assignments`),
        fetch(`/api/admin/planning/folders`),
      ])

      if (folderRes.ok) setFolder(await folderRes.json())
      if (planningRes.ok) setPlanning(await planningRes.json())
      if (employeesRes.ok) setEmployees(await employeesRes.json())
      if (openingRes.ok) setOpeningHours(await openingRes.json())
      if (assignmentsRes.ok) setAssignments(await assignmentsRes.json())
      if (foldersRes.ok) setFoldersList(await foldersRes.json())

      setEdits({})
      setAddEmployeeByKey({})
    } catch (error) {
      console.error("[v0] Error fetching planning week:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (folderId && planningId && user?.role === "manager") {
      fetchAll(folderId, planningId)
    }
  }, [folderId, planningId, user])

  const weekDates = useMemo(() => {
    if (!planning) return []
    const dates: string[] = []
    const start = planning.week_start
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(start, i))
    }
    return dates
  }, [planning])

  const weekDays = useMemo(() => {
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    return days
  }, [])

  const openingFor = (dateStr: string, service: "lunch" | "dinner") => {
    if (!folderId) return null
    const weekday = toWeekdayIndex(dateStr)
    const row = openingHours.find((h) => h.weekday === weekday)
    if (!row) return null

    if (row.service_type === "continuous") {
      if (row.continuous_start && row.continuous_end) {
        return `${row.continuous_start}–${row.continuous_end}`
      }
      return null
    }

    if (service === "lunch") {
      return row.lunch_start && row.lunch_end ? `${row.lunch_start}–${row.lunch_end}` : null
    }

    return row.dinner_start && row.dinner_end ? `${row.dinner_start}–${row.dinner_end}` : null
  }

  const assignmentsByKey = useMemo(() => {
    const map: Record<string, PlanningAssignment[]> = {}
    for (const a of assignments) {
      const key = `${a.date}_${a.service}`
      if (!map[key]) map[key] = []
      map[key].push(a)
    }
    return map
  }, [assignments])

  const mergedAssignment = (a: PlanningAssignment) => {
    const e = edits[a.id]
    if (!e) return a
    return {
      ...a,
      work_start: e.work_start,
      work_end: e.work_end,
    }
  }

  const employeesSorted = useMemo(() => {
  const roleOrder: Record<string, number> = { manager: 0, bar: 1, salle: 2, cuisine: 3 }
  return [...employees].sort((a, b) => {
    const orderA = roleOrder[a.role] ?? 999
    const orderB = roleOrder[b.role] ?? 999
    if (orderA !== orderB) return orderA - orderB
    return a.first_name.localeCompare(b.first_name)
  })
}, [employees])

  const weeklyRecap = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const emp of employees) {
      totals[emp.id] = 0
    }

    // Grouper les assignments par employee_id, date et service pour éviter les doublons
    const uniqueAssignments = new Map()
    
    for (const a of assignments) {
      const m = mergedAssignment(a)
      const key = `${m.employee_id}_${a.date}_${a.service}`
      
      // Garder seulement la dernière version (avec les edits si présents)
      uniqueAssignments.set(key, m)
    }

    for (const [key, assignment] of uniqueAssignments) {
      // Nettoyer les heures (enlever les secondes si présentes)
      const cleanStart = assignment.work_start ? assignment.work_start.split(':').slice(0, 2).join(':') : null
      const cleanEnd = assignment.work_end ? assignment.work_end.split(':').slice(0, 2).join(':') : null
      
      const duration = durationMinutes(cleanStart, cleanEnd)
      
      if (duration > 0) {
        totals[assignment.employee_id] = (totals[assignment.employee_id] || 0) + duration
      }
    }

    return employees.map((emp) => ({
      employee: emp,
      minutes: totals[emp.id] || 0,
    }))
  }, [employees, assignments, edits])

  const updateEdit = (assignmentId: string, field: "work_start" | "work_end", value: string) => {
    setEdits((prev) => {
      const existing = prev[assignmentId]
      const next = {
        work_start: existing?.work_start ?? assignments.find((a) => a.id === assignmentId)?.work_start ?? null,
        work_end: existing?.work_end ?? assignments.find((a) => a.id === assignmentId)?.work_end ?? null,
        dirty: true,
      }

      if (field === "work_start") next.work_start = value === "" ? null : value
      if (field === "work_end") next.work_end = value === "" ? null : value

      return { ...prev, [assignmentId]: next }
    })
  }

  const saveAssignment = async (assignmentId: string) => {
    if (!folderId || !planningId) return
    const e = edits[assignmentId]
    if (!e?.dirty) return

    if (e.work_start && e.work_end && e.work_start >= e.work_end) {
      alert("Heures invalides : le début doit être avant la fin")
      return
    }

    const res = await fetch(`/api/admin/planning/folders/${folderId}/plannings/${planningId}/assignments/${assignmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_start: e.work_start, work_end: e.work_end }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      alert(body?.error || "Erreur lors de l'enregistrement")
      return
    }

    // Mettre à jour localement sans recharger toute la page
    const updatedAssignment = await res.json()
    
    setAssignments(prev => {
      const newAssignments = prev.map(a => a.id === assignmentId ? updatedAssignment : a)
      return newAssignments
    })
    
    setEdits(prev => {
      const { [assignmentId]: removed, ...rest } = prev
      return rest
    })
  }

  const deleteAssignment = async (assignmentId: string) => {
    if (!folderId || !planningId) return
    if (!confirm("Supprimer cette affectation ?")) return

    const res = await fetch(`/api/admin/planning/folders/${folderId}/plannings/${planningId}/assignments/${assignmentId}`, {
      method: "DELETE",
    })

    if (!res.ok) {
      alert("Erreur lors de la suppression")
      return
    }

    // Supprimer localement sans recharger toute la page
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    setEdits(prev => {
      const { [assignmentId]: removed, ...rest } = prev
      return rest
    })
  }

  const addAssignment = async (date: string, service: "lunch" | "dinner", employee_id: string) => {
    if (!folderId || !planningId) return

    const res = await fetch(`/api/admin/planning/folders/${folderId}/plannings/${planningId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, service, employee_id }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      alert(body?.error || "Erreur lors de l'ajout")
      return
    }

    // Ajouter localement sans recharger toute la page
    const newAssignment = await res.json()
    setAssignments(prev => [...prev, newAssignment])
  }

  const duplicatePlanning = async () => {
    if (!folderId || !planningId) return

    try {
      setDuplicating(true)

      const payload = targetFolderId && targetFolderId !== "same-folder" ? { target_folder_id: targetFolderId } : {}
      const res = await fetch(`/api/admin/planning/folders/${folderId}/plannings/${planningId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const duplicated = await res.json()
        alert(`Planning "${duplicated.title}" dupliqué avec succès`)
        setTargetFolderId("")
        setShowDuplicateDialog(false)
      } else {
        alert("Erreur lors de la duplication")
      }
    } catch (error) {
      console.error("[v0] Error duplicating planning:", error)
      alert("Erreur lors de la duplication")
    } finally {
      setDuplicating(false)
    }
  }

  const togglePlanningStatus = async () => {
    if (!planning || !folderId || !planningId) return
    
    const newStatus = planning.status === "validated" ? "draft" : "validated"
    const confirmMessage = newStatus === "validated" 
      ? "Voulez-vous valider ce planning ? Les affectations ne pourront plus être modifiées." 
      : "Voulez-vous repasser ce planning en brouillon ?"
    
    if (!confirm(confirmMessage)) return

    try {
      const response = await fetch(`/api/admin/planning/folders/${folderId}/plannings/${planningId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updatedPlanning = await response.json()
        setPlanning(updatedPlanning)
      } else {
        alert("Erreur lors de la modification du statut")
      }
    } catch (error) {
      console.error("Error updating planning status:", error)
      alert("Erreur lors de la modification du statut")
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  if (!user || user.role !== "manager" || !folderId || !planningId || !planning) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/planning/${folderId}/plannings`)}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{planning.title}</h1>
              <p className="text-slate-400">{folder?.name || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={togglePlanningStatus}
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              {planning.status === "validated" ? "Repasser en brouillon" : "Valider le planning"}
            </Button>
            <Button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter Excel
            </Button>
            <Badge
              variant={planning.status === "validated" ? "default" : "secondary"}
              className={planning.status === "validated" ? "bg-green-600" : "bg-slate-600"}
            >
              {planning.status === "validated" ? "Validé" : "Brouillon"}
            </Badge>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Duplication</CardTitle>
            <CardDescription className="text-slate-400">Dupliquer ce planning en brouillon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="md:col-span-2">
                <Label className="text-white">Dupliquer vers un autre dossier (optionnel)</Label>
                <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Même dossier" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="same-folder" className="text-white">
                      Même dossier
                    </SelectItem>
                    {foldersList
                      .filter((f) => f.id !== folderId && f.name.trim() !== "" && f.id.trim() !== "")
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-white">
                          {f.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button
                  onClick={duplicatePlanning}
                  disabled={duplicating}
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {duplicating ? "Duplication..." : "Dupliquer"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Récap heures semaine</CardTitle>
            <CardDescription className="text-slate-400">Calculé à partir des affectations (work_start/work_end)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {weeklyRecap.map((r) => (
                <div key={r.employee.id} className="bg-slate-700 rounded-md p-3">
                  <div className="text-white font-medium">
                    {r.employee.first_name} <span className="text-slate-300 text-sm">({r.employee.role})</span>
                  </div>
                  <div className="text-slate-200">{minutesToHoursMinutes(r.minutes)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="bg-slate-800 border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-slate-700 border-b border-slate-600">
                  <th className="p-3 text-left text-white font-medium">Salarié</th>
                  {weekDays.map((day, idx) => {
                    const date = weekDates[idx]
                    const lunchOpening = openingFor(date, "lunch")
                    const dinnerOpening = openingFor(date, "dinner")
                    
                    return (
                      <th key={day} className="p-3 text-center text-white font-medium">
                        <div className="space-y-1">
                          <div className="text-sm">{day}</div>
                          <div className="text-xs text-slate-300">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{lunchOpening || "—"}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{dinnerOpening || "—"}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyDaySchedule(date)}
                              className="h-6 px-2 text-xs border-slate-600 text-white hover:bg-slate-700"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pasteDaySchedule(date)}
                              disabled={!copiedSchedule}
                              className="h-6 px-2 text-xs border-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
                            >
                              Coller
                            </Button>
                          </div>
                        </div>
                      </th>
                    )
                  })}
                  <th className="p-3 text-center text-white font-medium">Total semaine</th>
                </tr>
              </thead>
              <tbody>
                {employeesSorted.map((emp) => {
                  const totalMinutes = weeklyRecap.find((r: any) => r.employee.id === emp.id)?.minutes || 0
                  
                  return (
                    <tr key={emp.id} className="border-b border-slate-700">
                      <td className="p-3">
                        <div className="text-white font-medium">{emp.first_name}</div>
                        <div className="text-slate-400 text-sm capitalize">{emp.role}</div>
                      </td>
                      {weekDays.map((day, idx) => {
                        const date = weekDates[idx]
                        const lunchKey = `${date}_lunch`
                        const dinnerKey = `${date}_dinner`
                        const lunchAssignments = (assignmentsByKey[lunchKey] || []).filter(a => a.employee_id === emp.id)
                        const dinnerAssignments = (assignmentsByKey[dinnerKey] || []).filter(a => a.employee_id === emp.id)
                        
                        // Récupérer ou créer les affectations pour ce salarié ce jour
                        const lunchAssignment = lunchAssignments[0] || null
                        const dinnerAssignment = dinnerAssignments[0] || null
                        
                        return (
                          <td key={day} className="p-2">
                            <div className="space-y-1">
                              {/* Créneau midi */}
                              <div className="flex gap-1 items-center">
                                <span className="text-xs text-slate-400 w-8">Midi:</span>
                                {lunchAssignment ? (
                                  <>
                                    <TimeInput
                                      value={mergedAssignment(lunchAssignment).work_start || ""}
                                      onChange={(value) => updateEdit(lunchAssignment.id, "work_start", value)}
                                      className="bg-slate-600 border-slate-500 text-white text-xs h-6 w-20"
                                    />
                                    <TimeInput
                                      value={mergedAssignment(lunchAssignment).work_end || ""}
                                      onChange={(value) => updateEdit(lunchAssignment.id, "work_end", value)}
                                      className="bg-slate-600 border-slate-500 text-white text-xs h-6 w-20"
                                    />
                                    <Button
                                      onClick={() => saveAssignment(lunchAssignment.id)}
                                      disabled={!edits[lunchAssignment.id]?.dirty}
                                      className={edits[lunchAssignment.id]?.dirty ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-600 hover:bg-slate-600"}
                                      size="sm"
                                    >
                                      ✓
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => deleteAssignment(lunchAssignment.id)} 
                                      size="sm"
                                      className="h-6 w-6 text-xs"
                                    >
                                      ×
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    onClick={() => addAssignment(date, "lunch", emp.id)}
                                    className="bg-green-600 hover:bg-green-700 h-6 text-xs px-2"
                                    size="sm"
                                  >
                                    +Midi
                                  </Button>
                                )}
                              </div>
                              
                              {/* Créneau soir */}
                              <div className="flex gap-1 items-center">
                                <span className="text-xs text-slate-400 w-8">Soir:</span>
                                {dinnerAssignment ? (
                                  <>
                                    <TimeInput
                                      value={mergedAssignment(dinnerAssignment).work_start || ""}
                                      onChange={(value) => updateEdit(dinnerAssignment.id, "work_start", value)}
                                      className="bg-slate-600 border-slate-500 text-white text-xs h-6 w-20"
                                    />
                                    <TimeInput
                                      value={mergedAssignment(dinnerAssignment).work_end || ""}
                                      onChange={(value) => updateEdit(dinnerAssignment.id, "work_end", value)}
                                      className="bg-slate-600 border-slate-500 text-white text-xs h-6 w-20"
                                    />
                                    <Button
                                      onClick={() => saveAssignment(dinnerAssignment.id)}
                                      disabled={!edits[dinnerAssignment.id]?.dirty}
                                      className={edits[dinnerAssignment.id]?.dirty ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-600 hover:bg-slate-600"}
                                      size="sm"
                                    >
                                      ✓
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      onClick={() => deleteAssignment(dinnerAssignment.id)} 
                                      size="sm"
                                      className="h-6 w-6 text-xs"
                                    >
                                      ×
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    onClick={() => addAssignment(date, "dinner", emp.id)}
                                    className="bg-green-600 hover:bg-green-700 h-6 text-xs px-2"
                                    size="sm"
                                  >
                                    +Soir
                                  </Button>
                                )}
                              </div>
                              
                              {/* Indicateur jour de repos si aucun créneau */}
                              {!lunchAssignment && !dinnerAssignment && (
                                <div className="text-xs text-slate-500 italic">Repos</div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                      <td className="p-3 text-center">
                        <div className="text-white font-medium">
                          {minutesToHoursMinutes(totalMinutes)}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-700 border-t border-slate-600">
                  <td className="p-3 text-white font-medium">Récap par jour</td>
                  {weekDays.map((day, idx) => {
                    const date = weekDates[idx]
                    // Calculer les totaux par rôle pour ce jour
                    const dayTotals: Record<string, number> = { bar: 0, salle: 0, cuisine: 0, manager: 0 }
                    
                    for (const a of assignments) {
                      if (a.date !== date) continue
                      const emp = employees.find((e) => e.id === a.employee_id)
                      if (!emp) continue
                      
                      const merged = mergedAssignment(a)
                      const minutes = durationMinutes(merged.work_start, merged.work_end)
                      if (dayTotals[emp.role] !== undefined) {
                        dayTotals[emp.role] += minutes
                      }
                    }
                    
                    return (
                      <td key={day} className="p-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-blue-400" />
                            <span className="text-blue-400">Bar: {minutesToHoursMinutes(dayTotals.bar)}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-green-400" />
                            <span className="text-green-400">Salle: {minutesToHoursMinutes(dayTotals.salle)}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-orange-400" />
                            <span className="text-orange-400">Cuisine: {minutesToHoursMinutes(dayTotals.cuisine)}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-purple-400" />
                            <span className="text-purple-400">Manager: {minutesToHoursMinutes(dayTotals.manager)}</span>
                          </div>
                        </div>
                      </td>
                    )
                  })}
                  <td className="p-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
