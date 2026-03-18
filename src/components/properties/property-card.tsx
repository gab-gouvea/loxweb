import { Building2, BedDouble, MapPin, Pencil, Trash2, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Property } from "@/types/property"
import { tipoLabels } from "@/lib/constants"

interface PropertyCardProps {
  property: Property
  ownerName?: string
  onEdit: (property: Property) => void
  onDelete: (property: Property) => void
}

export function PropertyCard({ property, ownerName, onEdit, onDelete }: PropertyCardProps) {
  const navigate = useNavigate()

  return (
    <Card className={`overflow-hidden cursor-pointer ${!property.ativo ? "opacity-50" : ""}`} onClick={() => navigate(`/propriedades/${property.id}`)}>
      {property.fotoCapa && (
        <div className="h-40 w-full overflow-hidden">
          <img
            src={property.fotoCapa}
            alt={property.nome}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{property.nome}</CardTitle>
            {!property.ativo && <Badge variant="destructive" className="text-xs">Inativa</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(property) }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(property) }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <Badge variant="secondary">{tipoLabels[property.tipo]}</Badge>
        </div>
        {property.endereco && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{property.endereco}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <BedDouble className="h-4 w-4" />
          <span>{property.quartos} quartos</span>
        </div>
        {ownerName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <User className="h-3 w-3" />
            <span>{ownerName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
