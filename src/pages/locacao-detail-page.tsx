import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
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
} from "lucide-react"
import { toast } from "sonner"
import { addDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import { useLocacao, useUpdateLocacao } from "@/hooks/use-locacoes"
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

  const [editingNotas, setEditingNotas] = useState(false)
  const [notas, setNotas] = useState("")
  const [editingFaxina, setEditingFaxina] = useState(false)
  const [faxinaIntervalo, setFaxinaIntervalo] = useState("")
  const [custoEmpresa, setCustoEmpresa] = useState<number | null>(null)
  const [faxinaDataSaida, setFaxinaDataSaida] = useState<string | null>(null)
  const [confirmConcluir, setConfirmConcluir] = useState(false)
  const [confirmEncerrar, setConfirmEncerrar] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

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
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
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

        {locacao.valorMensal != null && (
          <Card>
            <CardContent className="flex items-center gap-2 pt-3 pb-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Valor Mensal</p>
                <p className="text-sm font-medium">{formatCurrency(locacao.valorMensal)}</p>
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* Faxina de Rotina — card igual component-table */}
      <div className="space-y-4">
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
                    onClick={() => setConfirmConcluir(true)}
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
      </div>

      {/* Faxina de Saída — mesma UI das reservas */}
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
            <AlertDialogTitle>Concluir faxina?</AlertDialogTitle>
            <AlertDialogDescription>
              A data da última faxina será atualizada para hoje e a próxima será calculada automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const now = new Date()
                handleMutate({
                  ultimaFaxina: now.toISOString(),
                  proximaFaxina: addDays(now, locacao!.faxinaIntervaloDias!).toISOString(),
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
