import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ReservationForm } from "./reservation-form"
import { useCreateReservation, useUpdateReservation } from "@/hooks/use-reservations"
import type { Reservation, ReservationFormData } from "@/types/reservation"
import { toast } from "sonner"

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation?: Reservation
  defaultCheckIn?: Date
  defaultPropertyId?: string
}

export function ReservationDialog({
  open,
  onOpenChange,
  reservation,
  defaultCheckIn,
  defaultPropertyId,
}: ReservationDialogProps) {
  const createMutation = useCreateReservation()
  const updateMutation = useUpdateReservation()
  const isEditing = !!reservation

  function handleSubmit(data: ReservationFormData) {
    if (isEditing) {
      updateMutation.mutate(
        { id: reservation.id, data },
        {
          onSuccess: () => {
            toast.success("Reserva atualizada")
            onOpenChange(false)
          },
          onError: () => toast.error("Erro ao atualizar reserva"),
        },
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Reserva criada")
          onOpenChange(false)
        },
        onError: () => toast.error("Erro ao criar reserva"),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Reserva" : "Nova Reserva"}
          </DialogTitle>
        </DialogHeader>
        <ReservationForm
          reservation={reservation}
          defaultCheckIn={defaultCheckIn}
          defaultPropertyId={defaultPropertyId}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
