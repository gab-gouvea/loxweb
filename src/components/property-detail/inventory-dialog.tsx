import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InventoryForm } from "./inventory-form"
import { useCreateInventoryItem, useUpdateInventoryItem } from "@/hooks/use-property-details"
import type { InventoryItem, InventoryFormData } from "@/types/property-detail"
import { toast } from "sonner"

interface InventoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  item?: InventoryItem
  defaultSecao?: string
}

export function InventoryDialog({ open, onOpenChange, propertyId, item, defaultSecao }: InventoryDialogProps) {
  const createMutation = useCreateInventoryItem()
  const updateMutation = useUpdateInventoryItem()
  const isEditing = !!item

  function handleSubmit(data: InventoryFormData) {
    if (isEditing) {
      updateMutation.mutate(
        { id: item.id, propertyId, data },
        {
          onSuccess: () => {
            toast.success("Item atualizado")
            onOpenChange(false)
          },
          onError: () => toast.error("Erro ao atualizar item"),
        }
      )
    } else {
      createMutation.mutate(
        { propertyId, data },
        {
          onSuccess: () => {
            toast.success("Item adicionado")
            onOpenChange(false)
          },
          onError: () => toast.error("Erro ao adicionar item"),
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Item" : "Novo Item"}</DialogTitle>
        </DialogHeader>
        <InventoryForm
          item={item}
          defaultSecao={defaultSecao}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
