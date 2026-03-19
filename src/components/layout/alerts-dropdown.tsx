import { useNavigate } from "react-router-dom"
import {
  Bell,
  LogIn,
  LogOut,
  SprayCan,
  Wrench,
  CircleDollarSign,
  CalendarClock,
  PowerOff,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAlerts, type AlertType } from "@/hooks/use-alerts"
import { cn } from "@/lib/utils"
import { useState } from "react"

const alertIcons: Record<AlertType, typeof Bell> = {
  checkin_hoje: LogIn,
  checkout_hoje: LogOut,
  faxina_hoje: SprayCan,
  faxina_nao_paga: CircleDollarSign,
  pagamento_hoje: CircleDollarSign,
  manutencao_atrasada: Wrench,
  manutencao_agendada_hoje: CalendarClock,
  manutencao_agendada_7dias: CalendarClock,
  propriedade_inativa: PowerOff,
}

const alertColors: Record<AlertType, string> = {
  checkin_hoje: "text-green-600",
  checkout_hoje: "text-red-600",
  faxina_hoje: "text-yellow-600",
  faxina_nao_paga: "text-orange-600",
  pagamento_hoje: "text-blue-500",
  manutencao_atrasada: "text-red-600",
  manutencao_agendada_hoje: "text-yellow-600",
  manutencao_agendada_7dias: "text-blue-600",
  propriedade_inativa: "text-purple-600",
}

export function AlertsDropdown() {
  const navigate = useNavigate()
  const { alerts } = useAlerts()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Map<string, number>>(new Map())

  const SNOOZE_2_DIAS = 2 * 24 * 60 * 60 * 1000
  const SNOOZE_1_DIA = 1 * 24 * 60 * 60 * 1000

  const visibleAlerts = alerts.filter((a) => {
    const dismissedAt = dismissed.get(a.id)
    if (dismissedAt == null) return true
    const elapsed = Date.now() - dismissedAt
    if (a.type === "manutencao_atrasada") return elapsed >= SNOOZE_2_DIAS
    if (a.type === "faxina_nao_paga") return elapsed >= SNOOZE_1_DIA
    if (a.type === "manutencao_agendada_7dias") return elapsed >= SNOOZE_1_DIA
    if (a.type === "propriedade_inativa") return elapsed >= SNOOZE_1_DIA
    return false
  })
  const visibleCount = visibleAlerts.length

  function handleDismiss(e: React.MouseEvent, alertId: string) {
    e.stopPropagation()
    setDismissed((prev) => new Map(prev).set(alertId, Date.now()))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {visibleCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {visibleCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Alertas</h3>
          {visibleCount === 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Nenhum alerta no momento
            </p>
          )}
        </div>
        {visibleCount > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {visibleAlerts.map((alert) => {
              const Icon = alertIcons[alert.type]
              const color = alertColors[alert.type]
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setOpen(false)
                    if (alert.link) navigate(alert.link)
                  }}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", color)}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={(e) => handleDismiss(e, alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
