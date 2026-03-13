import { useState, useMemo } from "react"
import { Pencil } from "lucide-react"
import { startOfMonth } from "date-fns"
import { useNavigate } from "react-router-dom"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SummaryCard } from "@/components/shared/summary-card"
import { PropertyFilterSelect } from "@/components/shared/property-filter-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUpdateReservation } from "@/hooks/use-reservations"
import { useReservationsByMonth } from "@/hooks/use-reservations-by-month"
import { usePropertyMap } from "@/hooks/use-property-map"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { calcFaxinaReceita, calcDespesas, calcTotalRecebido } from "@/lib/reservation-calculations"
import { groupByProperty } from "@/lib/collection-utils"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import type { Reservation } from "@/types/reservation"

export function ReportsPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")

  // Dialog state for cancelled reservation value
  const [editingCancelada, setEditingCancelada] = useState<Reservation | null>(null)
  const [canceladaValor, setCanceladaValor] = useState(0)

  const { data: monthReservations = [], isLoading: loadingReservations } = useReservationsByMonth(currentMonth)
  const { properties, propertyMap } = usePropertyMap()
  const navigate = useNavigate()
  const updateReservation = useUpdateReservation()

  const filteredReservations = useMemo(() => {
    let result = monthReservations

    if (propertyFilter !== "todos") {
      result = result.filter((r) => r.propriedadeId === propertyFilter)
    }

    return result.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  }, [monthReservations, propertyFilter])

  const grouped = useMemo(() => groupByProperty(filteredReservations), [filteredReservations])

  const propertyIds = useMemo(() => {
    return Array.from(grouped.keys())
  }, [grouped])

  const summaryTotals = useMemo(() => {
    let totalRecebido = 0
    for (const r of filteredReservations) {
      const property = propertyMap.get(r.propriedadeId)
      totalRecebido += calcTotalRecebido(r, property)
    }
    const canceladas = filteredReservations.filter((r) => r.status === "cancelada").length
    return {
      totalRecebido,
      numReservas: filteredReservations.length - canceladas,
      canceladas,
    }
  }, [filteredReservations, propertyMap])



  function handleOpenCanceladaDialog(reservation: Reservation) {
    setEditingCancelada(reservation)
    setCanceladaValor(reservation.valorRecebidoCancelamento ?? 0)
  }

  function handleSaveCancelada() {
    if (!editingCancelada) return
    updateReservation.mutate(
      {
        id: editingCancelada.id,
        data: { valorRecebidoCancelamento: canceladaValor },
      },
      {
        onSuccess: () => setEditingCancelada(null),
      },
    )
  }

  return (
    <div className="space-y-6">
      <TabNavigation tabs={[
        { label: "Recebimentos", to: "/relatorios" },
        { label: "Manutenções", to: "/relatorios/manutencoes" },
        { label: "Despesas", to: "/relatorios/despesas" },
      ]} />

      {/* Month navigation + property filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        <PropertyFilterSelect value={propertyFilter} onValueChange={setPropertyFilter} properties={properties} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard title="Total Recebido" value={formatCurrency(summaryTotals.totalRecebido)} />
        <SummaryCard title="Reservas no Período" value={summaryTotals.numReservas} />
        <SummaryCard title="Reservas Canceladas" value={summaryTotals.canceladas} valueClassName={summaryTotals.canceladas > 0 ? "text-red-600" : "text-muted-foreground"} />
      </div>

      {/* Reservations grouped by property */}
      {propertyIds.map((propertyId) => {
        const property = propertyMap.get(propertyId)
        if (!property) return null

        const propReservations = grouped.get(propertyId) || []
        const subtotalReservas = propReservations.reduce(
          (sum, r) => sum + calcTotalRecebido(r, property),
          0,
        )

        return (
          <div key={propertyId} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{property.nome}</h3>
              <span className="text-sm text-muted-foreground">
                ({property.percentualComissao}% comissão)
              </span>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Comissão (%)</TableHead>
                    <TableHead className="text-right">Valor Comissão</TableHead>
                    <TableHead className="text-right">Faxina</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                    <TableHead className="text-right">Total Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propReservations.map((reservation) => {
                    const isCancelada = reservation.status === "cancelada"
                    const comissaoPercent = property.percentualComissao ?? 0
                    const valorComissao = isCancelada
                      ? 0
                      : ((reservation.precoTotal ?? 0) * comissaoPercent) / 100
                    const faxStatus = reservation.faxinaStatus ?? "nao_agendada"
                    const receitaFaxina = calcFaxinaReceita(reservation, property)
                    const despesas = calcDespesas(reservation)
                    const totalRecebido = calcTotalRecebido(reservation, property)

                    return (
                      <TableRow key={reservation.id} className={`cursor-pointer hover:bg-muted/50 ${isCancelada ? "opacity-60" : ""}`} onClick={() => navigate(`/reservas/${reservation.id}`)}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {reservation.nomeHospede}
                            {isCancelada && <ReservationStatusBadge status="cancelada" />}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(reservation.checkIn)}</TableCell>
                        <TableCell>{formatDate(reservation.checkOut)}</TableCell>
                        <TableCell className="text-right">
                          {reservation.precoTotal
                            ? formatCurrency(reservation.precoTotal)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada ? "—" : `${comissaoPercent}%`}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada ? "—" : formatCurrency(valorComissao)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada || faxStatus === "nao_agendada" || receitaFaxina === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="text-green-700">
                              +{formatCurrency(receitaFaxina)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada || despesas.naoReembolsavel === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="text-red-600">−{formatCurrency(despesas.naoReembolsavel)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {isCancelada ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleOpenCanceladaDialog(reservation) }}
                            >
                              {totalRecebido > 0
                                ? formatCurrency(totalRecebido)
                                : formatCurrency(0)}
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            formatCurrency(totalRecebido)
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pr-4">
              <p className="text-sm font-bold">
                Subtotal: {formatCurrency(subtotalReservas)}
              </p>
            </div>
          </div>
        )
      })}

      {propertyIds.length === 0 && !loadingReservations && (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma reserva encontrada para este período.
        </div>
      )}

      {/* Dialog for cancelled reservation value */}
      <Dialog open={!!editingCancelada} onOpenChange={(open) => !open && setEditingCancelada(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Valor recebido (cancelamento)</DialogTitle>
            <DialogDescription>
              {editingCancelada?.nomeHospede}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Valor recebido (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={canceladaValor || ""}
                onChange={(e) => setCanceladaValor(e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCancelada(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCancelada} disabled={updateReservation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
