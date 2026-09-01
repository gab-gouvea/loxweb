import { useState, useMemo } from "react"
import { Pencil } from "lucide-react"
import { addDays, addMonths, format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SummaryCard } from "@/components/shared/summary-card"
import { PropertyFilterSelect } from "@/components/shared/property-filter-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useReservations, useUpdateReservation } from "@/hooks/use-reservations"
import { useLocacoes, useRecebimentosLocacao } from "@/hooks/use-locacoes"
import { usePropertyMap } from "@/hooks/use-property-map"
import { formatDate, toLocalDateStr } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { getErrorMessage } from "@/lib/api"
import { toast } from "sonner"
import { calcFaxinaReceita, calcDespesas, calcRecebidoBase, calcRecebidoExtensao } from "@/lib/reservation-calculations"
import { groupByProperty } from "@/lib/collection-utils"
import { ReservationStatusBadge } from "@/components/reservations/reservation-status-badge"
import { KeyRound } from "lucide-react"
import type { Reservation } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"
import type { Property } from "@/types/property"
import { useReportsMonthStore } from "@/hooks/use-month-store"

/** Uma linha do relatório: a reserva original (base) ou uma extensão específica dela. */
interface ReportLine {
  key: string
  propriedadeId: string
  reservation: Reservation
  isExtension: boolean
  isCancelada: boolean
  dataLinha: string
  dataOut: string | null
  bruto: number
  comissaoPercent: number
  comissaoValor: number
  liquido: number
  faxina: number
  despesasNaoReemb: number
  recebido: number
}

// Mês de recebimento = dia seguinte ao check-in (reserva base) ou ao início da extensão —
// a Airbnb repassa cada valor no dia seguinte, podendo cair em meses diferentes.
function recebimentoMonth(dateStr: string): string {
  const localStr = toLocalDateStr(dateStr)
  const [y, m, d] = localStr.split("-").map(Number)
  const local = new Date(y, m - 1, d)
  return format(addDays(local, 1), "yyyy-MM")
}

function buildReportLines(
  reservations: Reservation[],
  propertyMap: Map<string, Property>,
  reportYM: string,
): ReportLine[] {
  const lines: ReportLine[] = []
  for (const r of reservations) {
    if (r.status === "cancelada") {
      if (recebimentoMonth(r.checkIn) !== reportYM) continue
      lines.push({
        key: r.id,
        propriedadeId: r.propriedadeId,
        reservation: r,
        isExtension: false,
        isCancelada: true,
        dataLinha: r.checkIn,
        dataOut: r.checkOut,
        bruto: r.precoTotal ?? 0,
        comissaoPercent: 0,
        comissaoValor: 0,
        liquido: r.valorLiquidoCancelamento ?? 0,
        faxina: 0,
        despesasNaoReemb: 0,
        recebido: r.valorRecebidoCancelamento ?? 0,
      })
      continue
    }

    const property = propertyMap.get(r.propriedadeId)
    const taxaLimpeza = r.taxaLimpeza ?? property?.taxaLimpeza ?? 0
    const comissaoPercent = r.percentualComissao ?? property?.percentualComissao ?? 0
    const { reembolsavel, naoReembolsavel } = calcDespesas(r)
    const totalExtensoes = (r.extensoes ?? []).reduce((sum, e) => sum + e.valor, 0)

    if (recebimentoMonth(r.checkIn) === reportYM) {
      const baseBruto = (r.precoTotal ?? 0) - totalExtensoes
      const valorSemLimpeza = baseBruto - taxaLimpeza
      const comissaoValor = (valorSemLimpeza * comissaoPercent) / 100
      lines.push({
        key: r.id,
        propriedadeId: r.propriedadeId,
        reservation: r,
        isExtension: false,
        isCancelada: false,
        dataLinha: r.checkIn,
        dataOut: r.checkOut,
        bruto: baseBruto,
        comissaoPercent,
        comissaoValor,
        liquido: valorSemLimpeza - comissaoValor - reembolsavel,
        faxina: calcFaxinaReceita(r, property),
        despesasNaoReemb: naoReembolsavel,
        recebido: calcRecebidoBase(r, property),
      })
    }

    for (const [idx, ext] of (r.extensoes ?? []).entries()) {
      if (recebimentoMonth(ext.dataInicio) !== reportYM) continue
      const comissaoValor = (ext.valor * comissaoPercent) / 100
      lines.push({
        key: `${r.id}-ext-${idx}`,
        propriedadeId: r.propriedadeId,
        reservation: r,
        isExtension: true,
        isCancelada: false,
        dataLinha: ext.dataInicio,
        dataOut: null,
        bruto: ext.valor,
        comissaoPercent,
        comissaoValor,
        liquido: ext.valor - comissaoValor,
        faxina: 0,
        despesasNaoReemb: 0,
        recebido: calcRecebidoExtensao(r, property, ext.valor),
      })
    }
  }
  return lines
}

export function ReportsPage() {
  const { currentMonth, setCurrentMonth } = useReportsMonthStore()
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")

  // Dialog state for cancelled reservation - recebido
  const [editingRecebido, setEditingRecebido] = useState<Reservation | null>(null)
  const [canceladaValor, setCanceladaValor] = useState<number | "">(0)
  // Dialog state for cancelled reservation - líquido
  const [editingLiquido, setEditingLiquido] = useState<Reservation | null>(null)
  const [canceladaLiquido, setCanceladaLiquido] = useState<number | "">(0)
  const { data: allReservations = [], isLoading: loadingReservations } = useReservations()
  const { data: allLocacoes = [] } = useLocacoes()
  const { properties, propertyMap } = usePropertyMap()
  const navigate = useNavigate()
  const updateReservation = useUpdateReservation()

  const reportMes = currentMonth.getMonth() + 1
  const reportAno = currentMonth.getFullYear()
  const reportYM = format(currentMonth, "yyyy-MM")
  const { data: locacaoRecebimentos = [] } = useRecebimentosLocacao(reportMes, reportAno)
  const locacaoRecebidoSet = useMemo(() => new Set(locacaoRecebimentos.map(r => r.locacaoId)), [locacaoRecebimentos])
  // Map locacaoId -> valorRecebido confirmado neste mês (preserva valor antes de reajustes)
  const locacaoValorRecebidoMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of locacaoRecebimentos) {
      // mes=99 é faxina, ignorar aqui
      if (r.mes !== 99) m.set(r.locacaoId, r.valorRecebido)
    }
    return m
  }, [locacaoRecebimentos])

  // Uma linha por reserva base + uma linha por extensão, cada uma no mês do seu próprio recebimento
  const reportLines = useMemo(
    () => buildReportLines(allReservations, propertyMap, reportYM),
    [allReservations, propertyMap, reportYM],
  )

  // Locações que geram recebimento neste mês (pagamento OU faxina de saída)
  const [monthLocacoes, locacaoInfoMap] = useMemo(() => {
    const result: Locacao[] = []
    const infoMap = new Map<string, { hasPayment: boolean; hasFaxina: boolean }>()

    for (const l of allLocacoes) {
      if (propertyFilter !== "todos" && l.propriedadeId !== propertyFilter) continue

      // Converter Instant para datas locais (evita shift de timezone)
      const ciStr = toLocalDateStr(l.checkIn)
      const coStr = toLocalDateStr(l.checkOut)
      const [cy, cm, cd] = ciStr.split("-").map(Number)
      const [oy, om, od] = coStr.split("-").map(Number)
      const checkInLocal = new Date(cy, cm - 1, cd)
      const checkOutLocal = new Date(oy, om - 1, od)

      let hasPayment = false
      if (l.tipoPagamento === "avista") {
        hasPayment = format(checkInLocal, "yyyy-MM") === reportYM
      } else {
        // Mensal: pagamento no dia da entrada de cada mês
        let current = new Date(checkInLocal)
        while (current < checkOutLocal) {
          if (format(current, "yyyy-MM") === reportYM) {
            hasPayment = true
            break
          }
          current = addMonths(current, 1)
        }
      }

      // Faxina de saída aparece junto com o último pagamento (último ciclo antes do checkout)
      let hasFaxina = false
      if (l.faxinaStatus === "agendada") {
        if (l.tipoPagamento === "avista") {
          hasFaxina = format(checkInLocal, "yyyy-MM") === reportYM
        } else {
          // Mensal: faxina aparece no mês do último pagamento (último ciclo antes do checkout)
          let lastPayment = new Date(checkInLocal)
          let current = new Date(checkInLocal)
          while (current < checkOutLocal) {
            lastPayment = new Date(current)
            current = addMonths(current, 1)
          }
          hasFaxina = format(lastPayment, "yyyy-MM") === reportYM
        }
      }

      if (hasPayment || hasFaxina) {
        result.push(l)
        infoMap.set(l.id, { hasPayment, hasFaxina })
      }
    }
    return [result, infoMap] as const
  }, [allLocacoes, reportYM, propertyFilter])

  // Calcular bruto da locação para este mês (só se tem pagamento no mês)
  // Se já confirmado, deriva do valorRecebido armazenado (preserva valor antes de reajuste)
  function getLocacaoBruto(l: Locacao, hasPayment: boolean): number {
    if (!hasPayment) return 0
    const valorRecebido = locacaoValorRecebidoMap.get(l.id)
    if (valorRecebido != null) {
      const pct = l.percentualComissao ?? 0
      return pct > 0 ? (valorRecebido * 100) / pct : 0
    }
    if (l.tipoPagamento === "avista") return l.valorTotal ?? 0
    return l.valorMensal ?? 0
  }

  function getLocacaoComissao(l: Locacao, hasPayment: boolean): number {
    if (!hasPayment) return 0
    // Se já confirmado, usar valor armazenado (preserva valor antes de reajuste)
    const valorRecebido = locacaoValorRecebidoMap.get(l.id)
    if (valorRecebido != null) return valorRecebido
    const bruto = getLocacaoBruto(l, hasPayment)
    return (bruto * (l.percentualComissao ?? 0)) / 100
  }

  // Despesas da locação filtradas pelo mês do relatório
  function getLocacaoDespesas(l: Locacao) {
    const all = l.despesas ?? []
    const filtered = all.filter((d) => d.mes === reportMes && d.ano === reportAno)
    return {
      naoReembolsavel: filtered.filter((d) => !d.reembolsavel).reduce((s, d) => s + d.valor, 0),
      reembolsavel: filtered.filter((d) => d.reembolsavel).reduce((s, d) => s + d.valor, 0),
    }
  }

  function calcLocacaoFaxinaReceita(l: Locacao, property: { taxaLimpeza?: number } | undefined): number {
    if (l.faxinaStatus !== "agendada") return 0
    const taxaLimpeza = l.taxaLimpeza ?? property?.taxaLimpeza ?? 0
    if (l.faxinaPorMim) return taxaLimpeza
    return taxaLimpeza - (l.custoEmpresaFaxina ?? 0)
  }

  const totalLocacoes = useMemo(() => {
    return monthLocacoes.reduce((sum, l) => {
      const info = locacaoInfoMap.get(l.id)!
      const property = propertyMap.get(l.propriedadeId)
      const comissao = getLocacaoComissao(l, info.hasPayment)
      const faxina = info.hasFaxina ? calcLocacaoFaxinaReceita(l, property) : 0
      const { naoReembolsavel: despNaoReemb } = getLocacaoDespesas(l)
      return sum + comissao + faxina - despNaoReemb
    }, 0)
  }, [monthLocacoes, locacaoInfoMap, propertyMap])

  const filteredLines = useMemo(() => {
    let result = reportLines

    if (propertyFilter !== "todos") {
      result = result.filter((l) => l.propriedadeId === propertyFilter)
    }

    return result.sort((a, b) => a.dataLinha.localeCompare(b.dataLinha))
  }, [reportLines, propertyFilter])

  const grouped = useMemo(() => groupByProperty(filteredLines), [filteredLines])

  // Agrupar locações por propriedade
  const locacoesByProperty = useMemo(() => {
    const map = new Map<string, Locacao[]>()
    for (const l of monthLocacoes) {
      const list = map.get(l.propriedadeId) ?? []
      list.push(l)
      map.set(l.propriedadeId, list)
    }
    return map
  }, [monthLocacoes])

  const propertyIds = useMemo(() => {
    const ids = new Set([...grouped.keys(), ...locacoesByProperty.keys()])
    return Array.from(ids)
  }, [grouped, locacoesByProperty])

  const summaryTotals = useMemo(() => {
    let totalRecebido = 0
    let totalLiquido = 0
    let totalPago = 0
    let totalAReceber = 0
    let canceladas = 0
    const reservaIds = new Set<string>()
    for (const line of filteredLines) {
      totalRecebido += line.recebido
      totalLiquido += line.liquido
      if (line.isCancelada) {
        canceladas++
        if (line.recebido > 0) {
          totalPago += line.recebido
        }
      } else {
        reservaIds.add(line.reservation.id)
        if (line.reservation.pagamentoRecebido) {
          totalPago += line.recebido
        } else {
          totalAReceber += line.recebido
        }
      }
    }
    // Incluir locações nos totais (separando pago/a receber)
    let locacoesPago = 0
    let locacoesAReceber = 0
    for (const l of monthLocacoes) {
      const info = locacaoInfoMap.get(l.id)!
      const property = propertyMap.get(l.propriedadeId)
      const comissao = getLocacaoComissao(l, info.hasPayment)
      const bruto = getLocacaoBruto(l, info.hasPayment)
      const faxina = info.hasFaxina ? calcLocacaoFaxinaReceita(l, property) : 0
      const { naoReembolsavel: locDespNaoReemb } = getLocacaoDespesas(l)
      const locTotal = comissao + faxina - locDespNaoReemb
      if (locacaoRecebidoSet.has(l.id)) {
        locacoesPago += locTotal
      } else {
        locacoesAReceber += locTotal
      }
      // Líquido proprietário: bruto - comissão - despesas reembolsáveis
      const { reembolsavel: locDespReemb } = getLocacaoDespesas(l)
      totalLiquido += bruto - comissao - locDespReemb
    }
    totalRecebido += totalLocacoes
    totalPago += locacoesPago
    totalAReceber += locacoesAReceber

    return {
      totalRecebido,
      totalLiquido,
      totalPago,
      totalAReceber,
      numReservas: reservaIds.size,
      canceladas,
      totalLocacoes,
      numLocacoes: monthLocacoes.length,
    }
  }, [filteredLines, propertyMap, totalLocacoes, monthLocacoes, locacaoInfoMap, locacaoRecebidoSet])



  function handleOpenRecebidoDialog(reservation: Reservation) {
    setEditingRecebido(reservation)
    setCanceladaValor(reservation.valorRecebidoCancelamento ?? 0)
  }

  function handleSaveRecebido() {
    if (!editingRecebido) return
    updateReservation.mutate(
      { id: editingRecebido.id, data: { valorRecebidoCancelamento: canceladaValor || 0 } },
      {
        onSuccess: () => setEditingRecebido(null),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  function handleOpenLiquidoDialog(reservation: Reservation) {
    setEditingLiquido(reservation)
    setCanceladaLiquido(reservation.valorLiquidoCancelamento ?? 0)
  }

  function handleSaveLiquido() {
    if (!editingLiquido) return
    updateReservation.mutate(
      { id: editingLiquido.id, data: { valorLiquidoCancelamento: canceladaLiquido || 0 } },
      {
        onSuccess: () => setEditingLiquido(null),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-6">
      <TabNavigation tabs={[
        { label: "Recebimentos", to: "/relatorios" },
        { label: "Manutenções", to: "/relatorios/manutencoes" },
        { label: "Despesas", to: "/relatorios/despesas" },
      ]} />

      {/* Month navigation + property filter */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        <PropertyFilterSelect value={propertyFilter} onValueChange={setPropertyFilter} properties={properties} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard title="Recebido" value={formatCurrency(summaryTotals.totalPago)} valueClassName="text-green-600" />
        <SummaryCard title="Meu Total Líquido" value={formatCurrency(summaryTotals.totalRecebido)} />
        <SummaryCard title="Reservas no Período" value={summaryTotals.numReservas} />
        <SummaryCard title="A Receber" value={formatCurrency(summaryTotals.totalAReceber)} valueClassName={summaryTotals.totalAReceber > 0 ? "text-orange-600" : "text-muted-foreground"} />
        <SummaryCard title={propertyFilter === "todos" ? "Total Líquido Proprietários" : "Total Líquido Proprietário"} value={formatCurrency(summaryTotals.totalLiquido)} />
        <SummaryCard title="Reservas Canceladas" value={summaryTotals.canceladas} valueClassName={summaryTotals.canceladas > 0 ? "text-red-600" : "text-muted-foreground"} />
      </div>

      {/* Reservations grouped by property */}
      {propertyIds.map((propertyId) => {
        const property = propertyMap.get(propertyId)
        if (!property) return null

        const propLines = grouped.get(propertyId) || []
        const propLocacoes = locacoesByProperty.get(propertyId) ?? []
        const subtotalLocProp = propLocacoes.reduce((sum, l) => {
          const info = locacaoInfoMap.get(l.id)!
          const comissao = getLocacaoComissao(l, info.hasPayment)
          const faxina = info.hasFaxina ? calcLocacaoFaxinaReceita(l, propertyMap.get(l.propriedadeId)) : 0
          const despNaoReemb = (l.despesas ?? []).filter((d) => !d.reembolsavel).reduce((s, d) => s + d.valor, 0)
          return sum + comissao + faxina - despNaoReemb
        }, 0)
        const subtotalReservas = propLines.reduce((sum, l) => sum + l.recebido, 0) + subtotalLocProp
        const subtotalLiquido = propLines.reduce((sum, l) => sum + l.liquido, 0) + propLocacoes.reduce((sum, l) => {
            const info = locacaoInfoMap.get(l.id)!
            const bruto = getLocacaoBruto(l, info.hasPayment)
            const comissaoValor = getLocacaoComissao(l, info.hasPayment)
            const { reembolsavel: locDespReemb } = getLocacaoDespesas(l)
            return sum + bruto - comissaoValor - locDespReemb
          }, 0)
        const comissaoHeader = propLines.find((l) => !l.isCancelada)?.comissaoPercent ?? property.percentualComissao ?? 0

        return (
          <div key={propertyId} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{property.nome}</h3>
              <span className="text-sm text-muted-foreground">
                ({comissaoHeader}% comissão)
              </span>
            </div>

            <div className="rounded-lg border shadow-sm overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Hóspede</TableHead>
                    <TableHead className="whitespace-nowrap">Check-in</TableHead>
                    <TableHead className="whitespace-nowrap">Check-out</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Bruto</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Líquido</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Com. (%)</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Comissão</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Saldo Faxina</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Despesas</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Recebido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propLines.map((line) => {
                    const { reservation, isCancelada, isExtension } = line

                    return (
                      <TableRow
                        key={line.key}
                        className={`cursor-pointer hover:bg-muted/50 ${isCancelada ? "opacity-60" : ""} ${isExtension ? "bg-amber-50/70 dark:bg-amber-950/20" : ""}`}
                        onClick={() => navigate(`/reservas/${reservation.id}`)}
                      >
                        <TableCell className="font-medium w-[130px]">
                          <div className="flex items-center gap-2">
                            <span className="truncate block max-w-[100px]">{reservation.nomeHospede}</span>
                            {isExtension && (
                              <span className="shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                                EXTENSÃO
                              </span>
                            )}
                            {isCancelada && <ReservationStatusBadge status="cancelada" />}
                            {!isCancelada && !isExtension && reservation.pagamentoRecebido && <span className="text-green-600 text-xs">✓</span>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(line.dataLinha)}</TableCell>
                        <TableCell className="whitespace-nowrap">{line.dataOut ? formatDate(line.dataOut) : "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {line.bruto ? formatCurrency(line.bruto) : "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {isCancelada ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleOpenLiquidoDialog(reservation) }}
                            >
                              {line.liquido > 0 ? formatCurrency(line.liquido) : formatCurrency(0)}
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : formatCurrency(line.liquido)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada ? "—" : `${line.comissaoPercent}%`}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada ? "—" : formatCurrency(line.comissaoValor)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada || line.faxina === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="text-green-700">
                              +{formatCurrency(line.faxina)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelada || line.despesasNaoReemb === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className="text-red-600">−{formatCurrency(line.despesasNaoReemb)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {isCancelada ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleOpenRecebidoDialog(reservation) }}
                            >
                              {line.recebido > 0
                                ? formatCurrency(line.recebido)
                                : formatCurrency(0)}
                              <Pencil className="h-3 w-3" />
                            </button>
                          ) : (
                            formatCurrency(line.recebido)
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* Locações desta propriedade — fundo azul */}
                  {(locacoesByProperty.get(propertyId) ?? []).map((loc) => {
                    const info = locacaoInfoMap.get(loc.id)!
                    const bruto = getLocacaoBruto(loc, info.hasPayment)
                    const comissaoPercent = loc.percentualComissao ?? 0
                    const comissaoValor = getLocacaoComissao(loc, info.hasPayment)
                    const faxinaReceita = info.hasFaxina ? calcLocacaoFaxinaReceita(loc, property) : 0
                    const { naoReembolsavel: locDespNaoReemb, reembolsavel: locDespReemb } = getLocacaoDespesas(loc)
                    const liquido = bruto - comissaoValor - locDespReemb
                    const recebido = comissaoValor + faxinaReceita - locDespNaoReemb
                    return (
                      <TableRow
                        key={`loc-${loc.id}`}
                        className="cursor-pointer hover:bg-blue-200/80 bg-blue-100/70"
                        onClick={() => navigate(`/longatemporada/${loc.id}`)}
                      >
                        <TableCell className="font-medium w-[130px]">
                          <div className="flex items-center gap-2">
                            <KeyRound className="h-3 w-3 text-blue-600 shrink-0" />
                            <span className="truncate block max-w-[100px]">{loc.nomeCompleto}</span>
                            {locacaoRecebidoSet.has(loc.id) && <span className="text-green-600 text-xs">✓</span>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(loc.checkIn)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(loc.checkOut)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{bruto > 0 ? formatCurrency(bruto) : "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{bruto > 0 ? formatCurrency(liquido) : "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{info.hasPayment ? `${comissaoPercent}%` : "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{info.hasPayment ? formatCurrency(comissaoValor) : "—"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {faxinaReceita > 0 ? (
                            <span className="text-green-700">+{formatCurrency(faxinaReceita)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {locDespNaoReemb > 0 ? (
                            <span className="text-red-600">−{formatCurrency(locDespNaoReemb)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-semibold">{formatCurrency(recebido)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-1 sm:gap-6 pr-4">
              <p className="text-sm text-muted-foreground">
                Total Líquido Proprietário: {formatCurrency(subtotalLiquido)}
              </p>
              <p className="text-sm font-bold">
                Meu Total Líquido: {formatCurrency(subtotalReservas)}
              </p>
            </div>
          </div>
        )
      })}

      {propertyIds.length === 0 && monthLocacoes.length === 0 && !loadingReservations && (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma reserva ou locação encontrada para este período.
        </div>
      )}


      {/* Dialog - valor recebido cancelamento */}
      <Dialog open={!!editingRecebido} onOpenChange={(open) => !open && setEditingRecebido(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Valor recebido (cancelamento)</DialogTitle>
            <DialogDescription>
              {editingRecebido?.nomeHospede}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Valor recebido (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={canceladaValor ?? ""}
                onChange={(e) => setCanceladaValor(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecebido(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRecebido} disabled={updateReservation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - valor líquido cancelamento */}
      <Dialog open={!!editingLiquido} onOpenChange={(open) => !open && setEditingLiquido(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Valor líquido do proprietário (cancelamento)</DialogTitle>
            <DialogDescription>
              {editingLiquido?.nomeHospede}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Valor líquido (R$)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={canceladaLiquido ?? ""}
                onChange={(e) => setCanceladaLiquido(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLiquido(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLiquido} disabled={updateReservation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
