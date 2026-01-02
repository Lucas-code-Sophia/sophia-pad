"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Users, Clock, Settings, Plus, FolderOpen } from "lucide-react"
import type { PlanningFolder } from "@/lib/types"

export default function PlanningPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [folders, setFolders] = useState<PlanningFolder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "manager") {
      fetchFolders()
    }
  }, [user])

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/admin/planning/folders")
      if (response.ok) {
        const data = await response.json()
        setFolders(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching planning folders:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
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

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin")}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'admin
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Planning</h1>
              <p className="text-slate-400">Gestion des plannings</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/admin/planning/new")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un dossier
          </Button>
        </div>

        {folders.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">Aucun dossier de planning</h3>
              <p className="text-slate-400 text-center mb-4">
                Créez votre premier dossier pour commencer à organiser les plannings
              </p>
              <Button
                onClick={() => router.push("/admin/planning/new")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un dossier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <Card key={folder.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push(`/admin/planning/${folder.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">{folder.name}</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        {formatDate(folder.date_start)} - {formatDate(folder.date_end)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={folder.status === "validated" ? "default" : "secondary"}
                      className={folder.status === "validated" ? "bg-green-600" : "bg-slate-600"}
                    >
                      {folder.status === "validated" ? "Validé" : "Brouillon"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span className="text-slate-300 text-sm">
                        {Math.ceil((new Date(folder.date_end).getTime() - new Date(folder.date_start).getTime()) / (1000 * 60 * 60 * 24)) + 1} jours
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-400" />
                      <span className="text-slate-300 text-sm">Gérer</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
