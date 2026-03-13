import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react"
import { startOfMonth, endOfMonth, addMonths, subMonths, format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { useNavigate, Link } from "react-router-dom"
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
import { useReservations, useUpdateReservation } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { formatCurrency } from "@/lib/constants"
import type { Property } from "@/types/property"

export function FaxinaPagamentosPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [pagoFilter, setPagoFilter] = useState<string>("todos")

  const navigate = useNavigate()
  const { data: properties = [] } = useProperties()
  const updateReservation = useUpdateReservation()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: allReservationsRaw = [] } = useReservations()

  const allReservations = useMemo(() => {
    return allReservationsRaw.filter((r) => {
      const checkIn = parseISO(r.checkIn)
      return checkIn >= monthStart && checkIn <= monthEnd
    })
  }, [allReservationsRaw, monthStart, monthEnd])

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) map.set(p.id, p)
    return map
  }, [properties])

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

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex items-center gap-6 border-b">
        <Link
          to="/faxina-terceirizada"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Faxinas
        </Link>
        <span className="pb-2 text-sm font-medium border-b-2 border-primary">
          Pagamentos
        </span>
      </div>

      {/* Month navigation + filters */}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Faxinas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.pago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.pendente > 0 ? "text-red-600" : ""}`}>
              {formatCurrency(summary.pendente)}
            </p>
          </CardContent>
        </Card>
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
