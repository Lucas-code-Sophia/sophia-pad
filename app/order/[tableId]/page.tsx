"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { Table, MenuCategory, MenuItem, Order, OrderItem } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Plus, Minus, Send, Clock, DollarSign, Gift, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useOfflineManager } from "@/lib/offline-manager"
import { OfflineIndicator } from "@/components/offline-indicator"

// Fonction pour générer un ID unique
const generateUniqueId = (productName: string) => {
  const name = productName.toLowerCase().replace(/\s+/g, '-')
  const time = new Date().toTimeString().slice(0, 5).replace(':', '')
  const random = Math.random().toString(36).substr(2, 4)
  return `${name}-${time}-${random}`
}

interface CartItem {
  id: string // ID du panier (React)
  cartItemId: string // ID unique pour la BDD
  menuItem: MenuItem | null // Peut être null si non trouvé
  quantity: number
  status: "pending" | "to_follow_1" | "to_follow_2" | "fired" | "completed"
  notes?: string
  isComplimentary?: boolean
  complimentaryReason?: string
}

interface SupplementItem {
  id: string
  name: string
  amount: number
  notes?: string
  isComplimentary?: boolean
  complimentaryReason?: string
}

export default function OrderPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const tableId = params.tableId as string
  const { isOnline, savePendingOrder, syncPendingOrders } = useOfflineManager()

  const [table, setTable] = useState<Table | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [supplements, setSupplements] = useState<SupplementItem[]>([])
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [existingItems, setExistingItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notesDialog, setNotesDialog] = useState<{ open: boolean; itemId: string | null }>({
    open: false,
    itemId: null,
  })
  const [tempNotes, setTempNotes] = useState("")
  const [supplementDialog, setSupplementDialog] = useState(false)
  const [supplementForm, setSupplementForm] = useState({
    name: "",
    amount: "",
    notes: "",
    isComplimentary: false,
    complimentaryReason: "",
  })
  const [complimentaryDialog, setComplimentaryDialog] = useState<{
    open: boolean
    itemId: string | null
    type: "cart" | "supplement"
  }>({
    open: false,
    itemId: null,
    type: "cart",
  })
  const [complimentaryReason, setComplimentaryReason] = useState("")

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && tableId) {
      fetchData()
    }
  }, [user, tableId])

  // Realtime : écouter les changements sur order_items pour mise à jour instantanée
  useEffect(() => {
    if (!currentOrder?.id) return

    const supabase = createClient()
    
    const channel = supabase
      .channel(`order_${currentOrder.id}`)
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'order_items',
        filter: `order_id=eq.${currentOrder.id}` // Seulement pour cette commande
      }, (payload) => {
        // Mapper le payload vers notre format CartItem
        const mapPayloadToCartItem = (item: any): CartItem => {
          const menuItem = menuItems.find((m: MenuItem) => m.id === item.menu_item_id)
          return {
            id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            cartItemId: item.id,
            menuItem: menuItem || null,
            quantity: item.quantity,
            status: item.status as CartItem['status'],
            notes: item.notes,
            isComplimentary: item.is_complimentary,
            complimentaryReason: item.complimentary_reason,
          }
        }

        if (payload.eventType === 'INSERT') {
          // Ajouter le nouvel item au panier
          const newItem = mapPayloadToCartItem(payload.new)
          if (newItem.status !== 'fired' && newItem.status !== 'completed') {
            setCart(prev => [...prev, newItem])
          }
        } else if (payload.eventType === 'UPDATE') {
          // Mettre à jour l'item existant
          setCart(prev => prev.map(item => {
            if (item.cartItemId === payload.new.id) {
              const updatedItem = mapPayloadToCartItem(payload.new)
              // Garder dans le panier seulement si pas fired/completed
              return (updatedItem.status !== 'fired' && updatedItem.status !== 'completed')
                ? updatedItem
                : item
            }
            return item
          }))
        } else if (payload.eventType === 'DELETE') {
          // Supprimer l'item du panier
          setCart(prev => prev.filter(item => item.cartItemId !== payload.old.id))
        }
      })
      .subscribe()

    // Cleanup : se désabonner au démontage
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentOrder?.id, menuItems])

  const fetchData = async () => {
    try {
      // Fetch table
      const tableRes = await fetch(`/api/tables/${tableId}`)
      if (tableRes.ok) {
        const tableData = await tableRes.json()
        setTable(tableData)
      }

      // Fetch categories
      const categoriesRes = await fetch("/api/menu/categories")
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
        if (categoriesData.length > 0) {
          setSelectedCategory(categoriesData[0].id)
        }
      }

      // Fetch menu items
      const itemsRes = await fetch("/api/menu/items")
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        setMenuItems(itemsData)
        
        // Maintenant que menuItems est chargé, fetch les orders
        const orderRes = await fetch(`/api/orders/table/${tableId}`)
        if (orderRes.ok) {
          const orderData = await orderRes.json()
          if (orderData) {
            setCurrentOrder(orderData.order)
            
            // Organiser les articles selon leur statut
            const pendingItems = orderData.items.filter((item: OrderItem) => item.status === "pending")
            const toFollow1Items = orderData.items.filter((item: OrderItem) => item.status === "to_follow_1")
            const toFollow2Items = orderData.items.filter((item: OrderItem) => item.status === "to_follow_2")
            const firedItems = orderData.items.filter((item: OrderItem) => item.status === "fired" || item.status === "completed")
            
            // Mettre TOUS les articles non envoyés dans le panier (pending + to_follow)
            const cartItems = [...pendingItems, ...toFollow1Items, ...toFollow2Items].map((item: OrderItem) => {
              const menuItem = itemsData.find((m: MenuItem) => m.id === item.menu_item_id)
              if (!menuItem) {
                console.warn("[v0] MenuItem not found for item:", item.menu_item_id)
              }
              return {
                id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                cartItemId: item.id, // Utiliser l'ID de la BDD comme référence unique
                menuItem: menuItem || null,
                quantity: item.quantity,
                status: item.status as "pending" | "to_follow_1" | "to_follow_2",
                notes: item.notes,
                isComplimentary: item.is_complimentary,
                complimentaryReason: item.complimentary_reason,
              }
            })
            
            // Vider d'abord le panier, puis mettre tous les articles non envoyés
            setCart([])
            setCart(cartItems)
            setExistingItems(firedItems)
            
            console.log("[v0] Order loaded:", {
              pending: pendingItems.length,
              toFollow1: toFollow1Items.length,
              toFollow2: toFollow2Items.length,
              fired: firedItems.length,
              cartItems: cartItems.length, // Maintenant inclut pending + to_follow
              totalInCart: pendingItems.length + toFollow1Items.length + toFollow2Items.length
            })
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (menuItem: MenuItem) => {
    // BDD source de vérité:
    // - si un item "pending" identique existe déjà, on incrémente sa quantité
    // - sinon, on insère un nouvel item en BDD
    try {
      const existingPending = cart.find(
        (i) => i.status === "pending" && i.menuItem?.id === menuItem.id && (!i.notes || i.notes.trim() === ""),
      )

      if (existingPending) {
        const response = await fetch("/api/orders/fire-follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrder?.id,
            items: [
              {
                cartItemId: existingPending.cartItemId,
                menuItemId: menuItem.id,
                quantity: existingPending.quantity + 1,
                price: menuItem.price,
                status: existingPending.status,
                notes: existingPending.notes,
                isComplimentary: existingPending.isComplimentary || false,
                complimentaryReason: existingPending.complimentaryReason,
              },
            ],
            serverId: user?.id || "",
          }),
        })

        if (response.ok) {
          // Plus besoin de fetchData() - Realtime gère la mise à jour
        }
        return
      }

      const orderData = {
        tableId,
        serverId: user?.id || "",
        items: [
          {
            menuItemId: menuItem.id,
            quantity: 1,
            price: menuItem.price,
            status: "pending",
            notes: "",
            isComplimentary: false,
            complimentaryReason: "",
          },
        ],
        supplements: [],
        orderId: currentOrder?.id,
      }

      const response = await fetch("/api/orders/to-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        // Plus besoin de fetchData() - Realtime gère la mise à jour
      }
    } catch (error) {
      console.error("[v0] Error adding item to cart:", error)
    }
  }

  const removeFromCart = async (cartItemId: string) => {
    // Trouver l'article dans le panier
    const item = cart.find((item) => item.cartItemId === cartItemId)
    if (!item) return
    
    try {
      if (item.quantity > 1) {
        // Mettre à jour la quantité en utilisant l'API existante
        const response = await fetch("/api/orders/fire-follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrder?.id,
            items: [{
              cartItemId: cartItemId,
              menuItemId: item.menuItem?.id || '',
              quantity: item.quantity - 1,
              price: item.menuItem?.price || 0,
              status: item.status, // Garder le même statut
              notes: item.notes,
              isComplimentary: item.isComplimentary || false,
              complimentaryReason: item.complimentaryReason,
            }],
            serverId: user?.id || "",
          }),
        })
        
        if (response.ok) {
          // Plus besoin de fetchData() - Realtime gère la mise à jour
        }
      } else {
        // Supprimer l'article
        const response = await fetch("/api/orders/fire-follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrder?.id,
            items: [{
              cartItemId: cartItemId,
              menuItemId: item.menuItem?.id || '',
              quantity: 0, // Quantité 0 = suppression
              price: item.menuItem?.price || 0,
              status: item.status,
              notes: item.notes,
              isComplimentary: item.isComplimentary || false,
              complimentaryReason: item.complimentaryReason,
            }],
            serverId: user?.id || "",
          }),
        })
        
        if (response.ok) {
          // Plus besoin de fetchData() - Realtime gère la mise à jour
        }
      }
    } catch (error) {
      console.error("[v0] Error removing item from cart:", error)
    }
  }

  const toggleToFollow = async (cartItemId: string) => {
    // Trouver l'article actuel
    const item = cart.find((item) => item.cartItemId === cartItemId)
    if (!item) return
    
    // Calculer le nouveau statut
    let newStatus: "pending" | "to_follow_1" | "to_follow_2"
    if (item.status === "pending") {
      newStatus = "to_follow_1"
    } else if (item.status === "to_follow_1") {
      newStatus = "to_follow_2"
    } else {
      newStatus = "pending"
    }
    
    try {
      // Mettre à jour le statut en base
      const response = await fetch("/api/orders/fire-follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: currentOrder?.id,
          items: [{
            cartItemId: cartItemId,
            menuItemId: item.menuItem?.id || '',
            quantity: item.quantity,
            price: item.menuItem?.price || 0,
            status: newStatus, // Nouveau statut
            notes: item.notes,
            isComplimentary: item.isComplimentary || false,
            complimentaryReason: item.complimentaryReason,
          }],
          serverId: user?.id || "",
        }),
      })
      
      if (response.ok) {
        // Plus besoin de fetchData() - Realtime gère la mise à jour
      }
    } catch (error) {
      console.error("[v0] Error toggling to-follow status:", error)
    }
  }

  const openNotesDialog = (cartItemId: string) => {
    const item = cart.find((i) => i.cartItemId === cartItemId)
    setTempNotes(item?.notes || "")
    setNotesDialog({ open: true, itemId: cartItemId })
  }

  const saveNotes = async () => {
    if (notesDialog.itemId) {
      // Trouver l'article actuel
      const item = cart.find((item) => item.cartItemId === notesDialog.itemId)
      if (!item) return
      
      try {
        // Mettre à jour les notes en base
        const response = await fetch("/api/orders/fire-follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrder?.id,
            items: [{
              cartItemId: notesDialog.itemId,
              menuItemId: item.menuItem?.id || '',
              quantity: item.quantity,
              price: item.menuItem?.price || 0,
              status: item.status,
              notes: tempNotes, // Nouvelles notes
              isComplimentary: item.isComplimentary || false,
              complimentaryReason: item.complimentaryReason,
            }],
            serverId: user?.id || "",
          }),
        })
        
        if (response.ok) {
          // Plus besoin de fetchData() - Realtime gère la mise à jour
        }
      } catch (error) {
        console.error("[v0] Error saving notes:", error)
      }
    }
    setNotesDialog({ open: false, itemId: null })
    setTempNotes("")
  }

  const addSupplement = () => {
    if (
      !supplementForm.name ||
      (!supplementForm.isComplimentary && (!supplementForm.amount || Number.parseFloat(supplementForm.amount) <= 0))
    ) {
      alert("Veuillez remplir le nom et le montant (ou cocher Offert)")
      return
    }

    const newSupplement: SupplementItem = {
      id: `supplement-${Date.now()}`,
      name: supplementForm.name,
      amount: supplementForm.isComplimentary ? 0 : Number.parseFloat(supplementForm.amount),
      notes: supplementForm.notes,
      isComplimentary: supplementForm.isComplimentary,
      complimentaryReason: supplementForm.complimentaryReason,
    }

    setSupplements((prev) => [...prev, newSupplement])
    setSupplementForm({ name: "", amount: "", notes: "", isComplimentary: false, complimentaryReason: "" })
    setSupplementDialog(false)
  }

  const removeSupplement = (id: string) => {
    setSupplements((prev) => prev.filter((s) => s.id !== id))
  }

  const toggleComplimentary = (itemId: string, type: "cart" | "supplement") => {
    setComplimentaryDialog({ open: true, itemId, type })
  }

  const saveComplimentary = async () => {
    if (complimentaryDialog.type === "cart" && complimentaryDialog.itemId) {
      // Trouver l'article actuel
      const item = cart.find((item) => item.cartItemId === complimentaryDialog.itemId)
      if (!item) return
      
      try {
        // Mettre à jour le statut offert en base
        const response = await fetch("/api/orders/fire-follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrder?.id,
            items: [{
              cartItemId: complimentaryDialog.itemId,
              menuItemId: item.menuItem?.id || '',
              quantity: item.quantity,
              price: item.menuItem?.price || 0,
              status: item.status,
              notes: item.notes,
              isComplimentary: !item.isComplimentary, // Inverser le statut
              complimentaryReason: !item.isComplimentary ? complimentaryReason : "",
            }],
            serverId: user?.id || "",
          }),
        })
        
        if (response.ok) {
          // Plus besoin de fetchData() - Realtime gère la mise à jour
        }
      } catch (error) {
        console.error("[v0] Error saving complimentary status:", error)
      }
    } else if (complimentaryDialog.type === "supplement" && complimentaryDialog.itemId) {
      // Les suppléments ne sont pas persistés en BDD avant l'envoi: on reste en local
      setSupplements((prev) =>
        prev.map((sup) =>
          sup.id === complimentaryDialog.itemId
            ? {
                ...sup,
                isComplimentary: !sup.isComplimentary,
                complimentaryReason: !sup.isComplimentary ? complimentaryReason : "",
              }
            : sup,
        ),
      )
    }
    setComplimentaryDialog({ open: false, itemId: null, type: "cart" })
    setComplimentaryReason("")
  }

  const sendOrder = async () => {
    if (cart.length === 0 && supplements.length === 0) return

    // Séparer ce qui doit être envoyé immédiatement vs ce qui reste en "à suivre"
    let itemsToSend = cart.filter((item) => item.status === "pending")
    const itemsToKeep = cart.filter((item) => item.status !== "pending") // Les "à suivre"
    
    // Si aucun article "pending" mais qu'il y a des "à suivre 1", les envoyer
    if (itemsToSend.length === 0) {
      const toFollow1Items = cart.filter((item) => item.status === "to_follow_1")
      if (toFollow1Items.length > 0) {
        itemsToSend = toFollow1Items
        console.log("[v0] No pending items, sending to_follow_1 items instead")
      }
    }
    
    // N'envoyer les suppléments que s'il y a des plats à envoyer
    const supplementsToSend = itemsToSend.length > 0 ? supplements : []

    console.log("🔍 DEBUG sendOrder:")
    console.log("- Cart total:", cart.length)
    console.log("- Items to send (pending):", cart.filter((item) => item.status === "pending").length)
    console.log("- Items to send (final):", itemsToSend.length)
    console.log("- Items to keep (à suivre):", itemsToKeep.length)
    console.log("- Supplements to send:", supplementsToSend.length)

    if (itemsToSend.length === 0 && supplementsToSend.length === 0) {
      alert("Aucun plat à envoyer")
      return
    }

    // Préparer TOUS les articles du panier pour que l'API sache lesquels garder
    const allItemsForAPI = cart.map((item) => {
      // Les articles à envoyer deviennent "fired"
      if (itemsToSend.some(sendItem => sendItem.cartItemId === item.cartItemId)) {
        return {
          cartItemId: item.cartItemId,
          menuItemId: item.menuItem?.id || '',
          quantity: item.quantity,
          price: item.menuItem?.price || 0,
          status: "fired", // Les items envoyés deviennent "fired"
          notes: item.notes,
          isComplimentary: item.isComplimentary || false,
          complimentaryReason: item.complimentaryReason,
        }
      }
      // Les articles "à suivre" gardent leur statut
      return {
        cartItemId: item.cartItemId,
        menuItemId: item.menuItem?.id || '',
        quantity: item.quantity,
        price: item.menuItem?.price || 0,
        status: item.status, // Garder le statut "à suivre"
        notes: item.notes,
        isComplimentary: item.isComplimentary || false,
        complimentaryReason: item.complimentaryReason,
      }
    })

    const orderData = {
      tableId,
      serverId: user?.id || "",
      items: allItemsForAPI, // TOUS les articles du panier
      supplements: supplementsToSend.map((sup) => ({
        name: sup.name,
        amount: sup.amount,
        notes: sup.notes,
        isComplimentary: sup.isComplimentary || false,
        complimentaryReason: sup.complimentaryReason,
      })),
      orderId: currentOrder?.id,
    }

    if (!isOnline) {
      savePendingOrder(orderData)
      setCart(itemsToKeep) // Garder seulement les "à suivre"
      alert("Commande enregistrée. Elle sera envoyée dès que la connexion sera rétablie.")
      return
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        // On se resynchronise depuis la BDD (source de vérité)
        await fetchData()

        // Vider les suppléments seulement s'ils ont été envoyés
        if (supplementsToSend.length > 0) {
          setSupplements([])
        }

        alert(`${getFollowNumberText()} envoyés à la cuisine !`)
      } else {
        throw new Error("Failed to create order")
      }
    } catch (error) {
      console.error("[v0] Error sending order:", error)
      savePendingOrder(orderData)
      
      // Vider le panier même en erreur - la BDD est la source de vérité
      setCart([])
      console.log("[v0] Order saved offline and cart cleared")
      alert("Erreur réseau. Commande enregistrée et sera envoyée automatiquement.")
    }
  }

  const fireToFollowItems = async () => {
    try {
      let toFollowItems = []
      let followNumber = ""
      
      // D'abord essayer d'envoyer les plats normaux (pending)
      toFollowItems = cart.filter((item) => item.status === "pending")
      if (toFollowItems.length > 0) {
        followNumber = "plats normaux"
      } else {
        // Si pas de plats normaux, envoyer les "À suivre 1"
        toFollowItems = cart.filter((item) => item.status === "to_follow_1")
        if (toFollowItems.length > 0) {
          followNumber = "À suivre 1"
        } else {
          // Si pas de "À suivre 1", envoyer les "À suivre 2"
          toFollowItems = cart.filter((item) => item.status === "to_follow_2")
          if (toFollowItems.length > 0) {
            followNumber = "À suivre 2"
          }
        }
      }
      
      if (toFollowItems.length === 0) {
        alert("Aucun plat à envoyer")
        return
      }

      // Utiliser /api/orders (c'est lui qui passe en "fired" + crée les tickets)
      // On envoie tous les items du panier, en marquant uniquement le batch choisi en "fired".
      const allItemsForAPI = cart.map((item) => {
        const shouldFire = toFollowItems.some((f) => f.cartItemId === item.cartItemId)
        return {
          cartItemId: item.cartItemId,
          menuItemId: item.menuItem?.id || "",
          quantity: item.quantity,
          price: item.menuItem?.price || 0,
          status: shouldFire ? "fired" : item.status,
          notes: item.notes,
          isComplimentary: item.isComplimentary || false,
          complimentaryReason: item.complimentaryReason,
        }
      })

      const orderData = {
        tableId,
        serverId: user?.id || "",
        items: allItemsForAPI,
        supplements: [],
        orderId: currentOrder?.id,
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      if (response.ok) {
        await fetchData()
        alert(`${followNumber} envoyés à la cuisine !`)
      }
    } catch (error) {
      console.error("[v0] Error firing to follow items:", error)
      alert("Erreur lors de l'envoi des plats")
    }
  }

  
  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const handleBackClick = async () => {
    // Plus besoin de sauvegarder : tous les articles sont déjà en base
    router.push("/floor-plan")
  }

  const filteredItems = menuItems.filter((item) => item.category_id === selectedCategory)
  const cartTotal =
    cart.reduce((sum, item) => sum + (item.isComplimentary || !item.menuItem ? 0 : item.menuItem.price * item.quantity), 0) +
    supplements.reduce((sum, sup) => sum + (sup.isComplimentary ? 0 : sup.amount), 0) +
    existingItems.reduce((sum, item) => sum + (item.is_complimentary ? 0 : item.price * item.quantity), 0)
  const toFollowCount = cart.filter((item) => item.status === "to_follow_1" || item.status === "to_follow_2").length
  
  // Compter les plats et boissons à envoyer
  const getItemsToSendText = () => {
    const itemsToSend = cart.filter((item) => item.status === "pending")
    const toFollow1Items = cart.filter((item) => item.status === "to_follow_1")
    const toFollow2Items = cart.filter((item) => item.status === "to_follow_2")
    
    let itemsText = ""
    let supplementsText = ""
    
    if (itemsToSend.length > 0) {
      itemsText = `${itemsToSend.length} plat${itemsToSend.length > 1 ? 's' : ''}`
    } else if (toFollow1Items.length > 0 && toFollow2Items.length > 0) {
      // Les deux types de "à suivre" sont présents
      itemsText = `${toFollow1Items.length} plat${toFollow1Items.length > 1 ? 's' : ''} à suivre 1 et ${toFollow2Items.length} plat${toFollow2Items.length > 1 ? 's' : ''} à suivre 2`
    } else if (toFollow1Items.length > 0) {
      // Seulement des "à suivre 1"
      itemsText = `${toFollow1Items.length} plat${toFollow1Items.length > 1 ? 's' : ''} à suivre 1`
    } else if (toFollow2Items.length > 0) {
      // Seulement des "à suivre 2"
      itemsText = `${toFollow2Items.length} plat${toFollow2Items.length > 1 ? 's' : ''} à suivre 2`
    }
    
    if (supplements.length > 0) {
      supplementsText = ` et ${supplements.length} boisson${supplements.length > 1 ? 's' : ''}`
    }
    
    return itemsText + supplementsText
  }

  const getFollowNumberText = () => {
    const itemsToSend = cart.filter((item) => item.status === "pending")
    const toFollow1Items = cart.filter((item) => item.status === "to_follow_1")
    const toFollow2Items = cart.filter((item) => item.status === "to_follow_2")
    
    if (itemsToSend.length > 0) {
      return `${itemsToSend.length} plat${itemsToSend.length > 1 ? 's' : ''}`
    } else if (toFollow1Items.length > 0 && toFollow2Items.length > 0) {
      return `${toFollow1Items.length} plat${toFollow1Items.length > 1 ? 's' : ''} à suivre 1 et ${toFollow2Items.length} plat${toFollow2Items.length > 1 ? 's' : ''} à suivre 2`
    } else if (toFollow1Items.length > 0) {
      return `${toFollow1Items.length} plat${toFollow1Items.length > 1 ? 's' : ''} à suivre 1`
    } else if (toFollow2Items.length > 0) {
      return `${toFollow2Items.length} plat${toFollow2Items.length > 1 ? 's' : ''} à suivre 2`
    }
    
    return ""
  }

  // Vérifier s'il reste des plats non envoyés avant d'aller à l'addition
  const handleBillClick = () => {
    const unprocessedItems = cart.filter(item => 
      item.status === "pending" || item.status === "to_follow_1" || item.status === "to_follow_2"
    )
    
    if (unprocessedItems.length > 0) {
      if (confirm(`⚠️ Attention !\n\nIl reste ${unprocessedItems.length} plat${unprocessedItems.length > 1 ? 's' : ''} non envoyé${unprocessedItems.length > 1 ? 's' : ''}.\n\nVoulez-vous continuer quand même vers l'addition ?`)) {
        router.push(`/bill/${tableId}`)
      }
    } else {
      router.push(`/bill/${tableId}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4">
      <OfflineIndicator />

      {/* Header */}
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <Button
          onClick={handleBackClick}
          variant="outline"
          size="sm"
          className="bg-slate-800 text-white border-slate-700"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Retour</span>
        </Button>
        <div className="text-center flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-white">Table {table?.table_number}</h1>
          <p className="text-xs sm:text-sm text-slate-400">{table?.seats} couverts</p>
        </div>
        <Button
          onClick={handleBillClick}
          variant="outline"
          size="sm"
          className="bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
          disabled={!currentOrder || existingItems.length === 0}
        >
          <span className="text-xs sm:text-sm">Addition</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Menu Section */}
        <div className="lg:col-span-8">
          {/* Categories */}
          <div className="mb-3 sm:mb-4 flex gap-1.5 sm:gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                size="sm"
                variant={selectedCategory === category.id ? "default" : "outline"}
                className={
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap text-xs sm:text-sm"
                    : "bg-slate-800 text-white border-slate-700 hover:bg-slate-750 whitespace-nowrap text-xs sm:text-sm"
                }
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {filteredItems.map((item) => {
              const cartItem = cart.find((c) => c.menuItem?.id === item.id && c.status === "pending")
              const quantity = cartItem?.quantity || 0
              const isOutOfStock = item.out_of_stock

              return (
                <Card
                  key={item.id}
                  className={`p-3 sm:p-4 transition-colors ${
                    isOutOfStock
                      ? "bg-red-900/30 border-2 border-red-700 opacity-60 cursor-not-allowed"
                      : "bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750"
                  }`}
                  onClick={() => !isOutOfStock && addToCart(item)}
                >
                  <div className="text-center">
                    <div className="font-semibold text-white text-sm sm:text-base mb-1 truncate">{item.name}</div>
                    <div className="text-xs sm:text-sm text-slate-400 mb-2">{item.price.toFixed(2)} €</div>
                    {isOutOfStock ? (
                      <div className="flex items-center justify-center gap-1 text-red-400">
                        <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm font-medium">Rupture</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        {quantity > 0 && (
                          <Badge className="bg-blue-600 text-xs mb-1">
                            {quantity}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-white h-6 w-6 sm:h-7 sm:w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToCart(item)
                          }}
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-4">
          <Card className="bg-slate-800 border-slate-700 p-3 sm:p-4 lg:sticky lg:top-4">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Commande en cours</h2>

            {/* To Follow Alert */}
            {toFollowCount > 0 && (
              <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-400">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm font-medium">{toFollowCount} plat(s) à suivre</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={fireToFollowItems}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                  >
                    Envoyer la suite
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Items */}
            {existingItems.length > 0 && (
              <div className="mb-3 sm:mb-4">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-400 mb-2">Déjà commandé</h3>
                <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                  {existingItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs sm:text-sm text-slate-300 bg-slate-900/50 p-2 rounded"
                    >
                      <span>
                        {item.quantity}x {menuItems.find((m) => m.id === item.menu_item_id)?.name}
                      </span>
                      <Badge variant="default" className="text-xs">
                        {item.status === "fired" ? "Envoyé" : 
                         item.status === "completed" ? "Terminé" : 
                         item.status === "to_follow_1" ? "À suivre 1" :
                         item.status === "to_follow_2" ? "À suivre 2" :
                         "En attente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 max-h-48 sm:max-h-60 overflow-y-auto">
              {cart.length === 0 && supplements.length === 0 ? (
                <p className="text-center text-slate-500 py-6 sm:py-8 text-sm">Panier vide</p>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className={`p-2 sm:p-3 rounded-lg ${item.isComplimentary ? "bg-green-900/20 border-2 border-green-700" : "bg-slate-900"}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white text-sm sm:text-base truncate">
                              {item.menuItem?.name || "Article inconnu"}
                            </h4>
                            {item.isComplimentary && (
                              <Badge className="bg-green-600 text-xs flex items-center gap-1">
                                <Gift className="h-3 w-3" />
                                Offert
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-xs sm:text-sm ${item.isComplimentary ? "line-through text-slate-500" : "text-slate-400"}`}
                          >
                            {item.menuItem?.price.toFixed(2) || "0.00"} €
                          </p>
                          {item.isComplimentary && item.complimentaryReason && (
                            <p className="text-xs text-green-400 italic mt-1">{item.complimentaryReason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 ml-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.cartItemId)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800 border-slate-700"
                          >
                            <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <span className="text-white font-semibold w-5 sm:w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => item.menuItem && addToCart(item.menuItem)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800 border-slate-700"
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={item.status === "to_follow_1" || item.status === "to_follow_2" ? "default" : "outline"}
                          onClick={() => toggleToFollow(item.cartItemId)}
                          className={
                            item.status === "to_follow_1" || item.status === "to_follow_2"
                              ? "bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                              : "bg-slate-800 border-slate-700 text-xs"
                          }
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {item.status === "to_follow_1" ? "À suivre 1" : item.status === "to_follow_2" ? "À suivre 2" : "À suivre"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNotesDialog(item.cartItemId)}
                          className="bg-slate-800 border-slate-700 text-xs"
                        >
                          Notes
                        </Button>
                        <Button
                          size="sm"
                          variant={item.isComplimentary ? "default" : "outline"}
                          onClick={() => toggleComplimentary(item.cartItemId, "cart")}
                          className={
                            item.isComplimentary
                              ? "bg-green-600 hover:bg-green-700 text-white text-xs"
                              : "bg-slate-800 border-slate-700 text-xs"
                          }
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Offert
                        </Button>
                      </div>
                      {item.notes && <p className="text-xs text-slate-400 mt-2 italic">{item.notes}</p>}
                    </div>
                  ))}

                  {/* Supplements */}
                  {supplements.map((supplement) => (
                    <div
                      key={supplement.id}
                      className={`p-2 sm:p-3 rounded-lg ${supplement.isComplimentary ? "bg-green-900/20 border-2 border-green-700" : "bg-purple-900/20 border border-purple-700"}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                            <h4 className="font-medium text-white text-sm sm:text-base truncate">{supplement.name}</h4>
                            {supplement.isComplimentary && (
                              <Badge className="bg-green-600 text-xs flex items-center gap-1">
                                <Gift className="h-3 w-3" />
                                Offert
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-xs sm:text-sm ${supplement.isComplimentary ? "line-through text-slate-500" : "text-purple-400"}`}
                          >
                            {supplement.amount.toFixed(2)} € (supplément)
                          </p>
                          {supplement.notes && <p className="text-xs text-slate-400 mt-1 italic">{supplement.notes}</p>}
                          {supplement.isComplimentary && supplement.complimentaryReason && (
                            <p className="text-xs text-green-400 italic mt-1">{supplement.complimentaryReason}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeSupplement(supplement.id)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-slate-800 border-slate-700 ml-2 flex-shrink-0"
                        >
                          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2">
                        <Button
                          size="sm"
                          variant={supplement.isComplimentary ? "default" : "outline"}
                          onClick={() => toggleComplimentary(supplement.id, "supplement")}
                          className={
                            supplement.isComplimentary
                              ? "bg-green-600 hover:bg-green-700 text-white text-xs"
                              : "bg-slate-800 border-slate-700 text-xs"
                          }
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Offert
                        </Button>
                        <Badge className="bg-purple-600 text-xs">Non imprimé sur le ticket</Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Supplement Button */}
            <Button
              onClick={() => setSupplementDialog(true)}
              variant="outline"
              size="sm"
              className="w-full mb-3 sm:mb-4 bg-purple-900/30 border-purple-700 text-purple-300 hover:bg-purple-900/50 text-xs sm:text-sm"
            >
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Ajouter un supplément
            </Button>

            {/* Total */}
            <div className="border-t border-slate-700 pt-3 sm:pt-4 mb-3 sm:mb-4">
              <div className="flex justify-between items-center text-white">
                <span className="text-base sm:text-lg font-semibold">Total</span>
                <span className="text-xl sm:text-2xl font-bold text-blue-400">{cartTotal.toFixed(2)} €</span>
              </div>
              {/* Afficher le détail du total si des plats sont en attente */}
              {(cart.length > 0 || existingItems.length > 0) && (
                <div className="mt-2 text-xs text-slate-400">
                  {existingItems.length > 0 && (
                    <div>Déjà commandé: {existingItems.reduce((sum, item) => sum + (item.is_complimentary ? 0 : item.price * item.quantity), 0).toFixed(2)} €</div>
                  )}
                  {cart.length > 0 && (
                    <div>Plats en attente: {cart.reduce((sum, item) => sum + (item.isComplimentary || !item.menuItem ? 0 : item.menuItem.price * item.quantity), 0).toFixed(2)} €</div>
                  )}
                  {supplements.length > 0 && (
                    <div>Suppléments: {supplements.reduce((sum, sup) => sum + (sup.isComplimentary ? 0 : sup.amount), 0).toFixed(2)} €</div>
                  )}
                </div>
              )}
            </div>

            {/* Send Button */}
            <Button
              onClick={sendOrder}
              disabled={cart.length === 0 && supplements.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg py-5 sm:py-6"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Envoyer la commande
            </Button>
          </Card>
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onOpenChange={(open) => setNotesDialog({ open, itemId: null })}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Ajouter des notes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes" className="text-slate-300">
              Notes pour la cuisine
            </Label>
            <Textarea
              id="notes"
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Ex: Sans oignons, bien cuit..."
              className="mt-2 bg-slate-900 border-slate-700 text-white"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesDialog({ open: false, itemId: null })}
              className="bg-slate-700 border-slate-600"
            >
              Annuler
            </Button>
            <Button onClick={saveNotes} className="bg-blue-600 hover:bg-blue-700">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplement Dialog */}
      <Dialog open={supplementDialog} onOpenChange={setSupplementDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un supplément</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="supplement-name" className="text-slate-300">
                Nom du supplément
              </Label>
              <Input
                id="supplement-name"
                value={supplementForm.name}
                onChange={(e) => setSupplementForm({ ...supplementForm, name: e.target.value })}
                placeholder="Ex: Pourboire, Frais de service..."
                className="mt-2 bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="supplement-complimentary"
                checked={supplementForm.isComplimentary}
                onCheckedChange={(checked) =>
                  setSupplementForm({ ...supplementForm, isComplimentary: checked as boolean })
                }
              />
              <Label htmlFor="supplement-complimentary" className="text-slate-300 cursor-pointer">
                Article offert (gratuit)
              </Label>
            </div>
            {!supplementForm.isComplimentary && (
              <div>
                <Label htmlFor="supplement-amount" className="text-slate-300">
                  Montant (€)
                </Label>
                <Input
                  id="supplement-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={supplementForm.amount}
                  onChange={(e) => setSupplementForm({ ...supplementForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="mt-2 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            )}
            {supplementForm.isComplimentary && (
              <div>
                <Label htmlFor="supplement-reason" className="text-slate-300">
                  Raison (optionnel)
                </Label>
                <Input
                  id="supplement-reason"
                  value={supplementForm.complimentaryReason}
                  onChange={(e) => setSupplementForm({ ...supplementForm, complimentaryReason: e.target.value })}
                  placeholder="Ex: Geste commercial, Erreur..."
                  className="mt-2 bg-slate-900 border-slate-700 text-white"
                />
              </div>
            )}
            <div>
              <Label htmlFor="supplement-notes" className="text-slate-300">
                Notes (optionnel)
              </Label>
              <Textarea
                id="supplement-notes"
                value={supplementForm.notes}
                onChange={(e) => setSupplementForm({ ...supplementForm, notes: e.target.value })}
                placeholder="Notes internes..."
                className="mt-2 bg-slate-900 border-slate-700 text-white"
                rows={3}
              />
            </div>
            <div className="p-3 bg-purple-900/20 border border-purple-700 rounded">
              <p className="text-sm text-purple-300">
                Ce supplément sera ajouté au total de la commande mais ne sera pas imprimé sur le ticket de caisse.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSupplementDialog(false)
                setSupplementForm({ name: "", amount: "", notes: "", isComplimentary: false, complimentaryReason: "" })
              }}
              className="bg-slate-700 border-slate-600"
            >
              Annuler
            </Button>
            <Button onClick={addSupplement} className="bg-purple-600 hover:bg-purple-700">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complimentary Dialog */}
      <Dialog
        open={complimentaryDialog.open}
        onOpenChange={(open) => setComplimentaryDialog({ open, itemId: null, type: "cart" })}
      >
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marquer comme offert</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="complimentary-reason" className="text-slate-300">
              Raison (optionnel mais recommandé)
            </Label>
            <Input
              id="complimentary-reason"
              value={complimentaryReason}
              onChange={(e) => setComplimentaryReason(e.target.value)}
              placeholder="Ex: Geste commercial, Erreur de commande, Client régulier..."
              className="mt-2 bg-slate-900 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-400 mt-2">
              Les articles offerts seront enregistrés et visibles dans le récapitulatif admin.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setComplimentaryDialog({ open: false, itemId: null, type: "cart" })
                setComplimentaryReason("")
              }}
              className="bg-slate-700 border-slate-600"
            >
              Annuler
            </Button>
            <Button onClick={saveComplimentary} className="bg-green-600 hover:bg-green-700">
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
