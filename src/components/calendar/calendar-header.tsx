import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/hooks/use-calendar-store"

interface CalendarHeaderProps {
  onNewReservation: () => void
}

export function CalendarHeader({ onNewReservation }: CalendarHeaderProps) {
  const { startDate, visibleDays, goForward, goBack, goToToday, showCheckoutsFaxinas, toggleCheckoutsFaxinas } = useCalendarStore()

  const endDate = addDays(startDate, visibleDays - 1)

  const startMonth = format(startDate, "MMMM", { locale: ptBR })
  const endMonth = format(endDate, "MMMM", { locale: ptBR })
  const year = format(endDate, "yyyy")

  const dateLabel =
    startMonth === endMonth
      ? `${startMonth} ${year}`
      : `${format(startDate, "MMM", { locale: ptBR })} – ${format(endDate, "MMM", { locale: ptBR })} ${year}`

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize">
          {dateLabel}
        </h2>
        <Button variant="outline" size="icon" onClick={goForward}>
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
      <Button
        variant={showCheckoutsFaxinas ? "default" : "outline"}
        size="sm"
        onClick={toggleCheckoutsFaxinas}
      >
        Calendário Manutenção
      </Button>
    </div>
  )
}
