import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react"
import { startOfMonth, endOfMonth, addMonths, subMonths, parseISO, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useReservations, useUpdateReservation } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

function calcFaxinaReceita(reservation: Reservation, property: Property | undefined): number {
  if (reservation.status === "cancelada") return 0
  const status = reservation.faxinaStatus ?? "nao_agendada"
  if (status === "nao_agendada") return 0
  const taxaLimpeza = property?.taxaLimpeza ?? 0
  if (reservation.faxinaPorMim) return taxaLimpeza
  return taxaLimpeza - (reservation.custoEmpresaFaxina ?? 0)
}

function calcDespesas(reservation: Reservation): { reembolsavel: number; naoReembolsavel: number } {
  if (!reservation.despesas?.length) return { reembolsavel: 0, naoReembolsavel: 0 }
  let reembolsavel = 0
  let naoReembolsavel = 0
  for (const d of reservation.despesas) {
    if (d.reembolsavel) reembolsavel += d.valor
    else naoReembolsavel += d.valor
  }
  return { reembolsavel, naoReembolsavel }
}

function calcTotalRecebido(reservation: Reservation, property: Property | undefined): number {
  if (reservation.status === "cancelada") {
    return reservation.valorRecebidoCancelamento ?? 0
  }
  const precoTotal = reservation.precoTotal ?? 0
  const comissaoPercent = property?.percentualComissao ?? 0
  const valorComissao = (precoTotal * comissaoPercent) / 100
  const { naoReembolsavel } = calcDespesas(reservation)
  const receitaFaxina = calcFaxinaReceita(reservation, property)
  return valorComissao + receitaFaxina - naoReembolsavel
}

export function ReportsPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")

  // Dialog state for cancelled reservation value
  const [editingCancelada, setEditingCancelada] = useState<Reservation | null>(null)
  const [canceladaValor, setCanceladaValor] = useState(0)

  const { data: reservations = [], isLoading: loadingReservations } = useReservations()
  const { data: properties = [] } = useProperties()
  const navigate = useNavigate()
  const updateReservation = useUpdateReservation()

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) map.set(p.id, p)
    return map
  }, [properties])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const filteredReservations = useMemo(() => {
    let result = reservations.filter((r) => {
      const checkIn = parseISO(r.checkIn)
      return checkIn >= monthStart && checkIn <= monthEnd
    })

    if (propertyFilter !== "todos") {
      result = result.filter((r) => r.propriedadeId === propertyFilter)
    }

    return result.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  }, [reservations, monthStart, monthEnd, propertyFilter])

  const groupedByProperty = useMemo(() => {
    const groups = new Map<string, Reservation[]>()
    for (const r of filteredReservations) {
      const existing = groups.get(r.propriedadeId) || []
      existing.push(r)
      groups.set(r.propriedadeId, existing)
    }
    return groups
  }, [filteredReservations])

  const reservationPropertyIds = useMemo(() => {
    return Array.from(groupedByProperty.keys())
  }, [groupedByProperty])

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

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR })

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
      {/* Header with tab navigation */}
      <div className="flex items-center gap-6 border-b">
        <span className="pb-2 text-sm font-medium border-b-2 border-primary">
          Recebimentos
        </span>
        <Link
          to="/relatorios/manutencoes"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Manutenções
        </Link>
        <Link
          to="/relatorios/despesas"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Despesas
        </Link>
      </div>

      {/* Month navigation + property filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize">
            {monthLabel}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Propriedade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas propriedades</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summaryTotals.totalRecebido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservas no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summaryTotals.numReservas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservas Canceladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summaryTotals.canceladas > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              {summaryTotals.canceladas}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reservations grouped by property */}
      {reservationPropertyIds.map((propertyId) => {
        const property = propertyMap.get(propertyId)
        if (!property) return null

        const propReservations = groupedByProperty.get(propertyId) || []
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

      {reservationPropertyIds.length === 0 && !loadingReservations && (
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
