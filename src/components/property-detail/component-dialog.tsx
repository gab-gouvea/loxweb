import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ComponentForm } from "./component-form"
import { useCreateComponent, useUpdateComponent } from "@/hooks/use-property-details"
import type { PropertyComponent, ComponentFormData } from "@/types/property-detail"
import { toast } from "sonner"

interface ComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  component?: PropertyComponent
}

export function ComponentDialog({ open, onOpenChange, propertyId, component }: ComponentDialogProps) {
  const createMutation = useCreateComponent()
  const updateMutation = useUpdateComponent()
  const isEditing = !!component

  function handleSubmit(data: ComponentFormData) {
    if (isEditing) {
      updateMutation.mutate(
        { id: component.id, propertyId, data },
        {
          onSuccess: () => {
            toast.success("Componente atualizado")
            onOpenChange(false)
          },
          onError: () => toast.error("Erro ao atualizar componente"),
        }
      )
    } else {
      createMutation.mutate(
        { propertyId, data },
        {
          onSuccess: () => {
            toast.success("Componente adicionado")
            onOpenChange(false)
          },
          onError: () => toast.error("Erro ao adicionar componente"),
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Componente" : "Novo Componente"}</DialogTitle>
        </DialogHeader>
        <ComponentForm
          component={component}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
