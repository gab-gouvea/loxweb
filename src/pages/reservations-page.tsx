import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useReservations } from "@/hooks/use-reservations"
import { usePropertyMap } from "@/hooks/use-property-map"
import { ReservationDialog } from "@/components/reservations/reservation-dialog"
import { ReservationDeleteDialog } from "@/components/reservations/reservation-delete-dialog"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { formatDate } from "@/lib/date-utils"
import { sourceLabels, formatCurrency } from "@/lib/constants"
import type { Reservation, ReservationStatus } from "@/types/reservation"

const PAGE_SIZE = 20

export function ReservationsPage() {
  const navigate = useNavigate()
  const { data: reservations = [], isLoading } = useReservations()
  const { properties, propertyMap } = usePropertyMap()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [sortBy, setSortBy] = useState<string>("recente")
  const [searchName, setSearchName] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = reservations
    if (statusFilter !== "todos") {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (propertyFilter !== "todos") {
      result = result.filter((r) => r.propriedadeId === propertyFilter)
    }
    if (searchName.trim()) {
      const term = searchName.trim().toLowerCase()
      result = result.filter((r) => r.nomeHospede.toLowerCase().includes(term))
    }

    switch (sortBy) {
      case "recente":
        return [...result].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      case "antigo":
        return [...result].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
      case "nome_az":
        return [...result].sort((a, b) => a.nomeHospede.localeCompare(b.nomeHospede, "pt-BR"))
      case "nome_za":
        return [...result].sort((a, b) => b.nomeHospede.localeCompare(a.nomeHospede, "pt-BR"))
      default:
        return result
    }
  }, [reservations, statusFilter, propertyFilter, sortBy, searchName])

  // Reset page when filters change
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginatedReservations = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page to 1 when filters change
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1) }
  const handlePropertyFilter = (v: string) => { setPropertyFilter(v); setPage(1) }
  const handleSortBy = (v: string) => { setSortBy(v); setPage(1) }
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchName(e.target.value); setPage(1) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservas</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por hospede..."
            value={searchName}
            onChange={handleSearch}
            className="w-[200px] pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="em andamento">Em Andamento</SelectItem>
            <SelectItem value="concluída">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={handlePropertyFilter}>
          <SelectTrigger className="w-[200px]">
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

        <Select value={sortBy} onValueChange={handleSortBy}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recente">Mais recentes</SelectItem>
            <SelectItem value="antigo">Mais antigas</SelectItem>
            <SelectItem value="nome_az">Nome A → Z</SelectItem>
            <SelectItem value="nome_za">Nome Z → A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[150px]">Hospede</TableHead>
                <TableHead className="max-w-[130px]">Propriedade</TableHead>
                <TableHead className="whitespace-nowrap">Check-in</TableHead>
                <TableHead className="whitespace-nowrap">Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma reserva encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedReservations.map((reservation) => {
                  const property = propertyMap.get(reservation.propriedadeId)
                  return (
                    <TableRow
                      key={reservation.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/reservas/${reservation.id}`)}
                    >
                      <TableCell className="font-medium max-w-[150px] truncate">{reservation.nomeHospede}</TableCell>
                      <TableCell className="max-w-[130px] truncate">{property?.nome}</TableCell>
                      <TableCell>{formatDate(reservation.checkIn)}</TableCell>
                      <TableCell>{formatDate(reservation.checkOut)}</TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={reservation.status as ReservationStatus} />
                      </TableCell>
                      <TableCell>{sourceLabels[reservation.fonte]}</TableCell>
                      <TableCell className="text-right">
                        {reservation.precoTotal
                          ? formatCurrency(reservation.precoTotal)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingReservation(reservation)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filtered.length} reserva{filtered.length !== 1 ? "s" : ""} — Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ReservationDeleteDialog
        open={!!deletingReservation}
        onOpenChange={(open) => !open && setDeletingReservation(null)}
        reservation={deletingReservation}
      />
    </div>
  )
}
