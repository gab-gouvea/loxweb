import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/hooks/use-calendar-store"
import { formatMonth } from "@/lib/date-utils"
import { useProperties } from "@/hooks/use-properties"
import { propertyColorMap } from "@/lib/colors"
import { cn } from "@/lib/utils"

interface CalendarHeaderProps {
  onNewReservation: () => void
}

export function CalendarHeader({ onNewReservation }: CalendarHeaderProps) {
  const {
    currentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    selectedPropertyIds,
    setPropertyFilter,
  } = useCalendarStore()
  const { data: properties } = useProperties()

  function toggleProperty(id: string) {
    if (!selectedPropertyIds) {
      // Currently showing all, switch to all except this one... no, show only this one
      setPropertyFilter([id])
    } else if (selectedPropertyIds.includes(id)) {
      const next = selectedPropertyIds.filter((pid) => pid !== id)
      setPropertyFilter(next.length > 0 ? next : null)
    } else {
      setPropertyFilter([...selectedPropertyIds, id])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize">
            {formatMonth(currentMonth)}
          </h2>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        <Button onClick={onNewReservation}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
        </Button>
      </div>

      {properties && properties.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          <Button
            variant={selectedPropertyIds === null ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPropertyFilter(null)}
          >
            Todos
          </Button>
          {properties.map((p) => {
            const isActive = selectedPropertyIds === null || selectedPropertyIds.includes(p.id)
            const colors = propertyColorMap[p.cor]
            return (
              <Button
                key={p.id}
                variant="ghost"
                size="sm"
                className={cn("h-7 gap-1.5 text-xs", !isActive && "opacity-40")}
                onClick={() => toggleProperty(p.id)}
              >
                <div className={cn("h-2.5 w-2.5 rounded-full", colors.bg)} />
                {p.nome}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
