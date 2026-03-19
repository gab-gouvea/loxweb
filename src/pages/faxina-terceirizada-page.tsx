import { useState, useMemo } from "react"
import { startOfMonth, endOfMonth, parseISO, isSameDay, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { useNavigate } from "react-router-dom"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { PropertyFilterSelect } from "@/components/shared/property-filter-select"
import { TabNavigation } from "@/components/shared/tab-navigation"
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
import { usePropertyMap } from "@/hooks/use-property-map"
import { useProprietarioMap } from "@/hooks/use-proprietario-map"
import { formatCurrency } from "@/lib/constants"
import type { Reservation } from "@/types/reservation"
import { useFaxinaMonthStore } from "@/hooks/use-month-store"

export function FaxinaTerceirizadaPage() {
  const { currentMonth, setCurrentMonth } = useFaxinaMonthStore()
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [statusFilter, setStatusFilter] = useState<string>("agendadas")

  const navigate = useNavigate()
  const { properties, propertyMap } = usePropertyMap()
  const { proprietarioMap } = useProprietarioMap()

  const { data: allReservations = [] } = useReservations()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  // Filter only third-party cleanings by checkout month
  const faxinas = useMemo(() => {
    return allReservations
      .filter((r) => {
        const checkOut = parseISO(r.checkOut)
        if (checkOut < monthStart || checkOut > monthEnd) return false
        if (r.status === "cancelada") return false
        if (r.faxinaPorMim !== false) return false
        if (!r.faxinaStatus || r.faxinaStatus === "nao_agendada") return false
        if (propertyFilter !== "todos" && r.propriedadeId !== propertyFilter) return false
        if (statusFilter === "agendadas" && r.faxinaPaga) return false
        return true
      })
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut))
  }, [allReservations, monthStart, monthEnd, propertyFilter, statusFilter])

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
    const propertyIdsComFaxina = new Set(faxinas.map((f) => f.propriedadeId))
    return properties.filter((p) => propertyIdsComFaxina.has(p.id))
  }, [properties, faxinas])



  return (
    <div className="space-y-6">
      <TabNavigation tabs={[
        { label: "Faxinas", to: "/faxina-terceirizada" },
        { label: "Pagamentos", to: "/faxina-terceirizada/pagamentos" },
      ]} />

      {/* Month navigation + property filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        <div className="flex items-center gap-2">
          <PropertyFilterSelect
            value={propertyFilter}
            onValueChange={setPropertyFilter}
            properties={properties}
          />
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
                <TableRow className="bg-yellow-100 hover:bg-yellow-100">
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
        <div className="rounded-lg border max-w-5xl" style={{ fontSize: "12px" }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-yellow-100 hover:bg-yellow-100">
                <TableHead className="font-bold text-black py-1 px-1" style={{ fontSize: "12px" }}>PROPRIEDADE</TableHead>
                <TableHead className="font-bold text-black py-1 px-1" style={{ fontSize: "12px" }}>ENDEREÇO</TableHead>
                <TableHead className="font-bold text-black py-1 px-1" style={{ fontSize: "12px" }}>DORMS</TableHead>
                <TableHead className="font-bold text-black py-1 px-1" style={{ fontSize: "12px" }}>ACESSO PRÉDIO</TableHead>
                <TableHead className="font-bold text-black py-1 px-1" style={{ fontSize: "12px" }}>ACESSO APTO/CASA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium py-0.5 px-1 whitespace-normal break-words" style={{ fontSize: "12px" }}>{property.nome}</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal break-words" style={{ fontSize: "12px" }}>{property.endereco || "—"}</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal" style={{ fontSize: "12px" }}>{property.quartos} DORM</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal break-words" style={{ fontSize: "12px" }}>{property.acessoPredio || "—"}</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal break-words" style={{ fontSize: "12px" }}>{property.acessoApartamento || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
