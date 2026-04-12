import { useState, useMemo } from "react"
import { Check, X } from "lucide-react"
import { parseISO, format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { PropertyFilterSelect } from "@/components/shared/property-filter-select"
import { SummaryCard } from "@/components/shared/summary-card"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { Button } from "@/components/ui/button"
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
import { useReservations, useUpdateReservation } from "@/hooks/use-reservations"
import { useLocacoes, useUpdateLocacao } from "@/hooks/use-locacoes"
import { usePropertyMap } from "@/hooks/use-property-map"
import { formatCurrency } from "@/lib/constants"
import { toLocalDateStr } from "@/lib/date-utils"
import { useFaxinaPagamentosMonthStore } from "@/hooks/use-month-store"

interface FaxinaPagItem {
  id: string
  propriedadeId: string
  nomeHospede: string
  checkOut: string
  custoEmpresaFaxina?: number | null
  faxinaPaga?: boolean
  tipo: "reserva" | "locacao"
}

export function FaxinaPagamentosPage() {
  const { currentMonth, setCurrentMonth } = useFaxinaPagamentosMonthStore()
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [pagoFilter, setPagoFilter] = useState<string>("todos")

  const navigate = useNavigate()
  const { properties, propertyMap } = usePropertyMap()
  const updateReservation = useUpdateReservation()
  const updateLocacao = useUpdateLocacao()

  const { data: allReservations = [] } = useReservations()
  const { data: allLocacoes = [] } = useLocacoes()

  const reportYM = format(currentMonth, "yyyy-MM")

  // Filter empresa parceira faxinas from reservations + locações by checkout month
  const faxinas = useMemo(() => {
    const items: FaxinaPagItem[] = []

    for (const r of allReservations) {
      if (toLocalDateStr(r.checkOut).substring(0, 7) !== reportYM) continue
      if (r.status === "cancelada") continue
      if (r.faxinaPorMim !== false) continue
      if (!r.faxinaStatus || r.faxinaStatus === "nao_agendada") continue
      if (propertyFilter !== "todos" && r.propriedadeId !== propertyFilter) continue
      if (pagoFilter === "pago" && !r.faxinaPaga) continue
      if (pagoFilter === "nao_pago" && r.faxinaPaga) continue
      items.push({
        id: r.id, propriedadeId: r.propriedadeId, nomeHospede: r.nomeHospede,
        checkOut: r.checkOut, custoEmpresaFaxina: r.custoEmpresaFaxina, faxinaPaga: r.faxinaPaga, tipo: "reserva",
      })
    }

    for (const l of allLocacoes) {
      if (toLocalDateStr(l.checkOut).substring(0, 7) !== reportYM) continue
      if (l.faxinaPorMim !== false) continue
      if (!l.faxinaStatus || l.faxinaStatus === "nao_agendada") continue
      if (propertyFilter !== "todos" && l.propriedadeId !== propertyFilter) continue
      if (pagoFilter === "pago" && !l.faxinaPaga) continue
      if (pagoFilter === "nao_pago" && l.faxinaPaga) continue
      items.push({
        id: l.id, propriedadeId: l.propriedadeId, nomeHospede: l.nomeCompleto,
        checkOut: l.checkOut, custoEmpresaFaxina: l.custoEmpresaFaxina, faxinaPaga: l.faxinaPaga, tipo: "locacao",
      })
    }

    return items.sort((a, b) => a.checkOut.localeCompare(b.checkOut) || a.id.localeCompare(b.id))
  }, [allReservations, allLocacoes, reportYM, propertyFilter, pagoFilter])

  const summary = useMemo(() => {
    const total = faxinas.reduce((sum, r) => sum + (r.custoEmpresaFaxina ?? 0), 0)
    const pago = faxinas.filter((r) => r.faxinaPaga).reduce((sum, r) => sum + (r.custoEmpresaFaxina ?? 0), 0)
    const pendente = total - pago
    return { total, pago, pendente }
  }, [faxinas])



  return (
    <div className="space-y-6">
      <TabNavigation tabs={[
        { label: "Faxinas", to: "/faxina-terceirizada" },
        { label: "Pagamentos", to: "/faxina-terceirizada/pagamentos" },
      ]} />

      {/* Month navigation + filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <PropertyFilterSelect
            value={propertyFilter}
            onValueChange={setPropertyFilter}
            properties={properties}
          />

          <Select value={pagoFilter} onValueChange={setPagoFilter}>
            <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="pago">Pagas</SelectItem>
              <SelectItem value="nao_pago">Não pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Total Faxinas" value={formatCurrency(summary.total)} />
        <SummaryCard title="Pago" value={formatCurrency(summary.pago)} valueClassName="text-green-700" />
        <SummaryCard title="Pendente" value={formatCurrency(summary.pendente)} valueClassName={summary.pendente > 0 ? "text-red-600" : ""} />
      </div>

      {/* Table */}
      {faxinas.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-yellow-100">
                <TableHead className="font-bold text-black">LOCAL</TableHead>
                <TableHead className="font-bold text-black">HÓSPEDE</TableHead>
                <TableHead className="font-bold text-black">CHECK-OUT</TableHead>
                <TableHead className="font-bold text-black text-right">VALOR</TableHead>
                <TableHead className="font-bold text-black text-center">PAGO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faxinas.map((item) => {
                const property = propertyMap.get(item.propriedadeId)
                const checkOutDate = parseISO(item.checkOut)
                const link = item.tipo === "reserva" ? `/reservas/${item.id}` : `/longatemporada/${item.id}`

                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(link)}
                  >
                    <TableCell className="font-medium">{property?.nome ?? "—"}</TableCell>
                    <TableCell>{item.nomeHospede}</TableCell>
                    <TableCell>{format(checkOutDate, "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.custoEmpresaFaxina ?? 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-11 w-11 sm:h-7 sm:w-7 ${item.faxinaPaga ? "text-green-600" : "text-red-500"}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (item.tipo === "reserva") {
                            updateReservation.mutate({ id: item.id, data: { faxinaPaga: !item.faxinaPaga } })
                          } else {
                            updateLocacao.mutate({ id: item.id, data: { faxinaPaga: !item.faxinaPaga } })
                          }
                        }}
                        disabled={updateReservation.isPending || updateLocacao.isPending}
                      >
                        {item.faxinaPaga ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma faxina terceirizada neste período.
        </div>
      )}
    </div>
  )
}
