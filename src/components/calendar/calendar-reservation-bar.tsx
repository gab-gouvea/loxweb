import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { propertyColorMap } from "@/lib/colors"
import type { CalendarBarSegment } from "@/lib/calendar-utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"
import { formatDateShort } from "@/lib/date-utils"

interface CalendarReservationBarProps {
  segment: CalendarBarSegment
  reservation?: Reservation
  property?: Property
  onClick: (reservationId: string) => void
}

export function CalendarReservationBar({
  segment,
  reservation,
  property,
  onClick,
}: CalendarReservationBarProps) {
  const colors = propertyColorMap[segment.color]

  const bar = (
    <button
      type="button"
      onClick={() => onClick(segment.reservationId)}
      className={cn(
        "absolute z-[5] h-5 cursor-pointer truncate px-1.5 text-xs leading-5 text-white transition-opacity hover:opacity-90",
        colors.bg,
        segment.isStart ? "rounded-l-md" : "rounded-l-none",
        segment.isEnd ? "rounded-r-md" : "rounded-r-none",
      )}
      style={{
        top: `${30 + segment.row * 22}px`,
        left: `calc(${(segment.startCol / 7) * 100}% + 2px)`,
        width: `calc(${(segment.spanCols / 7) * 100}% - 4px)`,
      }}
    >
      <span className="flex items-center gap-0.5 truncate">
        {segment.isStart && <span className="truncate">{segment.guestName}</span>}
        {segment.isEnd && segment.faxinaPorMim && (
          <Sparkles className="ml-auto h-3 w-3 flex-shrink-0 text-white/80" />
        )}
      </span>
    </button>
  )

  if (!reservation || !property) return bar

  return (
    <Tooltip>
      <TooltipTrigger asChild>{bar}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-1">
          <p className="font-semibold">{reservation.nomeHospede}</p>
          <p>{property.nome}</p>
          <p>
            {formatDateShort(reservation.checkIn)} → {formatDateShort(reservation.checkOut)}
          </p>
          {reservation.precoTotal && (
            <p>R$ {reservation.precoTotal.toLocaleString("pt-BR")}</p>
          )}
          {reservation.faxinaPorMim && (
            <p className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Faxina: R$ {(reservation.valorFaxina ?? 0).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
