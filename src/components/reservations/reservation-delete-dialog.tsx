import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeleteReservation } from "@/hooks/use-reservations"
import type { Reservation } from "@/types/reservation"
import { toast } from "sonner"

interface ReservationDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation | null
}

export function ReservationDeleteDialog({ open, onOpenChange, reservation }: ReservationDeleteDialogProps) {
  const deleteMutation = useDeleteReservation()

  function handleDelete() {
    if (!reservation) return
    deleteMutation.mutate(reservation.id, {
      onSuccess: () => {
        toast.success("Reserva excluída")
        onOpenChange(false)
      },
      onError: () => toast.error("Erro ao excluir reserva"),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir reserva?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a reserva de "{reservation?.nomeHospede}"? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
