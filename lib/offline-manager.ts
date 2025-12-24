"use client"

import { useState, useEffect } from "react"

export interface PendingOrder {
  id: string
  tableId: string
  serverId: string
  items: any[]
  supplements: any[]
  timestamp: number
  orderId?: string
}

const STORAGE_KEY = "pending_orders"

export function useOfflineManager() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Load pending orders from localStorage
    loadPendingOrders()

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingOrders()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Try to sync every 10 seconds if offline
    const syncInterval = setInterval(() => {
      if (navigator.onLine && pendingOrders.length > 0) {
        syncPendingOrders()
      }
    }, 10000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(syncInterval)
    }
  }, [pendingOrders.length])

  const loadPendingOrders = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setPendingOrders(JSON.parse(stored))
      }
    } catch (error) {
      console.error("[v0] Error loading pending orders:", error)
    }
  }

  const savePendingOrder = (order: Omit<PendingOrder, "id" | "timestamp">) => {
    const newOrder: PendingOrder = {
      ...order,
      id: `offline-${Date.now()}`,
      timestamp: Date.now(),
    }

    const updated = [...pendingOrders, newOrder]
    setPendingOrders(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    return newOrder.id
  }

  const syncPendingOrders = async () => {
    if (pendingOrders.length === 0 || isSyncing) return

    setIsSyncing(true)

    try {
      const successfulIds: string[] = []

      for (const order of pendingOrders) {
        try {
          const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tableId: order.tableId,
              serverId: order.serverId,
              items: order.items,
              supplements: order.supplements,
              orderId: order.orderId,
            }),
          })

          if (response.ok) {
            successfulIds.push(order.id)
          }
        } catch (error) {
          console.error("[v0] Error syncing order:", error)
        }
      }

      // Remove successfully synced orders
      if (successfulIds.length > 0) {
        const remaining = pendingOrders.filter((o) => !successfulIds.includes(o.id))
        setPendingOrders(remaining)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining))
      }
    } catch (error) {
      console.error("[v0] Error during sync:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const clearPendingOrders = () => {
    setPendingOrders([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    isOnline,
    pendingOrders,
    isSyncing,
    savePendingOrder,
    syncPendingOrders,
    clearPendingOrders,
  }
}
