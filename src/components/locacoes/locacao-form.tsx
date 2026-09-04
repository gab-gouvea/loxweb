import { useEffect, useMemo, useRef, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addMonths, format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { CalendarIcon, Plus, UserCheck, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
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
import { formatCurrency } from "@/lib/constants"
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
      incluirConjuge: locacao?.incluirConjuge ?? false,
      conjugeNome: locacao?.conjugeNome ?? "",
      conjugeCpf: locacao?.conjugeCpf ?? "",
      conjugeRg: locacao?.conjugeRg ?? "",
      conjugeDataNascimento: locacao?.conjugeDataNascimento ?? "",
      conjugeProfissao: locacao?.conjugeProfissao ?? "",
      conjugeEstadoCivil: locacao?.conjugeEstadoCivil ?? "",
      conjugeEndereco: locacao?.conjugeEndereco ?? "",
      conjugeEmail: locacao?.conjugeEmail ?? "",
      checkIn: locacao?.checkIn ?? "",
      checkOut: locacao?.checkOut ?? "",
      numMoradores: locacao?.numMoradores ?? undefined,
      valorMensal: locacao?.valorMensal ?? undefined,
      tipoPagamento: locacao?.tipoPagamento ?? "mensal",
      valorTotal: locacao?.valorTotal ?? undefined,
      percentualComissao: locacao?.percentualComissao || undefined,
      semAdministracao: locacao?.semAdministracao ?? false,
      percentualPrimeiroAluguel: locacao?.percentualPrimeiroAluguel || undefined,
      parcelasTaxa: locacao?.parcelasTaxa?.length
        ? locacao.parcelasTaxa.map((p) => ({ dia: p.dia ?? "", mes: p.mes, ano: p.ano, valor: p.valor }))
        : [],
      garantia: locacao?.garantia ?? "",
      notas: locacao?.notas ?? "",
    },
  })

  const tipoPagamento = form.watch("tipoPagamento")
  const cpfValue = form.watch("cpf")
  const tipoLocacao = form.watch("tipoLocacao")
  const incluirConjuge = form.watch("incluirConjuge")
  const semAdministracao = form.watch("semAdministracao")
  const checkInValue = form.watch("checkIn")
  const checkOutValue = form.watch("checkOut")
  const valorMensalValue = form.watch("valorMensal")
  const valorTotalValue = form.watch("valorTotal")
  const percentualPrimeiroAluguelValue = form.watch("percentualPrimeiroAluguel")

  const primeiroAluguel = tipoPagamento === "avista" ? valorTotalValue : valorMensalValue
  const taxaTotal =
    typeof primeiroAluguel === "number" && typeof percentualPrimeiroAluguelValue === "number"
      ? (primeiroAluguel * percentualPrimeiroAluguelValue) / 100
      : null

  // Meses oferecidos para o recebimento da taxa. Partem do check-in quando há data; sem data,
  // partem do mês atual — a lista nunca pode ficar vazia, senão o select abre sem opção nenhuma.
  const parcelasAtuais = form.watch("parcelasTaxa") ?? []
  const mesesLocacao = useMemo(() => {
    const inicio = checkInValue ? parseISO(checkInValue) : new Date()
    const fim = checkOutValue ? parseISO(checkOutValue) : addMonths(inicio, 12)
    const chaves = new Map<string, { mes: number; ano: number }>()

    // Um mês a mais que o checkout: a taxa pode cair logo depois do fim do contrato
    let cursor = inicio
    let guarda = 0
    while (cursor <= addMonths(fim, 1) && guarda < 40) {
      chaves.set(`${cursor.getMonth() + 1}-${cursor.getFullYear()}`, {
        mes: cursor.getMonth() + 1,
        ano: cursor.getFullYear(),
      })
      cursor = addMonths(cursor, 1)
      guarda++
    }

    // Garante que os meses já escolhidos apareçam, mesmo fora da janela do contrato
    for (const p of parcelasAtuais) {
      if (typeof p?.mes === "number" && typeof p?.ano === "number") {
        chaves.set(`${p.mes}-${p.ano}`, { mes: p.mes, ano: p.ano })
      }
    }

    return [...chaves.values()]
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
      .map((m) => ({
        ...m,
        label: format(new Date(m.ano, m.mes - 1, 1), "MMMM/yyyy", { locale: ptBR }),
      }))
  }, [checkInValue, checkOutValue, parcelasAtuais])

  // Parcelas da taxa de intermediação — a taxa pode ser recebida de uma vez ou dividida em meses
  const { fields: parcelaFields, append: appendParcela, remove: removeParcela, replace: replaceParcelas } =
    useFieldArray({ control: form.control, name: "parcelasTaxa" })
  const parcelas = form.watch("parcelasTaxa") ?? []
  const somaParcelas = parcelas.reduce(
    (acc, p) => acc + (typeof p?.valor === "number" ? p.valor : 0), 0,
  )
  const restante = taxaTotal != null ? taxaTotal - somaParcelas : null

  // Primeira parcela: padrão = mês seguinte ao check-in (o inquilino entra, mora e paga antes do
  // repasse). Depois que o usuário mexe nas parcelas, paramos de sobrescrever.
  const parcelasTocado = useRef((locacao?.parcelasTaxa?.length ?? 0) > 0)
  useEffect(() => {
    if (!checkInValue || parcelasTocado.current) return
    // 2º mês de locação: o inquilino entra, mora e paga o primeiro aluguel antes do repasse
    const padrao = addMonths(parseISO(checkInValue), 1)
    replaceParcelas([{
      dia: "",
      mes: padrao.getMonth() + 1,
      ano: padrao.getFullYear(),
      valor: "",
    }])
  }, [checkInValue, replaceParcelas])

  // Parcela única e valor ainda não digitado: preenche com a taxa cheia
  useEffect(() => {
    if (parcelasTocado.current || taxaTotal == null || taxaTotal <= 0) return
    if (parcelaFields.length !== 1) return
    form.setValue("parcelasTaxa.0.valor", taxaTotal)
  }, [taxaTotal, parcelaFields.length, form])

  function adicionarParcela() {
    parcelasTocado.current = true
    const ultima = parcelas[parcelas.length - 1]
    const proxima =
      typeof ultima?.mes === "number" && typeof ultima?.ano === "number"
        ? addMonths(new Date(ultima.ano, ultima.mes - 1, 1), 1)
        : addMonths(checkInValue ? parseISO(checkInValue) : new Date(), 1)
    appendParcela({
      dia: "",
      mes: proxima.getMonth() + 1,
      ano: proxima.getFullYear(),
      // Já sugere o que falta para fechar a taxa
      valor: restante != null && restante > 0 ? Number(restante.toFixed(2)) : "",
    })
  }

  /** Rótulo "Nº mês — Mês/Ano" de uma parcela; cai para o mês/ano cru se estiver fora do contrato. */
  function labelMesLocacao(mes?: number | "", ano?: number | ""): string {
    if (typeof mes !== "number" || typeof ano !== "number") return ""
    const encontrado = mesesLocacao.find((m) => m.mes === mes && m.ano === ano)
    if (encontrado) return encontrado.label
    return format(new Date(ano, mes - 1, 1), "MMMM/yyyy", { locale: ptBR })
  }

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

        {tipoLocacao === "anual" && (
          <>
            <FormField
              control={form.control}
              name="incluirConjuge"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Incluir cônjuge no contrato
                  </FormLabel>
                </FormItem>
              )}
            />

            {incluirConjuge && (
              <div className="space-y-4 rounded-md border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do Cônjuge</h4>

                <FormTextField<LocacaoFormData>
                  control={form.control}
                  name="conjugeNome"
                  label="Nome Completo"
                  placeholder="Ex: Maria da Silva"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="conjugeCpf"
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
                    name="conjugeRg"
                    label="RG"
                    placeholder="Ex: 1.234.567"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="conjugeDataNascimento"
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
                    name="conjugeProfissao"
                    label="Profissão"
                    placeholder="Ex: Engenheira"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="conjugeEstadoCivil"
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
                    name="conjugeEmail"
                    label="E-mail"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <FormTextField<LocacaoFormData>
                  control={form.control}
                  name="conjugeEndereco"
                  label="Endereço Completo (com CEP)"
                  placeholder="Deixe em branco se for o mesmo do inquilino"
                />
              </div>
            )}
          </>
        )}

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

        {tipoLocacao === "anual" && (
          <FormField
            control={form.control}
            name="semAdministracao"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  Não vou administrar este imóvel (recebo só a taxa de intermediação)
                </FormLabel>
              </FormItem>
            )}
          />
        )}

        {tipoLocacao === "anual" && semAdministracao ? (
          <div className="space-y-4 rounded-md border p-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Taxa de Intermediação
            </h4>

            <FormNumberField<LocacaoFormData>
              control={form.control}
              name="percentualPrimeiroAluguel"
              label="% do Primeiro Aluguel"
              min={0}
              max={100}
              step={0.01}
              placeholder="Ex: 100"
            />

            {taxaTotal != null && (
              <p className="text-sm">
                Taxa total: <span className="font-medium">{formatCurrency(taxaTotal)}</span>
              </p>
            )}

            <FormItem>
              <FormLabel>Recebimento da Taxa</FormLabel>

              <div className="space-y-2">
                {parcelaFields.map((parcelaField, index) => (
                  <div key={parcelaField.id} className="flex items-center gap-2">
                    <span className="text-sm shrink-0">Recebimento em</span>
                    <FormField
                      control={form.control}
                      name={`parcelasTaxa.${index}.mes`}
                      render={({ field }) => (
                        <FormItem className="space-y-0 flex-1 min-w-0">
                          <Select
                            value={
                              typeof field.value === "number" && typeof parcelas[index]?.ano === "number"
                                ? `${field.value}-${parcelas[index]?.ano}`
                                : ""
                            }
                            onValueChange={(v) => {
                              parcelasTocado.current = true
                              const [mes, ano] = v.split("-").map(Number)
                              field.onChange(mes)
                              form.setValue(`parcelasTaxa.${index}.ano`, ano)
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full" aria-label={`Mês do recebimento ${index + 1}`}>
                                <SelectValue placeholder="mês da locação">
                                  {labelMesLocacao(parcelas[index]?.mes, parcelas[index]?.ano) || undefined}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mesesLocacao.map((m) => (
                                <SelectItem key={`${m.mes}-${m.ano}`} value={`${m.mes}-${m.ano}`}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormItem className="space-y-0 w-28 shrink-0">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="R$"
                          {...form.register(`parcelasTaxa.${index}.valor`, {
                            setValueAs: (v) => (v === "" || v == null ? "" : Number(v)),
                            onChange: () => { parcelasTocado.current = true },
                          })}
                        />
                      </FormControl>
                    </FormItem>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground"
                      onClick={() => { parcelasTocado.current = true; removeParcela(index) }}
                      disabled={parcelaFields.length <= 1}
                      aria-label="Remover mês"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={adicionarParcela}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar mês
              </Button>

              <FormField
                control={form.control}
                name="parcelasTaxa"
                render={() => <FormMessage />}
              />

              {restante != null && Math.abs(restante) >= 0.01 && (
                <p className={`text-xs ${restante < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {restante > 0
                    ? `Falta distribuir ${formatCurrency(restante)}`
                    : `Passou ${formatCurrency(Math.abs(restante))} do valor da taxa`}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Padrão: 2º mês de locação, quando o inquilino já pagou o primeiro aluguel.
              </p>
            </FormItem>
          </div>
        ) : (
          <FormNumberField<LocacaoFormData>
            control={form.control}
            name="percentualComissao"
            label="Comissão (%)"
            min={0}
            max={100}
            step={0.01}
            placeholder="Ex: 10"
          />
        )}

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
