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
  Check,
  RefreshCw,
  Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAlerts, type AlertType } from "@/hooks/use-alerts"
import { useUpdateReservation } from "@/hooks/use-reservations"
import { cn } from "@/lib/utils"
import { useState, useCallback } from "react"

const STORAGE_KEY = "lox_dismissed_alerts"

function loadDismissed(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    return new Map(JSON.parse(raw))
  } catch {
    return new Map()
  }
}

function saveDismissed(map: Map<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...map]))
}

const alertIcons: Record<AlertType, typeof Bell> = {
  checkin_hoje: LogIn,
  checkout_hoje: LogOut,
  faxina_hoje: SprayCan,
  faxina_nao_paga: CircleDollarSign,
  pagamento_pendente: CircleDollarSign,
  manutencao_atrasada: Wrench,
  manutencao_agendada_hoje: CalendarClock,
  manutencao_agendada_7dias: CalendarClock,
  propriedade_inativa: PowerOff,
  locacao_checkin_hoje: LogIn,
  locacao_checkout_hoje: LogOut,
  locacao_faxina_atrasada: RefreshCw,
  locacao_faxina_proxima: RefreshCw,
  locacao_expirando: Timer,
  locacao_expirando_urgente: Timer,
}

const alertColors: Record<AlertType, string> = {
  checkin_hoje: "text-green-600",
  checkout_hoje: "text-red-600",
  faxina_hoje: "text-yellow-600",
  faxina_nao_paga: "text-orange-600",
  pagamento_pendente: "text-blue-500",
  manutencao_atrasada: "text-red-600",
  manutencao_agendada_hoje: "text-yellow-600",
  manutencao_agendada_7dias: "text-blue-600",
  propriedade_inativa: "text-purple-600",
  locacao_checkin_hoje: "text-green-600",
  locacao_checkout_hoje: "text-red-600",
  locacao_faxina_atrasada: "text-red-600",
  locacao_faxina_proxima: "text-yellow-600",
  locacao_expirando: "text-orange-600",
  locacao_expirando_urgente: "text-red-600",
}

export function AlertsDropdown() {
  const navigate = useNavigate()
  const { alerts } = useAlerts()
  const updateReservation = useUpdateReservation()
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Map<string, number>>(loadDismissed)

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
    if (a.type === "pagamento_pendente") return elapsed >= SNOOZE_1_DIA
    if (a.type === "locacao_faxina_atrasada") return elapsed >= SNOOZE_2_DIAS
    if (a.type === "locacao_faxina_proxima") return elapsed >= SNOOZE_1_DIA
    return false
  })
  const visibleCount = visibleAlerts.length

  const handleDismiss = useCallback((e: React.MouseEvent, alertId: string) => {
    e.stopPropagation()
    setDismissed((prev) => {
      const next = new Map(prev).set(alertId, Date.now())
      saveDismissed(next)
      return next
    })
  }, [])

  function handleConfirmCheckinCheckout(e: React.MouseEvent, alert: { id: string; type: AlertType }) {
    e.stopPropagation()
    const reservationId = alert.id.replace(/^(checkin|checkout)-/, "")
    if (alert.type === "checkin_hoje") {
      updateReservation.mutate({ id: reservationId, data: { checkinConfirmado: true, status: "em andamento" } })
    } else {
      updateReservation.mutate({ id: reservationId, data: { checkoutConfirmado: true, status: "concluída" } })
    }
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
                  <div className="flex items-center gap-0.5 shrink-0">
                    {(alert.type === "checkin_hoje" || alert.type === "checkout_hoje") && (
                      <button
                        type="button"
                        className="rounded p-1 text-green-600 hover:bg-green-100 transition-colors"
                        title="Confirmar"
                        onClick={(e) => handleConfirmCheckinCheckout(e, alert)}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={(e) => handleDismiss(e, alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
