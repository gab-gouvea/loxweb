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
import { useDeleteProprietario } from "@/hooks/use-proprietarios"
import type { Proprietario } from "@/types/proprietario"
import { toast } from "sonner"

interface ProprietarioDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proprietario: Proprietario | null
}

export function ProprietarioDeleteDialog({ open, onOpenChange, proprietario }: ProprietarioDeleteDialogProps) {
  const deleteMutation = useDeleteProprietario()

  function handleDelete() {
    if (!proprietario) return
    deleteMutation.mutate(proprietario.id, {
      onSuccess: () => {
        toast.success("Proprietário excluído")
        onOpenChange(false)
      },
      onError: () => toast.error("Erro ao excluir proprietário"),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir proprietário?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir &ldquo;{proprietario?.nomeCompleto}&rdquo;? Esta ação não pode ser desfeita.
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
