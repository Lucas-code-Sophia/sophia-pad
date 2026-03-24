"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Printer } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sampleTicket } from "@/lib/epos"
import { printTicketWithConfiguredMode, type PrintMode } from "@/lib/print-client"

export default function PrintingSettingsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [kitchenIp, setKitchenIp] = useState("")
  const [barIp, setBarIp] = useState("")
  const [caisseIp, setCaisseIp] = useState("")
  const [printMode, setPrintMode] = useState<PrintMode>("server")
  const [savingPrint, setSavingPrint] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "manager") {
      fetchPrintSettings()
    }
  }, [user])

  const fetchPrintSettings = async () => {
    try {
      const res = await fetch("/api/admin/print-settings")
      if (res.ok) {
        const data = await res.json()
        setKitchenIp(data.kitchen_ip || "")
        setBarIp(data.bar_ip || "")
        setCaisseIp(data.caisse_ip || "")
        const mode: PrintMode =
          data.print_mode === "direct_epos" || data.print_mode === "airprint" ? data.print_mode : "server"
        setPrintMode(mode)
      }
    } catch (error) {
      console.error("[v0] Error fetching print settings:", error)
    }
  }

  const savePrintSettings = async () => {
    try {
      setSavingPrint(true)
      const res = await fetch("/api/admin/print-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchen_ip: kitchenIp,
          bar_ip: barIp,
          caisse_ip: caisseIp,
          print_mode: printMode,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || "Echec de l'enregistrement des parametres d'impression")
      } else {
        alert("Parametres d'impression enregistres")
      }
    } catch {
      alert("Echec de l'enregistrement des parametres d'impression")
    } finally {
      setSavingPrint(false)
    }
  }

  const testPrint = async (kind: "kitchen" | "bar" | "caisse") => {
    try {
      const result = await printTicketWithConfiguredMode({
        kind,
        ticket: sampleTicket(kind),
        modeOverride: printMode,
        ipOverride: kind === "bar" ? barIp : kind === "caisse" ? caisseIp : kitchenIp,
      })
      if (result.ok) {
        alert(`Test d'impression envoye (mode: ${result.mode})`)
      } else {
        alert(result.message || "Echec du test d'impression")
      }
    } catch {
      alert("Echec du test d'impression")
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  if (!user || user.role !== "manager") {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
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
            <h1 className="text-xl sm:text-3xl font-bold text-white">Impression</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Reglages centralises pour toute l'equipe (sauvegardes en base)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-slate-600 rounded-lg">
                <Printer className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-base sm:text-lg">Parametres d'impression</CardTitle>
                <CardDescription className="text-slate-400 text-xs sm:text-sm">
                  Cuisine, Bar et Caisse
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-sm text-slate-300">Mode d'impression</Label>
                <select
                  value={printMode}
                  onChange={(e) => setPrintMode(e.target.value as PrintMode)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm text-white"
                >
                  <option value="server">Serveur (Vercel)</option>
                  <option value="direct_epos">Direct Epson (LAN local)</option>
                  <option value="airprint">AirPrint (dialogue iPad)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Direct Epson et AirPrint doivent etre lances depuis un appareil sur le Wi-Fi local du restaurant.
                </p>
              </div>
              <div>
                <Label className="text-sm text-slate-300">IP Cuisine</Label>
                <Input
                  value={kitchenIp}
                  onChange={(e) => setKitchenIp(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-sm"
                  placeholder="192.168.1.30"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">IP Bar</Label>
                <Input
                  value={barIp}
                  onChange={(e) => setBarIp(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-sm"
                  placeholder="192.168.1.31"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">IP Caisse</Label>
                <Input
                  value={caisseIp}
                  onChange={(e) => setCaisseIp(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-sm"
                  placeholder="192.168.1.32"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={savePrintSettings}
                  disabled={savingPrint}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Enregistrer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testPrint("kitchen")}
                  className="bg-slate-600 hover:bg-slate-500 border-slate-500"
                >
                  Test Cuisine
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testPrint("bar")}
                  className="bg-slate-600 hover:bg-slate-500 border-slate-500"
                >
                  Test Bar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testPrint("caisse")}
                  className="bg-slate-600 hover:bg-slate-500 border-slate-500"
                >
                  Test Caisse
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
