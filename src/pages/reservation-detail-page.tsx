import { useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getErrorMessage } from "@/lib/api"
import { useReservation, useReservations, useUpdateReservation } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { ReservationInfoSection } from "@/components/reservation-detail/reservation-info-section"
import { ReservationCleaningSection } from "@/components/reservation-detail/reservation-cleaning-section"
import { ReservationExpensesSection } from "@/components/reservation-detail/reservation-expenses-section"
import { ReservationNotesSection } from "@/components/reservation-detail/reservation-notes-section"
import { sourceLabels } from "@/lib/constants"
import { type ReservationStatus } from "@/types/reservation"

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: reservation, isLoading } = useReservation(id!)
  const { data: properties = [] } = useProperties()
  const { data: allReservations = [] } = useReservations()
  const updateMutation = useUpdateReservation()

  // Ultimo custo pago a empresa parceira na mesma propriedade
  const ultimoCustoEmpresa = useMemo(() => {
    if (!reservation) return null
    const anteriores = allReservations
      .filter(
        (r) =>
          r.id !== reservation.id &&
          r.propriedadeId === reservation.propriedadeId &&
          !r.faxinaPorMim &&
          r.custoEmpresaFaxina != null &&
          r.custoEmpresaFaxina > 0
      )
      .sort((a, b) => b.checkOut.localeCompare(a.checkOut))
    return anteriores.length > 0 ? anteriores[0].custoEmpresaFaxina! : null
  }, [reservation, allReservations])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/reservas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Reserva nao encontrada.</p>
      </div>
    )
  }

  const property = properties.find((p) => p.id === reservation.propriedadeId)

  function handleMutate(data: Record<string, unknown>, options?: { onSuccess?: () => void }) {
    updateMutation.mutate({ id: reservation!.id, data }, {
      ...options,
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  function handleConfirmarReserva() {
    updateMutation.mutate(
      { id: reservation!.id, data: { status: "confirmada" as ReservationStatus } },
      {
        onSuccess: () => toast.success("Reserva confirmada"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  function handleCancelarReserva() {
    updateMutation.mutate(
      { id: reservation!.id, data: { status: "cancelada" as ReservationStatus } },
      {
        onSuccess: () => toast.success("Reserva cancelada"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/reservas")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{reservation.nomeHospede}</h1>
            <span className="translate-y-[1px]">
              <ReservationStatusBadge status={reservation.status} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(reservation.status === "pendente" || reservation.status === "cancelada") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleConfirmarReserva}
              disabled={updateMutation.isPending}
            >
              Confirmar Reserva
            </Button>
          )}
          {(reservation.status === "pendente" || reservation.status === "confirmada") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleCancelarReserva}
              disabled={updateMutation.isPending}
            >
              Cancelar Reserva
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <ReservationInfoSection
        reservation={reservation}
        property={property}
        onMutate={handleMutate}
        isPending={updateMutation.isPending}
      />

      <div className="text-sm text-muted-foreground">
        Fonte: <span className="font-medium text-foreground">{sourceLabels[reservation.fonte]}</span>
      </div>

      <Separator />

      {/* Faxina */}
      <ReservationCleaningSection
        reservation={reservation}
        property={property}
        ultimoCustoEmpresa={ultimoCustoEmpresa}
        onMutate={handleMutate}
        isPending={updateMutation.isPending}
      />

      <Separator />

      {/* Despesas */}
      <ReservationExpensesSection
        reservation={reservation}
        onMutate={handleMutate}
        isPending={updateMutation.isPending}
      />

      <Separator />

      {/* Notas */}
      <ReservationNotesSection
        reservation={reservation}
        onMutate={handleMutate}
        isPending={updateMutation.isPending}
      />
    </div>
  )
}
