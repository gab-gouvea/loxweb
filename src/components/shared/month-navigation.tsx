import { ChevronLeft, ChevronRight } from "lucide-react"
import { addMonths, subMonths, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Button } from "@/components/ui/button"

interface MonthNavigationProps {
  currentMonth: Date
  onMonthChange: (month: Date) => void
}

export function MonthNavigation({ currentMonth, onMonthChange }: MonthNavigationProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="min-h-[44px] min-w-[44px]"
        onClick={() => onMonthChange(subMonths(currentMonth, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <h2 className="min-w-45 text-center text-base sm:text-lg font-semibold capitalize">
        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
      </h2>
      <Button
        variant="outline"
        size="icon"
        className="min-h-[44px] min-w-[44px]"
        onClick={() => onMonthChange(addMonths(currentMonth, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
