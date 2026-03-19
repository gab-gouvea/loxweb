import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { startOfMonth } from "date-fns"
import { BarChart3, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { useOccupancy } from "@/hooks/use-occupancy"

export function OccupancyPage() {
  const navigate = useNavigate()
  const [occupancyMonth, setOccupancyMonth] = useState(startOfMonth(new Date()))
  const [animated, setAnimated] = useState(false)
  const { occupancy, avgOccupancy } = useOccupancy(occupancyMonth)

  useEffect(() => {
    setAnimated(false)
    const timer = setTimeout(() => setAnimated(true), 50)
    return () => clearTimeout(timer)
  }, [occupancyMonth])

  function getBarColor(pct: number) {
    if (pct >= 70) return "bg-green-500"
    if (pct >= 40) return "bg-yellow-500"
    return "bg-red-400"
  }

  function getTextColor(pct: number) {
    if (pct >= 70) return "text-green-600"
    if (pct >= 40) return "text-yellow-600"
    return "text-red-500"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Ocupação por Propriedade</h1>
        </div>
        <MonthNavigation currentMonth={occupancyMonth} onMonthChange={setOccupancyMonth} />
      </div>

      <div className="rounded-lg border p-4 flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Média Geral</span>
        <span className={`text-2xl font-bold ${getTextColor(avgOccupancy)}`}>{avgOccupancy}%</span>
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(avgOccupancy)}`}
            style={{ width: animated ? `${avgOccupancy}%` : "0%" }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {occupancy.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/propriedades/${item.id}`)}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-sm">{item.nome}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.occupiedDays}/{item.totalDays} dias</span>
                <span className={`text-base font-bold ${getTextColor(item.pct)}`}>{item.pct}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(item.pct)}`}
                style={{ width: animated ? `${item.pct}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
