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
import { EmptyState } from "@/components/shared/empty-state"
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
import { useLocacoes } from "@/hooks/use-locacoes"
import { useLocacaoRecebidoSet } from "@/hooks/use-locacao-recebido-set"
import { useOccupancy } from "@/hooks/use-occupancy"
import { useAllPropertyComponents, useAllPendingScheduledMaintenances } from "@/hooks/use-property-details"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { formatDate, toLocalDateStr, getTodayStr } from "@/lib/date-utils"
import { buildPagamentosPendentes } from "@/lib/pagamentos-pendentes"
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
  const { data: locacoes = [] } = useLocacoes()

  // Mesmo set dos alertas — cobre também os meses antigos (à vista e sem administração)
  const recebidoSet = useLocacaoRecebidoSet(locacoes)
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

    // Pagamentos não recebidos — uma linha por cobrança: reserva base, cada extensão,
    // cada parcela de taxa de intermediação e cada ciclo de locação administrada.
    const pagamentosNaoRecebidos = buildPagamentosPendentes({
      reservations,
      locacoes,
      propertyMap,
      recebidoSet,
      today,
    })

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
  }, [properties, reservations, components, pendingMaintenances, locacoes, propertyMap, recebidoSet])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {userName ? `Olá, ${userName}` : "Olá"}
      </h1>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard title="Imóveis" value={stats.imoveis} icon={Building2} onClick={() => navigate("/propriedades")} />
        <SummaryCard title="Total de Reservas" value={stats.reservasAtivas} icon={CalendarDays} onClick={() => navigate("/reservas")} />
        <SummaryCard title="Ver % de Ocupação" value={`${avgOccupancy}%`} icon={BarChart3} onClick={() => navigate("/ocupacao")} valueClassName={avgOccupancy >= 70 ? "text-green-600" : ""} />
      </div>

      {/* Seções lado a lado: Check-ins e Checkouts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Próximos Check-ins */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <LogIn className="h-5 w-5 shrink-0 text-green-600" />
            <h2 className="text-lg font-semibold">Próximos Check-ins</h2>
            <span className="text-sm text-muted-foreground">(Próximos 7 dias)</span>
          </div>
          {stats.proximosCheckins.length === 0 ? (
            <EmptyState icon={LogIn} title="Nenhum check-in nos próximos 7 dias" />
          ) : (
            <div className="rounded-lg border shadow-sm overflow-x-auto">
              <Table className="table-fixed min-w-[400px]">
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
                      className="cursor-pointer min-h-[44px]"
                      onClick={() => navigate(`/reservas/${r.id}`)}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate py-3">{r.nomeHospede}</TableCell>
                      <TableCell className="max-w-[140px] truncate py-3">{propertyMap.get(r.propriedadeId)?.nome}</TableCell>
                      <TableCell className="py-3">{formatDate(r.checkIn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Próximos Checkouts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <LogOut className="h-5 w-5 shrink-0 text-red-600" />
            <h2 className="text-lg font-semibold">Próximos Checkouts</h2>
            <span className="text-sm text-muted-foreground">(Próximos 7 dias)</span>
          </div>
          {stats.proximosCheckouts.length === 0 ? (
            <EmptyState icon={LogOut} title="Nenhum checkout nos próximos 7 dias" />
          ) : (
            <div className="rounded-lg border shadow-sm overflow-x-auto">
              <Table className="table-fixed min-w-[400px]">
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
                      className="cursor-pointer min-h-[44px]"
                      onClick={() => navigate(`/reservas/${r.id}`)}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate py-3">{r.nomeHospede}</TableCell>
                      <TableCell className="max-w-[140px] truncate py-3">{propertyMap.get(r.propriedadeId)?.nome}</TableCell>
                      <TableCell className="py-3">{formatDate(r.checkOut)}</TableCell>
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
          <div className="flex items-center gap-2 flex-wrap">
            <CircleDollarSign className="h-5 w-5 shrink-0 text-blue-600" />
            <h2 className="text-lg font-semibold">Pagamentos Não Recebidos</h2>
            <span className="text-sm text-muted-foreground">({stats.pagamentosNaoRecebidos.length})</span>
          </div>
          <div className="rounded-lg border shadow-sm overflow-x-auto">
            <Table className="table-fixed min-w-[480px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Hóspede</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.pagamentosNaoRecebidos.map((pagamento) => {
                  const prop = propertyMap.get(pagamento.propriedadeId)
                  const badgeClass = pagamento.origem === "extensao"
                    ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  return (
                    <TableRow
                      key={pagamento.key}
                      className="cursor-pointer min-h-[44px]"
                      onClick={() => navigate(pagamento.link)}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate py-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{pagamento.nome}</span>
                          {pagamento.badge && (
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                              {pagamento.badge}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate py-3">{prop?.nome}</TableCell>
                      <TableCell className="font-medium py-3">
                        {pagamento.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell className="py-3">{formatDate(pagamento.vencimento)}</TableCell>
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
          <div className="flex items-center gap-2 flex-wrap">
            <SprayCan className="h-5 w-5 shrink-0 text-yellow-600" />
            <h2 className="text-lg font-semibold">Agendamentos de Faxina Pendentes</h2>
          </div>
          <div className="rounded-lg border shadow-sm overflow-x-auto">
            <Table className="table-fixed min-w-[480px]">
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
                    className="cursor-pointer min-h-[44px]"
                    onClick={() => navigate(`/reservas/${r.id}`)}
                  >
                    <TableCell className="font-medium max-w-[140px] truncate py-3">{r.nomeHospede}</TableCell>
                    <TableCell className="max-w-[140px] truncate py-3">{propertyMap.get(r.propriedadeId)?.nome}</TableCell>
                    <TableCell className="py-3">{formatDate(r.checkOut)}</TableCell>
                    <TableCell className="py-3">
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
          <div className="flex items-center gap-2 flex-wrap">
            <Wrench className="h-5 w-5 shrink-0 text-red-600" />
            <h2 className="text-lg font-semibold">Manutenções Atrasadas</h2>
          </div>
          <div className="rounded-lg border shadow-sm overflow-x-auto">
            <Table className="table-fixed min-w-[480px]">
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
                    className="cursor-pointer min-h-[44px]"
                    onClick={() => navigate(`/propriedades/${c.propriedadeId}`)}
                  >
                    <TableCell className="font-medium max-w-[140px] truncate py-3">{c.nome}</TableCell>
                    <TableCell className="max-w-[140px] truncate py-3">{propertyMap.get(c.propriedadeId)?.nome}</TableCell>
                    <TableCell className="max-w-[100px] truncate py-3">{c.prestador || "—"}</TableCell>
                    <TableCell className="py-3">
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
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarClock className="h-5 w-5 shrink-0 text-blue-600" />
            <h2 className="text-lg font-semibold">Próximas Manutenções Agendadas</h2>
            <span className="text-sm text-muted-foreground">(Próximos 7 dias)</span>
          </div>
          <div className="rounded-lg border shadow-sm overflow-x-auto">
            <Table className="table-fixed min-w-[480px]">
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
                    className="cursor-pointer min-h-[44px]"
                    onClick={() => navigate(`/propriedades/${sm.propriedadeId}`)}
                  >
                    <TableCell className="font-medium max-w-[140px] truncate py-3">{sm.nome}</TableCell>
                    <TableCell className="max-w-[140px] truncate py-3">{propertyMap.get(sm.propriedadeId)?.nome}</TableCell>
                    <TableCell className="max-w-[100px] truncate py-3">{sm.prestador || "—"}</TableCell>
                    <TableCell className="py-3">{formatDate(sm.dataPrevista)}</TableCell>
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
