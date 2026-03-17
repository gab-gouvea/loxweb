import { useState } from "react"
import { format, parseISO, addDays } from "date-fns"
import { Plus, Pencil, Trash2, CheckCircle2, Wrench, Calendar, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePropertyComponents, useDeleteComponent, useUpdateComponent, useCreateMaintenanceRecord } from "@/hooks/use-property-details"
import { getComponentStatus, type PropertyComponent } from "@/types/property-detail"
import { ComponentDialog } from "./component-dialog"
import { toast } from "sonner"

interface ComponentTableProps {
  propertyId: string
}

export function ComponentTable({ propertyId }: ComponentTableProps) {
  const { data: components, isLoading } = usePropertyComponents(propertyId)
  const deleteMutation = useDeleteComponent()
  const updateMutation = useUpdateComponent()
  const createMaintenanceRecord = useCreateMaintenanceRecord()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<PropertyComponent | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Conclude popup state
  const [concludingComponent, setConcludingComponent] = useState<PropertyComponent | null>(null)
  const [concludeValor, setConcludeValor] = useState<number | "">(0)
  const [concludePrestador, setConcludePrestador] = useState("")

  function handleEdit(component: PropertyComponent) {
    setEditingComponent(component)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingComponent(undefined)
  }

  function handleOpenConclude(component: PropertyComponent) {
    setConcludingComponent(component)
    setConcludeValor(0)
    setConcludePrestador(component.prestador || "")
  }

  function handleConfirmConclude() {
    if (!concludingComponent) return
    const hoje = new Date()
    const proxima = addDays(hoje, concludingComponent.intervaloDias)

    createMaintenanceRecord.mutate(
      {
        propriedadeId: propertyId,
        componenteId: concludingComponent.id,
        nomeServico: concludingComponent.nome,
        prestador: concludePrestador,
        data: format(hoje, "yyyy-MM-dd"),
        valor: concludeValor || 0,
        pago: false,
      },
      {
        onSuccess: () => {
          updateMutation.mutate(
            {
              id: concludingComponent.id,
              propertyId,
              data: {
                ultimaManutencao: format(hoje, "yyyy-MM-dd"),
                proximaManutencao: format(proxima, "yyyy-MM-dd"),
                prestador: concludePrestador,
              },
            },
            {
              onSuccess: () => {
                toast.success("Serviço concluído e registrado")
                setConcludingComponent(null)
              },
              onError: () => toast.error("Erro ao atualizar serviço"),
            },
          )
        },
        onError: () => toast.error("Erro ao registrar manutenção"),
      },
    )
  }

  function handleDelete() {
    if (!deletingId) return
    deleteMutation.mutate(
      { id: deletingId, propertyId },
      {
        onSuccess: () => {
          toast.success("Serviço removido")
          setDeletingId(null)
        },
        onError: () => toast.error("Erro ao remover serviço"),
      }
    )
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Serviços de Rotina</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      {components && components.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {components.map((comp) => {
            const status = getComponentStatus(comp.proximaManutencao)
            const isAtrasado = status === "atrasado"
            return (
              <Card key={comp.id} className={`relative ${isAtrasado ? "border-red-300" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isAtrasado ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}>
                        <Wrench className="h-4 w-4" />
                      </div>
                      <h3 className="font-medium truncate">{comp.nome}</h3>
                    </div>
                    <Badge variant={isAtrasado ? "destructive" : "default"} className="shrink-0">
                      {isAtrasado ? "Atrasado" : "Em dia"}
                    </Badge>
                  </div>

                  {comp.prestador && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{comp.prestador}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Última: {format(parseISO(comp.ultimaManutencao), "dd/MM/yyyy")}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${isAtrasado ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Próxima: {format(parseISO(comp.proximaManutencao), "dd/MM/yyyy")}</span>
                    </div>
                  </div>

                  {comp.observacoes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {comp.observacoes}
                    </p>
                  )}

                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleOpenConclude(comp)}
                      disabled={updateMutation.isPending || createMaintenanceRecord.isPending}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Concluir
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => handleEdit(comp)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={() => setDeletingId(comp.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
      )}

      <ComponentDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        propertyId={propertyId}
        component={editingComponent}
      />

      {/* Conclude dialog */}
      <Dialog open={!!concludingComponent} onOpenChange={(open) => !open && setConcludingComponent(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Concluir serviço</DialogTitle>
            <DialogDescription>{concludingComponent?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Prestador</label>
              <Input
                value={concludePrestador}
                onChange={(e) => setConcludePrestador(e.target.value)}
                placeholder="Nome do prestador"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Valor realizado (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={concludeValor ?? ""}
                onChange={(e) => setConcludeValor(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcludingComponent(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmConclude}
              disabled={!concludePrestador.trim() || updateMutation.isPending || createMaintenanceRecord.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
