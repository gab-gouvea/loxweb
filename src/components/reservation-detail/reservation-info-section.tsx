import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CalendarDays,
  Users,
  Building2,
  DollarSign,
  Pencil,
  Save,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, ThumbsUp } from "lucide-react"
import { formatDate, localDateToISO } from "@/lib/date-utils"
import { formatCurrency, sourceLabels } from "@/lib/constants"
import type { Reservation, ReservationSource } from "@/types/reservation"
import { reservationSources } from "@/types/reservation"
import type { Property } from "@/types/property"
import { calcValorPagamento } from "@/lib/reservation-calculations"

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
  const navigate = useNavigate()
  const [editingInfo, setEditingInfo] = useState(false)
  const [editNomeHospede, setEditNomeHospede] = useState<string | null>(null)
  const [editFonte, setEditFonte] = useState<ReservationSource | null>(null)
  const [editCheckIn, setEditCheckIn] = useState<string | null>(null)
  const [editCheckOut, setEditCheckOut] = useState<string | null>(null)
  const [editPrecoTotal, setEditPrecoTotal] = useState<string | null>(null)
  const [editNumHospedes, setEditNumHospedes] = useState<string | null>(null)

  function handleSaveInfo() {
    const data: Record<string, unknown> = {}
    if (editNomeHospede !== null) data.nomeHospede = editNomeHospede
    if (editFonte !== null) data.fonte = editFonte
    if (editCheckIn !== null) data.checkIn = localDateToISO(editCheckIn)
    if (editCheckOut !== null) data.checkOut = localDateToISO(editCheckOut)
    if (editPrecoTotal !== null) data.precoTotal = Number(editPrecoTotal)
    if (editNumHospedes !== null) data.numHospedes = Number(editNumHospedes)

    onMutate(data, {
      onSuccess: () => {
        toast.success("Reserva atualizada")
        handleCancelInfoEdit()
      },
    })
  }

  function handleCancelInfoEdit() {
    setEditingInfo(false)
    setEditNomeHospede(null)
    setEditFonte(null)
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
        <div className={`grid gap-3 ${reservation.status === "cancelada" || !property ? "grid-cols-3 lg:grid-cols-5" : "grid-cols-3 lg:grid-cols-6"}`}>
          <Card className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => property && navigate(`/propriedades/${property.id}`)}>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Propriedade</p>
                <p className="text-sm font-medium truncate">{property?.nome ?? "\u2014"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="text-sm font-medium">{formatDate(reservation.checkIn)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="text-sm font-medium">{formatDate(reservation.checkOut)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hóspedes</p>
                <p className="text-sm font-medium">{reservation.numHospedes}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Valor Bruto</p>
                <p className="text-sm font-medium">
                  {reservation.precoTotal
                    ? formatCurrency(reservation.precoTotal)
                    : "\u2014"}
                </p>
              </div>
            </CardContent>
          </Card>
          {reservation.status !== "cancelada" && property && (
            <Card
              className={`relative transition-colors ${reservation.pagamentoRecebido ? "border-green-300 bg-green-50" : ""}`}
            >
              <Button
                variant={reservation.pagamentoRecebido ? "default" : "outline"}
                size="icon"
                className={`absolute top-1.5 right-1.5 h-6 w-6 ${reservation.pagamentoRecebido ? "bg-green-600 hover:bg-green-700" : ""}`}
                onClick={(e) => { e.stopPropagation(); onMutate({ pagamentoRecebido: !reservation.pagamentoRecebido }) }}
                disabled={isPending}
              >
                {reservation.pagamentoRecebido ? <Check className="h-3 w-3" /> : <ThumbsUp className="h-3 w-3" />}
              </Button>
              <CardContent className="flex items-center gap-2 pt-3 pb-3">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{reservation.pagamentoRecebido ? "Recebido" : "A Receber"}</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(calcValorPagamento(reservation, property))}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome do Hóspede</label>
              <Input
                className="h-8"
                value={editNomeHospede ?? reservation.nomeHospede}
                onChange={(e) => setEditNomeHospede(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fonte</label>
              <Select
                value={editFonte ?? reservation.fonte}
                onValueChange={(v) => setEditFonte(v as ReservationSource)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reservationSources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {sourceLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
              <label className="text-xs text-muted-foreground mb-1 block">Valor Bruto (R$)</label>
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
