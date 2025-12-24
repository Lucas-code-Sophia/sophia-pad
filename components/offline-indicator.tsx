"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { WifiOff, RefreshCw } from "lucide-react"

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check pending orders
    const checkPending = () => {
      try {
        const stored = localStorage.getItem("pending_orders")
        if (stored) {
          const orders = JSON.parse(stored)
          setPendingCount(orders.length)
        } else {
          setPendingCount(0)
        }
      } catch (error) {
        setPendingCount(0)
      }
    }

    checkPending()
    const interval = setInterval(checkPending, 2000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [])

  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div className="fixed top-2 right-2 z-50">
      {!isOnline ? (
        <Badge className="bg-red-600 text-white flex items-center gap-2 px-3 py-2 shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Hors ligne</span>
        </Badge>
      ) : pendingCount > 0 ? (
        <Badge className="bg-yellow-600 text-white flex items-center gap-2 px-3 py-2 shadow-lg animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">{pendingCount} commande(s) en attente</span>
        </Badge>
      ) : null}
    </div>
  )
}
