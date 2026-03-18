import { useState } from "react"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useUpdateProperty } from "@/hooks/use-properties"
import type { Property } from "@/types/property"
import { toast } from "sonner"

interface PropertyDeactivateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: Property
}

export function PropertyDeactivateDialog({
  open,
  onOpenChange,
  property,
}: PropertyDeactivateDialogProps) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [observacao, setObservacao] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)
  const updateProperty = useUpdateProperty()

  const tomorrow = addDays(new Date(), 1)
  tomorrow.setHours(0, 0, 0, 0)

  function handleSubmit() {
    if (!date) {
      toast.error("Selecione a data até quando o imóvel ficará inativo")
      return
    }

    const [y, m, d] = [date.getFullYear(), date.getMonth(), date.getDate()]
    const inativoAte = new Date(y, m, d).toISOString()

    updateProperty.mutate(
      {
        id: property.id,
        data: {
          ativo: false,
          inativoAte,
          observacaoInatividade: observacao || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Propriedade inativada com sucesso")
          onOpenChange(false)
          setDate(undefined)
          setObservacao("")
        },
        onError: () => {
          toast.error("Erro ao inativar propriedade")
        },
      }
    )
  }

  function handleReactivate() {
    updateProperty.mutate(
      {
        id: property.id,
        data: {
          ativo: true,
          inativoAte: undefined,
          observacaoInatividade: undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Propriedade reativada com sucesso")
          onOpenChange(false)
        },
        onError: () => {
          toast.error("Erro ao reativar propriedade")
        },
      }
    )
  }

  // If property is already inactive, show reactivation dialog
  if (!property.ativo) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Propriedade</AlertDialogTitle>
            <AlertDialogDescription>
              Esta propriedade está inativa
              {property.inativoAte && (
                <> até <strong>{format(new Date(property.inativoAte), "dd/MM/yyyy", { locale: ptBR })}</strong></>
              )}
              {property.observacaoInatividade && (
                <>. Observação: <em>{property.observacaoInatividade}</em></>
              )}
              . Deseja reativá-la?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button onClick={handleReactivate} disabled={updateProperty.isPending}>
              Reativar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Inativar Propriedade</AlertDialogTitle>
          <AlertDialogDescription>
            Defina até quando <strong>{property.nome}</strong> ficará inativa.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Inativo até *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d)
                    setCalendarOpen(false)
                  }}
                  disabled={(d) => d < tomorrow}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Ex: locação anual, manutenções, pintura..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={updateProperty.isPending || !date}
          >
            Inativar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
