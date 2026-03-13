import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { startOfMonth, endOfMonth, addMonths, subMonths, parseISO, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Link, useNavigate } from "react-router-dom"
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useReservations } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

export function ExpensesReportPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [tipoFilter, setTipoFilter] = useState<string>("todos")

  const navigate = useNavigate()
  const { data: reservations = [], isLoading } = useReservations()
  const { data: properties = [] } = useProperties()

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) map.set(p.id, p)
    return map
  }, [properties])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  // Filter reservations that have expenses and checkIn falls in the month
  const filteredReservations = useMemo(() => {
    let result = reservations.filter((r) => {
      if (!r.despesas?.length) return false
      const checkIn = parseISO(r.checkIn)
      return checkIn >= monthStart && checkIn <= monthEnd
    })

    if (propertyFilter !== "todos") {
      result = result.filter((r) => r.propriedadeId === propertyFilter)
    }

    // Filter despesas by tipo and exclude reservations with no matching despesas
    if (tipoFilter !== "todos") {
      const isReembolsavel = tipoFilter === "reembolsavel"
      result = result
        .map((r) => ({
          ...r,
          despesas: (r.despesas || []).filter((d) => d.reembolsavel === isReembolsavel),
        }))
        .filter((r) => r.despesas.length > 0)
    }

    return result.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  }, [reservations, monthStart, monthEnd, propertyFilter, tipoFilter])

  const groupedByProperty = useMemo(() => {
    const groups = new Map<string, Reservation[]>()
    for (const r of filteredReservations) {
      const existing = groups.get(r.propriedadeId) || []
      existing.push(r)
      groups.set(r.propriedadeId, existing)
    }
    return groups
  }, [filteredReservations])

  const propertyIds = useMemo(() => {
    return Array.from(groupedByProperty.keys())
  }, [groupedByProperty])

  const summary = useMemo(() => {
    let totalReembolsavel = 0
    let totalNaoReembolsavel = 0
    for (const r of filteredReservations) {
      for (const d of r.despesas || []) {
        if (d.reembolsavel) totalReembolsavel += d.valor
        else totalNaoReembolsavel += d.valor
      }
    }
    return { totalReembolsavel, totalNaoReembolsavel, total: totalReembolsavel + totalNaoReembolsavel }
  }, [filteredReservations])

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Header with tab navigation */}
      <div className="flex items-center gap-6 border-b">
        <Link
          to="/relatorios"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Recebimentos
        </Link>
        <Link
          to="/relatorios/manutencoes"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Manutenções
        </Link>
        <span className="pb-2 text-sm font-medium border-b-2 border-primary">
          Despesas
        </span>
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

        <div className="flex items-center gap-2">
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

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas despesas</SelectItem>
              <SelectItem value="reembolsavel">Reembolsáveis</SelectItem>
              <SelectItem value="nao_reembolsavel">Não reembolsáveis</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reembolsáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalReembolsavel)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Reembolsáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.totalNaoReembolsavel > 0 ? "text-red-600" : ""}`}>
              {formatCurrency(summary.totalNaoReembolsavel)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses grouped by property */}
      {propertyIds.map((propertyId) => {
        const property = propertyMap.get(propertyId)
        if (!property) return null

        const propReservations = groupedByProperty.get(propertyId) || []

        return (
          <div key={propertyId} className="space-y-3">
            <h3 className="text-lg font-semibold">{property.nome}</h3>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propReservations.flatMap((reservation) =>
                    (reservation.despesas || []).map((despesa, idx) => (
                      <TableRow key={`${reservation.id}-${idx}`} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/reservas/${reservation.id}`)}>
                        {idx === 0 ? (
                          <>
                            <TableCell className="font-medium" rowSpan={reservation.despesas!.length}>
                              {reservation.nomeHospede}
                            </TableCell>
                            <TableCell rowSpan={reservation.despesas!.length}>
                              {formatDate(reservation.checkIn)}
                            </TableCell>
                            <TableCell rowSpan={reservation.despesas!.length}>
                              {formatDate(reservation.checkOut)}
                            </TableCell>
                          </>
                        ) : null}
                        <TableCell>{despesa.descricao}</TableCell>
                        <TableCell className="text-center">
                          {despesa.reembolsavel ? (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              Reembolsável
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              Não reembolsável
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(despesa.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      })}

      {propertyIds.length === 0 && !isLoading && (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma despesa encontrada para este período.
        </div>
      )}
    </div>
  )
}
