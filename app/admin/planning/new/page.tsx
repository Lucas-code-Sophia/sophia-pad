"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Calendar, Save } from "lucide-react"

export default function NewPlanningFolderPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [loading, setLoading] = useState(false)

  if (!isLoading && (!user || user.role !== "manager")) {
    router.push("/floor-plan")
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !dateStart || !dateEnd) {
      alert("Veuillez remplir tous les champs")
      return
    }

    if (new Date(dateEnd) < new Date(dateStart)) {
      alert("La date de fin doit être après la date de début")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/planning/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date_start: dateStart,
          date_end: dateEnd,
          status: "draft",
        }),
      })

      if (response.ok) {
        const folder = await response.json()
        router.push(`/admin/planning/${folder.id}`)
      } else {
        const error = await response.json()
        alert(error.error || "Erreur lors de la création du dossier")
      }
    } catch (error) {
      console.error("Error creating folder:", error)
      alert("Erreur lors de la création du dossier")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/planning")}
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Nouveau dossier de planning</h1>
            <p className="text-slate-400">Créez un nouveau dossier pour organiser vos plannings</p>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Informations du dossier</CardTitle>
            <CardDescription className="text-slate-400">
              Définissez les paramètres de votre nouveau dossier de planning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Nom du dossier</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Semaine du 15 au 21 janvier"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateStart" className="text-white">Date de début</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateEnd" className="text-white">Date de fin</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/planning")}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Création..." : "Créer le dossier"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
