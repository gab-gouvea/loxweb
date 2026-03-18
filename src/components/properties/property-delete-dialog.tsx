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
import { AlertTriangle } from "lucide-react"
import { useDeleteProperty } from "@/hooks/use-properties"
import { useReservations } from "@/hooks/use-reservations"
import type { Property } from "@/types/property"
import { toast } from "sonner"
import { useMemo } from "react"

interface PropertyDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: Property | null
}

export function PropertyDeleteDialog({ open, onOpenChange, property }: PropertyDeleteDialogProps) {
  const deleteMutation = useDeleteProperty()
  const { data: reservations = [] } = useReservations()

  const reservasAssociadas = useMemo(() =>
    reservations.filter((r) => r.propriedadeId === property?.id && r.status !== "cancelada"),
    [reservations, property?.id]
  )

  function handleDelete() {
    if (!property) return
    deleteMutation.mutate(property.id, {
      onSuccess: () => {
        toast.success("Propriedade excluída")
        onOpenChange(false)
      },
      onError: () => toast.error("Erro ao excluir propriedade"),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir propriedade?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir "{property?.nome}"? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          {reservasAssociadas.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 mt-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Esta propriedade possui <strong>{reservasAssociadas.length} reserva{reservasAssociadas.length > 1 ? "s" : ""}</strong> associada{reservasAssociadas.length > 1 ? "s" : ""}. Ao excluir, essas reservas deixarão de aparecer nos relatórios.
              </span>
            </div>
          )}
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
