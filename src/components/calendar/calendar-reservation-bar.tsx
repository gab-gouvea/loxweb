import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimelineSegment } from "@/lib/calendar-utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"
import { formatDateShort } from "@/lib/date-utils"

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  "em andamento": "Em Andamento",
  cancelada: "Cancelada",
  concluída: "Concluída",
}

interface CalendarReservationBarProps {
  segment: TimelineSegment
  colWidth: number
  rowHeight: number
  reservation?: Reservation
  property?: Property
  onClick: (reservationId: string) => void
}

export function CalendarReservationBar({
  segment,
  colWidth,
  rowHeight,
  reservation,
  property,
  onClick,
}: CalendarReservationBarProps) {
  const barHeight = 32
  const topOffset = (rowHeight - barHeight) / 2
  const barWidth = (segment.endOffset - segment.startOffset) * colWidth - 4

  const statusLabel = statusLabels[segment.status] ?? segment.status
  const valueLabel = segment.precoTotal
    ? `R$${segment.precoTotal.toLocaleString("pt-BR")}`
    : ""

  const bar = (
    <button
      type="button"
      onClick={() => onClick(segment.reservationId)}
      className={cn(
        "absolute z-[5] cursor-pointer truncate px-2 text-xs font-medium text-white transition-opacity hover:opacity-90 bg-teal-700",
        !segment.isClippedStart ? "rounded-l-full" : "rounded-l-none",
        !segment.isClippedEnd ? "rounded-r-full" : "rounded-r-none",
      )}
      style={{
        top: topOffset,
        left: segment.startOffset * colWidth + 2,
        width: barWidth,
        height: barHeight,
        lineHeight: `${barHeight}px`,
      }}
    >
      <span className="flex items-center gap-1 truncate">
        <span className="truncate">
          {segment.guestName}
          {barWidth > 200 && valueLabel && ` · ${valueLabel}`}
        </span>
        {barWidth > 250 && (
          <span className="ml-auto flex-shrink-0 text-white/80">{statusLabel}</span>
        )}
        {segment.faxinaStatus === "agendada" && (
          <span className="ml-auto h-2.5 w-2.5 flex-shrink-0 rounded-full bg-yellow-400" />
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
          <p>{statusLabel}</p>
          {reservation.precoTotal != null && reservation.precoTotal > 0 && (
            <p>R$ {reservation.precoTotal.toLocaleString("pt-BR")}</p>
          )}
          {reservation.valorFaxina != null && reservation.valorFaxina > 0 && (
            <p className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Faxina: R$ {reservation.valorFaxina.toLocaleString("pt-BR")}
              {reservation.faxinaStatus === "nao_agendada"
                ? " — não agendada"
                : reservation.faxinaStatus === "agendada"
                  ? ` — agendada (${reservation.faxinaPorMim ? "eu" : "empresa"})`
                  : ` — concluída (${reservation.faxinaPorMim ? "eu" : "empresa"})`}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
