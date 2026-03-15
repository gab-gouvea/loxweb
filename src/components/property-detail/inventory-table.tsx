import { useState, useMemo } from "react"
import { Plus, Pencil, Trash2, Package } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { useInventoryItems, useDeleteInventoryItem } from "@/hooks/use-property-details"
import type { InventoryItem } from "@/types/property-detail"
import { InventoryDialog } from "./inventory-dialog"
import { toast } from "sonner"

interface InventoryTableProps {
  propertyId: string
}

export function InventoryTable({ propertyId }: InventoryTableProps) {
  const { data: items, isLoading } = useInventoryItems(propertyId)
  const deleteMutation = useDeleteInventoryItem()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [defaultComodo, setDefaultComodo] = useState<string | undefined>()
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [newSectionName, setNewSectionName] = useState("")
  const [emptySections, setEmptySections] = useState<string[]>([])

  const grouped = useMemo(() => {
    if (!items) return new Map<string, InventoryItem[]>()
    const map = new Map<string, InventoryItem[]>()
    for (const item of items) {
      const comodo = item.comodo || "Geral"
      const list = map.get(comodo) ?? []
      list.push(item)
      map.set(comodo, list)
    }
    // Add empty sections that don't have items yet
    for (const s of emptySections) {
      if (!map.has(s)) map.set(s, [])
    }
    return map
  }, [items, emptySections])

  function handleEdit(item: InventoryItem) {
    setEditingItem(item)
    setDefaultComodo(undefined)
    setDialogOpen(true)
  }

  function handleNewItem(comodo: string) {
    setEditingItem(undefined)
    setDefaultComodo(comodo)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(undefined)
      setDefaultComodo(undefined)
    }
  }

  function handleAddSection() {
    const trimmed = newSectionName.trim()
    if (!trimmed) return
    if (grouped.has(trimmed)) {
      toast.error("Cômodo já existe")
      return
    }
    setEmptySections((prev) => [...prev, trimmed])
    setNewSectionName("")
    setSectionDialogOpen(false)
    toast.success("Cômodo adicionado")
  }

  function handleDelete() {
    if (!deletingId) return
    deleteMutation.mutate(
      { id: deletingId, propertyId },
      {
        onSuccess: () => {
          toast.success("Item removido")
          setDeletingId(null)
        },
        onError: () => toast.error("Erro ao remover item"),
      }
    )
  }

  const lastUpdated = items && items.length > 0
    ? items.reduce((latest, item) =>
        item.atualizadoEm > latest ? item.atualizadoEm : latest
      , items[0].atualizadoEm)
    : null

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Inventário</h2>
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Atualizado em {format(parseISO(lastUpdated), "dd/MM/yyyy")}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setSectionDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Cômodo
        </Button>
      </div>

      {grouped.size > 0 ? (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([comodo, sectionItems]) => (
            <div key={comodo} className="space-y-3">
              <h3 className="text-base font-medium text-muted-foreground">{comodo}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {sectionItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      {item.imagemUrl ? (
                        <img
                          src={item.imagemUrl}
                          alt={item.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 space-y-1">
                      <h3 className="font-medium text-sm truncate">{item.nome}</h3>
                      <p className="text-sm text-muted-foreground">Qtd: {item.quantidade}</p>
                      {item.descricao && (
                        <p className="text-xs text-muted-foreground truncate">{item.descricao}</p>
                      )}
                      <div className="flex items-center gap-1 pt-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingId(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {/* Card placeholder para novo item */}
                <Card
                  className="overflow-hidden border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleNewItem(comodo)}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
                    <Plus className="h-8 w-8" />
                    <span className="text-sm font-medium">Novo Item</span>
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum item no inventário.</p>
      )}

      {/* Dialog: Adicionar Cômodo */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Cômodo</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Ex: Cozinha, Sala, Quarto"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSection} disabled={!newSectionName.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo/Editar Item */}
      <InventoryDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        propertyId={propertyId}
        item={editingItem}
        defaultComodo={defaultComodo}
      />

      {/* Dialog: Confirmar exclusão */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
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
