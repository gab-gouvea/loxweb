import { useState, useMemo } from "react"
import { parseISO, isSameDay, format } from "date-fns"
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
import { useLocacoes } from "@/hooks/use-locacoes"
import { usePropertyMap } from "@/hooks/use-property-map"
import { useProprietarioMap } from "@/hooks/use-proprietario-map"
import { formatCurrency } from "@/lib/constants"
import { toLocalDateStr } from "@/lib/date-utils"
import { useFaxinaMonthStore } from "@/hooks/use-month-store"

interface FaxinaItem {
  id: string
  propriedadeId: string
  nomeHospede: string
  checkOut: string
  custoEmpresaFaxina?: number | null
  faxinaPaga?: boolean
  tipo: "reserva" | "locacao"
}

export function FaxinaTerceirizadaPage() {
  const { currentMonth, setCurrentMonth } = useFaxinaMonthStore()
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [statusFilter, setStatusFilter] = useState<string>("agendadas")

  const navigate = useNavigate()
  const { properties, propertyMap } = usePropertyMap()
  const { proprietarioMap } = useProprietarioMap()

  const { data: allReservations = [] } = useReservations()
  const { data: allLocacoes = [] } = useLocacoes()

  const reportYM = format(currentMonth, "yyyy-MM")

  // Filter third-party cleanings from reservations + locações by checkout month
  const faxinas = useMemo(() => {
    const items: FaxinaItem[] = []

    // Reservas
    for (const r of allReservations) {
      if (toLocalDateStr(r.checkOut).substring(0, 7) !== reportYM) continue
      if (r.status === "cancelada") continue
      if (r.faxinaPorMim !== false) continue
      if (!r.faxinaStatus || r.faxinaStatus === "nao_agendada") continue
      if (propertyFilter !== "todos" && r.propriedadeId !== propertyFilter) continue
      if (statusFilter === "agendadas" && r.faxinaPaga) continue
      items.push({
        id: r.id,
        propriedadeId: r.propriedadeId,
        nomeHospede: r.nomeHospede,
        checkOut: r.checkOut,
        custoEmpresaFaxina: r.custoEmpresaFaxina,
        faxinaPaga: r.faxinaPaga,
        tipo: "reserva",
      })
    }

    // Locações
    for (const l of allLocacoes) {
      if (toLocalDateStr(l.checkOut).substring(0, 7) !== reportYM) continue
      if (l.faxinaPorMim !== false) continue
      if (!l.faxinaStatus || l.faxinaStatus === "nao_agendada") continue
      if (propertyFilter !== "todos" && l.propriedadeId !== propertyFilter) continue
      if (statusFilter === "agendadas" && l.faxinaPaga) continue
      items.push({
        id: l.id,
        propriedadeId: l.propriedadeId,
        nomeHospede: l.nomeCompleto,
        checkOut: l.checkOut,
        custoEmpresaFaxina: l.custoEmpresaFaxina,
        faxinaPaga: l.faxinaPaga,
        tipo: "locacao",
      })
    }

    return items.sort((a, b) => a.checkOut.localeCompare(b.checkOut))
  }, [allReservations, allLocacoes, reportYM, propertyFilter, statusFilter])

  // Check if there's a next check-in on the same day as checkout
  function hasNextCheckInToday(item: FaxinaItem): boolean {
    const checkOutDate = parseISO(item.checkOut)
    return allReservations.some(
      (r) =>
        r.id !== item.id &&
        r.propriedadeId === item.propriedadeId &&
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
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <PropertyFilterSelect
            value={propertyFilter}
            onValueChange={setPropertyFilter}
            properties={properties}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
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
                {faxinas.map((item) => {
                  const property = propertyMap.get(item.propriedadeId)
                  const owner = property?.proprietarioId
                    ? proprietarioMap.get(property.proprietarioId)
                    : undefined
                  const checkOutDate = parseISO(item.checkOut)
                  const nextCheckIn = hasNextCheckInToday(item)
                  const link = item.tipo === "reserva" ? `/reservas/${item.id}` : `/longatemporada/${item.id}`

                  return (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50 [&>td]:py-3" onClick={() => navigate(link)}>
                      <TableCell className="font-medium">{property?.nome ?? "—"}</TableCell>
                      <TableCell>{owner?.nomeCompleto ?? "—"}</TableCell>
                      <TableCell>{item.nomeHospede}</TableCell>
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
                        {formatCurrency(item.custoEmpresaFaxina ?? 0)}
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
        <div className="overflow-x-auto rounded-lg border text-xs">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-yellow-100 hover:bg-yellow-100">
                <TableHead className="font-bold text-black py-1 px-1 text-xs">PROPRIEDADE</TableHead>
                <TableHead className="font-bold text-black py-1 px-1 text-xs">ENDEREÇO</TableHead>
                <TableHead className="font-bold text-black py-1 px-1 text-xs">DORMS</TableHead>
                <TableHead className="font-bold text-black py-1 px-1 text-xs">ACESSO PRÉDIO</TableHead>
                <TableHead className="font-bold text-black py-1 px-1 text-xs">ACESSO APTO/CASA</TableHead>
                <TableHead className="font-bold text-black py-1 px-1 text-xs">WI-FI</TableHead>
                <TableHead className="font-bold text-black py-1 px-1 text-xs">HOBBY BOX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium py-0.5 px-1 whitespace-normal break-words">{property.nome}</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal break-words">{property.endereco || "—"}</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal">{property.quartos} DORM</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal break-words">{property.acessoPredio || "—"}</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal break-words">{property.acessoApartamento || "—"}</TableCell>
                  <TableCell className="py-0.5 px-1 whitespace-normal break-words">{property.senhaWifi || "—"}</TableCell>
                  <TableCell className={`py-0.5 px-1 whitespace-normal ${property.temHobbyBox ? "text-green-600 font-medium" : ""}`}>{property.temHobbyBox ? "Sim" : "Não"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
