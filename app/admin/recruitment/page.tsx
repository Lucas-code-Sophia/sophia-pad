"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { Applicant } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Mail,
  Phone,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  Brain,
  TrendingUp,
  Briefcase,
} from "lucide-react"

export default function RecruitmentPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  const [candidates, setCandidates] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [positionFilter, setPositionFilter] = useState<string>("all")
  const [selectedCandidate, setSelectedCandidate] = useState<Applicant | null>(null)
  const [showCandidateDialog, setShowCandidateDialog] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Applicant | null>(null)
  
  // Formulaire d'ajout/modification
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    start_date: "",
    end_date: "",
    notes: "",
    cv_file: null as File | null,
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "manager") {
      fetchCandidates()
    }
  }, [user])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/recruitment")
      if (response.ok) {
        const result = await response.json()
        // L'API retourne { data: [...], count: 1, debug: {...} }
        setCandidates(result.data || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching candidates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCandidate = async () => {
    try {
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "cv_file" && value) {
          formDataToSend.append(key, value)
        } else if (key !== "cv_file" && value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString())
        }
      })

      const response = await fetch("/api/admin/recruitment", {
        method: "POST",
        body: formDataToSend,
      })

      if (response.ok) {
        setShowAddDialog(false)
        setFormData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          position: "",
          start_date: "",
          end_date: "",
          notes: "",
          cv_file: null,
        })
        fetchCandidates()
      }
    } catch (error) {
      console.error("[v0] Error adding candidate:", error)
    }
  }

  const handleUpdateCandidate = async () => {
    if (!editingCandidate) return

    try {
      const response = await fetch(`/api/admin/recruitment/${editingCandidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editingCandidate.status,
          notes: editingCandidate.notes,
        }),
      })

      if (response.ok) {
        setEditingCandidate(null)
        fetchCandidates()
      }
    } catch (error) {
      console.error("[v0] Error updating candidate:", error)
    }
  }

  const handleDeleteCandidate = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette candidature ?")) return

    try {
      const response = await fetch(`/api/admin/recruitment/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchCandidates()
      }
    } catch (error) {
      console.error("[v0] Error deleting candidate:", error)
    }
  }

  const downloadCV = async (applicant: Applicant) => {
    if (applicant.cv_file_path && applicant.cv_file_name) {
      try {
        console.log("[v0] Opening CV URL:", applicant.cv_file_path)
        
        // cv_file_path contient déjà l'URL complète, l'utiliser directement
        const fileUrl = applicant.cv_file_path
        
        console.log("[v0] File URL:", fileUrl)
        
        // Ouvrir directement dans un nouvel onglet
        window.open(fileUrl, '_blank')
        
      } catch (error) {
        console.error("[v0] Error opening CV:", error)
        alert("Erreur lors de l'ouverture du CV")
      }
    } else {
      alert("Aucun CV disponible pour ce candidat")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-blue-600"
      case "REVIEWED": return "bg-yellow-600"
      case "INTERVIEW_SCHEDULED": return "bg-purple-600"
      case "INTERVIEWED": return "bg-indigo-600"
      case "ACCEPTED": return "bg-green-600"
      case "REJECTED": return "bg-red-600"
      default: return "bg-gray-600"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "NEW": return "Nouveau"
      case "REVIEWED": return "Examiné"
      case "INTERVIEW_SCHEDULED": return "Entretien planifié"
      case "INTERVIEWED": return "Entretenu"
      case "ACCEPTED": return "Accepté"
      case "REJECTED": return "Refusé"
      default: return status
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = `${candidate.first_name} ${candidate.last_name} ${candidate.email} ${candidate.position}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter
    const matchesPosition = positionFilter === "all" || candidate.position === positionFilter
    
    return matchesSearch && matchesStatus && matchesPosition
  })

  const stats = {
    total: candidates.length,
    new: candidates.filter(c => c.status === "NEW").length,
    interviewed: candidates.filter(c => c.status === "INTERVIEWED").length,
    accepted: candidates.filter(c => c.status === "ACCEPTED").length,
    rejected: candidates.filter(c => c.status === "REJECTED").length,
  }

  const positions = [...new Set(candidates.map(c => c.position))]

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            size="sm"
            className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Retour</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white">Recrutement</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">Gestion des candidatures et CV</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchCandidates} 
            variant="outline" 
            className="bg-slate-700 hover:bg-slate-600 border-slate-600"
            title="Recharger la liste"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recharger
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une candidature
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle candidature</DialogTitle>
              <DialogDescription className="text-slate-400">
                Ajouter un nouveau candidat et son CV
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              <div>
                <Label>Poste</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Ex: Serveur, Manager, Chef..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de début souhaitée</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <Label>Date de fin (si contrat)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  rows={3}
                />
              </div>
              <div>
                <Label>CV (PDF, DOC, DOCX)</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFormData({ ...formData, cv_file: e.target.files?.[0] || null })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <Button onClick={handleAddCandidate} className="w-full bg-teal-600 hover:bg-teal-700">
                Ajouter la candidature
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="bg-gradient-to-br from-teal-600 to-teal-700 border-teal-500">
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-teal-100">Total</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-3xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-teal-200 mt-1">Candidatures</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500">
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-100">Nouvelles</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-3xl font-bold text-white">{stats.new}</div>
            <p className="text-xs text-blue-200 mt-1">À examiner</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500">
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-purple-100">Entretiens</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-3xl font-bold text-white">{stats.interviewed}</div>
            <p className="text-xs text-purple-200 mt-1">En cours</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-500">
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-green-100">Acceptées</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-3xl font-bold text-white">{stats.accepted}</div>
            <p className="text-xs text-green-200 mt-1">Recrutées</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-600 to-red-700 border-red-500">
          <CardHeader className="pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-red-100">Refusées</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-3xl font-bold text-white">{stats.rejected}</div>
            <p className="text-xs text-red-200 mt-1">Non retenues</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom, email, poste..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="NEW">Nouveaux</SelectItem>
                  <SelectItem value="REVIEWED">Examinés</SelectItem>
                  <SelectItem value="INTERVIEW_SCHEDULED">Entretien planifié</SelectItem>
                  <SelectItem value="INTERVIEWED">Entretenus</SelectItem>
                  <SelectItem value="ACCEPTED">Acceptés</SelectItem>
                  <SelectItem value="REJECTED">Refusés</SelectItem>
                </SelectContent>
              </Select>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Poste" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Tous les postes</SelectItem>
                  {positions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-white py-8">
            <div className="text-xl">Chargement des candidatures...</div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-white text-lg font-semibold mb-2">Aucune candidature trouvée</h3>
              <p className="text-slate-400">
                {searchTerm || statusFilter !== "all" || positionFilter !== "all"
                  ? "Aucune candidature ne correspond à vos filtres."
                  : "Commencez par ajouter une nouvelle candidature."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold truncate">
                            {candidate.first_name} {candidate.last_name}
                          </h3>
                          <Badge className={`${getStatusColor(candidate.status)} text-white text-xs`}>
                            {getStatusText(candidate.status)}
                          </Badge>
                          {candidate.ai_score && (
                            <Badge className="bg-purple-600 text-white text-xs flex items-center gap-1">
                              <Brain className="h-3 w-3" />
                              {candidate.ai_score}/100
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-slate-500" />
                            <span className="truncate">{candidate.position}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-500" />
                            <span className="truncate">{candidate.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-500" />
                            <span>{candidate.phone}</span>
                          </div>
                          {candidate.start_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <span>Début: {new Date(candidate.start_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span>Candidature: {new Date(candidate.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        {candidate.ai_summary && (
                          <div className="mt-2 p-2 bg-purple-900/20 border border-purple-700 rounded text-xs text-purple-300">
                            <strong>Résumé IA:</strong> {candidate.ai_summary}
                          </div>
                        )}
                        {candidate.notes && (
                          <div className="mt-2 text-xs text-slate-400 italic">
                            <strong>Notes:</strong> {candidate.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:flex-col">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCandidate(candidate)
                        setShowCandidateDialog(true)
                      }}
                      className="bg-slate-700 hover:bg-slate-600 border-slate-600"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Voir
                    </Button>
                    {candidate.cv_file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCV(candidate)}
                        className="bg-slate-700 hover:bg-slate-600 border-slate-600"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        CV
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCandidate(candidate)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 border-blue-500"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCandidate(candidate.id)}
                      className="bg-red-600 hover:bg-red-700 border-red-500"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Candidate Dialog */}
      <Dialog open={showCandidateDialog} onOpenChange={setShowCandidateDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la candidature</DialogTitle>
            <DialogDescription className="text-slate-400">
              Informations complètes du candidat
            </DialogDescription>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Informations personnelles</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-slate-400">Nom complet</Label>
                      <p className="text-white">{selectedCandidate.first_name} {selectedCandidate.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Email</Label>
                      <p className="text-white">{selectedCandidate.email}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Téléphone</Label>
                      <p className="text-white">{selectedCandidate.phone}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Poste souhaité</Label>
                      <p className="text-white">{selectedCandidate.position}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Disponibilités</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-slate-400">Date de début souhaitée</Label>
                      <p className="text-white">
                        {selectedCandidate.start_date 
                          ? new Date(selectedCandidate.start_date).toLocaleDateString('fr-FR')
                          : "Non spécifiée"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Date de fin (si contrat)</Label>
                      <p className="text-white">
                        {selectedCandidate.end_date 
                          ? new Date(selectedCandidate.end_date).toLocaleDateString('fr-FR')
                          : "Non spécifiée"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Date de candidature</Label>
                      <p className="text-white">
                        {new Date(selectedCandidate.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Statut actuel</Label>
                      <Badge className={`${getStatusColor(selectedCandidate.status)} text-white`}>
                        {getStatusText(selectedCandidate.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {selectedCandidate.ai_summary && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    Analyse IA
                  </h3>
                  <div className="p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-purple-300">Score de compatibilité</Label>
                      <Badge className="bg-purple-600 text-white">
                        {selectedCandidate.ai_score}/100
                      </Badge>
                    </div>
                    <p className="text-purple-300">{selectedCandidate.ai_summary}</p>
                  </div>
                </div>
              )}

              {selectedCandidate.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
                  <div className="p-4 bg-slate-700 rounded-lg">
                    <p className="text-slate-300">{selectedCandidate.notes}</p>
                  </div>
                </div>
              )}

              {selectedCandidate.cv_file_path && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    CV
                  </h3>
                  <div className="p-4 bg-slate-700 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{selectedCandidate.cv_file_name}</p>
                      <p className="text-slate-400 text-sm">Cliquez pour télécharger</p>
                    </div>
                    <Button
                      onClick={() => downloadCV(selectedCandidate)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Candidate Dialog */}
      <Dialog open={!!editingCandidate} onOpenChange={(open) => !open && setEditingCandidate(null)}>
        <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la candidature</DialogTitle>
            <DialogDescription className="text-slate-400">
              Mettre à jour le statut et les notes
            </DialogDescription>
          </DialogHeader>
          {editingCandidate && (
            <div className="space-y-4">
              <div>
                <Label>Statut</Label>
                <Select
                  value={editingCandidate.status}
                  onValueChange={(value) => setEditingCandidate({ ...editingCandidate, status: value as any })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="NEW">Nouveau</SelectItem>
                    <SelectItem value="REVIEWED">Examiné</SelectItem>
                    <SelectItem value="INTERVIEW_SCHEDULED">Entretien planifié</SelectItem>
                    <SelectItem value="INTERVIEWED">Entretenu</SelectItem>
                    <SelectItem value="ACCEPTED">Accepté</SelectItem>
                    <SelectItem value="REJECTED">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingCandidate.notes}
                  onChange={(e) => setEditingCandidate({ ...editingCandidate, notes: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateCandidate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingCandidate(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-600"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
        </Dialog>
      </div>
  )
}
