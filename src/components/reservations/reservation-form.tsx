import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import {
  reservationFormSchema,
  reservationSources,
  type ReservationFormData,
  type Reservation,
} from "@/types/reservation"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useProperties } from "@/hooks/use-properties"
import { cn } from "@/lib/utils"
import { sourceLabels } from "@/lib/constants"
import { FormTextField, FormNumberField, FormTextareaField } from "@/components/shared/form-fields"

interface ReservationFormProps {
  reservation?: Reservation
  defaultCheckIn?: Date
  defaultPropertyId?: string
  onSubmit: (data: ReservationFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function ReservationForm({
  reservation,
  defaultCheckIn,
  defaultPropertyId,
  onSubmit,
  onCancel,
  isSubmitting,
}: ReservationFormProps) {
  const { data: properties } = useProperties()

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      propriedadeId: reservation?.propriedadeId ?? defaultPropertyId ?? "",
      nomeHospede: reservation?.nomeHospede ?? "",
      checkIn: reservation?.checkIn ?? (defaultCheckIn ? defaultCheckIn.toISOString() : ""),
      checkOut: reservation?.checkOut ?? "",
      status: reservation?.status ?? "pendente",
      precoTotal: reservation?.precoTotal ?? undefined,
      notas: reservation?.notas ?? "",
      fonte: reservation?.fonte ?? "direto",
      numHospedes: reservation?.numHospedes ?? 1,
      faxinaStatus: reservation?.faxinaStatus ?? "nao_agendada",
      faxinaPorMim: reservation?.faxinaPorMim ?? false,
      despesas: reservation?.despesas ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "despesas",
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormTextField<ReservationFormData>
          control={form.control}
          name="nomeHospede"
          label="Nome do Hospede"
          placeholder="Ex: Maria Silva"
        />

        <FormField
          control={form.control}
          name="propriedadeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Propriedade</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-in</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(parseISO(field.value), "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString() ?? "")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-out</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn("justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(parseISO(field.value), "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(date) => field.onChange(date?.toISOString() ?? "")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormField
            control={form.control}
            name="fonte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fonte</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {reservationSources.map((s) => (
                      <SelectItem key={s} value={s}>
                        {sourceLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormNumberField<ReservationFormData>
            control={form.control}
            name="numHospedes"
            label="Hospedes"
            min={1}
          />

          <FormNumberField<ReservationFormData>
            control={form.control}
            name="precoTotal"
            label="Valor Total (R$)"
            min={0}
            step={0.01}
            placeholder="0,00"
          />
        </div>

        {/* Despesas — only when editing */}
        {reservation && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-medium">Despesas</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ descricao: "", valor: 0, reembolsavel: false })}
              >
                <Plus className="mr-1 h-3 w-3" />
                Adicionar
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma despesa adicionada.</p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded border p-2">
                <div className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`despesas.${index}.descricao`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Nome do item ou descrição da despesa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`despesas.${index}.valor`}
                    render={({ field }) => (
                      <FormItem className="w-28">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="R$"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`despesas.${index}.reembolsavel`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal">Reembolsavel</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        )}

        <FormTextareaField<ReservationFormData>
          control={form.control}
          name="notas"
          label="Notas"
          placeholder="Observacoes sobre a reserva..."
          rows={3}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
