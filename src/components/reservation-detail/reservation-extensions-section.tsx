import { useState } from "react"
import { Plus, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/constants"
import { formatDate, localDateToISO, toLocalDateStr } from "@/lib/date-utils"
import type { Reservation, Extensao } from "@/types/reservation"

interface ReservationExtensionsSectionProps {
  reservation: Reservation
  onMutate: (data: Record<string, unknown>, options?: { onSuccess?: () => void }) => void
  isPending: boolean
}

export function ReservationExtensionsSection({
  reservation,
  onMutate,
  isPending,
}: ReservationExtensionsSectionProps) {
  const [novaExtensao, setNovaExtensao] = useState<{ dataInicio: string; valor: string } | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingExtensao, setEditingExtensao] = useState<{ dataInicio: string; valor: string } | null>(null)

  const totalExtensoes = (reservation.extensoes ?? []).reduce((sum, e) => sum + e.valor, 0)

  function handleAddExtensao() {
    if (!novaExtensao || !novaExtensao.dataInicio || Number(novaExtensao.valor) <= 0) return
    const extensoes: Extensao[] = [
      ...(reservation.extensoes ?? []),
      { dataInicio: localDateToISO(novaExtensao.dataInicio), valor: Number(novaExtensao.valor) },
    ]
    onMutate(
      { extensoes },
      {
        onSuccess: () => {
          toast.success("Extensão adicionada")
          setNovaExtensao(null)
        },
      },
    )
  }

  function handleRemoveExtensao(index: number) {
    const extensoes = [...(reservation.extensoes ?? [])]
    extensoes.splice(index, 1)
    onMutate(
      { extensoes },
      { onSuccess: () => toast.success("Extensão removida") },
    )
  }

  function handleStartEdit(index: number) {
    const extensao = (reservation.extensoes ?? [])[index]
    if (!extensao) return
    setNovaExtensao(null)
    setEditingIndex(index)
    setEditingExtensao({ dataInicio: toLocalDateStr(extensao.dataInicio), valor: String(extensao.valor) })
  }

  function handleCancelEdit() {
    setEditingIndex(null)
    setEditingExtensao(null)
  }

  function handleSaveEdit() {
    if (editingIndex === null || !editingExtensao || !editingExtensao.dataInicio || Number(editingExtensao.valor) <= 0) return
    const extensoes = [...(reservation.extensoes ?? [])]
    extensoes[editingIndex] = {
      dataInicio: localDateToISO(editingExtensao.dataInicio),
      valor: Number(editingExtensao.valor),
    }
    onMutate(
      { extensoes },
      {
        onSuccess: () => {
          toast.success("Extensão atualizada")
          handleCancelEdit()
        },
      },
    )
  }

  function handleStartAdd() {
    handleCancelEdit()
    setNovaExtensao({ dataInicio: "", valor: "" })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Extensões</h2>
          <p className="text-xs text-muted-foreground">
            Dias extras pagos pelo hóspede além da reserva original. A Airbnb repassa cada extensão no mês seguinte ao início dela, não no mês do check-in.
          </p>
        </div>
        {!novaExtensao && editingIndex === null && (
          <Button variant="outline" size="sm" onClick={handleStartAdd}>
            <Plus className="mr-1 h-3 w-3" />
            Adicionar
          </Button>
        )}
      </div>

      {(reservation.extensoes ?? []).length === 0 && !novaExtensao && (
        <p className="text-sm text-muted-foreground">Nenhuma extensão registrada.</p>
      )}

      {(reservation.extensoes ?? []).map((extensao, index) =>
        editingIndex === index && editingExtensao ? (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <div className="flex-1 w-full">
                <label className="text-xs text-muted-foreground mb-1 block">Início da extensão</label>
                <Input
                  type="date"
                  value={editingExtensao.dataInicio}
                  onChange={(e) => setEditingExtensao({ ...editingExtensao, dataInicio: e.target.value })}
                />
              </div>
              <div className="w-full sm:w-28">
                <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="R$"
                  value={editingExtensao.valor}
                  onChange={(e) => setEditingExtensao({ ...editingExtensao, valor: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={!editingExtensao.dataInicio || !editingExtensao.valor || isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div key={index} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{formatCurrency(extensao.valor)}</p>
              <p className="text-sm text-muted-foreground">
                Início em {formatDate(extensao.dataInicio)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleStartEdit(index)}
                disabled={isPending || novaExtensao !== null}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleRemoveExtensao(index)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ),
      )}

      {/* Nova extensão inline */}
      {novaExtensao && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-col sm:flex-row items-start gap-2">
            <div className="flex-1 w-full">
              <label className="text-xs text-muted-foreground mb-1 block">Início da extensão</label>
              <Input
                type="date"
                value={novaExtensao.dataInicio}
                onChange={(e) => setNovaExtensao({ ...novaExtensao, dataInicio: e.target.value })}
              />
            </div>
            <div className="w-full sm:w-28">
              <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="R$"
                value={novaExtensao.valor}
                onChange={(e) => setNovaExtensao({ ...novaExtensao, valor: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setNovaExtensao(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddExtensao}
              disabled={!novaExtensao.dataInicio || !novaExtensao.valor || isPending}
            >
              Salvar
            </Button>
          </div>
        </div>
      )}

      {(reservation.extensoes ?? []).length > 0 && (
        <div className="text-sm pt-1">
          Total em extensões: <span className="font-semibold">{formatCurrency(totalExtensoes)}</span>
        </div>
      )}
    </div>
  )
}
