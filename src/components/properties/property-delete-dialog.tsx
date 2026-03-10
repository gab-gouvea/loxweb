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
import { useDeleteProperty } from "@/hooks/use-properties"
import type { Property } from "@/types/property"
import { toast } from "sonner"

interface PropertyDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: Property | null
}

export function PropertyDeleteDialog({ open, onOpenChange, property }: PropertyDeleteDialogProps) {
  const deleteMutation = useDeleteProperty()

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
