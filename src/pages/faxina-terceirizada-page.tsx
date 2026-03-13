import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { startOfMonth, endOfMonth, addMonths, subMonths, format, parseISO, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { useNavigate, Link } from "react-router-dom"
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
import { useReservations } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { useProprietarios } from "@/hooks/use-proprietarios"
import type { Property } from "@/types/property"
import type { Proprietario } from "@/types/proprietario"
import { formatCurrency } from "@/lib/constants"
import type { Reservation } from "@/types/reservation"

export function FaxinaTerceirizadaPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [statusFilter, setStatusFilter] = useState<string>("agendadas")

  const navigate = useNavigate()
  const { data: properties = [] } = useProperties()
  const { data: proprietarios = [] } = useProprietarios()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: allReservationsRaw = [] } = useReservations()

  const allReservations = useMemo(() => {
    return allReservationsRaw.filter((r) => {
      const checkIn = parseISO(r.checkIn)
      return checkIn >= monthStart && checkIn <= monthEnd
    })
  }, [allReservationsRaw, monthStart, monthEnd])

  const proprietarioMap = useMemo(() => {
    const map = new Map<string, Proprietario>()
    for (const p of proprietarios) map.set(p.id, p)
    return map
  }, [proprietarios])

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) map.set(p.id, p)
    return map
  }, [properties])

  // Filter only third-party cleanings (hide paid ones by default)
  const faxinas = useMemo(() => {
    return allReservations
      .filter((r) => {
        if (r.status === "cancelada") return false
        if (r.faxinaPorMim !== false) return false
        if (!r.faxinaStatus || r.faxinaStatus === "nao_agendada") return false
        if (propertyFilter !== "todos" && r.propriedadeId !== propertyFilter) return false
        if (statusFilter === "agendadas" && r.faxinaPaga) return false
        return true
      })
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut))
  }, [allReservations, propertyFilter, statusFilter])

  // Check if there's a next check-in on the same day as checkout
  function hasNextCheckInToday(reservation: Reservation): boolean {
    const checkOutDate = parseISO(reservation.checkOut)
    return allReservations.some(
      (r) =>
        r.id !== reservation.id &&
        r.propriedadeId === reservation.propriedadeId &&
        r.status !== "cancelada" &&
        isSameDay(parseISO(r.checkIn), checkOutDate),
    )
  }

  const filteredProperties = useMemo(() => {
    if (propertyFilter !== "todos") {
      return properties.filter((p) => p.id === propertyFilter)
    }
    return properties
  }, [properties, propertyFilter])

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex items-center gap-6 border-b">
        <span className="pb-2 text-sm font-medium border-b-2 border-primary">
          Faxinas
        </span>
        <Link
          to="/faxina-terceirizada/pagamentos"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Pagamentos
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agendadas">Faxinas agendadas</SelectItem>
              <SelectItem value="todas">Todas do mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table 1: Faxinas do Mês */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{statusFilter === "todas" ? "Todas do Mês" : "Agendadas"}</h3>
        {faxinas.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-yellow-100">
                  <TableHead className="font-bold text-black">LOCAL</TableHead>
                  <TableHead className="font-bold text-black">PROPRIETÁRIO</TableHead>
                  <TableHead className="font-bold text-black">HÓSPEDE</TableHead>
                  <TableHead className="font-bold text-black">CHECK-OUT</TableHead>
                  <TableHead className="font-bold text-black text-center">PROX. CHECK-IN HOJE</TableHead>
                  <TableHead className="font-bold text-black">MÊS</TableHead>
                  <TableHead className="font-bold text-black">ANO</TableHead>
                  <TableHead className="font-bold text-black text-right">VALOR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faxinas.map((reservation) => {
                  const property = propertyMap.get(reservation.propriedadeId)
                  const owner = property?.proprietarioId
                    ? proprietarioMap.get(property.proprietarioId)
                    : undefined
                  const checkOutDate = parseISO(reservation.checkOut)
                  const nextCheckIn = hasNextCheckInToday(reservation)

                  return (
                    <TableRow key={reservation.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/reservas/${reservation.id}`)}>
                      <TableCell className="font-medium">{property?.nome ?? "—"}</TableCell>
                      <TableCell>{owner?.nomeCompleto ?? "—"}</TableCell>
                      <TableCell>{reservation.nomeHospede}</TableCell>
                      <TableCell>{format(checkOutDate, "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-center">
                        {nextCheckIn ? (
                          <span className="inline-block rounded bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                            SIM
                          </span>
                        ) : (
                          <span className="text-sm">NÃO</span>
                        )}
                      </TableCell>
                      <TableCell className="uppercase">
                        {format(checkOutDate, "MMMM", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{format(checkOutDate, "yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(reservation.custoEmpresaFaxina ?? 0)}
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

      {/* Table 2: Property Reference */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Informações das Propriedades</h3>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-yellow-100">
                <TableHead className="font-bold text-black">PROPRIEDADE</TableHead>
                <TableHead className="font-bold text-black">ENDEREÇO</TableHead>
                <TableHead className="font-bold text-black">QUARTOS</TableHead>
                <TableHead className="font-bold text-black">ACESSO PRÉDIO</TableHead>
                <TableHead className="font-bold text-black">ACESSO APARTAMENTO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.nome}</TableCell>
                  <TableCell>{property.endereco || "—"}</TableCell>
                  <TableCell>{property.quartos} DORM</TableCell>
                  <TableCell>{property.acessoPredio || "—"}</TableCell>
                  <TableCell>{property.acessoApartamento || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
