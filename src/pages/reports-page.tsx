import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { startOfMonth, endOfMonth, addMonths, subMonths, parseISO, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useReservations } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { formatDate } from "@/lib/date-utils"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

function calcFaxinaLiquida(reservation: Reservation): number {
  const status = reservation.faxinaStatus ?? "nao_agendada"
  if (status === "nao_agendada") return 0
  const valorFaxina = reservation.valorFaxina ?? 0
  // Faxina por mim = receita; faxina pela empresa = despesa (paga à empresa)
  return reservation.faxinaPorMim ? valorFaxina : -valorFaxina
}

function calcTotalRecebido(reservation: Reservation, property: Property | undefined): number {
  const precoTotal = reservation.precoTotal ?? 0
  const comissaoPercent = property?.percentualComissao ?? 0
  const valorComissao = (precoTotal * comissaoPercent) / 100
  return valorComissao + calcFaxinaLiquida(reservation)
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ReportsPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")

  const { data: reservations = [], isLoading: loadingReservations } = useReservations()
  const { data: properties = [] } = useProperties()

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
      const checkOut = parseISO(r.checkOut)
      return checkOut >= monthStart && checkIn <= monthEnd
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

  const summaryTotals = useMemo(() => {
    let totalRecebido = 0
    for (const r of filteredReservations) {
      const property = propertyMap.get(r.propriedadeId)
      totalRecebido += calcTotalRecebido(r, property)
    }
    return { totalRecebido, numReservas: filteredReservations.length }
  }, [filteredReservations, propertyMap])

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatório de Recebimentos</h1>
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
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Data table grouped by property */}
      {Array.from(groupedByProperty.entries()).map(([propertyId, propReservations]) => {
        const property = propertyMap.get(propertyId)
        if (!property) return null

        const subtotalRecebido = propReservations.reduce(
          (sum, r) => sum + calcTotalRecebido(r, property),
          0,
        )

        return (
          <div key={propertyId} className="space-y-2">
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
                    <TableHead className="text-right">Total Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propReservations.map((reservation) => {
                    const comissaoPercent = property.percentualComissao ?? 0
                    const valorComissao =
                      ((reservation.precoTotal ?? 0) * comissaoPercent) / 100
                    const valorFaxina = reservation.valorFaxina ?? 0
                    const faxStatus = reservation.faxinaStatus ?? "nao_agendada"
                    const faxLiquida = calcFaxinaLiquida(reservation)
                    const totalRecebido = valorComissao + faxLiquida

                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          {reservation.nomeHospede}
                        </TableCell>
                        <TableCell>{formatDate(reservation.checkIn)}</TableCell>
                        <TableCell>{formatDate(reservation.checkOut)}</TableCell>
                        <TableCell className="text-right">
                          {reservation.precoTotal
                            ? formatCurrency(reservation.precoTotal)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">{comissaoPercent}%</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(valorComissao)}
                        </TableCell>
                        <TableCell className="text-right">
                          {faxStatus === "nao_agendada" || valorFaxina === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={reservation.faxinaPorMim ? "text-green-700" : "text-red-600"}>
                              {reservation.faxinaPorMim ? "+" : "−"}{formatCurrency(valorFaxina)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totalRecebido)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7} className="text-right font-semibold">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(subtotalRecebido)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        )
      })}

      {filteredReservations.length === 0 && !loadingReservations && (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma reserva encontrada para este período.
        </div>
      )}
    </div>
  )
}
