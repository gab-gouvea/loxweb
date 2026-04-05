import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LocacaoForm } from "./locacao-form"
import { useCreateLocacao, useUpdateLocacao } from "@/hooks/use-locacoes"
import type { Locacao, LocacaoFormData } from "@/types/locacao"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"

interface LocacaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locacao?: Locacao
}

export function LocacaoDialog({
  open,
  onOpenChange,
  locacao,
}: LocacaoDialogProps) {
  const createMutation = useCreateLocacao()
  const updateMutation = useUpdateLocacao()
  const isEditing = !!locacao

  function handleSubmit(formData: LocacaoFormData) {
    const data = {
      ...formData,
      valorMensal: formData.valorMensal === "" ? undefined : formData.valorMensal,
      valorTotal: formData.valorTotal === "" ? undefined : formData.valorTotal,
      garantia: formData.garantia === "" ? undefined : formData.garantia,
    }
    if (isEditing) {
      updateMutation.mutate(
        { id: locacao.id, data },
        {
          onSuccess: () => {
            toast.success("Locação atualizada")
            onOpenChange(false)
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      )
    } else {
      createMutation.mutate({ ...data, status: "ativa" }, {
        onSuccess: () => {
          toast.success("Locação criada")
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Locação" : "Nova Locação"}
          </DialogTitle>
        </DialogHeader>
        <LocacaoForm
          locacao={locacao}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
