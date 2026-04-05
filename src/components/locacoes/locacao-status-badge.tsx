import { Badge } from "@/components/ui/badge"
import type { LocacaoStatus } from "@/types/locacao"

const statusConfig: Record<LocacaoStatus, { label: string; className: string }> = {
  ativa: { label: "Ativa", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  encerrada: { label: "Encerrada", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
}

export function LocacaoStatusBadge({ status }: { status: LocacaoStatus }) {
  const config = statusConfig[status] ?? statusConfig.ativa
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
