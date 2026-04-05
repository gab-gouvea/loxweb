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
import { useDeleteLocacao } from "@/hooks/use-locacoes"
import type { Locacao } from "@/types/locacao"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"

interface LocacaoDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locacao: Locacao | null
}

export function LocacaoDeleteDialog({ open, onOpenChange, locacao }: LocacaoDeleteDialogProps) {
  const deleteMutation = useDeleteLocacao()

  function handleDelete() {
    if (!locacao) return
    deleteMutation.mutate(locacao.id, {
      onSuccess: () => {
        toast.success("Locação excluída")
        onOpenChange(false)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir locação?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a locação de{" "}
            <strong>{locacao?.nomeCompleto}</strong>? Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
