import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PropertyForm } from "./property-form"
import { useCreateProperty, useUpdateProperty } from "@/hooks/use-properties"
import type { Property, PropertyFormData } from "@/types/property"
import { toast } from "sonner"

interface PropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property?: Property
}

export function PropertyDialog({ open, onOpenChange, property }: PropertyDialogProps) {
  const createMutation = useCreateProperty()
  const updateMutation = useUpdateProperty()
  const isEditing = !!property

  function handleSubmit(data: PropertyFormData) {
    if (isEditing) {
      updateMutation.mutate(
        { id: property.id, data },
        {
          onSuccess: () => {
            toast.success("Propriedade atualizada")
            onOpenChange(false)
          },
          onError: () => toast.error("Erro ao atualizar propriedade"),
        },
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Propriedade criada")
          onOpenChange(false)
        },
        onError: () => toast.error("Erro ao criar propriedade"),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Propriedade" : "Nova Propriedade"}
          </DialogTitle>
        </DialogHeader>
        <PropertyForm
          property={property}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
