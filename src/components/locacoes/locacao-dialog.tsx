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
    // Sem administração só existe em locação anual; o modo escolhido zera os campos do outro,
    // para não deixar percentual obsoleto guiando os cálculos de receita.
    const semAdministracao = formData.tipoLocacao === "anual" && formData.semAdministracao === true
    const data = {
      ...formData,
      valorMensal: formData.valorMensal === "" ? undefined : formData.valorMensal,
      valorTotal: formData.valorTotal === "" ? undefined : formData.valorTotal,
      garantia: formData.garantia === "" ? undefined : formData.garantia,
      semAdministracao,
      percentualComissao: semAdministracao || formData.percentualComissao === ""
        ? undefined
        : formData.percentualComissao,
      percentualPrimeiroAluguel: !semAdministracao || formData.percentualPrimeiroAluguel === ""
        ? undefined
        : formData.percentualPrimeiroAluguel,
      // Parcelas só valem no modo sem administração; o form usa "" para campo vazio
      parcelasTaxa: semAdministracao
        ? (formData.parcelasTaxa ?? [])
            .filter((p) => typeof p.mes === "number" && typeof p.ano === "number" && typeof p.valor === "number")
            .map((p) => ({
              dia: typeof p.dia === "number" ? p.dia : undefined,
              mes: p.mes as number,
              ano: p.ano as number,
              valor: p.valor as number,
            }))
        : [],
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
      <DialogContent className="w-full max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto sm:max-w-[600px] p-4 sm:p-6">
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
