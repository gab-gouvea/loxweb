import { useState, useMemo } from "react"
import { Check, X } from "lucide-react"
import { startOfMonth, parseISO, format } from "date-fns"
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
import { useReservationsByMonth } from "@/hooks/use-reservations-by-month"
import { useUpdateReservation } from "@/hooks/use-reservations"
import { usePropertyMap } from "@/hooks/use-property-map"
import { formatCurrency } from "@/lib/constants"

export function FaxinaPagamentosPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [pagoFilter, setPagoFilter] = useState<string>("todos")

  const navigate = useNavigate()
  const { properties, propertyMap } = usePropertyMap()
  const updateReservation = useUpdateReservation()

  const { data: allReservations = [] } = useReservationsByMonth(currentMonth)

  // Filter only empresa parceira faxinas (agendada or concluida, not por mim)
  const faxinas = useMemo(() => {
    return allReservations
      .filter((r) => {
        if (r.status === "cancelada") return false
        if (r.faxinaPorMim !== false) return false
        if (!r.faxinaStatus || r.faxinaStatus === "nao_agendada") return false
        if (propertyFilter !== "todos" && r.propriedadeId !== propertyFilter) return false
        if (pagoFilter === "pago" && !r.faxinaPaga) return false
        if (pagoFilter === "nao_pago" && r.faxinaPaga) return false
        return true
      })
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut))
  }, [allReservations, propertyFilter, pagoFilter])

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        <div className="flex items-center gap-2">
          <PropertyFilterSelect
            value={propertyFilter}
            onValueChange={setPropertyFilter}
            properties={properties}
          />

          <Select value={pagoFilter} onValueChange={setPagoFilter}>
            <SelectTrigger className="w-[180px]">
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
              {faxinas.map((reservation) => {
                const property = propertyMap.get(reservation.propriedadeId)
                const checkOutDate = parseISO(reservation.checkOut)

                return (
                  <TableRow
                    key={reservation.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/reservas/${reservation.id}`)}
                  >
                    <TableCell className="font-medium">{property?.nome ?? "—"}</TableCell>
                    <TableCell>{reservation.nomeHospede}</TableCell>
                    <TableCell>{format(checkOutDate, "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(reservation.custoEmpresaFaxina ?? 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${reservation.faxinaPaga ? "text-green-600" : "text-red-500"}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          updateReservation.mutate({
                            id: reservation.id,
                            data: { faxinaPaga: !reservation.faxinaPaga },
                          })
                        }}
                        disabled={updateReservation.isPending}
                      >
                        {reservation.faxinaPaga ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
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
