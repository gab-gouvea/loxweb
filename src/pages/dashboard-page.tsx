import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { startOfMonth } from "date-fns"
import {
  Building2,
  CalendarDays,
  SprayCan,
  Wrench,
  CalendarClock,
  LogIn,
  LogOut,
  BarChart3,
  CircleDollarSign,
} from "lucide-react"
import { SummaryCard } from "@/components/shared/summary-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getUserName } from "@/lib/auth"
import { usePropertyMap } from "@/hooks/use-property-map"
import { useReservations } from "@/hooks/use-reservations"
import { useOccupancy } from "@/hooks/use-occupancy"
import { useAllPropertyComponents, useAllPendingScheduledMaintenances } from "@/hooks/use-property-details"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { formatDate, toLocalDateStr, getTodayStr } from "@/lib/date-utils"
import { calcValorPagamento } from "@/lib/reservation-calculations"
import type { ReservationStatus } from "@/types/reservation"

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const userName = getUserName()
  const { properties, propertyMap } = usePropertyMap()
  const { data: reservations = [] } = useReservations()
  const { data: components = [] } = useAllPropertyComponents()
  const { data: pendingMaintenances = [] } = useAllPendingScheduledMaintenances()
  const { avgOccupancy } = useOccupancy(startOfMonth(new Date()))
  const stats = useMemo(() => {
    const today = getTodayStr()
    const in7days = addDays(today, 7)
    const imoveis = properties.filter((p) => p.ativo).length

    const naoCanceladas = reservations.filter((r) => r.status !== "cancelada")

    const faxinasPendentes = reservations.filter(
      (r) =>
        (r.status === "em andamento" || r.status === "concluída") &&
        (!r.faxinaStatus || r.faxinaStatus === "nao_agendada")
    )

    // Manutenções atrasadas
    const manutencoesAtrasadas = components.filter(
      (c) => toLocalDateStr(c.proximaManutencao) < today
    )

    // Pagamentos não recebidos (checkIn + 1 <= hoje e não recebido)
    const pagamentosNaoRecebidos = naoCanceladas
      .filter((r) => {
        if (r.pagamentoRecebido) return false
        const paymentDate = addDays(toLocalDateStr(r.checkIn), 1)
        return paymentDate <= today
      })
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn))

    // Próximos check-ins (hoje + 7 dias)
    const proximosCheckins = naoCanceladas
      .filter((r) => {
        if (r.checkinConfirmado) return false
        const d = toLocalDateStr(r.checkIn)
        return d >= today && d <= in7days
      })
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))

    // Próximos checkouts (hoje + 7 dias)
    const proximosCheckouts = naoCanceladas
      .filter((r) => {
        if (r.checkoutConfirmado) return false
        const d = toLocalDateStr(r.checkOut)
        return d >= today && d <= in7days
      })
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut))

    // Próximas manutenções agendadas (pendentes, hoje + futuras)
    const proximasManutencoes = pendingMaintenances
      .filter((sm) => sm.dataPrevista >= today && sm.dataPrevista <= in7days)
      .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista))

    return {
      imoveis,
      reservasAtivas: naoCanceladas.length,
      pagamentosNaoRecebidos,
      faxinasPendentes,
      manutencoesAtrasadas,
      proximosCheckins,
      proximosCheckouts,
      proximasManutencoes,
    }
  }, [properties, reservations, components, pendingMaintenances])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {userName ? `Olá, ${userName}` : "Olá"}
      </h1>

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard title="Imóveis" value={stats.imoveis} icon={Building2} onClick={() => navigate("/propriedades")} />
        <SummaryCard title="Total de Reservas" value={stats.reservasAtivas} icon={CalendarDays} onClick={() => navigate("/reservas")} />
        <SummaryCard title="Ver % de Ocupação" value={`${avgOccupancy}%`} icon={BarChart3} onClick={() => navigate("/ocupacao")} valueClassName={avgOccupancy >= 70 ? "text-green-600" : ""} />
      </div>

      {/* Seções lado a lado: Check-ins e Checkouts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Próximos Check-ins */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-green-600" />
            <h2 className="text-lg font-semibold">Próximos Check-ins</h2>
            <span className="text-sm text-muted-foreground">(Próximos 7 dias)</span>
          </div>
          {stats.proximosCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum check-in nos próximos 7 dias</p>
          ) : (
            <div className="rounded-lg border">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Propriedade</TableHead>
                    <TableHead>Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.proximosCheckins.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/reservas/${r.id}`)}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate">{r.nomeHospede}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{propertyMap.get(r.propriedadeId)?.nome}</TableCell>
                      <TableCell>{formatDate(r.checkIn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Próximos Checkouts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-red-600" />
            <h2 className="text-lg font-semibold">Próximos Checkouts</h2>
            <span className="text-sm text-muted-foreground">(Próximos 7 dias)</span>
          </div>
          {stats.proximosCheckouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum checkout nos próximos 7 dias</p>
          ) : (
            <div className="rounded-lg border">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Propriedade</TableHead>
                    <TableHead>Check-out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.proximosCheckouts.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/reservas/${r.id}`)}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate">{r.nomeHospede}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{propertyMap.get(r.propriedadeId)?.nome}</TableCell>
                      <TableCell>{formatDate(r.checkOut)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Pagamentos Não Recebidos */}
      {stats.pagamentosNaoRecebidos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 text-blue-600" />
            <h2 className="text-lg font-semibold">Pagamentos Não Recebidos</h2>
            <span className="text-sm text-muted-foreground">({stats.pagamentosNaoRecebidos.length})</span>
          </div>
          <div className="rounded-lg border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Hóspede</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.pagamentosNaoRecebidos.map((r) => {
                  const prop = propertyMap.get(r.propriedadeId)
                  const valorPagamento = calcValorPagamento(r, prop)
                  const paymentDate = addDays(toLocalDateStr(r.checkIn), 1)
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/reservas/${r.id}`)}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate">{r.nomeHospede}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{prop?.nome}</TableCell>
                      <TableCell className="font-medium">
                        {valorPagamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>{formatDate(paymentDate)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Faxinas Pendentes */}
      {stats.faxinasPendentes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SprayCan className="h-4 w-4 text-yellow-600" />
            <h2 className="text-lg font-semibold">Agendamentos de Faxina Pendentes</h2>
          </div>
          <div className="rounded-lg border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Hóspede</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.faxinasPendentes.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/reservas/${r.id}`)}
                  >
                    <TableCell className="font-medium max-w-[140px] truncate">{r.nomeHospede}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{propertyMap.get(r.propriedadeId)?.nome}</TableCell>
                    <TableCell>{formatDate(r.checkOut)}</TableCell>
                    <TableCell>
                      <ReservationStatusBadge status={r.status as ReservationStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Manutenções Atrasadas */}
      {stats.manutencoesAtrasadas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-red-600" />
            <h2 className="text-lg font-semibold">Manutenções Atrasadas</h2>
          </div>
          <div className="rounded-lg border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.manutencoesAtrasadas.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/propriedades/${c.propriedadeId}`)}
                  >
                    <TableCell className="font-medium max-w-[140px] truncate">{c.nome}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{propertyMap.get(c.propriedadeId)?.nome}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{c.prestador || "—"}</TableCell>
                    <TableCell>
                      {formatDate(c.proximaManutencao)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Próximas Manutenções Agendadas */}
      {stats.proximasManutencoes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            <h2 className="text-lg font-semibold">Próximas Manutenções Agendadas</h2>
            <span className="text-sm text-muted-foreground">(Próximos 7 dias)</span>
          </div>
          <div className="rounded-lg border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead>Data Prevista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.proximasManutencoes.map((sm) => (
                  <TableRow
                    key={sm.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/propriedades/${sm.propriedadeId}`)}
                  >
                    <TableCell className="font-medium max-w-[140px] truncate">{sm.nome}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{propertyMap.get(sm.propriedadeId)?.nome}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{sm.prestador || "—"}</TableCell>
                    <TableCell>{formatDate(sm.dataPrevista)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
