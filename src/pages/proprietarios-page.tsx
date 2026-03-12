import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProprietarios } from "@/hooks/use-proprietarios"
import { useProperties } from "@/hooks/use-properties"
import { ProprietarioDialog } from "@/components/proprietarios/proprietario-dialog"
import { ProprietarioDeleteDialog } from "@/components/proprietarios/proprietario-delete-dialog"
import type { Proprietario } from "@/types/proprietario"

export function ProprietariosPage() {
  const navigate = useNavigate()
  const { data: proprietarios = [], isLoading } = useProprietarios()
  const { data: properties = [] } = useProperties()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProprietario, setEditingProprietario] = useState<Proprietario | undefined>()
  const [deletingProprietario, setDeletingProprietario] = useState<Proprietario | null>(null)

  const propertyCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of properties) {
      if (p.proprietarioId) {
        map.set(p.proprietarioId, (map.get(p.proprietarioId) ?? 0) + 1)
      }
    }
    return map
  }, [properties])

  function handleEdit(proprietario: Proprietario) {
    setEditingProprietario(proprietario)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingProprietario(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proprietários</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Proprietário
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Profissão</TableHead>
                <TableHead className="text-center">Propriedades</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proprietarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum proprietário cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                proprietarios.map((proprietario) => (
                  <TableRow
                    key={proprietario.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/proprietarios/${proprietario.id}`)}
                  >
                    <TableCell className="font-medium">{proprietario.nomeCompleto}</TableCell>
                    <TableCell>{proprietario.cpf}</TableCell>
                    <TableCell>{proprietario.email || "—"}</TableCell>
                    <TableCell>{proprietario.profissao || "—"}</TableCell>
                    <TableCell className="text-center">{propertyCountMap.get(proprietario.id) ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(proprietario)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingProprietario(proprietario)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ProprietarioDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        proprietario={editingProprietario}
      />

      <ProprietarioDeleteDialog
        open={!!deletingProprietario}
        onOpenChange={(open) => !open && setDeletingProprietario(null)}
        proprietario={deletingProprietario}
      />
    </div>
  )
}
