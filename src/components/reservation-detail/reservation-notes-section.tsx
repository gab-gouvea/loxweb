import { useState } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Reservation } from "@/types/reservation"

interface ReservationNotesSectionProps {
  reservation: Reservation
  onMutate: (data: Record<string, unknown>, options?: { onSuccess?: () => void }) => void
  isPending: boolean
}

export function ReservationNotesSection({
  reservation,
  onMutate,
  isPending,
}: ReservationNotesSectionProps) {
  const [notas, setNotas] = useState<string | null>(null)

  const currentNotas = notas !== null ? notas : (reservation.notas ?? "")
  const notasChanged = notas !== null && notas !== (reservation.notas ?? "")

  function handleSaveNotas() {
    onMutate(
      { notas: currentNotas },
      {
        onSuccess: () => {
          toast.success("Notas salvas")
          setNotas(null)
        },
      },
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notas</h2>
        {notasChanged && (
          <Button size="sm" onClick={handleSaveNotas} disabled={isPending}>
            <Save className="mr-1 h-3 w-3" />
            Salvar
          </Button>
        )}
      </div>
      <Textarea
        placeholder="Observacoes sobre a reserva..."
        rows={3}
        value={currentNotas}
        onChange={(e) => setNotas(e.target.value)}
      />
    </div>
  )
}
