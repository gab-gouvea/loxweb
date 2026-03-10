import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Building2, BedDouble, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useProperty } from "@/hooks/use-properties"
import { propertyColorMap } from "@/lib/colors"
import { cn } from "@/lib/utils"
import { ComponentTable } from "@/components/property-detail/component-table"
import { InventoryTable } from "@/components/property-detail/inventory-table"

const tipoLabels: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  studio: "Studio",
  chalé: "Chalé",
  flat: "Flat",
  outro: "Outro",
}

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: property, isLoading } = useProperty(id!)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/propriedades")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Propriedade não encontrada.</p>
      </div>
    )
  }

  const colors = propertyColorMap[property.cor]

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate("/propriedades")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Header com foto de capa */}
      <div className="overflow-hidden rounded-lg border">
        {property.fotoCapa && (
          <div className="h-56 w-full overflow-hidden print:h-40">
            <img
              src={property.fotoCapa}
              alt={property.nome}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className={cn("h-4 w-4 rounded-full", colors.bg)} />
            <h1 className="text-2xl font-bold">{property.nome}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <Badge variant="secondary">{tipoLabels[property.tipo]}</Badge>
            </div>
            {property.endereco && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{property.endereco}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              <span>{property.quartos} quartos</span>
            </div>
          </div>
        </div>
      </div>

      <Separator className="print:hidden" />

      {/* Componentes de manutenção */}
      <div className="print:hidden">
        <ComponentTable propertyId={property.id} />
      </div>

      <Separator className="print:hidden" />

      {/* Inventário */}
      <InventoryTable propertyId={property.id} propertyName={property.nome} />
    </div>
  )
}
