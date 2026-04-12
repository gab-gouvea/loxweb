import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Building2, BedDouble, MapPin, User, Package, DoorOpen, Pencil, PowerOff, Power, Trash2, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useProperty } from "@/hooks/use-properties"
import { useProprietario } from "@/hooks/use-proprietarios"
import { ComponentTable } from "@/components/property-detail/component-table"
import { ScheduledMaintenanceTable } from "@/components/property-detail/scheduled-maintenance-table"
import { InventoryTable } from "@/components/property-detail/inventory-table"
import { PropertyDialog } from "@/components/properties/property-dialog"
import { PropertyDeactivateDialog } from "@/components/properties/property-deactivate-dialog"
import { PropertyDeleteDialog } from "@/components/properties/property-delete-dialog"
import { tipoLabels } from "@/lib/constants"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: property, isLoading } = useProperty(id!)
  const { data: proprietario } = useProprietario(property?.proprietarioId ?? "")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Propriedade não encontrada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Header com foto de capa */}
      <div className="overflow-hidden rounded-lg border">
        {property.fotoCapa && (
          <div className="h-40 sm:h-56 w-full overflow-hidden print:h-40">
            <img
              src={property.fotoCapa}
              alt={property.nome}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-4 space-y-2">
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">{property.nome}</h1>
              {!property.ativo && (
                <Badge variant="destructive">Inativa</Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 print:hidden">
              <Button
                variant={property.ativo ? "outline" : "default"}
                size="sm"
                className="min-h-[44px] sm:min-h-0"
                onClick={() => setDeactivateDialogOpen(true)}
              >
                {property.ativo ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Inativar
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Reativar
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => setDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>
          {!property.ativo && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Propriedade inativa</strong>
              {property.inativoAte && (
                <> até {format(new Date(property.inativoAte), "dd/MM/yyyy", { locale: ptBR })}</>
              )}
              {property.observacaoInatividade && (
                <> — {property.observacaoInatividade}</>
              )}
            </div>
          )}
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
            {proprietario && (
              <Link
                to={`/proprietarios/${proprietario.id}`}
                className="flex items-center gap-1 hover:underline"
              >
                <User className="h-4 w-4" />
                <span>{proprietario.nomeCompleto}</span>
              </Link>
            )}
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>Hobby Box: {property.temHobbyBox ? "Sim" : "Não"}</span>
            </div>
          </div>
          {(property.acessoPredio || property.acessoApartamento || property.senhaWifi) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {property.acessoPredio && (
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="flex items-center gap-1 font-medium mb-1">
                    <DoorOpen className="h-4 w-4" />
                    Como entrar no prédio
                  </div>
                  <p className="text-muted-foreground">{property.acessoPredio}</p>
                </div>
              )}
              {property.acessoApartamento && (
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="flex items-center gap-1 font-medium mb-1">
                    <DoorOpen className="h-4 w-4" />
                    Como entrar no apartamento
                  </div>
                  <p className="text-muted-foreground">{property.acessoApartamento}</p>
                </div>
              )}
              {property.senhaWifi && (
                <div className="rounded-md bg-muted/50 p-3">
                  <div className="flex items-center gap-1 font-medium mb-1">
                    <Wifi className="h-4 w-4" />
                    Wi-Fi
                  </div>
                  <p className="text-muted-foreground">{property.senhaWifi}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Separator className="print:hidden" />

      {/* Serviços e manutenção */}
      <div className="print:hidden">
        <ComponentTable propertyId={property.id} />
      </div>

      <Separator className="print:hidden" />

      {/* Manutenções agendadas */}
      <div className="print:hidden">
        <ScheduledMaintenanceTable propertyId={property.id} />
      </div>

      <Separator className="print:hidden" />

      {/* Inventário */}
      <InventoryTable propertyId={property.id} />

      <PropertyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        property={property}
      />

      <PropertyDeactivateDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        property={property}
      />

      {/* Zona de perigo */}
      <Separator className="print:hidden" />
      <div className="print:hidden">
        <Button
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir Propriedade
        </Button>
      </div>

      <PropertyDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        property={property}
      />
    </div>
  )
}
