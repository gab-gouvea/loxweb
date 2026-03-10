import { useState, useMemo } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
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
import { propertyColorMap } from "@/lib/colors"
import { cn } from "@/lib/utils"
import type { Reservation, ReservationStatus } from "@/types/reservation"

const sourceLabels: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  direto: "Direto",
  outro: "Outro",
}

export function ReservationsPage() {
  const { data: reservations = [], isLoading } = useReservations()
  const { data: properties = [] } = useProperties()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | undefined>()
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

  function handleEdit(reservation: Reservation) {
    setEditingReservation(reservation)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingReservation(undefined)
  }

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
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="concluída">Concluída</SelectItem>
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
                <span className="flex items-center gap-2">
                  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", propertyColorMap[p.cor].bg)} />
                  {p.nome}
                </span>
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
                <TableHead>Hóspede</TableHead>
                <TableHead>Propriedade</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[80px]"></TableHead>
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
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">{reservation.nomeHospede}</TableCell>
                      <TableCell>
                        {property && (
                          <span className="flex items-center gap-2">
                            <span className={cn("inline-block h-2.5 w-2.5 rounded-full", propertyColorMap[property.cor].bg)} />
                            {property.nome}
                          </span>
                        )}
                      </TableCell>
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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(reservation)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingReservation(reservation)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        onOpenChange={handleDialogClose}
        reservation={editingReservation}
      />

      <ReservationDeleteDialog
        open={!!deletingReservation}
        onOpenChange={(open) => !open && setDeletingReservation(null)}
        reservation={deletingReservation}
      />
    </div>
  )
}
