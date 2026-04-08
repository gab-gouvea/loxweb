import { useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Mail,
  MapPin,
  Pencil,
  Save,
  Briefcase,
  CreditCard,
  FileText,
  Heart,
  Shield,
  Users,
  SprayCan,
  RefreshCw,
  Check,
  DoorOpen,
  User,
  Building,
  Clock,
  CheckCircle2,
  Wallet,
  ThumbsUp,
} from "lucide-react"
import { toast } from "sonner"
import { addDays, addMonths, parseISO, isBefore, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { useLocacao, useUpdateLocacao, useRecebimentosByLocacao, useUpsertRecebimentoLocacao, useDeleteRecebimentoLocacao } from "@/hooks/use-locacoes"
import { usePropertyMap } from "@/hooks/use-property-map"
import { LocacaoStatusBadge } from "@/components/locacoes/locacao-status-badge"
import { LocacaoDialog } from "@/components/locacoes/locacao-dialog"
import { formatDate, toLocalDateStr, getTodayStr, localDateToISO } from "@/lib/date-utils"
import { formatCurrency, formatCpf } from "@/lib/constants"
import { getErrorMessage } from "@/lib/api"
import type { Locacao, LocacaoFormData, LocacaoStatus } from "@/types/locacao"

export function LocacaoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: locacao, isLoading } = useLocacao(id!)
  const { propertyMap } = usePropertyMap()
  const updateMutation = useUpdateLocacao()
  const { data: recebimentos = [] } = useRecebimentosByLocacao(id!)
  const upsertRecebimento = useUpsertRecebimentoLocacao()
  const deleteRecebimento = useDeleteRecebimentoLocacao()

  const [editingNotas, setEditingNotas] = useState(false)
  const [notas, setNotas] = useState("")
  const [editingFaxina, setEditingFaxina] = useState(false)
  const [faxinaIntervalo, setFaxinaIntervalo] = useState("")
  const [custoEmpresa, setCustoEmpresa] = useState<number | null>(null)
  const [faxinaDataSaida, setFaxinaDataSaida] = useState<string | null>(null)
  const [confirmConcluir, setConfirmConcluir] = useState(false)
  const [concluirData, setConcluirData] = useState<Date>(new Date())
  const [confirmEncerrar, setConfirmEncerrar] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  // Vistoria (anual) — mode: false=closed, "agendar"=date picker, "concluir"=notes form
  const [editingVistoriaEntrada, setEditingVistoriaEntrada] = useState<false | "agendar" | "concluir">(false)
  const [vistoriaEntradaNotas, setVistoriaEntradaNotas] = useState("")
  const [vistoriaEntradaData, setVistoriaEntradaData] = useState("")
  const [editingVistoriaSaida, setEditingVistoriaSaida] = useState<false | "agendar" | "concluir">(false)
  const [vistoriaSaidaNotas, setVistoriaSaidaNotas] = useState("")
  const [vistoriaSaidaData, setVistoriaSaidaData] = useState("")

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!locacao) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Locação não encontrada</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/longatemporada")}>
          Voltar
        </Button>
      </div>
    )
  }

  const property = propertyMap.get(locacao.propriedadeId)
  const isAnual = locacao.tipoLocacao === "anual"

  function handleMutate(data: Partial<LocacaoFormData & Locacao>) {
    updateMutation.mutate(
      { id: locacao!.id, data },
      {
        onSuccess: () => toast.success("Locação atualizada"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  function handleEncerrar() {
    handleMutate({ status: "encerrada" })
  }

  function handleReativar() {
    handleMutate({ status: "ativa" })
  }

  function handleSaveNotas() {
    handleMutate({ notas })
    setEditingNotas(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">{locacao.nomeCompleto}</h1>
          <LocacaoStatusBadge status={locacao.status as LocacaoStatus} />
          <Badge variant="outline" className={isAnual ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-teal-50 text-teal-700 border-teal-200"}>
            {isAnual ? "Anual" : "Longa Temporada"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b">
        <span className="pb-2 text-sm font-medium border-b-2 border-primary">
          Detalhes
        </span>
        <Link
          to={`/longatemporada/${locacao.id}/contrato`}
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Contrato
        </Link>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-2 pt-3 pb-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Propriedade</p>
              <p className="text-sm font-medium">{property?.nome ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 pt-3 pb-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="text-sm font-medium">{formatDate(locacao.checkIn)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-2 pt-3 pb-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Saída</p>
              <p className="text-sm font-medium">{formatDate(locacao.checkOut)}</p>
            </div>
          </CardContent>
        </Card>

        {locacao.numMoradores != null && (
          <Card>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Moradores</p>
                <p className="text-sm font-medium">{locacao.numMoradores}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {(() => {
          const checkInDate = parseISO(toLocalDateStr(locacao.checkIn))
          const checkOutDate = parseISO(toLocalDateStr(locacao.checkOut))
          const today = parseISO(getTodayStr())
          const recebimentoMap = new Map(recebimentos.map(r => [`${r.mes}-${r.ano}`, r]))
          const comissaoPct = locacao.percentualComissao ?? 0
          const taxaLimpeza = property?.taxaLimpeza ?? 0

          // Receita líquida de faxina pro gestor: taxa inteira (por mim) ou taxa - custo empresa (terceirizada)
          const faxinaReceita = locacao.faxinaPorMim ? taxaLimpeza : taxaLimpeza - (locacao.custoEmpresaFaxina ?? 0)

          // Ciclo atual baseado no dia de entrada
          let cicloStart = checkInDate
          while (isBefore(addMonths(cicloStart, 1), today) || addMonths(cicloStart, 1).getTime() === today.getTime()) {
            cicloStart = addMonths(cicloStart, 1)
          }
          if (isBefore(today, checkInDate)) cicloStart = checkInDate
          const nextCiclo = addMonths(cicloStart, 1)
          const isUltimoCiclo = !isBefore(nextCiclo, checkOutDate)

          let pagMes: number, pagAno: number, valorBruto: number
          if (locacao.tipoPagamento === "avista") {
            pagMes = checkInDate.getMonth() + 1
            pagAno = checkInDate.getFullYear()
            valorBruto = locacao.valorTotal ?? 0
          } else {
            pagMes = cicloStart.getMonth() + 1
            pagAno = cicloStart.getFullYear()
            valorBruto = locacao.valorMensal ?? 0
          }

          const valorComissao = valorBruto * comissaoPct / 100

          const pagKey = `${pagMes}-${pagAno}`
          const recebido = recebimentoMap.has(pagKey)

          // Faxina — card separado com confirmação independente (mes=99 como marcador)
          const faxinaKey = `99-${pagAno}`
          const faxinaRecebida = recebimentoMap.has(faxinaKey)

          return (
            <>
              {/* Valor bruto */}
              <Card>
                <CardContent className="flex items-center gap-2 pt-3 pb-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {locacao.tipoPagamento === "avista" ? "Valor à Vista" : "Valor Mensal"}
                    </p>
                    <p className="text-sm font-medium">{formatCurrency(valorBruto)}</p>
                  </div>
                </CardContent>
              </Card>
              {/* Comissão — A Receber / Recebido */}
              <Card className={`relative transition-colors ${recebido ? "border-green-300 bg-green-50" : ""}`}>
                <Button
                  variant={recebido ? "default" : "outline"}
                  size="icon"
                  className={`absolute top-1.5 right-1.5 h-6 w-6 ${recebido ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => {
                    if (recebido) {
                      deleteRecebimento.mutate({ locacaoId: locacao.id, mes: pagMes, ano: pagAno }, {
                        onSuccess: () => toast.success("Pagamento desmarcado"),
                        onError: (err) => toast.error(getErrorMessage(err)),
                      })
                    } else {
                      upsertRecebimento.mutate({ locacaoId: locacao.id, mes: pagMes, ano: pagAno, valorRecebido: valorComissao }, {
                        onSuccess: () => toast.success("Pagamento confirmado"),
                        onError: (err) => toast.error(getErrorMessage(err)),
                      })
                    }
                  }}
                  disabled={upsertRecebimento.isPending || deleteRecebimento.isPending}
                >
                  {recebido ? <Check className="h-3 w-3" /> : <ThumbsUp className="h-3 w-3" />}
                </Button>
                <CardContent className="flex items-center gap-2 pt-3 pb-3">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {recebido ? "Recebido" : "A Receber"}
                    </p>
                    <p className="text-sm font-medium">{formatCurrency(valorComissao)}</p>
                  </div>
                </CardContent>
              </Card>
              {/* Faxina — card separado com confirmação */}
              <Card className={`relative transition-colors ${faxinaRecebida ? "border-green-300 bg-green-50" : ""}`}>
                <Button
                  variant={faxinaRecebida ? "default" : "outline"}
                  size="icon"
                  className={`absolute top-1.5 right-1.5 h-6 w-6 ${faxinaRecebida ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => {
                    if (faxinaRecebida) {
                      deleteRecebimento.mutate({ locacaoId: locacao.id, mes: 99, ano: pagAno }, {
                        onSuccess: () => toast.success("Faxina desmarcada"),
                        onError: (err) => toast.error(getErrorMessage(err)),
                      })
                    } else {
                      upsertRecebimento.mutate({ locacaoId: locacao.id, mes: 99, ano: pagAno, valorRecebido: faxinaReceita }, {
                        onSuccess: () => toast.success("Faxina confirmada"),
                        onError: (err) => toast.error(getErrorMessage(err)),
                      })
                    }
                  }}
                  disabled={upsertRecebimento.isPending || deleteRecebimento.isPending}
                >
                  {faxinaRecebida ? <Check className="h-3 w-3" /> : <ThumbsUp className="h-3 w-3" />}
                </Button>
                <CardContent className="flex items-center gap-2 pt-3 pb-3">
                  <SprayCan className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {faxinaRecebida ? "Faxina Recebida" : "Faxina a Receber"}
                    </p>
                    <p className="text-sm font-medium">{formatCurrency(faxinaReceita)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-2 pt-3 pb-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Comissão</p>
                    <p className="text-sm font-medium">{locacao.percentualComissao ?? 0}%</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )
        })()}

        {locacao.garantia && (
          <Card>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Garantia</p>
                <p className="text-sm font-medium">{locacao.garantia === "caucao" ? "Caução" : "Seguro Fiança"}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dados do Inquilino */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Dados do Inquilino</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locacao.cpf && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                CPF
              </div>
              <p className="text-sm font-medium">{formatCpf(locacao.cpf)}</p>
            </div>
          )}

          {locacao.rg && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                RG
              </div>
              <p className="text-sm font-medium">{locacao.rg}</p>
            </div>
          )}

          {locacao.dataNascimento && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CalendarDays className="h-3 w-3" />
                Data de Nascimento
              </div>
              <p className="text-sm font-medium">{formatDate(locacao.dataNascimento)}</p>
            </div>
          )}

          {locacao.profissao && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Briefcase className="h-3 w-3" />
                Profissão
              </div>
              <p className="text-sm font-medium">{locacao.profissao}</p>
            </div>
          )}

          {locacao.estadoCivil && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Heart className="h-3 w-3" />
                Estado Civil
              </div>
              <p className="text-sm font-medium capitalize">{locacao.estadoCivil.replace("_", " ")}</p>
            </div>
          )}

          {locacao.email && (
            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Mail className="h-3 w-3" />
                E-mail
              </div>
              <p className="text-sm font-medium">{locacao.email}</p>
            </div>
          )}

          {locacao.endereco && (
            <div className="rounded-md bg-muted/50 p-3 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <MapPin className="h-3 w-3" />
                Endereço
              </div>
              <p className="text-sm font-medium">{locacao.endereco}</p>
            </div>
          )}
        </div>
      </div>

      {/* Vistorias — só anual */}
      {isAnual && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Vistorias</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vistoria de Entrada */}
            {(() => {
              const isAgendada = !!locacao.vistoriaEntradaData && !locacao.vistoriaEntradaConcluida
              const isConcluida = !!locacao.vistoriaEntradaConcluida
              const isNaoAgendada = !isAgendada && !isConcluida

              return (
                <Card className={isConcluida ? "border-green-300 bg-green-50/30" : "border-blue-300"}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          isConcluida ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                        }`}>
                          <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <h3 className="font-medium text-sm">Vistoria de Entrada</h3>
                      </div>
                      <Badge variant="outline" className={
                        isConcluida ? "bg-green-100 text-green-700 border-green-200 shrink-0"
                        : isAgendada ? "bg-blue-50 text-blue-700 border-blue-200 shrink-0"
                        : "bg-gray-50 text-gray-600 border-gray-200 shrink-0"
                      }>
                        {isConcluida && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {isAgendada && <Clock className="mr-1 h-3 w-3" />}
                        {isConcluida ? "Concluída" : isAgendada ? "Agendada" : "Não agendada"}
                      </Badge>
                    </div>

                    {/* Data destaque */}
                    {isAgendada && locacao.vistoriaEntradaData && (
                      <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Agendada para {formatDate(locacao.vistoriaEntradaData)}</span>
                      </div>
                    )}
                    {isConcluida && locacao.vistoriaEntradaData && (
                      <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2">
                        <CalendarDays className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Realizada em {formatDate(locacao.vistoriaEntradaData)}</span>
                      </div>
                    )}
                    {isConcluida && locacao.vistoriaEntradaNotas && (
                      <div className="rounded-md bg-white/70 border p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Observações</p>
                        <p className="text-sm whitespace-pre-wrap">{locacao.vistoriaEntradaNotas}</p>
                      </div>
                    )}

                    {/* Não agendada → Agendar */}
                    {isNaoAgendada && (
                      editingVistoriaEntrada === "agendar" ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Data:</span>
                            <Input type="date" className="w-44 h-8" value={vistoriaEntradaData} onChange={(e) => setVistoriaEntradaData(e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => { if (vistoriaEntradaData) { handleMutate({ vistoriaEntradaData }); setEditingVistoriaEntrada(false) } }} disabled={updateMutation.isPending || !vistoriaEntradaData}>
                              <CalendarDays className="mr-1 h-3 w-3" />
                              Agendar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingVistoriaEntrada(false)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <Button size="sm" variant="outline" onClick={() => { setVistoriaEntradaData(locacao.checkIn.split("T")[0]); setEditingVistoriaEntrada("agendar") }}>
                            <CalendarDays className="mr-1 h-3 w-3" />
                            Agendar Vistoria
                          </Button>
                        </div>
                      )
                    )}

                    {/* Agendada → Concluir ou Cancelar */}
                    {isAgendada && (
                      editingVistoriaEntrada === "concluir" ? (
                        <div className="space-y-2 pt-1 border-t">
                          <Textarea value={vistoriaEntradaNotas} onChange={(e) => setVistoriaEntradaNotas(e.target.value)} rows={3} placeholder="Descreva o estado do imóvel na entrada..." className="text-sm" />
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { handleMutate({ vistoriaEntradaNotas: vistoriaEntradaNotas || undefined, vistoriaEntradaConcluida: true }); setEditingVistoriaEntrada(false) }} disabled={updateMutation.isPending}>
                              <Check className="mr-1 h-3 w-3" />
                              Concluir Vistoria
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingVistoriaEntrada(false)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 pt-1 border-t">
                          <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => { setVistoriaEntradaNotas(locacao.vistoriaEntradaNotas ?? ""); setEditingVistoriaEntrada("concluir") }}>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Concluir
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleMutate({ clearVistoriaEntrada: true })} disabled={updateMutation.isPending}>
                            Cancelar agendamento
                          </Button>
                        </div>
                      )
                    )}

                    {/* Concluída → Desfazer */}
                    {isConcluida && (
                      <div className="pt-1 border-t">
                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => handleMutate({ vistoriaEntradaConcluida: false })} disabled={updateMutation.isPending}>
                          Desfazer conclusão
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}

            {/* Vistoria de Saída */}
            {(() => {
              const isAgendada = !!locacao.vistoriaSaidaData && !locacao.vistoriaSaidaConcluida
              const isConcluida = !!locacao.vistoriaSaidaConcluida
              const isNaoAgendada = !isAgendada && !isConcluida

              return (
                <Card className={isConcluida ? "border-green-300 bg-green-50/30" : "border-orange-300"}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          isConcluida ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                        }`}>
                          <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <h3 className="font-medium text-sm">Vistoria de Saída</h3>
                      </div>
                      <Badge variant="outline" className={
                        isConcluida ? "bg-green-100 text-green-700 border-green-200 shrink-0"
                        : isAgendada ? "bg-orange-50 text-orange-700 border-orange-200 shrink-0"
                        : "bg-gray-50 text-gray-600 border-gray-200 shrink-0"
                      }>
                        {isConcluida && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {isAgendada && <Clock className="mr-1 h-3 w-3" />}
                        {isConcluida ? "Concluída" : isAgendada ? "Agendada" : "Não agendada"}
                      </Badge>
                    </div>

                    {/* Data destaque */}
                    {isAgendada && locacao.vistoriaSaidaData && (
                      <div className="flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2">
                        <CalendarDays className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Agendada para {formatDate(locacao.vistoriaSaidaData)}</span>
                      </div>
                    )}
                    {isConcluida && locacao.vistoriaSaidaData && (
                      <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2">
                        <CalendarDays className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Realizada em {formatDate(locacao.vistoriaSaidaData)}</span>
                      </div>
                    )}
                    {isConcluida && locacao.vistoriaSaidaNotas && (
                      <div className="rounded-md bg-white/70 border p-2.5">
                        <p className="text-xs text-muted-foreground mb-1">Observações</p>
                        <p className="text-sm whitespace-pre-wrap">{locacao.vistoriaSaidaNotas}</p>
                      </div>
                    )}

                    {/* Não agendada → Agendar */}
                    {isNaoAgendada && (
                      editingVistoriaSaida === "agendar" ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Data:</span>
                            <Input type="date" className="w-44 h-8" value={vistoriaSaidaData} onChange={(e) => setVistoriaSaidaData(e.target.value)} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => { if (vistoriaSaidaData) { handleMutate({ vistoriaSaidaData }); setEditingVistoriaSaida(false) } }} disabled={updateMutation.isPending || !vistoriaSaidaData}>
                              <CalendarDays className="mr-1 h-3 w-3" />
                              Agendar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingVistoriaSaida(false)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1">
                          <Button size="sm" variant="outline" onClick={() => { setVistoriaSaidaData(locacao.checkOut.split("T")[0]); setEditingVistoriaSaida("agendar") }}>
                            <CalendarDays className="mr-1 h-3 w-3" />
                            Agendar Vistoria
                          </Button>
                        </div>
                      )
                    )}

                    {/* Agendada → Concluir ou Cancelar */}
                    {isAgendada && (
                      editingVistoriaSaida === "concluir" ? (
                        <div className="space-y-2 pt-1 border-t">
                          <Textarea value={vistoriaSaidaNotas} onChange={(e) => setVistoriaSaidaNotas(e.target.value)} rows={3} placeholder="Descreva o estado do imóvel na saída..." className="text-sm" />
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { handleMutate({ vistoriaSaidaNotas: vistoriaSaidaNotas || undefined, vistoriaSaidaConcluida: true }); setEditingVistoriaSaida(false) }} disabled={updateMutation.isPending}>
                              <Check className="mr-1 h-3 w-3" />
                              Concluir Vistoria
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingVistoriaSaida(false)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 pt-1 border-t">
                          <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => { setVistoriaSaidaNotas(locacao.vistoriaSaidaNotas ?? ""); setEditingVistoriaSaida("concluir") }}>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Concluir
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleMutate({ clearVistoriaSaida: true })} disabled={updateMutation.isPending}>
                            Cancelar agendamento
                          </Button>
                        </div>
                      )
                    )}

                    {/* Concluída → Desfazer */}
                    {isConcluida && (
                      <div className="pt-1 border-t">
                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => handleMutate({ vistoriaSaidaConcluida: false })} disabled={updateMutation.isPending}>
                          Desfazer conclusão
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}
          </div>
        </div>
      )}

      {/* Faxina de Rotina — card igual component-table (só temporada) */}
      {!isAnual && <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Faxina de Rotina
          </h2>
          {!locacao.faxinaIntervaloDias && !editingFaxina && (
            <Button size="sm" onClick={() => { setFaxinaIntervalo("15"); setEditingFaxina(true) }}>
              Configurar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Form para criar/editar intervalo */}
        {editingFaxina && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Intervalo entre faxinas (dias)</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  className="w-24 h-8"
                  value={faxinaIntervalo}
                  onChange={(e) => setFaxinaIntervalo(e.target.value)}
                  placeholder="Ex: 15"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">dias</span>
                <Button
                  size="sm"
                  onClick={() => {
                    const dias = Number(faxinaIntervalo)
                    if (dias > 0) {
                      const base = locacao.ultimaFaxina ? new Date(locacao.ultimaFaxina) : new Date()
                      handleMutate({
                        faxinaIntervaloDias: dias,
                        proximaFaxina: addDays(base, dias).toISOString(),
                      })
                    }
                    setEditingFaxina(false)
                  }}
                  disabled={updateMutation.isPending}
                >
                  Salvar
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingFaxina(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card da faxina — mesmo visual do component-table */}
        {locacao.faxinaIntervaloDias != null && !editingFaxina && (() => {
          const today = getTodayStr()
          const proxima = locacao.proximaFaxina ? toLocalDateStr(locacao.proximaFaxina) : null
          const isAtrasada = proxima ? proxima < today : false

          return (
            <Card className={isAtrasada ? "border-red-300" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isAtrasada ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}>
                      <SprayCan className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium">Faxina</h3>
                  </div>
                  <Badge variant={isAtrasada ? "destructive" : "default"} className="shrink-0">
                    {isAtrasada ? "Atrasada" : "Em dia"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`flex items-center gap-1.5 ${isAtrasada ? "" : "text-muted-foreground"}`}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Última: {locacao.ultimaFaxina ? formatDate(locacao.ultimaFaxina) : "—"}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${isAtrasada ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Próxima: {proxima ? formatDate(proxima) : "—"}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  A cada {locacao.faxinaIntervaloDias} dias
                </p>

                <div className="flex items-center gap-1 pt-1 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => { setConcluirData(new Date()); setConfirmConcluir(true) }}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Concluir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setFaxinaIntervalo(String(locacao.faxinaIntervaloDias))
                      setEditingFaxina(true)
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })()}
        </div>
      </div>}

      {/* Faxina de Saída */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-orange-600" />
            Faxina de Saída
          </h2>
          <Badge
            variant="outline"
            className={
              locacao.faxinaStatus === "agendada"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-gray-50 text-gray-600 border-gray-200"
            }
          >
            {locacao.faxinaStatus === "agendada" && <Clock className="mr-1 h-3 w-3" />}
            {locacao.faxinaStatus === "agendada" ? "Agendada" : "Não agendada"}
          </Badge>
        </div>

        {property?.taxaLimpeza != null && property.taxaLimpeza > 0 && (
          <p className="text-sm text-muted-foreground">
            Taxa de limpeza da propriedade: <span className="font-medium text-foreground">{formatCurrency(property.taxaLimpeza)}</span>
          </p>
        )}

        {/* Não agendada */}
        {(!locacao.faxinaStatus || locacao.faxinaStatus === "nao_agendada") && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Data da faxina:</span>
              <Input
                type="date"
                className="w-44"
                value={faxinaDataSaida ?? locacao.checkOut.split("T")[0]}
                onChange={(e) => setFaxinaDataSaida(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">Quem vai fazer a faxina?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const dateStr = faxinaDataSaida ?? locacao.checkOut.split("T")[0]
                  handleMutate({
                    faxinaStatus: "agendada",
                    faxinaPorMim: true,
                    faxinaData: localDateToISO(dateStr),
                  })
                }}
                disabled={updateMutation.isPending}
              >
                <User className="mr-1 h-3 w-3" />
                Eu faço
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Custo empresa (R$):</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-28"
                  value={custoEmpresa ?? ""}
                  onChange={(e) => setCustoEmpresa(e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const dateStr = faxinaDataSaida ?? locacao.checkOut.split("T")[0]
                  handleMutate({
                    faxinaStatus: "agendada",
                    faxinaPorMim: false,
                    faxinaData: localDateToISO(dateStr),
                    custoEmpresaFaxina: custoEmpresa ?? undefined,
                    faxinaPaga: false,
                  })
                  setCustoEmpresa(null)
                }}
                disabled={updateMutation.isPending || custoEmpresa === null}
              >
                <Building className="mr-1 h-3 w-3" />
                Empresa parceira
              </Button>
            </div>
          </div>
        )}

        {/* Agendada */}
        {locacao.faxinaStatus === "agendada" && (
          <div className="space-y-3">
            {locacao.faxinaData && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Data agendada:</span>
                <span className="text-sm font-medium">{formatDate(locacao.faxinaData)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Responsável:</span>
              <Badge variant="secondary" className="text-sm">
                {locacao.faxinaPorMim ? (
                  <><User className="mr-1 h-3 w-3" /> Eu</>
                ) : (
                  <><Building className="mr-1 h-3 w-3" /> Empresa parceira</>
                )}
              </Badge>
            </div>
            {locacao.faxinaPorMim ? (
              <p className="text-xs text-muted-foreground">
                Receita: <span className="font-medium text-green-700">{formatCurrency(property?.taxaLimpeza ?? 0)}</span>
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Custo empresa: {formatCurrency(locacao.custoEmpresaFaxina ?? 0)}
                  {" — "}
                  Receita líquida: <span className="font-medium text-green-700">{formatCurrency((property?.taxaLimpeza ?? 0) - (locacao.custoEmpresaFaxina ?? 0))}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pagamento:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className={locacao.faxinaPaga ? "text-green-700 border-green-300" : "text-red-600 border-red-300"}
                    onClick={() => handleMutate({ faxinaPaga: !locacao.faxinaPaga })}
                    disabled={updateMutation.isPending}
                  >
                    {locacao.faxinaPaga ? (
                      <><CheckCircle2 className="mr-1 h-3 w-3" /> Pago</>
                    ) : (
                      <><Clock className="mr-1 h-3 w-3" /> Não pago</>
                    )}
                  </Button>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMutate({ faxinaStatus: "nao_agendada", faxinaPorMim: false })}
              disabled={updateMutation.isPending}
            >
              Cancelar agendamento
            </Button>
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notas</h2>
          {!editingNotas && (
            <Button variant="ghost" size="sm" onClick={() => { setNotas(locacao.notas ?? ""); setEditingNotas(true) }}>
              <Pencil className="mr-1 h-3 w-3" />
              Editar
            </Button>
          )}
        </div>
        {editingNotas ? (
          <div className="space-y-2">
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              placeholder="Observações sobre a locação..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNotas} disabled={updateMutation.isPending}>
                <Save className="mr-1 h-3 w-3" />
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingNotas(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {locacao.notas || "Nenhuma nota adicionada."}
          </p>
        )}
      </div>

      {/* Encerrar / Reativar Locação */}
      {locacao.status === "ativa" && (
        <div className="pt-6 border-t">
          <Button variant="destructive" onClick={() => setConfirmEncerrar(true)}>
            Encerrar Locação
          </Button>
        </div>
      )}
      {locacao.status === "encerrada" && (
        <div className="pt-6 border-t">
          <Button onClick={handleReativar}>
            Reativar Locação
          </Button>
        </div>
      )}

      {/* Dialog editar locação */}
      <LocacaoDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        locacao={locacao}
      />

      {/* Confirmar encerramento */}
      <AlertDialog open={confirmEncerrar} onOpenChange={setConfirmEncerrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar locação antes do prazo?</AlertDialogTitle>
            <AlertDialogDescription>
              A locação de {locacao.nomeCompleto} será encerrada antes da data de saída prevista ({formatDate(locacao.checkOut)}). <span className="text-green-600 font-medium">Essa ação pode ser revertida.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                handleEncerrar()
                setConfirmEncerrar(false)
              }}
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar conclusão de faxina */}
      <AlertDialog open={confirmConcluir} onOpenChange={setConfirmConcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir faxina</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a data em que a faxina foi realizada. A próxima será calculada automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {format(concluirData, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={concluirData}
                  onSelect={(date) => date && setConcluirData(date)}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleMutate({
                  ultimaFaxina: concluirData.toISOString(),
                  proximaFaxina: addDays(concluirData, locacao!.faxinaIntervaloDias!).toISOString(),
                })
                setConfirmConcluir(false)
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
