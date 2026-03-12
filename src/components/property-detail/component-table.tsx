import { useState } from "react"
import { format, parseISO, addDays } from "date-fns"
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  const [concludeValor, setConcludeValor] = useState(0)

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
  }

  function handleConfirmConclude() {
    if (!concludingComponent) return
    const hoje = new Date()
    const proxima = addDays(hoje, concludingComponent.intervaloDias)

    // 1. Registrar a manutencao realizada
    createMaintenanceRecord.mutate(
      {
        propriedadeId: propertyId,
        componenteId: concludingComponent.id,
        nomeServico: concludingComponent.nome,
        prestador: concludingComponent.prestador,
        data: hoje.toISOString(),
        valor: concludeValor,
        pago: false,
      },
      {
        onSuccess: () => {
          // 2. Atualizar datas do componente
          updateMutation.mutate(
            {
              id: concludingComponent.id,
              propertyId,
              data: {
                ultimaManutencao: hoje.toISOString(),
                proximaManutencao: proxima.toISOString(),
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
        <h2 className="text-lg font-semibold">Serviços</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      {components && components.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Prestador</TableHead>
                <TableHead>Última Manutenção</TableHead>
                <TableHead>Próxima Manutenção</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((comp) => {
                const status = getComponentStatus(comp.proximaManutencao)
                return (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.nome}</TableCell>
                    <TableCell>{comp.prestador || "—"}</TableCell>
                    <TableCell>{format(parseISO(comp.ultimaManutencao), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{format(parseISO(comp.proximaManutencao), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={status === "atrasado" ? "destructive" : "default"}>
                        {status === "atrasado" ? "Atrasado" : "Em dia"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {comp.observacoes || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          title="Concluir serviço"
                          onClick={() => handleOpenConclude(comp)}
                          disabled={updateMutation.isPending || createMaintenanceRecord.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(comp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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
              <label className="text-sm text-muted-foreground mb-1 block">Valor realizado (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={concludeValor || ""}
                onChange={(e) => setConcludeValor(e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcludingComponent(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmConclude}
              disabled={updateMutation.isPending || createMaintenanceRecord.isPending}
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
