import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { CalendarIcon } from "lucide-react"
import {
  reservationFormSchema,
  reservationStatuses,
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
import { Textarea } from "@/components/ui/textarea"
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
import { propertyColorMap } from "@/lib/colors"

const statusLabels: Record<string, string> = {
  confirmada: "Confirmada",
  pendente: "Pendente",
  cancelada: "Cancelada",
  concluída: "Concluída",
}

const sourceLabels: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  direto: "Direto",
  outro: "Outro",
}

interface ReservationFormProps {
  reservation?: Reservation
  defaultCheckIn?: Date
  onSubmit: (data: ReservationFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function ReservationForm({
  reservation,
  defaultCheckIn,
  onSubmit,
  onCancel,
  isSubmitting,
}: ReservationFormProps) {
  const { data: properties } = useProperties()

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      propriedadeId: reservation?.propriedadeId ?? "",
      nomeHospede: reservation?.nomeHospede ?? "",
      checkIn: reservation?.checkIn ?? (defaultCheckIn ? defaultCheckIn.toISOString() : ""),
      checkOut: reservation?.checkOut ?? "",
      status: reservation?.status ?? "pendente",
      precoTotal: reservation?.precoTotal ?? undefined,
      precoPorNoite: reservation?.precoPorNoite ?? undefined,
      notas: reservation?.notas ?? "",
      fonte: reservation?.fonte ?? "direto",
      numHospedes: reservation?.numHospedes ?? 1,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nomeHospede"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Hóspede</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Maria Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
                      <span className="flex items-center gap-2">
                        <span className={cn("inline-block h-2.5 w-2.5 rounded-full", propertyColorMap[p.cor].bg)} />
                        {p.nome}
                      </span>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {reservationStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="numHospedes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hóspedes</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="precoPorNoite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>R$/Noite</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={0.01} placeholder="0,00" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="precoTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total (R$)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step={0.01} placeholder="0,00" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações sobre a reserva..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
