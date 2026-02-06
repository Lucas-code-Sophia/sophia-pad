"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  DEFAULT_FLOOR_PLAN_LAYOUT,
  FLOOR_PLAN_LAYOUTS,
  isTableLocation,
  type FloorPlanLayout,
  type FloorPlanLayoutId,
  type TableLocation,
} from "@/lib/floor-plan-layouts"
import { Checkbox } from "@/components/ui/checkbox"

const LOCATION_OPTIONS: Array<{ value: TableLocation; label: string }> = [
  { value: "T", label: "Terrasse" },
  { value: "I", label: "Interieur" },
  { value: "C", label: "Canape" },
  { value: "H", label: "Table d'Hote" },
]

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const buildDefaultZones = (): FloorPlanLayout["zones"] =>
  LOCATION_OPTIONS.map((loc) => ({
    id: `zone_${loc.value.toLowerCase()}`,
    title: loc.label,
    locations: [loc.value],
    layout: {
      columns: { mobile: loc.value === "T" || loc.value === "I" ? 4 : 2, desktop: loc.value === "T" || loc.value === "I" ? 8 : 4 },
      aspect: loc.value === "T" || loc.value === "I" ? "square" : "rect",
    },
  }))

const createLayout = (name: string, existingIds: string[]): FloorPlanLayout => {
  const base = slugify(name) || "layout"
  let id = base
  let i = 1
  while (existingIds.includes(id)) {
    id = `${base}-${i}`
    i += 1
  }
  return {
    id,
    label: name,
    description: "Disposition personnalisee",
    zones: buildDefaultZones(),
  }
}

export default function FloorPlanLayoutAdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [activeLayout, setActiveLayout] = useState<FloorPlanLayoutId>(DEFAULT_FLOOR_PLAN_LAYOUT)
  const [customLayouts, setCustomLayouts] = useState<FloorPlanLayout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null)
  const [layoutDraft, setLayoutDraft] = useState<FloorPlanLayout | null>(null)
  const [newLayoutName, setNewLayoutName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const allLayouts = useMemo(() => [...FLOOR_PLAN_LAYOUTS, ...customLayouts], [customLayouts])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "manager") {
      fetchLayoutSetting()
      fetchLayouts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchLayoutSetting = async () => {
    try {
      const response = await fetch("/api/settings/floor-plan-layout")
      if (response.ok) {
        const data = await response.json()
        const nextLayout = String(data?.active_layout || DEFAULT_FLOOR_PLAN_LAYOUT)
        setActiveLayout(nextLayout || DEFAULT_FLOOR_PLAN_LAYOUT)
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const fetchLayouts = async () => {
    try {
      const response = await fetch("/api/settings/floor-plan-layouts")
      if (response.ok) {
        const data = await response.json()
        const layouts = Array.isArray(data?.layouts) ? data.layouts : []
        setCustomLayouts(layouts)
        if (!selectedLayoutId && layouts.length > 0) {
          setSelectedLayoutId(layouts[0].id)
          setLayoutDraft(JSON.parse(JSON.stringify(layouts[0])) as FloorPlanLayout)
        }
      }
    } catch (e) {
      // ignore
    }
  }

  const saveLayouts = async (layouts: FloorPlanLayout[]) => {
    setSaving(true)
    try {
      const response = await fetch("/api/settings/floor-plan-layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast({
          title: "Erreur",
          description: err?.error || "Echec de la sauvegarde des dispositions",
          variant: "destructive" as any,
        })
        return false
      }
      return true
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Echec de la sauvegarde des dispositions",
        variant: "destructive" as any,
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSaveActive = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/settings/floor-plan-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_layout: activeLayout }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast({
          title: "Erreur",
          description: err?.error || "Echec de la sauvegarde du plan de salle",
          variant: "destructive" as any,
        })
        return
      }
      toast({ title: "OK", description: "Disposition active mise a jour" })
    } catch (e) {
      toast({
        title: "Erreur",
        description: "Echec de la sauvegarde du plan de salle",
        variant: "destructive" as any,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateLayout = async () => {
    const name = newLayoutName.trim()
    if (!name) return
    const newLayout = createLayout(name, allLayouts.map((l) => l.id))
    const updated = [...customLayouts, newLayout]
    setCustomLayouts(updated)
    setSelectedLayoutId(newLayout.id)
    setLayoutDraft(JSON.parse(JSON.stringify(newLayout)) as FloorPlanLayout)
    setNewLayoutName("")
    const ok = await saveLayouts(updated)
    if (ok) toast({ title: "OK", description: "Disposition creee" })
  }

  const handleSelectLayout = (id: string) => {
    setSelectedLayoutId(id)
    const found = customLayouts.find((layout) => layout.id === id)
    setLayoutDraft(found ? (JSON.parse(JSON.stringify(found)) as FloorPlanLayout) : null)
  }

  const handleSaveLayout = async () => {
    if (!layoutDraft) return
    const updated = customLayouts.map((layout) => (layout.id === layoutDraft.id ? layoutDraft : layout))
    setCustomLayouts(updated)
    const ok = await saveLayouts(updated)
    if (ok) toast({ title: "OK", description: "Disposition enregistree" })
  }

  const handleDeleteLayout = async (id: string) => {
    if (!confirm("Supprimer cette disposition ?")) return
    const updated = customLayouts.filter((layout) => layout.id !== id)
    setCustomLayouts(updated)
    if (selectedLayoutId === id) {
      setSelectedLayoutId(updated[0]?.id || null)
      setLayoutDraft(updated[0] ? (JSON.parse(JSON.stringify(updated[0])) as FloorPlanLayout) : null)
    }
    const ok = await saveLayouts(updated)
    if (ok) toast({ title: "OK", description: "Disposition supprimee" })
  }

  const updateDraft = (patch: Partial<FloorPlanLayout>) => {
    if (!layoutDraft) return
    setLayoutDraft({ ...layoutDraft, ...patch })
  }

  const updateZone = (index: number, patch: Partial<FloorPlanLayout["zones"][number]>) => {
    if (!layoutDraft) return
    const zones = layoutDraft.zones.map((zone, i) => (i === index ? { ...zone, ...patch } : zone))
    updateDraft({ zones })
  }

  const moveZone = (index: number, direction: -1 | 1) => {
    if (!layoutDraft) return
    const zones = [...layoutDraft.zones]
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= zones.length) return
    const [item] = zones.splice(index, 1)
    zones.splice(nextIndex, 0, item)
    updateDraft({ zones })
  }

  const removeZone = (index: number) => {
    if (!layoutDraft) return
    const zones = layoutDraft.zones.filter((_, i) => i !== index)
    updateDraft({ zones })
  }

  const addZone = () => {
    if (!layoutDraft) return
    const defaultLoc = LOCATION_OPTIONS[0]
    const zones = [
      ...layoutDraft.zones,
      {
        id: `zone_${Date.now()}`,
        title: defaultLoc.label,
        locations: [defaultLoc.value],
        layout: { columns: { mobile: 4, desktop: 8 }, aspect: "square" },
      },
    ]
    updateDraft({ zones })
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
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
            <h1 className="text-xl sm:text-3xl font-bold text-white">Disposition du plan de salle</h1>
            <p className="text-slate-400 text-xs sm:text-sm">Choisir la disposition visible pour tous</p>
          </div>
        </div>
      </div>

      <Card className="bg-slate-800 border-slate-700 max-w-3xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-base sm:text-lg">Disposition active</CardTitle>
          <CardDescription className="text-slate-400 text-xs sm:text-sm">
            Cette selection s&apos;applique a tous les serveurs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-slate-300">Disposition</Label>
            <Select value={activeLayout} onValueChange={(value) => setActiveLayout(value as FloorPlanLayoutId)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-sm">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {allLayouts.map((layout) => (
                  <SelectItem key={layout.id} value={layout.id}>
                    {layout.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-slate-400">
              {allLayouts.find((layout) => layout.id === activeLayout)?.description}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveActive} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              Enregistrer
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                fetchLayoutSetting()
                fetchLayouts()
              }}
              className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
            >
              Recharger
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-white text-base sm:text-lg">Dispositions personnalisees</CardTitle>
          <CardDescription className="text-slate-400 text-xs sm:text-sm">
            Creer et modifier des dispositions custom
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <Label className="text-sm text-slate-300">Nouvelle disposition</Label>
              <Input
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-sm"
                placeholder="Ex: Salle ete"
              />
            </div>
            <Button onClick={handleCreateLayout} className="bg-green-600 hover:bg-green-700">
              Creer
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Mes dispositions</Label>
              {customLayouts.length === 0 ? (
                <div className="text-sm text-slate-400">Aucune disposition personnalisee.</div>
              ) : (
                customLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                      selectedLayoutId === layout.id
                        ? "border-blue-500 bg-slate-700"
                        : "border-slate-600 bg-slate-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectLayout(layout.id)}
                      className="text-left text-slate-100 flex-1"
                    >
                      {layout.label}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteLayout(layout.id)}
                      className="bg-red-900/30 hover:bg-red-900/50 border-red-700 text-red-400 ml-2"
                    >
                      Supprimer
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-2">
              {!layoutDraft ? (
                <div className="text-sm text-slate-400">Selectionnez une disposition pour la modifier.</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-slate-300">Nom</Label>
                      <Input
                        value={layoutDraft.label}
                        onChange={(e) => updateDraft({ label: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-slate-300">Description</Label>
                      <Input
                        value={layoutDraft.description}
                        onChange={(e) => updateDraft({ description: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Zones</Label>
                    {layoutDraft.zones.map((zone, index) => (
                      <div key={zone.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end border border-slate-700 rounded-md p-3">
                        <div className="lg:col-span-3">
                          <Label className="text-xs text-slate-400">Nom</Label>
                          <Input
                            value={zone.title}
                            onChange={(e) => updateZone(index, { title: e.target.value })}
                            className="bg-slate-700 border-slate-600 text-sm"
                          />
                        </div>
                        <div className="lg:col-span-4">
                          <Label className="text-xs text-slate-400">Zones incluses</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {LOCATION_OPTIONS.map((loc) => {
                              const checked = zone.locations.includes(loc.value)
                              return (
                                <label key={loc.value} className="flex items-center gap-2 text-xs text-slate-200">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      const isChecked = Boolean(value)
                                      const next = isChecked
                                        ? [...zone.locations, loc.value]
                                        : zone.locations.filter((item) => item !== loc.value)
                                      if (next.length === 0) return
                                      updateZone(index, { locations: next })
                                    }}
                                  />
                                  {loc.label}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                        <div className="lg:col-span-3 grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-slate-400">Colonnes mobile</Label>
                            <Select
                              value={String(zone.layout?.columns?.mobile ?? 4)}
                              onValueChange={(value) =>
                                updateZone(index, {
                                  layout: {
                                    ...(zone.layout || {}),
                                    columns: {
                                      mobile: Number(value),
                                      desktop: zone.layout?.columns?.desktop ?? 8,
                                    },
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    {n}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Colonnes desktop</Label>
                            <Select
                              value={String(zone.layout?.columns?.desktop ?? 8)}
                              onValueChange={(value) =>
                                updateZone(index, {
                                  layout: {
                                    ...(zone.layout || {}),
                                    columns: {
                                      mobile: zone.layout?.columns?.mobile ?? 4,
                                      desktop: Number(value),
                                    },
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    {n}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-slate-400">Forme</Label>
                            <Select
                              value={zone.layout?.aspect ?? "square"}
                              onValueChange={(value) =>
                                updateZone(index, {
                                  layout: {
                                    ...(zone.layout || {}),
                                    aspect: value === "rect" ? "rect" : "square",
                                    columns: zone.layout?.columns ?? { mobile: 4, desktop: 8 },
                                  },
                                })
                              }
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                <SelectItem value="square">Carre</SelectItem>
                                <SelectItem value="rect">Rectangle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 justify-end items-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moveZone(index, -1)}
                              className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
                            >
                              Haut
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moveZone(index, 1)}
                              className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
                            >
                              Bas
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeZone(index)}
                              className="bg-red-900/30 hover:bg-red-900/50 border-red-700 text-red-400"
                            >
                              X
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button onClick={addZone} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white">
                      Ajouter une zone
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveLayout} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                      Enregistrer disposition
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
