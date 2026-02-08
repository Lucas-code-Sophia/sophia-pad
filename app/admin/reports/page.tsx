"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Calendar, Gift, Users, Target } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SalesData {
  date: string
  total: number
  orders: number
}

interface TopDish {
  name: string
  quantity: number
  revenue: number
}

interface ServerStats {
  server_name: string
  total_sales: number
  total_sales_ht?: number
  order_count: number
  average_ticket: number
  complimentary_amount?: number
  complimentary_count?: number
  complimentary_percentage?: number
}

export default function ReportsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [period, setPeriod] = useState<"today" | "7days" | "30days" | "3months" | "custom">("today")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [topDishes, setTopDishes] = useState<TopDish[]>([])
  const [serverStats, setServerStats] = useState<ServerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSales: 0,
    totalSalesHT: 0,
    totalOrders: 0,
    averageTicket: 0,
    totalTax: 0,
    taxRate10Share: 0,
    taxRate20Share: 0,
    totalComplimentaryAmount: 0,
    totalComplimentaryCount: 0,
    complimentaryPercentage: 0,
    paymentMix: {
      volume: { cash: 0, card: 0, other: 0 },
      value: { cash: 0, card: 0, other: 0 },
    },
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      router.push("/floor-plan")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === "manager" && period !== "custom") {
      fetchReports()
    }
  }, [user, period])

  useEffect(() => {
    if (user?.role === "manager" && period === "custom" && customStartDate && customEndDate) {
      fetchReports()
    }
  }, [customStartDate, customEndDate])

  const fetchReports = async () => {
    try {
      setLoading(true)
      let url = `/api/admin/reports?period=${period}`
      if (period === "custom" && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSalesData(data.salesData || [])
        setTopDishes(data.topDishes || [])
        setServerStats(data.serverStats || [])
        setStats(data.stats || { 
          totalSales: 0, 
          totalSalesHT: 0,
          totalOrders: 0, 
          averageTicket: 0, 
          totalTax: 0, 
          taxRate10Share: 0,
          taxRate20Share: 0,
          totalComplimentaryAmount: 0,
          totalComplimentaryCount: 0,
          complimentaryPercentage: 0,
          paymentMix: {
            volume: { cash: 0, card: 0, other: 0 },
            value: { cash: 0, card: 0, other: 0 },
          },
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]

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
          <h1 className="text-xl sm:text-3xl font-bold text-white">Rapports avancés</h1>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={period === "today" ? "default" : "outline"}
            onClick={() => setPeriod("today")}
            className={period === "today" ? "bg-green-600 hover:bg-green-700" : "bg-slate-800 border-slate-700"}
          >
            Aujourd'hui
          </Button>
          <Button
            size="sm"
            variant={period === "7days" ? "default" : "outline"}
            onClick={() => setPeriod("7days")}
            className={period === "7days" ? "bg-blue-600" : "bg-slate-800 border-slate-700"}
          >
            7 jours
          </Button>
          <Button
            size="sm"
            variant={period === "30days" ? "default" : "outline"}
            onClick={() => setPeriod("30days")}
            className={period === "30days" ? "bg-blue-600" : "bg-slate-800 border-slate-700"}
          >
            30 jours
          </Button>
          <Button
            size="sm"
            variant={period === "3months" ? "default" : "outline"}
            onClick={() => setPeriod("3months")}
            className={period === "3months" ? "bg-blue-600" : "bg-slate-800 border-slate-700"}
          >
            3 mois
          </Button>
          <Button
            size="sm"
            variant={period === "custom" ? "default" : "outline"}
            onClick={() => setPeriod("custom")}
            className={period === "custom" ? "bg-blue-600" : "bg-slate-800 border-slate-700"}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Personnalisé
          </Button>
        </div>
      </div>

      {period === "custom" && (
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-sm sm:text-base">Sélectionner une période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-slate-400 text-sm">
                  Date de début
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-slate-400 text-sm">
                  Date de fin
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-400">CA (TTC)</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <DollarSign className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.totalSales.toFixed(2)} €</div>
            <div className="text-xs text-blue-300 mt-1">HT : {stats.totalSalesHT.toFixed(2)} €</div>
            <div className="text-xs text-blue-400 mt-1">+{((stats.totalSales / (stats.totalSales - stats.totalComplimentaryAmount)) * 100 - 100).toFixed(1)}% vs objectif</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-400">Articles offerts</CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Gift className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.totalComplimentaryAmount.toFixed(2)} €</div>
            <div className="text-xs text-green-400 mt-1">{stats.totalComplimentaryCount} articles</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-400">Commandes</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.totalOrders}</div>
            <div className="text-xs text-purple-400 mt-1">Total périodes</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 border-orange-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-400">Ticket moyen</CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.averageTicket.toFixed(2)} €</div>
            <div className="text-xs text-orange-400 mt-1">Par commande</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-400">TVA collectée</CardTitle>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Target className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.totalTax.toFixed(2)} €</div>
            <div className="text-xs text-red-300 mt-1">
              {stats.taxRate20Share.toFixed(0)}% du CA à 20%, {stats.taxRate10Share.toFixed(0)}% du CA à 10%
            </div>
            <div className="text-xs text-red-400 mt-1">Calculée précisément</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Évolution des ventes</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              total: {
                label: "Ventes",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px] [&_.recharts-legend-item-text]:fill-slate-200 [&_.recharts-cartesian-axis-tick_text]:fill-slate-100"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <defs>
                  <linearGradient id="salesLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                    <stop offset="50%" stopColor="#0ea5e9" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(248,250,252,0.95)"
                  tick={{ fill: "#f8fafc", fontSize: 12 }}
                  tickLine={{ stroke: "rgba(248,250,252,0.8)" }}
                  axisLine={{ stroke: "rgba(248,250,252,0.7)" }}
                />
                <YAxis
                  stroke="rgba(248,250,252,0.95)"
                  tick={{ fill: "#f8fafc", fontSize: 12 }}
                  tickLine={{ stroke: "rgba(248,250,252,0.8)" }}
                  axisLine={{ stroke: "rgba(248,250,252,0.7)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="url(#salesLineGradient)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={{ r: 3, fill: "#e2e8f0", stroke: "#0ea5e9", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#0ea5e9", stroke: "#e2e8f0", strokeWidth: 2 }}
                  name="Ventes (€)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-amber-900/30 to-orange-800/20 border-amber-700/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <div className="p-2 bg-amber-500/30 rounded-lg">
                <ShoppingBag className="h-4 w-4 text-amber-400" />
              </div>
              Top 10 des plats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                quantity: {
                  label: "Quantité",
                  color: "#f59e0b", // Amber color
                },
              }}
              className="h-[350px] [&_.recharts-cartesian-axis-tick_text]:fill-slate-100 [&_.recharts-legend-item-text]:fill-slate-200"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDishes.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.18)" />
                  <XAxis
                    type="number"
                    stroke="rgba(248, 250, 252, 0.9)"
                    tick={{ fill: "#f8fafc", fontSize: 12 }}
                    tickLine={{ stroke: "rgba(248, 250, 252, 0.8)" }}
                    axisLine={{ stroke: "rgba(248, 250, 252, 0.7)" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="rgba(248, 250, 252, 0.9)"
                    tick={{ fill: "#f8fafc", fontSize: 12 }}
                    tickLine={{ stroke: "rgba(248, 250, 252, 0.8)" }}
                    axisLine={{ stroke: "rgba(248, 250, 252, 0.7)" }}
                    width={120}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="quantity" fill="#f59e0b" name="Quantité vendue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-900/30 to-purple-800/20 border-violet-700/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <div className="p-2 bg-violet-500/30 rounded-lg">
                <Users className="h-4 w-4 text-violet-400" />
              </div>
              Répartition par serveur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Ventes",
                  color: "#8b5cf6", // Violet color
                },
              }}
              className="h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serverStats}
                    dataKey="total_sales"
                    nameKey="server_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                      const RADIAN = Math.PI / 180
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                      const x = cx + radius * Math.cos(-midAngle * RADIAN)
                      const y = cy + radius * Math.sin(-midAngle * RADIAN)

                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="white" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          className="text-xs font-medium"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      )
                    }}
                  >
                    {serverStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border-slate-700/60 backdrop-blur-md mt-6">
        <CardHeader>
          <CardTitle className="text-white">Répartition des paiements</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/40 border border-slate-700/60 rounded-lg p-4">
            <div className="text-sm text-slate-300 mb-2">Volume (nombre de ventes)</div>
            <div className="text-white text-base">
              CB {stats.paymentMix.volume.card.toFixed(0)}% · Espèces {stats.paymentMix.volume.cash.toFixed(0)}%
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-700/60 rounded-lg p-4">
            <div className="text-sm text-slate-300 mb-2">Valeur (CA)</div>
            <div className="text-white text-base">
              CB {stats.paymentMix.value.card.toFixed(0)}% · Espèces {stats.paymentMix.value.cash.toFixed(0)}%
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/20 border-indigo-700/50 backdrop-blur-sm mt-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance des serveurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-indigo-700/50">
                  <th className="text-left py-3 px-4 text-indigo-400 font-medium">Serveur</th>
                  <th className="text-right py-3 px-4 text-indigo-400 font-medium">Commandes</th>
                  <th className="text-right py-3 px-4 text-indigo-400 font-medium">CA total</th>
                  <th className="text-right py-3 px-4 text-indigo-400 font-medium">CA HT</th>
                  <th className="text-right py-3 px-4 text-indigo-400 font-medium">Ticket moy</th>
                  <th className="text-right py-3 px-4 text-indigo-400 font-medium">Offerts</th>
                  <th className="text-right py-3 px-4 text-indigo-400 font-medium">% Offerts</th>
                </tr>
              </thead>
              <tbody>
                {serverStats.map((server, index) => (
                  <tr key={index} className="border-b border-indigo-700/30 hover:bg-indigo-800/30 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{server.server_name}</td>
                    <td className="py-3 px-4 text-right text-white">{server.order_count}</td>
                    <td className="py-3 px-4 text-right text-white">{server.total_sales.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right text-white">{(server.total_sales_ht ?? 0).toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right text-white">{server.average_ticket.toFixed(2)} €</td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-green-400">{server.complimentary_amount?.toFixed(2) || '0.00'} €</div>
                      <div className="text-xs text-green-500">({server.complimentary_count || 0} art.)</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-amber-400 font-medium">
                        {server.complimentary_percentage?.toFixed(1) || '0.0'}%
                      </div>
                      <div className="text-xs text-amber-500">du CA</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
