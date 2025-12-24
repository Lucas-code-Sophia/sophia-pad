"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Pencil, Trash2, Search, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { MenuItem } from "@/lib/types"

export default function MenuEditorPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [editDialog, setEditDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    tax_rate: "20",
    category: "",
    routing: "cuisine" as "cuisine" | "bar",
    out_of_stock: false,
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "manager") {
      fetchMenu()
    }
  }, [user])

  const fetchMenu = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([fetch("/api/menu/items"), fetch("/api/menu/categories")])

      if (itemsRes.ok) {
        const items = await itemsRes.json()
        setMenuItems(items)
      }

      if (categoriesRes.ok) {
        const cats = await categoriesRes.json()
        setCategories(cats.map((c: any) => c.name))
      }
    } catch (error) {
      console.error("[v0] Error fetching menu:", error)
    }
  }

  const handleSaveItem = async () => {
    try {
      const itemData = editingItem || newItem
      const url = editingItem ? `/api/menu/items/${editingItem.id}` : "/api/menu/items"
      const method = editingItem ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemData.name,
          price: Number.parseFloat(itemData.price.toString()),
          tax_rate: Number.parseFloat(itemData.tax_rate.toString()),
          category: itemData.category,
          routing: itemData.routing,
          out_of_stock: itemData.out_of_stock,
        }),
      })

      if (response.ok) {
        setEditDialog(false)
        setEditingItem(null)
        setNewItem({ name: "", price: "", tax_rate: "20", category: "", routing: "cuisine", out_of_stock: false })
        fetchMenu()
      }
    } catch (error) {
      console.error("[v0] Error saving item:", error)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return

    try {
      const response = await fetch(`/api/menu/items/${id}`, { method: "DELETE" })
      if (response.ok) {
        fetchMenu()
      }
    } catch (error) {
      console.error("[v0] Error deleting item:", error)
    }
  }

  const toggleOutOfStock = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/menu/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          out_of_stock: !currentStatus,
        }),
      })

      if (response.ok) {
        fetchMenu()
      }
    } catch (error) {
      console.error("[v0] Error toggling out of stock:", error)
    }
  }

  const filteredMenuItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const groupedItems = filteredMenuItems.reduce(
    (acc, item) => {
      const category = item.category || "Sans catégorie"
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    },
    {} as Record<string, MenuItem[]>,
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            size="sm"
            className="bg-slate-800 text-white border-slate-700"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Retour</span>
          </Button>
          <h1 className="text-xl sm:text-3xl font-bold text-white">Éditeur de menu</h1>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null)
            setEditDialog(true)
          }}
          size="sm"
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Ajouter un article</span>
        </Button>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="relative max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Rechercher un plat ou une catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm"
          />
        </div>
        {searchQuery && (
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            {filteredMenuItems.length} résultat{filteredMenuItems.length > 1 ? "s" : ""} trouvé
            {filteredMenuItems.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="space-y-4 sm:space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <Card key={category} className="bg-slate-800 border-slate-700">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-white text-base sm:text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 sm:p-3 rounded gap-3 ${
                      item.out_of_stock ? "bg-red-900/30 border-2 border-red-700" : "bg-slate-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white text-sm sm:text-base truncate">{item.name}</div>
                        {item.out_of_stock && (
                          <Badge className="bg-red-600 text-xs flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Rupture
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-400">
                        {item.price.toFixed(2)} € • TVA {item.tax_rate}% •{" "}
                        {item.routing === "cuisine" ? "Cuisine" : "Bar"}
                      </div>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOutOfStock(item.id, item.out_of_stock || false)}
                        className={`${
                          item.out_of_stock
                            ? "bg-red-900/50 hover:bg-red-900/70 border-red-700 text-red-300"
                            : "bg-orange-900/30 hover:bg-orange-900/50 border-orange-700 text-orange-300"
                        } h-8 w-8 sm:h-9 sm:w-9 p-0`}
                        title={item.out_of_stock ? "Retirer la rupture" : "Marquer en rupture"}
                      >
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingItem(item)
                          setEditDialog(true)
                        }}
                        className="bg-slate-600 hover:bg-slate-500 border-slate-500 h-8 w-8 sm:h-9 sm:w-9 p-0"
                      >
                        <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteItem(item.id)}
                        className="bg-red-900/30 hover:bg-red-900/50 border-red-700 text-red-400 h-8 w-8 sm:h-9 sm:w-9 p-0"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.keys(groupedItems).length === 0 && (
          <Card className="bg-slate-800 border-slate-700 p-6 sm:p-8">
            <p className="text-center text-slate-400 text-sm">
              {searchQuery ? "Aucun résultat trouvé" : "Aucun article dans le menu"}
            </p>
          </Card>
        )}
      </div>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingItem ? "Modifier l'article" : "Nouvel article"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-sm">Nom</Label>
              <Input
                value={editingItem ? editingItem.name : newItem.name}
                onChange={(e) =>
                  editingItem
                    ? setEditingItem({ ...editingItem, name: e.target.value })
                    : setNewItem({ ...newItem, name: e.target.value })
                }
                className="bg-slate-700 border-slate-600 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm">Prix (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingItem ? editingItem.price : newItem.price}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, price: Number.parseFloat(e.target.value) })
                      : setNewItem({ ...newItem, price: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-sm"
                />
              </div>
              <div>
                <Label className="text-sm">TVA (%)</Label>
                <Input
                  type="number"
                  value={editingItem ? editingItem.tax_rate : newItem.tax_rate}
                  onChange={(e) =>
                    editingItem
                      ? setEditingItem({ ...editingItem, tax_rate: Number.parseFloat(e.target.value) })
                      : setNewItem({ ...newItem, tax_rate: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm">Catégorie</Label>
              <Input
                value={editingItem ? editingItem.category : newItem.category}
                onChange={(e) =>
                  editingItem
                    ? setEditingItem({ ...editingItem, category: e.target.value })
                    : setNewItem({ ...newItem, category: e.target.value })
                }
                className="bg-slate-700 border-slate-600 text-sm"
                list="categories"
              />
              <datalist id="categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-sm">Impression</Label>
              <select
                value={editingItem ? editingItem.routing : newItem.routing}
                onChange={(e) =>
                  editingItem
                    ? setEditingItem({ ...editingItem, routing: e.target.value as "cuisine" | "bar" })
                    : setNewItem({ ...newItem, routing: e.target.value as "cuisine" | "bar" })
                }
                className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white text-sm"
              >
                <option value="cuisine">Cuisine</option>
                <option value="bar">Bar</option>
              </select>
            </div>
            <div className="mt-4">
              <Label className="text-sm">État de stock</Label>
              <select
                value={
                  editingItem ? (editingItem.out_of_stock ? "true" : "false") : newItem.out_of_stock ? "true" : "false"
                }
                onChange={(e) =>
                  editingItem
                    ? setEditingItem({ ...editingItem, out_of_stock: e.target.value === "true" })
                    : setNewItem({ ...newItem, out_of_stock: e.target.value === "true" })
                }
                className="w-full bg-slate-700 border-slate-600 rounded-md p-2 text-white text-sm"
              >
                <option value="false">En stock</option>
                <option value="true">Rupture</option>
              </select>
            </div>
            <Button onClick={handleSaveItem} className="w-full bg-blue-600 hover:bg-blue-700 text-sm">
              {editingItem ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
