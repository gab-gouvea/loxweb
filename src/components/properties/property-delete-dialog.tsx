import { useState, useMemo } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useDeleteProperty } from "@/hooks/use-properties"
import { useReservations } from "@/hooks/use-reservations"
import type { Property } from "@/types/property"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

interface PropertyDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: Property | null
}

export function PropertyDeleteDialog({ open, onOpenChange, property }: PropertyDeleteDialogProps) {
  const deleteMutation = useDeleteProperty()
  const navigate = useNavigate()
  const { data: reservations = [] } = useReservations()
  const [confirmText, setConfirmText] = useState("")

  const reservasAssociadas = useMemo(() =>
    reservations.filter((r) => r.propriedadeId === property?.id && r.status !== "cancelada"),
    [reservations, property?.id]
  )

  function handleDelete() {
    if (!property || confirmText !== "EXCLUIR") return
    deleteMutation.mutate(property.id, {
      onSuccess: () => {
        toast.success("Propriedade excluída")
        onOpenChange(false)
        setConfirmText("")
        navigate("/propriedades")
      },
      onError: () => toast.error("Erro ao excluir propriedade"),
    })
  }

  function handleOpenChange(value: boolean) {
    onOpenChange(value)
    if (!value) setConfirmText("")
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir propriedade?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir "{property?.nome}"? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          {reservasAssociadas.length > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 mt-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Esta propriedade possui <strong>{reservasAssociadas.length} reserva{reservasAssociadas.length > 1 ? "s" : ""}</strong> associada{reservasAssociadas.length > 1 ? "s" : ""}. Ao excluir, essas reservas deixarão de aparecer nos relatórios.
              </span>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Digite <strong>EXCLUIR</strong> para confirmar:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
            />
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={confirmText !== "EXCLUIR" || deleteMutation.isPending}
            variant="destructive"
          >
            {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
