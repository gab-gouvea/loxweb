import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SummaryCard } from "@/components/shared/summary-card"
import { PropertyFilterSelect } from "@/components/shared/property-filter-select"
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
import { useReservationsByMonth } from "@/hooks/use-reservations-by-month"
import { usePropertyMap } from "@/hooks/use-property-map"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { groupByProperty } from "@/lib/collection-utils"
import { useExpensesReportMonthStore } from "@/hooks/use-month-store"

export function ExpensesReportPage() {
  const { currentMonth, setCurrentMonth } = useExpensesReportMonthStore()
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [tipoFilter, setTipoFilter] = useState<string>("todos")

  const navigate = useNavigate()
  const { data: reservations = [], isLoading } = useReservationsByMonth(currentMonth)
  const { properties, propertyMap } = usePropertyMap()

  // Filter reservations that have expenses
  const filteredReservations = useMemo(() => {
    let result = reservations.filter((r) => {
      if (!r.despesas?.length) return false
      return true
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
  }, [reservations, propertyFilter, tipoFilter])

  const grouped = useMemo(() => groupByProperty(filteredReservations), [filteredReservations])
  const propertyIds = useMemo(() => Array.from(grouped.keys()), [grouped])

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

        <div className="flex items-center gap-2">
          <PropertyFilterSelect value={propertyFilter} onValueChange={setPropertyFilter} properties={properties} />

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
        <SummaryCard title="Total Despesas" value={formatCurrency(summary.total)} />
        <SummaryCard title="Reembolsáveis" value={formatCurrency(summary.totalReembolsavel)} valueClassName="text-green-700" />
        <SummaryCard title="Não Reembolsáveis" value={formatCurrency(summary.totalNaoReembolsavel)} valueClassName={summary.totalNaoReembolsavel > 0 ? "text-red-600" : ""} />
      </div>

      {/* Expenses grouped by property */}
      {propertyIds.map((propertyId) => {
        const property = propertyMap.get(propertyId)
        if (!property) return null

        const propReservations = grouped.get(propertyId) || []

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
