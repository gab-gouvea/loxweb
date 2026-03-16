import { useState } from "react"
import { Plus, Trash2, Pencil, CheckCircle2, Calendar, User } from "lucide-react"
import { toast } from "sonner"
import { format, isPast, isToday, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import {
  useScheduledMaintenances,
  useCreateScheduledMaintenance,
  useUpdateScheduledMaintenance,
  useConfirmScheduledMaintenance,
  useDeleteScheduledMaintenance,
} from "@/hooks/use-property-details"
import type { ScheduledMaintenance } from "@/types/property-detail"

interface ScheduledMaintenanceTableProps {
  propertyId: string
}

export function ScheduledMaintenanceTable({ propertyId }: ScheduledMaintenanceTableProps) {
  const { data: items = [] } = useScheduledMaintenances(propertyId)
  const createMutation = useCreateScheduledMaintenance()
  const updateMutation = useUpdateScheduledMaintenance()
  const confirmMutation = useConfirmScheduledMaintenance()
  const deleteMutation = useDeleteScheduledMaintenance()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nome: "", dataPrevista: "", prestador: "" })

  // Confirm dialog state
  const [confirmItem, setConfirmItem] = useState<ScheduledMaintenance | null>(null)
  const [confirmValor, setConfirmValor] = useState("")
  const [confirmPrestador, setConfirmPrestador] = useState("")

  // Delete dialog state
  const [deletingItem, setDeletingItem] = useState<ScheduledMaintenance | null>(null)

  const pendentes = items.filter((i) => !i.confirmada)
  const confirmadas = items.filter((i) => {
    if (!i.confirmada) return false
    const conclusao = i.dataConclusao ?? i.dataPrevista
    const [y, m, d] = conclusao.split("-").map(Number)
    return differenceInDays(new Date(), new Date(y, m - 1, d)) <= 3
  })

  function handleStartAdd() {
    setEditingId(null)
    setFormData({ nome: "", dataPrevista: "", prestador: "" })
    setShowForm(true)
  }

  function handleStartEdit(item: ScheduledMaintenance) {
    setShowForm(false)
    setEditingId(item.id)
    setFormData({
      nome: item.nome,
      dataPrevista: item.dataPrevista,
      prestador: item.prestador ?? "",
    })
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
  }

  function handleSave() {
    if (!formData.nome || !formData.dataPrevista) return
    const today = format(new Date(), "yyyy-MM-dd")
    if (formData.dataPrevista < today) {
      toast.error("A data prevista não pode ser anterior a hoje")
      return
    }

    const payload = {
      nome: formData.nome,
      dataPrevista: formData.dataPrevista,
      ...(formData.prestador ? { prestador: formData.prestador } : {}),
    }

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, propertyId, data: payload },
        {
          onSuccess: () => {
            toast.success("Serviço agendado atualizado")
            handleCancel()
          },
        },
      )
    } else {
      createMutation.mutate(
        { propertyId, data: payload },
        {
          onSuccess: () => {
            toast.success("Serviço agendado criado")
            handleCancel()
          },
        },
      )
    }
  }

  function handleDelete() {
    if (!deletingItem) return
    deleteMutation.mutate(
      { id: deletingItem.id, propertyId },
      {
        onSuccess: () => {
          toast.success("Serviço agendado removido")
          setDeletingItem(null)
        },
      },
    )
  }

  function handleOpenConfirm(item: ScheduledMaintenance) {
    setConfirmItem(item)
    setConfirmValor("")
    setConfirmPrestador(item.prestador ?? "")
  }

  function handleConfirm() {
    if (!confirmItem || !confirmPrestador.trim()) return
    const valor = confirmValor ? Number(confirmValor) : 0
    if (valor < 0) return
    confirmMutation.mutate(
      {
        id: confirmItem.id,
        propertyId,
        data: {
          valor,
          prestador: confirmPrestador,
        },
      },
      {
        onSuccess: () => {
          toast.success("Serviço confirmado e lançado no relatório")
          setConfirmItem(null)
        },
      },
    )
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number)
    return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR })
  }

  function getStatus(item: ScheduledMaintenance) {
    if (item.confirmada) return "confirmada" as const
    const [y, m, d] = item.dataPrevista.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    if (isToday(date)) return "hoje" as const
    if (isPast(date)) return "atrasada" as const
    return "agendada" as const
  }

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Serviços Agendados</h2>
        <Button size="sm" onClick={handleStartAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Agendar Serviço
        </Button>
      </div>

      {/* Form para adicionar/editar */}
      {(showForm || editingId) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Nome do serviço"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              <Input
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                value={formData.dataPrevista}
                onChange={(e) => setFormData({ ...formData, dataPrevista: e.target.value })}
              />
              <Input
                placeholder="Prestador (opcional)"
                value={formData.prestador}
                onChange={(e) => setFormData({ ...formData, prestador: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!formData.nome || !formData.dataPrevista || isPending}
              >
                {editingId ? "Salvar" : "Agendar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pendentes.length === 0 && confirmadas.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Nenhum serviço agendado.</p>
      )}

      {/* Lista de pendentes */}
      {pendentes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pendentes.map((item) => {
            if (editingId === item.id) return null
            const status = getStatus(item)
            const isAtrasado = status === "atrasada"
            return (
              <Card key={item.id} className={isAtrasado ? "border-red-300" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isAtrasado ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <h3 className="font-medium truncate">{item.nome}</h3>
                    </div>
                    <Badge
                      variant={isAtrasado ? "destructive" : "default"}
                      className={
                        status === "hoje"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : status === "agendada"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : ""
                      }
                    >
                      {status === "hoje" ? "Hoje" : status === "atrasada" ? "Atrasada" : "Agendado"}
                    </Badge>
                  </div>

                  {item.prestador && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{item.prestador}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Data prevista: {formatDate(item.dataPrevista)}</span>
                  </div>

                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleOpenConfirm(item)}
                      disabled={isPending || confirmMutation.isPending}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Confirmar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => handleStartEdit(item)}
                      disabled={isPending || showForm}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingItem(item)}
                      disabled={isPending}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Lista de confirmadas */}
      {confirmadas.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Confirmados ({confirmadas.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {confirmadas.map((item) => (
              <Card key={item.id} className="opacity-60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <h3 className="font-medium truncate">{item.nome}</h3>
                    </div>
                    <Badge className="bg-green-50 text-green-700 border-green-200">Confirmado</Badge>
                  </div>

                  {item.prestador && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>{item.prestador}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(item.dataConclusao ?? item.dataPrevista)}</span>
                    </div>
                    {item.valor != null && item.valor > 0 && (
                      <div className="text-muted-foreground">
                        R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingItem(item)}
                      disabled={isPending}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de confirmação */}
      <Dialog open={!!confirmItem} onOpenChange={(open) => !open && setConfirmItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirme que o serviço <span className="font-medium text-foreground">{confirmItem?.nome}</span> foi
              realizado. Será lançado no relatório de manutenções.
            </p>
            <div className="space-y-2">
              <Input
                placeholder="Nome do prestador"
                value={confirmPrestador}
                onChange={(e) => setConfirmPrestador(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Valor pago"
                value={confirmValor}
                onChange={(e) => setConfirmValor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItem(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!confirmPrestador.trim() || confirmMutation.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingItem?.confirmada ? "Remover serviço confirmado?" : "Remover serviço agendado?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.confirmada
                ? "O registro de manutenção já foi lançado no relatório e não será afetado."
                : "Essa ação não pode ser desfeita."}
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
