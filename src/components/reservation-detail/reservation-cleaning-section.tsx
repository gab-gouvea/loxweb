import { useState } from "react"
import {
  Sparkles,
  User,
  Building,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate, localDateToISO } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import type { Reservation, FaxinaStatus } from "@/types/reservation"
import type { Property } from "@/types/property"

interface ReservationCleaningSectionProps {
  reservation: Reservation
  property: Property | undefined
  ultimoCustoEmpresa: number | null
  onMutate: (data: Record<string, unknown>, options?: { onSuccess?: () => void }) => void
  isPending: boolean
}

export function ReservationCleaningSection({
  reservation,
  property,
  ultimoCustoEmpresa,
  onMutate,
  isPending,
}: ReservationCleaningSectionProps) {
  const [custoEmpresa, setCustoEmpresa] = useState<number | null>(null)
  const [custoEmpresaTouched, setCustoEmpresaTouched] = useState(false)
  const [faxinaData, setFaxinaData] = useState<string | null>(null)

  const faxinaStatus: FaxinaStatus = reservation.faxinaStatus ?? "nao_agendada"
  const taxaLimpeza = property?.taxaLimpeza ?? 0

  function handleAgendarFaxina(porMim: boolean) {
    const dateStr = faxinaData ?? reservation.faxinaData?.split("T")[0] ?? reservation.checkOut.split("T")[0]
    const dataFaxina = localDateToISO(dateStr)
    const data: Record<string, unknown> = {
      faxinaStatus: "agendada" as FaxinaStatus,
      faxinaPorMim: porMim,
      faxinaData: dataFaxina,
    }
    const custoFinal = custoEmpresa ?? ultimoCustoEmpresa
    if (!porMim && custoFinal !== null) {
      data.custoEmpresaFaxina = custoFinal
      data.faxinaPaga = false
    }
    onMutate(data, {
      onSuccess: () => {
        toast.success(porMim ? "Faxina agendada (você)" : "Faxina agendada (empresa)")
        setCustoEmpresa(null)
        setCustoEmpresaTouched(false)
      },
    })
  }

  function handleToggleFaxinaPaga() {
    onMutate(
      { faxinaPaga: !reservation.faxinaPaga },
      { onSuccess: () => toast.success(reservation.faxinaPaga ? "Marcada como não paga" : "Marcada como paga") },
    )
  }

  function handleCancelarFaxina() {
    onMutate(
      {
        faxinaStatus: "nao_agendada" as FaxinaStatus,
        faxinaPorMim: false,
      },
      { onSuccess: () => toast.success("Agendamento cancelado") },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Faxina
        </h2>
        <Badge
          variant="outline"
          className={
            faxinaStatus === "agendada" || faxinaStatus === "concluida"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-gray-50 text-gray-600 border-gray-200"
          }
        >
          {(faxinaStatus === "agendada" || faxinaStatus === "concluida") && <Clock className="mr-1 h-3 w-3" />}
          {faxinaStatus === "agendada" || faxinaStatus === "concluida"
            ? "Agendada"
            : "Não agendada"}
        </Badge>
      </div>

      {taxaLimpeza > 0 && (
        <p className="text-sm text-muted-foreground">
          Taxa de limpeza da propriedade: <span className="font-medium text-foreground">{formatCurrency(taxaLimpeza)}</span>
        </p>
      )}

      {/* Estado: Não agendada → data + botões para agendar */}
      {faxinaStatus === "nao_agendada" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Data da faxina:</span>
            <Input
              type="date"
              className="w-44"
              value={faxinaData ?? reservation.checkOut.split("T")[0]}
              onChange={(e) => setFaxinaData(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">Quem vai fazer a faxina?</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAgendarFaxina(true)}
              disabled={isPending}
            >
              <User className="mr-1 h-3 w-3" />
              Eu faço
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Custo empresa (R$):</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="w-28"
                value={custoEmpresaTouched ? (custoEmpresa ?? "") : (custoEmpresa ?? ultimoCustoEmpresa ?? "")}
                onChange={(e) => {
                  setCustoEmpresaTouched(true)
                  setCustoEmpresa(e.target.value === "" ? null : Number(e.target.value))
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAgendarFaxina(false)}
              disabled={isPending || (custoEmpresaTouched ? custoEmpresa === null : custoEmpresa === null && ultimoCustoEmpresa === null)}
            >
              <Building className="mr-1 h-3 w-3" />
              Empresa parceira
            </Button>
          </div>
        </div>
      )}

      {/* Estado: Agendada → mostra data, quem faz, botões concluir/cancelar */}
      {(faxinaStatus === "agendada" || faxinaStatus === "concluida") && (
        <div className="space-y-3">
          {reservation.faxinaData && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Data agendada:</span>
              <span className="text-sm font-medium">{formatDate(reservation.faxinaData)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Responsável:</span>
            <Badge variant="secondary" className="text-sm">
              {reservation.faxinaPorMim ? (
                <><User className="mr-1 h-3 w-3" /> Eu</>
              ) : (
                <><Building className="mr-1 h-3 w-3" /> Empresa parceira</>
              )}
            </Badge>
          </div>
          {reservation.faxinaPorMim ? (
            <p className="text-xs text-muted-foreground">
              Receita: <span className="font-medium text-green-700">{formatCurrency(taxaLimpeza)}</span>
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Custo empresa: {formatCurrency(reservation.custoEmpresaFaxina ?? 0)}
                {" — "}
                Receita líquida: <span className="font-medium text-green-700">{formatCurrency(taxaLimpeza - (reservation.custoEmpresaFaxina ?? 0))}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Pagamento:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className={reservation.faxinaPaga ? "text-green-700 border-green-300" : "text-red-600 border-red-300"}
                  onClick={handleToggleFaxinaPaga}
                  disabled={isPending}
                >
                  {reservation.faxinaPaga ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" /> Pago</>
                  ) : (
                    <><Clock className="mr-1 h-3 w-3" /> Não pago</>
                  )}
                </Button>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelarFaxina}
            disabled={isPending}
          >
            Cancelar agendamento
          </Button>
        </div>
      )}
    </div>
  )
}
