import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Building2,
  CalendarDays,
  SprayCan,
  Wrench,
  CircleDollarSign,
  LogIn,
  LogOut,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProperties } from "@/hooks/use-properties"
import { useReservations } from "@/hooks/use-reservations"
import { useAllPropertyComponents } from "@/hooks/use-property-details"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { formatDate } from "@/lib/date-utils"
import type { ReservationStatus } from "@/types/reservation"

/** Converte ISO string para YYYY-MM-DD local */
function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: properties = [] } = useProperties()
  const { data: reservations = [] } = useReservations()
  const { data: components = [] } = useAllPropertyComponents()

  const propertyMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of properties) map.set(p.id, p.nome)
    return map
  }, [properties])

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

    // Faxinas não pagas (empresa parceira)
    const faxinasNaoPagas = reservations.filter(
      (r) =>
        !r.faxinaPorMim &&
        r.faxinaPaga === false &&
        r.faxinaStatus &&
        r.faxinaStatus !== "nao_agendada"
    )

    // Próximos check-ins (hoje + 7 dias)
    const proximosCheckins = naoCanceladas
      .filter((r) => {
        const d = toLocalDateStr(r.checkIn)
        return d >= today && d <= in7days
      })
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))

    // Próximos checkouts (hoje + 7 dias)
    const proximosCheckouts = naoCanceladas
      .filter((r) => {
        const d = toLocalDateStr(r.checkOut)
        return d >= today && d <= in7days
      })
      .sort((a, b) => a.checkOut.localeCompare(b.checkOut))

    return {
      imoveis,
      reservasAtivas: naoCanceladas.length,
      faxinasPendentes,
      manutencoesAtrasadas,
      faxinasNaoPagas,
      proximosCheckins,
      proximosCheckouts,
    }
  }, [properties, reservations, components])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Olá, Gabriel</h1>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/propriedades")}
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2 min-h-[3rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Imóveis
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.imoveis}</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/reservas")}
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2 min-h-[3rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Reservas
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.reservasAtivas}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-2 min-h-[3rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agend. Faxina Pendentes
            </CardTitle>
            <SprayCan className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.faxinasPendentes.length > 0 ? "text-yellow-600" : "text-green-600"}`}>
              {stats.faxinasPendentes.length}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/faxina-terceirizada/pagamentos")}
        >
          <CardHeader className="flex flex-row items-start justify-between pb-2 min-h-[3rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faxinas Não Pagas
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.faxinasNaoPagas.length > 0 ? "text-orange-600" : "text-green-600"}`}>
              {stats.faxinasNaoPagas.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-2 min-h-[3rem]">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Manut. Atrasadas
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.manutencoesAtrasadas.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {stats.manutencoesAtrasadas.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seções lado a lado: Check-ins e Checkouts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Próximos Check-ins */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-green-600" />
            <h2 className="text-lg font-semibold">Próximos Check-ins</h2>
            <span className="text-sm text-muted-foreground">Próximos 7 dias</span>
          </div>
          {stats.proximosCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum check-in nos próximos 7 dias</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
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
                      <TableCell className="font-medium">{r.nomeHospede}</TableCell>
                      <TableCell>{propertyMap.get(r.propriedadeId)}</TableCell>
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
            <span className="text-sm text-muted-foreground">Próximos 7 dias</span>
          </div>
          {stats.proximosCheckouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum checkout nos próximos 7 dias</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
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
                      <TableCell className="font-medium">{r.nomeHospede}</TableCell>
                      <TableCell>{propertyMap.get(r.propriedadeId)}</TableCell>
                      <TableCell>{formatDate(r.checkOut)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Faxinas Pendentes */}
      {stats.faxinasPendentes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <SprayCan className="h-4 w-4 text-yellow-600" />
            <h2 className="text-lg font-semibold">Agendamentos de Faxina Pendentes</h2>
          </div>
          <div className="rounded-lg border">
            <Table>
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
                    <TableCell className="font-medium">{r.nomeHospede}</TableCell>
                    <TableCell>{propertyMap.get(r.propriedadeId)}</TableCell>
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
            <Table>
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
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{propertyMap.get(c.propriedadeId)}</TableCell>
                    <TableCell>{c.prestador || "—"}</TableCell>
                    <TableCell className="text-red-600">
                      {formatDate(c.proximaManutencao)}
                    </TableCell>
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
