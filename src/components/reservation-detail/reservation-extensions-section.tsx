import { useState } from "react"
import { Plus, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/constants"
import { formatDate, localDateToISO, toLocalDateStr } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import type { Reservation, Extensao } from "@/types/reservation"

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/** Menor data de saída permitida: dia seguinte à data informada (checkout atual, ou início fixo de uma extensão). */
function minDateAfter(iso: string): string {
  return addDaysToDateStr(toLocalDateStr(iso), 1)
}

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
  const [novaExtensao, setNovaExtensao] = useState<{ novaDataSaida: string; valor: string } | null>(null)
  const [editingLast, setEditingLast] = useState(false)
  const [editingExtensao, setEditingExtensao] = useState<{ novaDataSaida: string; valor: string } | null>(null)
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)

  const extensoes = reservation.extensoes ?? []
  const lastIndex = extensoes.length - 1
  const totalExtensoes = extensoes.reduce((sum, e) => sum + e.valor, 0)

  /** Data final de cada extensão: início da próxima, ou o checkout atual da reserva se for a última. */
  function dataFinalDaExtensao(index: number): string {
    return index < lastIndex ? extensoes[index + 1].dataInicio : reservation.checkOut
  }

  function handleAddExtensao() {
    if (!novaExtensao || !novaExtensao.novaDataSaida || Number(novaExtensao.valor) <= 0) return
    const minPermitida = minDateAfter(reservation.checkOut)
    if (novaExtensao.novaDataSaida < minPermitida) {
      toast.error(`A nova data de saída deve ser depois de ${formatDate(reservation.checkOut)}`)
      return
    }
    const novasExtensoes: Extensao[] = [
      ...extensoes,
      { dataInicio: reservation.checkOut, valor: Number(novaExtensao.valor) },
    ]
    onMutate(
      { extensoes: novasExtensoes, checkOut: localDateToISO(novaExtensao.novaDataSaida) },
      {
        onSuccess: () => {
          toast.success("Extensão adicionada")
          setNovaExtensao(null)
        },
      },
    )
  }

  function handleRemoveExtensao(index: number) {
    setRemovingIndex(index)
    setTimeout(() => {
      const removido = extensoes[index]
      const novasExtensoes = [...extensoes]
      novasExtensoes.splice(index, 1)
      const isLast = index === lastIndex
      onMutate(
        isLast ? { extensoes: novasExtensoes, checkOut: removido.dataInicio } : { extensoes: novasExtensoes },
        { onSuccess: () => toast.success("Extensão removida") },
      )
      setRemovingIndex(null)
    }, 180)
  }

  function handleStartEditLast() {
    if (lastIndex < 0) return
    setNovaExtensao(null)
    setEditingLast(true)
    setEditingExtensao({ novaDataSaida: toLocalDateStr(reservation.checkOut), valor: String(extensoes[lastIndex].valor) })
  }

  function handleCancelEdit() {
    setEditingLast(false)
    setEditingExtensao(null)
  }

  function handleSaveEdit() {
    if (!editingExtensao || !editingExtensao.novaDataSaida || Number(editingExtensao.valor) <= 0 || lastIndex < 0) return
    const minPermitida = minDateAfter(extensoes[lastIndex].dataInicio)
    if (editingExtensao.novaDataSaida < minPermitida) {
      toast.error(`A nova data de saída deve ser depois de ${formatDate(extensoes[lastIndex].dataInicio)}`)
      return
    }
    const novasExtensoes = [...extensoes]
    novasExtensoes[lastIndex] = {
      dataInicio: extensoes[lastIndex].dataInicio,
      valor: Number(editingExtensao.valor),
    }
    onMutate(
      { extensoes: novasExtensoes, checkOut: localDateToISO(editingExtensao.novaDataSaida) },
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
    setNovaExtensao({ novaDataSaida: "", valor: "" })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Extensões</h2>
        {!novaExtensao && !editingLast && (
          <Button variant="outline" size="sm" onClick={handleStartAdd}>
            <Plus className="mr-1 h-3 w-3" />
            Adicionar
          </Button>
        )}
      </div>

      {extensoes.length === 0 && !novaExtensao && (
        <p className="text-sm text-muted-foreground">Nenhuma extensão registrada.</p>
      )}

      {extensoes.map((extensao, index) =>
        editingLast && index === lastIndex && editingExtensao ? (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-col sm:flex-row items-start gap-2">
              <div className="flex-1 w-full">
                <label className="text-xs text-muted-foreground mb-1 block">Nova data de saída</label>
                <Input
                  type="date"
                  min={minDateAfter(extensao.dataInicio)}
                  value={editingExtensao.novaDataSaida}
                  onChange={(e) => setEditingExtensao({ ...editingExtensao, novaDataSaida: e.target.value })}
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
                disabled={!editingExtensao.novaDataSaida || !editingExtensao.valor || isPending}
              >
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between rounded-lg border p-3 transition-all duration-200",
              removingIndex === index && "animate-out fade-out slide-out-to-right-4 pointer-events-none",
            )}
          >
            <div>
              <p className="text-sm font-medium">
                Estendida até {formatDate(dataFinalDaExtensao(index))} — {formatCurrency(extensao.valor)}
              </p>
              <p className="text-xs text-muted-foreground">
                Recebimento no relatório: {formatDate(minDateAfter(extensao.dataInicio))}
              </p>
            </div>
            <div className="flex gap-1">
              {index === lastIndex && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleStartEditLast}
                  disabled={isPending || novaExtensao !== null}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
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
              <label className="text-xs text-muted-foreground mb-1 block">Nova data de saída</label>
              <Input
                type="date"
                min={minDateAfter(reservation.checkOut)}
                value={novaExtensao.novaDataSaida}
                onChange={(e) => setNovaExtensao({ ...novaExtensao, novaDataSaida: e.target.value })}
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
              disabled={!novaExtensao.novaDataSaida || !novaExtensao.valor || isPending}
            >
              Salvar
            </Button>
          </div>
        </div>
      )}

      {extensoes.length > 0 && (
        <div className="text-sm pt-1">
          Total em extensões: <span className="font-semibold">{formatCurrency(totalExtensoes)}</span>
        </div>
      )}
    </div>
  )
}
