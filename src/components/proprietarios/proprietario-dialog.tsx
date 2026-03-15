import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProprietarioForm } from "./proprietario-form"
import { useCreateProprietario, useUpdateProprietario } from "@/hooks/use-proprietarios"
import type { Proprietario, ProprietarioFormData } from "@/types/proprietario"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"

interface ProprietarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proprietario?: Proprietario
}

export function ProprietarioDialog({ open, onOpenChange, proprietario }: ProprietarioDialogProps) {
  const createMutation = useCreateProprietario()
  const updateMutation = useUpdateProprietario()
  const isEditing = !!proprietario

  function handleSubmit(data: ProprietarioFormData) {
    if (isEditing) {
      updateMutation.mutate(
        { id: proprietario.id, data },
        {
          onSuccess: () => {
            toast.success("Proprietário atualizado")
            onOpenChange(false)
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Proprietário criado")
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Proprietário" : "Novo Proprietário"}
          </DialogTitle>
        </DialogHeader>
        <ProprietarioForm
          proprietario={proprietario}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
