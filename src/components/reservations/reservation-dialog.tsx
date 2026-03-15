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
import { getErrorMessage } from "@/lib/api"

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
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Reserva criada")
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
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
