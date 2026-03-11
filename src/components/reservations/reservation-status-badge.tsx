import { Badge } from "@/components/ui/badge"
import type { ReservationStatus } from "@/types/reservation"
import { cn } from "@/lib/utils"

const statusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  confirmada: { label: "Confirmada", className: "bg-green-100 text-green-700 border-green-300" },
  "em andamento": { label: "Em Andamento", className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  cancelada: { label: "Cancelada", className: "bg-red-100 text-red-700 border-red-300" },
  concluída: { label: "Concluída", className: "bg-blue-100 text-blue-700 border-blue-300" },
}

interface ReservationStatusBadgeProps {
  status: ReservationStatus
}

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  )
}
