import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProperties } from "@/hooks/use-properties"
import { PropertyCard } from "@/components/properties/property-card"
import { PropertyDialog } from "@/components/properties/property-dialog"
import { PropertyDeleteDialog } from "@/components/properties/property-delete-dialog"
import type { Property } from "@/types/property"

export function PropertiesPage() {
  const { data: properties, isLoading } = useProperties()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | undefined>()
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null)

  function handleEdit(property: Property) {
    setEditingProperty(property)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingProperty(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Propriedades</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Propriedade
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties?.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEdit={handleEdit}
              onDelete={setDeletingProperty}
            />
          ))}
        </div>
      )}

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        property={editingProperty}
      />

      <PropertyDeleteDialog
        open={!!deletingProperty}
        onOpenChange={(open) => !open && setDeletingProperty(null)}
        property={deletingProperty}
      />
    </div>
  )
}
