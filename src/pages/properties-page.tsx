import { useState, useMemo } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useProperties } from "@/hooks/use-properties"
import { useProprietarioMap } from "@/hooks/use-proprietario-map"
import { PropertyCard } from "@/components/properties/property-card"
import { PropertyDialog } from "@/components/properties/property-dialog"
import type { Property } from "@/types/property"

export function PropertiesPage() {
  const { data: rawProperties, isLoading } = useProperties()
  const { proprietarioMap } = useProprietarioMap()
  const properties = useMemo(() => rawProperties ? [...rawProperties].sort((a, b) => {
    // Inativas vão para o fundo
    if (a.ativo !== b.ativo) return a.ativo ? -1 : 1
    return a.nome.localeCompare(b.nome)
  }) : undefined, [rawProperties])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | undefined>()
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
        <h1 className="text-xl sm:text-2xl font-bold">Propriedades</h1>
        <Button onClick={() => setDialogOpen(true)} className="min-h-[44px] min-w-[44px]">
          <Plus className="mr-2 h-4 w-4" />
          Nova Propriedade
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties?.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              ownerName={property.proprietarioId ? proprietarioMap.get(property.proprietarioId)?.nomeCompleto : undefined}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        property={editingProperty}
      />

    </div>
  )
}
