import { useState } from "react"
import { Plus, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/constants"
import type { Reservation, Despesa } from "@/types/reservation"

interface ReservationExpensesSectionProps {
  reservation: Reservation
  onMutate: (data: Record<string, unknown>, options?: { onSuccess?: () => void }) => void
  isPending: boolean
}

export function ReservationExpensesSection({
  reservation,
  onMutate,
  isPending,
}: ReservationExpensesSectionProps) {
  const [novaDespesa, setNovaDespesa] = useState<{ descricao: string; valor: string; reembolsavel: boolean } | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingDespesa, setEditingDespesa] = useState<{ descricao: string; valor: string; reembolsavel: boolean } | null>(null)

  const totalDespesas = (reservation.despesas ?? []).reduce((sum, d) => sum + d.valor, 0)
  const totalReembolsavel = (reservation.despesas ?? []).filter((d) => d.reembolsavel).reduce((sum, d) => sum + d.valor, 0)

  function handleAddDespesa() {
    if (!novaDespesa || !novaDespesa.descricao || Number(novaDespesa.valor) <= 0) return
    const despesas: Despesa[] = [
      ...(reservation.despesas ?? []),
      { descricao: novaDespesa.descricao, valor: Number(novaDespesa.valor), reembolsavel: novaDespesa.reembolsavel },
    ]
    onMutate(
      { despesas },
      {
        onSuccess: () => {
          toast.success("Despesa adicionada")
          setNovaDespesa(null)
        },
      },
    )
  }

  function handleRemoveDespesa(index: number) {
    const despesas = [...(reservation.despesas ?? [])]
    despesas.splice(index, 1)
    onMutate(
      { despesas },
      { onSuccess: () => toast.success("Despesa removida") },
    )
  }

  function handleStartEdit(index: number) {
    const despesa = (reservation.despesas ?? [])[index]
    if (!despesa) return
    setNovaDespesa(null)
    setEditingIndex(index)
    setEditingDespesa({ descricao: despesa.descricao, valor: String(despesa.valor), reembolsavel: despesa.reembolsavel })
  }

  function handleCancelEdit() {
    setEditingIndex(null)
    setEditingDespesa(null)
  }

  function handleSaveEdit() {
    if (editingIndex === null || !editingDespesa || !editingDespesa.descricao || Number(editingDespesa.valor) <= 0) return
    const despesas = [...(reservation.despesas ?? [])]
    despesas[editingIndex] = {
      descricao: editingDespesa.descricao,
      valor: Number(editingDespesa.valor),
      reembolsavel: editingDespesa.reembolsavel,
    }
    onMutate(
      { despesas },
      {
        onSuccess: () => {
          toast.success("Despesa atualizada")
          handleCancelEdit()
        },
      },
    )
  }

  function handleStartAdd() {
    handleCancelEdit()
    setNovaDespesa({ descricao: "", valor: "", reembolsavel: false })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Despesas</h2>
        {!novaDespesa && editingIndex === null && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartAdd}
          >
            <Plus className="mr-1 h-3 w-3" />
            Adicionar
          </Button>
        )}
      </div>

      {(reservation.despesas ?? []).length === 0 && !novaDespesa && (
        <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
      )}

      {(reservation.despesas ?? []).map((despesa, index) =>
        editingIndex === index && editingDespesa ? (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Nome do item ou descricao"
                className="flex-1"
                value={editingDespesa.descricao}
                onChange={(e) => setEditingDespesa({ ...editingDespesa, descricao: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="R$"
                className="w-28"
                value={editingDespesa.valor}
                onChange={(e) => setEditingDespesa({ ...editingDespesa, valor: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editingDespesa.reembolsavel}
                  onCheckedChange={(checked) => setEditingDespesa({ ...editingDespesa, reembolsavel: !!checked })}
                />
                <span className="text-xs">Reembolsavel</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editingDespesa.descricao || !editingDespesa.valor || isPending}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div key={index} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium">{despesa.descricao}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(despesa.valor)}
                </p>
              </div>
              {despesa.reembolsavel && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Reembolsavel
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleStartEdit(index)}
                disabled={isPending || novaDespesa !== null}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleRemoveDespesa(index)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ),
      )}

      {/* Nova despesa inline */}
      {novaDespesa && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <Input
              placeholder="Nome do item ou descricao"
              className="flex-1"
              value={novaDespesa.descricao}
              onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="R$"
              className="w-28"
              value={novaDespesa.valor}
              onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={novaDespesa.reembolsavel}
                onCheckedChange={(checked) => setNovaDespesa({ ...novaDespesa, reembolsavel: !!checked })}
              />
              <span className="text-xs">Reembolsavel</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setNovaDespesa(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAddDespesa}
                disabled={!novaDespesa.descricao || !novaDespesa.valor || isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {(reservation.despesas ?? []).length > 0 && (
        <div className="flex items-center gap-4 text-sm pt-1">
          <span>
            Total: <span className="font-semibold">{formatCurrency(totalDespesas)}</span>
          </span>
          {totalReembolsavel > 0 && (
            <span className="text-blue-700">
              Reembolsavel: {formatCurrency(totalReembolsavel)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
