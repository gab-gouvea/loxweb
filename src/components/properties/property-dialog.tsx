import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PropertyForm } from "./property-form"
import { useCreateProperty, useUpdateProperty } from "@/hooks/use-properties"
import { useReservations, useUpdateReservation } from "@/hooks/use-reservations"
import { useLocacoes, useUpdateLocacao } from "@/hooks/use-locacoes"
import type { Property, PropertyFormData } from "@/types/property"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api"
import { getTodayStr } from "@/lib/date-utils"
import { shouldLockTaxa, getItemsToLockTaxa } from "@/lib/taxa-lock"

interface PropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property?: Property
}

export function PropertyDialog({ open, onOpenChange, property }: PropertyDialogProps) {
  const createMutation = useCreateProperty()
  const updateMutation = useUpdateProperty()
  const updateReservation = useUpdateReservation()
  const updateLocacao = useUpdateLocacao()
  const { data: reservations } = useReservations()
  const { data: locacoes } = useLocacoes()
  const isEditing = !!property

  async function handleSubmit(data: PropertyFormData) {
    if (isEditing) {
      const oldTaxa = property.taxaLimpeza
      const newTaxa = typeof data.taxaLimpeza === "number" ? data.taxaLimpeza : undefined

      if (shouldLockTaxa(oldTaxa, newTaxa)) {
        const today = getTodayStr()
        const pastReservations = getItemsToLockTaxa(reservations, property.id, today)
        const pastLocacoes = getItemsToLockTaxa(locacoes, property.id, today)

        try {
          await Promise.all([
            ...pastReservations.map((r) =>
              updateReservation.mutateAsync({ id: r.id, data: { taxaLimpeza: oldTaxa } }),
            ),
            ...pastLocacoes.map((l) =>
              updateLocacao.mutateAsync({ id: l.id, data: { taxaLimpeza: oldTaxa } }),
            ),
          ])
        } catch (err) {
          toast.error(`Falha ao travar taxa antiga: ${getErrorMessage(err)}`)
          return
        }
      }

      updateMutation.mutate(
        { id: property.id, data },
        {
          onSuccess: () => {
            toast.success("Propriedade atualizada")
            onOpenChange(false)
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Propriedade criada")
          onOpenChange(false)
        },
        onError: (err) => toast.error(getErrorMessage(err)),
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
          isSubmitting={createMutation.isPending || updateMutation.isPending || updateReservation.isPending || updateLocacao.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
