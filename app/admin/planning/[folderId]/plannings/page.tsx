"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Copy, Calendar } from "lucide-react"
import type { PlanningFolder, PlanningMain } from "@/lib/types"

export default function FolderPlanningsPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [folderId, setFolderId] = useState<string | null>(null)
  const [folder, setFolder] = useState<PlanningFolder | null>(null)
  const [plannings, setPlannings] = useState<PlanningMain[]>([])
  const [loading, setLoading] = useState(true)

  const [newTitle, setNewTitle] = useState("")
  const [newWeekStart, setNewWeekStart] = useState("")
  const [newWeekEnd, setNewWeekEnd] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { folderId } = await params
      setFolderId(folderId)
    })()
  }, [params])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  const fetchAll = async (id: string) => {
    try {
      setLoading(true)
      const [folderRes, planningsRes] = await Promise.all([
        fetch(`/api/admin/planning/folders/${id}`),
        fetch(`/api/admin/planning/folders/${id}/plannings`),
      ])

      if (folderRes.ok) setFolder(await folderRes.json())
      if (planningsRes.ok) setPlannings(await planningsRes.json())
    } catch (error) {
      console.error("[v0] Error fetching plannings page:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (folderId && user?.role === "manager") {
      fetchAll(folderId)
    }
  }, [folderId, user])

  const canCreate = useMemo(() => {
    return !!newTitle.trim() && !!newWeekStart && !!newWeekEnd && newWeekStart <= newWeekEnd
  }, [newTitle, newWeekStart, newWeekEnd])

  const handleCreate = async () => {
    if (!folderId || !canCreate) return
    try {
      setCreating(true)
      const res = await fetch(`/api/admin/planning/folders/${folderId}/plannings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, week_start: newWeekStart, week_end: newWeekEnd }),
      })

      if (!res.ok) {
        alert("Erreur lors de la création du planning")
        return
      }

      setNewTitle("")
      setNewWeekStart("")
      setNewWeekEnd("")
      await fetchAll(folderId)
    } catch (error) {
      console.error("[v0] Error creating planning:", error)
      alert("Erreur lors de la création du planning")
    } finally {
      setCreating(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  if (!user || user.role !== "manager" || !folderId) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/planning/${folderId}`)}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour dossier
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Plannings</h1>
              <p className="text-slate-400">
                {folder?.name || ""} ({folder ? `${new Date(folder.date_start).toLocaleDateString("fr-FR")} – ${new Date(folder.date_end).toLocaleDateString("fr-FR")}` : ""})
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Créer un planning</CardTitle>
            <CardDescription className="text-slate-400">Semaine (dates incluses)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label className="text-white">Titre</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Semaine 1"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Début (lundi)</Label>
                <Input
                  type="date"
                  value={newWeekStart}
                  onChange={(e) => setNewWeekStart(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Fin (dimanche)</Label>
                <Input
                  type="date"
                  value={newWeekEnd}
                  onChange={(e) => setNewWeekEnd(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={handleCreate}
                disabled={!canCreate || creating}
                className={canCreate ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-600 hover:bg-slate-600"}
              >
                <Plus className="h-4 w-4 mr-2" />
                {creating ? "Création..." : "Créer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {plannings.map((p) => (
            <Card
              key={p.id}
              className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => router.push(`/admin/planning/${folderId}/plannings/${p.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white">{p.title}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {p.week_start} → {p.week_end}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={p.status === "validated" ? "default" : "secondary"}
                    className={p.status === "validated" ? "bg-green-600" : "bg-slate-600"}
                  >
                    {p.status === "validated" ? "Validé" : "Brouillon"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  Semaine
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Copy className="h-4 w-4 text-slate-300" />
                  Ouvrir
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plannings.length === 0 && (
          <div className="text-slate-400">Aucun planning pour l’instant.</div>
        )}
      </div>
    </div>
  )
}
