import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useProperties } from "@/hooks/use-properties"
import { ReservationDialog } from "@/components/reservations/reservation-dialog"
import { ReservationDeleteDialog } from "@/components/reservations/reservation-delete-dialog"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { formatDate } from "@/lib/date-utils"
import type { Reservation, ReservationStatus } from "@/types/reservation"

const sourceLabels: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  direto: "Direto",
  outro: "Outro",
}

export function ReservationsPage() {
  const navigate = useNavigate()
  const { data: reservations = [], isLoading } = useReservations()
  const { data: properties = [] } = useProperties()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")

  const propertyMap = useMemo(() => {
    const map = new Map<string, (typeof properties)[number]>()
    for (const p of properties) map.set(p.id, p)
    return map
  }, [properties])

  const filtered = useMemo(() => {
    let result = reservations
    if (statusFilter !== "todos") {
      result = result.filter((r) => r.status === statusFilter)
    }
    if (propertyFilter !== "todos") {
      result = result.filter((r) => r.propriedadeId === propertyFilter)
    }
    return result.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  }, [reservations, statusFilter, propertyFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservas</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
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
                <TableHead>Hospede</TableHead>
                <TableHead>Propriedade</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma reserva encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((reservation) => {
                  const property = propertyMap.get(reservation.propriedadeId)
                  return (
                    <TableRow
                      key={reservation.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/reservas/${reservation.id}`)}
                    >
                      <TableCell className="font-medium">{reservation.nomeHospede}</TableCell>
                      <TableCell>{property?.nome}</TableCell>
                      <TableCell>{formatDate(reservation.checkIn)}</TableCell>
                      <TableCell>{formatDate(reservation.checkOut)}</TableCell>
                      <TableCell>
                        <ReservationStatusBadge status={reservation.status as ReservationStatus} />
                      </TableCell>
                      <TableCell>{sourceLabels[reservation.fonte]}</TableCell>
                      <TableCell className="text-right">
                        {reservation.precoTotal
                          ? `R$ ${reservation.precoTotal.toLocaleString("pt-BR")}`
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
