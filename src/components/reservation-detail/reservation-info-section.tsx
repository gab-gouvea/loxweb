import { useState } from "react"
import {
  CalendarDays,
  Users,
  Building2,
  DollarSign,
  Pencil,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatDate, localDateToISO } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

interface ReservationInfoSectionProps {
  reservation: Reservation
  property: Property | undefined
  onMutate: (data: Record<string, unknown>, options?: { onSuccess?: () => void }) => void
  isPending: boolean
}

export function ReservationInfoSection({
  reservation,
  property,
  onMutate,
  isPending,
}: ReservationInfoSectionProps) {
  const [editingInfo, setEditingInfo] = useState(false)
  const [editCheckIn, setEditCheckIn] = useState<string | null>(null)
  const [editCheckOut, setEditCheckOut] = useState<string | null>(null)
  const [editPrecoTotal, setEditPrecoTotal] = useState<string | null>(null)
  const [editNumHospedes, setEditNumHospedes] = useState<string | null>(null)

  function handleSaveInfo() {
    const data: Record<string, unknown> = {}
    if (editCheckIn !== null) data.checkIn = localDateToISO(editCheckIn)
    if (editCheckOut !== null) data.checkOut = localDateToISO(editCheckOut)
    if (editPrecoTotal !== null) data.precoTotal = Number(editPrecoTotal)
    if (editNumHospedes !== null) data.numHospedes = Number(editNumHospedes)

    onMutate(data, {
      onSuccess: () => {
        toast.success("Reserva atualizada")
        setEditingInfo(false)
        setEditCheckIn(null)
        setEditCheckOut(null)
        setEditPrecoTotal(null)
        setEditNumHospedes(null)
      },
    })
  }

  function handleCancelInfoEdit() {
    setEditingInfo(false)
    setEditCheckIn(null)
    setEditCheckOut(null)
    setEditPrecoTotal(null)
    setEditNumHospedes(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {!editingInfo && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingInfo(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!editingInfo ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-2 pt-4 pb-4">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Propriedade</p>
                <p className="text-sm font-medium">{property?.nome ?? "\u2014"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-4 pb-4">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="text-sm font-medium">{formatDate(reservation.checkIn)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-4 pb-4">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="text-sm font-medium">{formatDate(reservation.checkOut)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-4 pb-4">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hóspedes</p>
                <p className="text-sm font-medium">{reservation.numHospedes}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-4 pb-4">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-sm font-medium">
                  {reservation.precoTotal
                    ? formatCurrency(reservation.precoTotal)
                    : "\u2014"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check-in</label>
              <Input
                type="date"
                className="h-8"
                value={editCheckIn ?? reservation.checkIn.split("T")[0]}
                onChange={(e) => setEditCheckIn(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Check-out</label>
              <Input
                type="date"
                className="h-8"
                value={editCheckOut ?? reservation.checkOut.split("T")[0]}
                onChange={(e) => setEditCheckOut(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hóspedes</label>
              <Input
                type="number"
                min={1}
                className="h-8 w-20"
                value={editNumHospedes ?? reservation.numHospedes}
                onChange={(e) => setEditNumHospedes(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor Total (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="h-8 w-32"
                value={editPrecoTotal ?? reservation.precoTotal ?? ""}
                onChange={(e) => setEditPrecoTotal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveInfo} disabled={isPending}>
              <Save className="mr-1 h-3 w-3" />
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelInfoEdit}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
