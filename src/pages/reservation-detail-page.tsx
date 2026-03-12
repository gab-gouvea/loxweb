import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CalendarDays,
  Users,
  Building2,
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Clock,
  CheckCircle2,
  User,
  Building,
  Pencil,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useReservation, useReservations, useUpdateReservation } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { formatDate } from "@/lib/date-utils"
import { type ReservationStatus, type Despesa, type FaxinaStatus } from "@/types/reservation"

const sourceLabels: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  direto: "Direto",
  outro: "Outro",
}

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: reservation, isLoading } = useReservation(id!)
  const { data: properties = [] } = useProperties()
  const { data: allReservations = [] } = useReservations()
  const updateMutation = useUpdateReservation()

  // Último custo pago à empresa parceira na mesma propriedade
  const ultimoCustoEmpresa = useMemo(() => {
    if (!reservation) return null
    const anteriores = allReservations
      .filter(
        (r) =>
          r.id !== reservation.id &&
          r.propriedadeId === reservation.propriedadeId &&
          !r.faxinaPorMim &&
          r.custoEmpresaFaxina != null &&
          r.custoEmpresaFaxina > 0
      )
      .sort((a, b) => b.checkOut.localeCompare(a.checkOut))
    return anteriores.length > 0 ? anteriores[0].custoEmpresaFaxina! : null
  }, [reservation, allReservations])

  // Local state for editable fields
  const [notas, setNotas] = useState<string | null>(null)
  const [custoEmpresa, setCustoEmpresa] = useState<number | null>(null)
  const [custoEmpresaTouched, setCustoEmpresaTouched] = useState(false)
  const [faxinaData, setFaxinaData] = useState<string | null>(null)
  const [novaDespesa, setNovaDespesa] = useState<{ descricao: string; valor: string; reembolsavel: boolean } | null>(null)

  // Editable info fields
  const [editingInfo, setEditingInfo] = useState(false)
  const [editCheckIn, setEditCheckIn] = useState<string | null>(null)
  const [editCheckOut, setEditCheckOut] = useState<string | null>(null)
  const [editPrecoTotal, setEditPrecoTotal] = useState<number | null>(null)
  const [editNumHospedes, setEditNumHospedes] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/reservas")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Reserva nao encontrada.</p>
      </div>
    )
  }

  const property = properties.find((p) => p.id === reservation.propriedadeId)

  // Resolved values (local state or from server)
  const currentNotas = notas !== null ? notas : (reservation.notas ?? "")
  const faxinaStatus: FaxinaStatus = reservation.faxinaStatus ?? "nao_agendada"
  const taxaLimpeza = property?.taxaLimpeza ?? 0

  const infoChanged = editCheckIn !== null || editCheckOut !== null || editPrecoTotal !== null || editNumHospedes !== null

  function handleSaveInfo() {
    const data: Record<string, unknown> = {}
    if (editCheckIn !== null) {
      const [y, m, d] = editCheckIn.split("-").map(Number)
      data.checkIn = new Date(y, m - 1, d).toISOString()
    }
    if (editCheckOut !== null) {
      const [y, m, d] = editCheckOut.split("-").map(Number)
      data.checkOut = new Date(y, m - 1, d).toISOString()
    }
    if (editPrecoTotal !== null) data.precoTotal = editPrecoTotal
    if (editNumHospedes !== null) data.numHospedes = editNumHospedes

    updateMutation.mutate(
      { id: reservation.id, data },
      {
        onSuccess: () => {
          toast.success("Reserva atualizada")
          setEditingInfo(false)
          setEditCheckIn(null)
          setEditCheckOut(null)
          setEditPrecoTotal(null)
          setEditNumHospedes(null)
        },
      },
    )
  }

  function handleCancelInfoEdit() {
    setEditingInfo(false)
    setEditCheckIn(null)
    setEditCheckOut(null)
    setEditPrecoTotal(null)
    setEditNumHospedes(null)
  }

  function handleConfirmarReserva() {
    updateMutation.mutate(
      { id: reservation.id, data: { status: "confirmada" as ReservationStatus } },
      { onSuccess: () => toast.success("Reserva confirmada") },
    )
  }

  function handleCancelarReserva() {
    updateMutation.mutate(
      { id: reservation.id, data: { status: "cancelada" as ReservationStatus } },
      { onSuccess: () => toast.success("Reserva cancelada") },
    )
  }

  function handleAgendarFaxina(porMim: boolean) {
    const dateStr = faxinaData ?? reservation.faxinaData?.split("T")[0] ?? reservation.checkOut.split("T")[0]
    const [y, m, d] = dateStr.split("-").map(Number)
    const dataFaxina = new Date(y, m - 1, d).toISOString()
    const data: Record<string, unknown> = {
      faxinaStatus: "agendada" as FaxinaStatus,
      faxinaPorMim: porMim,
      faxinaData: dataFaxina,
    }
    const custoFinal = custoEmpresa ?? ultimoCustoEmpresa
    if (!porMim && custoFinal !== null) {
      data.custoEmpresaFaxina = custoFinal
      data.faxinaPaga = false
    }
    updateMutation.mutate(
      { id: reservation.id, data },
      {
        onSuccess: () => {
          toast.success(porMim ? "Faxina agendada (você)" : "Faxina agendada (empresa)")
          setCustoEmpresa(null)
          setCustoEmpresaTouched(false)
        },
      },
    )
  }

  function handleToggleFaxinaPaga() {
    updateMutation.mutate(
      { id: reservation.id, data: { faxinaPaga: !reservation.faxinaPaga } },
      { onSuccess: () => toast.success(reservation.faxinaPaga ? "Marcada como não paga" : "Marcada como paga") },
    )
  }

  function handleCancelarFaxina() {
    updateMutation.mutate(
      {
        id: reservation.id,
        data: {
          faxinaStatus: "nao_agendada" as FaxinaStatus,
          faxinaPorMim: false,
        },
      },
      { onSuccess: () => toast.success("Agendamento cancelado") },
    )
  }

  function handleSaveNotas() {
    updateMutation.mutate(
      { id: reservation.id, data: { notas: currentNotas } },
      {
        onSuccess: () => {
          toast.success("Notas salvas")
          setNotas(null)
        },
      },
    )
  }

  function handleAddDespesa() {
    if (!novaDespesa || !novaDespesa.descricao || Number(novaDespesa.valor) <= 0) return
    const despesas: Despesa[] = [
      ...(reservation.despesas ?? []),
      { descricao: novaDespesa.descricao, valor: Number(novaDespesa.valor), reembolsavel: novaDespesa.reembolsavel },
    ]
    updateMutation.mutate(
      { id: reservation.id, data: { despesas } },
      {
        onSuccess: () => {
          toast.success("Despesa adicionada")
          setNovaDespesa(null)
        },
      },
    )
  }

  function handleRemoveDespesa(index: number) {
    const despesas = [...(reservation.despesas ?? [])]
    despesas.splice(index, 1)
    updateMutation.mutate(
      { id: reservation.id, data: { despesas } },
      { onSuccess: () => toast.success("Despesa removida") },
    )
  }

  const totalDespesas = (reservation.despesas ?? []).reduce((sum, d) => sum + d.valor, 0)
  const totalReembolsavel = (reservation.despesas ?? []).filter((d) => d.reembolsavel).reduce((sum, d) => sum + d.valor, 0)

  const notasChanged = notas !== null && notas !== (reservation.notas ?? "")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/reservas")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{reservation.nomeHospede}</h1>
            <span className="translate-y-[1px]">
              <ReservationStatusBadge status={reservation.status} />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(reservation.status === "pendente" || reservation.status === "cancelada") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleConfirmarReserva}
              disabled={updateMutation.isPending}
            >
              Confirmar Reserva
            </Button>
          )}
          {(reservation.status === "pendente" || reservation.status === "confirmada") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleCancelarReserva}
              disabled={updateMutation.isPending}
            >
              Cancelar Reserva
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {!editingInfo && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingInfo(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {!editingInfo ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardContent className="flex items-center gap-2 pt-4 pb-4">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Propriedade</p>
                  <p className="text-sm font-medium">{property?.nome ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-2 pt-4 pb-4">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="text-sm font-medium">{formatDate(reservation.checkIn)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-2 pt-4 pb-4">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="text-sm font-medium">{formatDate(reservation.checkOut)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-2 pt-4 pb-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Hóspedes</p>
                  <p className="text-sm font-medium">{reservation.numHospedes}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-2 pt-4 pb-4">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-sm font-medium">
                    {reservation.precoTotal
                      ? `R$ ${reservation.precoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Check-in</label>
                <Input
                  type="date"
                  className="h-8"
                  value={editCheckIn ?? reservation.checkIn.split("T")[0]}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Check-out</label>
                <Input
                  type="date"
                  className="h-8"
                  value={editCheckOut ?? reservation.checkOut.split("T")[0]}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hóspedes</label>
                <Input
                  type="number"
                  min={1}
                  className="h-8 w-20"
                  value={editNumHospedes ?? reservation.numHospedes}
                  onChange={(e) => setEditNumHospedes(e.target.value === "" ? 1 : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Total (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  className="h-8 w-32"
                  value={editPrecoTotal ?? reservation.precoTotal ?? ""}
                  onChange={(e) => setEditPrecoTotal(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveInfo} disabled={updateMutation.isPending}>
                <Save className="mr-1 h-3 w-3" />
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelInfoEdit}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Fonte: <span className="font-medium text-foreground">{sourceLabels[reservation.fonte]}</span>
      </div>

      <Separator />

      {/* Faxina */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Faxina
          </h2>
          <Badge
            variant="outline"
            className={
              faxinaStatus === "agendada" || faxinaStatus === "concluida"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-gray-50 text-gray-600 border-gray-200"
            }
          >
            {(faxinaStatus === "agendada" || faxinaStatus === "concluida") && <Clock className="mr-1 h-3 w-3" />}
            {faxinaStatus === "agendada" || faxinaStatus === "concluida"
              ? "Agendada"
              : "Não agendada"}
          </Badge>
        </div>

        {taxaLimpeza > 0 && (
          <p className="text-sm text-muted-foreground">
            Taxa de limpeza da propriedade: <span className="font-medium text-foreground">R$ {taxaLimpeza.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </p>
        )}

        {/* Estado: Não agendada → data + botões para agendar */}
        {faxinaStatus === "nao_agendada" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Data da faxina:</span>
              <Input
                type="date"
                className="w-44"
                value={faxinaData ?? reservation.checkOut.split("T")[0]}
                onChange={(e) => setFaxinaData(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">Quem vai fazer a faxina?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAgendarFaxina(true)}
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
                  value={custoEmpresaTouched ? (custoEmpresa ?? "") : (custoEmpresa ?? ultimoCustoEmpresa ?? "")}
                  onChange={(e) => {
                    setCustoEmpresaTouched(true)
                    setCustoEmpresa(e.target.value === "" ? null : Number(e.target.value))
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAgendarFaxina(false)}
                disabled={updateMutation.isPending || (custoEmpresaTouched ? custoEmpresa === null : custoEmpresa === null && ultimoCustoEmpresa === null)}
              >
                <Building className="mr-1 h-3 w-3" />
                Empresa parceira
              </Button>
            </div>
          </div>
        )}

        {/* Estado: Agendada → mostra data, quem faz, botões concluir/cancelar */}
        {(faxinaStatus === "agendada" || faxinaStatus === "concluida") && (
          <div className="space-y-3">
            {reservation.faxinaData && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Data agendada:</span>
                <span className="text-sm font-medium">{formatDate(reservation.faxinaData)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Responsável:</span>
              <Badge variant="secondary" className="text-sm">
                {reservation.faxinaPorMim ? (
                  <><User className="mr-1 h-3 w-3" /> Eu</>
                ) : (
                  <><Building className="mr-1 h-3 w-3" /> Empresa parceira</>
                )}
              </Badge>
            </div>
            {reservation.faxinaPorMim ? (
              <p className="text-xs text-muted-foreground">
                Receita: <span className="font-medium text-green-700">R$ {taxaLimpeza.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Custo empresa: R$ {(reservation.custoEmpresaFaxina ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  {" — "}
                  Receita líquida: <span className="font-medium text-green-700">R$ {(taxaLimpeza - (reservation.custoEmpresaFaxina ?? 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pagamento:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className={reservation.faxinaPaga ? "text-green-700 border-green-300" : "text-red-600 border-red-300"}
                    onClick={handleToggleFaxinaPaga}
                    disabled={updateMutation.isPending}
                  >
                    {reservation.faxinaPaga ? (
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
              onClick={handleCancelarFaxina}
              disabled={updateMutation.isPending}
            >
              Cancelar agendamento
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Despesas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Despesas</h2>
          {!novaDespesa && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNovaDespesa({ descricao: "", valor: "", reembolsavel: false })}
            >
              <Plus className="mr-1 h-3 w-3" />
              Adicionar
            </Button>
          )}
        </div>

        {(reservation.despesas ?? []).length === 0 && !novaDespesa && (
          <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
        )}

        {(reservation.despesas ?? []).map((despesa, index) => (
          <div key={index} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium">{despesa.descricao}</p>
                <p className="text-sm text-muted-foreground">
                  R$ {despesa.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {despesa.reembolsavel && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Reembolsavel
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => handleRemoveDespesa(index)}
              disabled={updateMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Nova despesa inline */}
        {novaDespesa && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Nome do item ou descricao"
                className="flex-1"
                value={novaDespesa.descricao}
                onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="R$"
                className="w-28"
                value={novaDespesa.valor}
                onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={novaDespesa.reembolsavel}
                  onCheckedChange={(checked) => setNovaDespesa({ ...novaDespesa, reembolsavel: !!checked })}
                />
                <span className="text-xs">Reembolsavel</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setNovaDespesa(null)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddDespesa}
                  disabled={!novaDespesa.descricao || !novaDespesa.valor || updateMutation.isPending}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}

        {(reservation.despesas ?? []).length > 0 && (
          <div className="flex items-center gap-4 text-sm pt-1">
            <span>
              Total: <span className="font-semibold">R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </span>
            {totalReembolsavel > 0 && (
              <span className="text-blue-700">
                Reembolsavel: R$ {totalReembolsavel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Notas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notas</h2>
          {notasChanged && (
            <Button size="sm" onClick={handleSaveNotas} disabled={updateMutation.isPending}>
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
    </div>
  )
}
