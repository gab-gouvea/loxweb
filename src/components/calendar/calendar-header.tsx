import { ChevronLeft, ChevronRight, KeyRound, Plus } from "lucide-react"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/hooks/use-calendar-store"

interface CalendarHeaderProps {
  onNewReservation: () => void
  onNewLocacao: () => void
}

export function CalendarHeader({ onNewReservation, onNewLocacao }: CalendarHeaderProps) {
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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="min-w-[140px] sm:min-w-[180px] text-center text-base sm:text-lg font-semibold capitalize">
          {dateLabel}
        </h2>
        <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]" onClick={goForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={goToToday}>
          Hoje
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button className="min-h-[44px]" onClick={onNewReservation}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
        </Button>
        <Button className="min-h-[44px]" onClick={onNewLocacao}>
          <KeyRound className="mr-2 h-4 w-4" />
          Nova Locação
        </Button>
        <Button
          variant={showCheckoutsFaxinas ? "default" : "outline"}
          size="sm"
          className="min-h-[44px]"
          onClick={toggleCheckoutsFaxinas}
        >
          Calendário Manutenção
        </Button>
      </div>
    </div>
  )
}
