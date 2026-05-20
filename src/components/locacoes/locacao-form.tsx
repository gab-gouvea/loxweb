import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { CalendarIcon, UserCheck, X } from "lucide-react"
import {
  locacaoFormSchema,
  type LocacaoFormData,
  type Locacao,
} from "@/types/locacao"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useProperties } from "@/hooks/use-properties"
import { useLocacoes } from "@/hooks/use-locacoes"
import { cn } from "@/lib/utils"
import { FormTextField, FormNumberField, FormTextareaField } from "@/components/shared/form-fields"

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "")
}

interface LocacaoFormProps {
  locacao?: Locacao
  onSubmit: (data: LocacaoFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function LocacaoForm({
  locacao,
  onSubmit,
  onCancel,
  isSubmitting,
}: LocacaoFormProps) {
  const { data: properties } = useProperties()
  const { data: allLocacoes = [] } = useLocacoes()
  const isCreating = !locacao
  const [dismissedCpfs, setDismissedCpfs] = useState<Set<string>>(new Set())

  const form = useForm<LocacaoFormData>({
    resolver: zodResolver(locacaoFormSchema),
    defaultValues: {
      propriedadeId: locacao?.propriedadeId ?? "",
      tipoLocacao: locacao?.tipoLocacao ?? "temporada",
      nomeCompleto: locacao?.nomeCompleto ?? "",
      cpf: locacao?.cpf ?? "",
      rg: locacao?.rg ?? "",
      dataNascimento: locacao?.dataNascimento ?? "",
      profissao: locacao?.profissao ?? "",
      estadoCivil: locacao?.estadoCivil ?? "",
      endereco: locacao?.endereco ?? "",
      email: locacao?.email ?? "",
      checkIn: locacao?.checkIn ?? "",
      checkOut: locacao?.checkOut ?? "",
      numMoradores: locacao?.numMoradores ?? undefined,
      valorMensal: locacao?.valorMensal ?? undefined,
      tipoPagamento: locacao?.tipoPagamento ?? "mensal",
      valorTotal: locacao?.valorTotal ?? undefined,
      percentualComissao: locacao?.percentualComissao || undefined,
      garantia: locacao?.garantia ?? "",
      notas: locacao?.notas ?? "",
    },
  })

  const tipoPagamento = form.watch("tipoPagamento")
  const cpfValue = form.watch("cpf")

  // Map de inquilinos únicos por CPF (mais recente prevalece)
  const inquilinosByCpf = useMemo(() => {
    const map = new Map<string, Locacao>()
    const sorted = [...allLocacoes].sort((a, b) =>
      (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""),
    )
    for (const loc of sorted) {
      const key = digitsOnly(loc.cpf ?? "")
      if (key.length === 11 && !map.has(key)) {
        map.set(key, loc)
      }
    }
    return map
  }, [allLocacoes])

  const matchedInquilino = useMemo(() => {
    if (!isCreating) return null
    const key = digitsOnly(cpfValue ?? "")
    if (key.length !== 11) return null
    if (dismissedCpfs.has(key)) return null
    return inquilinosByCpf.get(key) ?? null
  }, [isCreating, cpfValue, dismissedCpfs, inquilinosByCpf])

  function preencherInquilino(loc: Locacao) {
    form.setValue("nomeCompleto", loc.nomeCompleto ?? "", { shouldValidate: true })
    form.setValue("cpf", loc.cpf ?? "", { shouldValidate: true })
    form.setValue("rg", loc.rg ?? "")
    form.setValue("dataNascimento", loc.dataNascimento ?? "")
    form.setValue("profissao", loc.profissao ?? "")
    form.setValue("estadoCivil", loc.estadoCivil ?? "")
    form.setValue("endereco", loc.endereco ?? "")
    form.setValue("email", loc.email ?? "")
    setDismissedCpfs((prev) => new Set(prev).add(digitsOnly(loc.cpf ?? "")))
  }

  function ignorarInquilino(cpf: string) {
    setDismissedCpfs((prev) => new Set(prev).add(digitsOnly(cpf)))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {!locacao && (
          <FormField
            control={form.control}
            name="tipoLocacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Locação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="temporada">Longa Temporada</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <hr className="my-2" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do Inquilino</h3>

        <FormTextField<LocacaoFormData>
          control={form.control}
          name="nomeCompleto"
          label="Nome Completo"
          placeholder="Ex: João da Silva"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 11)
                      const formatted = digits
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                      field.onChange(formatted)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormTextField<LocacaoFormData>
            control={form.control}
            name="rg"
            label="RG"
            placeholder="Ex: 1.234.567"
          />
        </div>

        {matchedInquilino && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">
                Inquilino encontrado: {matchedInquilino.nomeCompleto}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Já existe uma locação com este CPF. Deseja preencher os dados automaticamente?
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => preencherInquilino(matchedInquilino)}
                  className="h-8"
                >
                  Preencher dados
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => ignorarInquilino(matchedInquilino.cpf ?? "")}
                  className="h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Ignorar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dataNascimento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Nascimento</FormLabel>
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
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear()
                          const m = String(date.getMonth() + 1).padStart(2, "0")
                          const d = String(date.getDate()).padStart(2, "0")
                          field.onChange(`${y}-${m}-${d}`)
                        } else {
                          field.onChange("")
                        }
                      }}
                      locale={ptBR}
                      captionLayout="dropdown"
                      fromYear={1940}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormTextField<LocacaoFormData>
            control={form.control}
            name="profissao"
            label="Profissão"
            placeholder="Ex: Engenheiro"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estadoCivil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado Civil</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                    <SelectItem value="casado">Casado(a)</SelectItem>
                    <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                    <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                    <SelectItem value="uniao_estavel">União Estável</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormTextField<LocacaoFormData>
            control={form.control}
            name="email"
            label="E-mail"
            placeholder="email@exemplo.com"
          />
        </div>

        <FormTextField<LocacaoFormData>
          control={form.control}
          name="endereco"
          label="Endereço Completo (com CEP)"
          placeholder="Ex: Rua das Flores, 123 - Centro - Florianópolis/SC - CEP 88000-000"
        />

        <hr className="my-2" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados da Locação</h3>

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
                  {properties?.filter((p) => p.ativo).map((p) => (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Entrada</FormLabel>
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
                <FormLabel>Data de Saída</FormLabel>
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

        <FormNumberField<LocacaoFormData>
          control={form.control}
          name="numMoradores"
          label="Nº de Moradores"
          min={1}
          step={1}
          placeholder="1"
        />

        <hr className="my-2" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pagamento</h3>

        <FormField
          control={form.control}
          name="tipoPagamento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Pagamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="avista">À Vista</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {tipoPagamento === "mensal" ? (
          <FormNumberField<LocacaoFormData>
            control={form.control}
            name="valorMensal"
            label="Valor Mensal (R$)"
            min={0}
            step={0.01}
            placeholder="0,00"
          />
        ) : (
          <FormNumberField<LocacaoFormData>
            control={form.control}
            name="valorTotal"
            label="Valor Total à Vista (R$)"
            min={0}
            step={0.01}
            placeholder="0,00"
          />
        )}

        <FormNumberField<LocacaoFormData>
          control={form.control}
          name="percentualComissao"
          label="Comissão (%)"
          min={0}
          max={100}
          step={0.01}
          placeholder="Ex: 10"
        />

        <FormField
          control={form.control}
          name="garantia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Garantia</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="caucao">Caução</SelectItem>
                  <SelectItem value="seguro_fianca">Seguro Fiança</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormTextareaField<LocacaoFormData>
          control={form.control}
          name="notas"
          label="Notas"
          placeholder="Observações sobre a locação..."
          rows={3}
        />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} className="min-h-[44px]">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
