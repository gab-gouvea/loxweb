import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { CalendarIcon } from "lucide-react"
import { componentFormSchema, type ComponentFormData, type PropertyComponent } from "@/types/property-detail"
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
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface ComponentFormProps {
  component?: PropertyComponent
  onSubmit: (data: ComponentFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function ComponentForm({ component, onSubmit, onCancel, isSubmitting }: ComponentFormProps) {
  const form = useForm<ComponentFormData>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      nome: component?.nome ?? "",
      ultimaManutencao: component?.ultimaManutencao ?? "",
      intervaloDias: component?.intervaloDias ?? 30,
      prestador: component?.prestador ?? "",
      observacoes: component?.observacoes ?? "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Manutenção de Ar Condicionado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ultimaManutencao"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Última Manutenção</FormLabel>
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
            name="intervaloDias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intervalo (dias)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="30"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="prestador"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prestador de Serviço</FormLabel>
              <FormControl>
                <Input placeholder="Nome da empresa ou profissional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalhes sobre o serviço..." rows={3} {...field} />
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
