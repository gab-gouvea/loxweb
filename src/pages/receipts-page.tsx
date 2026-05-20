import { useMemo, useState, useEffect } from "react"
import { endOfMonth, endOfYear, startOfYear, addYears, subYears } from "date-fns"
import { Download, Pencil, Check, ChevronLeft, ChevronRight } from "lucide-react"
import jsPDF from "jspdf"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProprietarioMap } from "@/hooks/use-proprietario-map"
import { usePropertyMap } from "@/hooks/use-property-map"
import { useReservations } from "@/hooks/use-reservations"
import { useRecibosMonthStore } from "@/hooks/use-month-store"
import { calcValorRecibo } from "@/lib/reservation-calculations"
import { toLocalDateStr } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { valorPorExtenso } from "@/lib/valor-por-extenso"
import type { Property } from "@/types/property"
import type { Reservation } from "@/types/reservation"

// Dados da administradora
const ADMIN_NOME = "Fernanda Gouvea de Oliveira"
const ADMIN_CPF = "149.757.678-48"
const ADMIN_CRECI = "49596"

const mesesExtenso = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

interface ReceiptRow {
  local: string
  proprietaria: string
  hospede: string
  dataPagto: string
  mes: string
  ano: number
  valor: number
  status: string
}

interface ReceiptGroup {
  key: string
  propertyName: string | null
  rows: ReceiptRow[]
  total: number
  usedProperties: { nome: string; endereco: string }[]
}

type ViewMode = "mensal" | "anual"

export function ReceiptsPage() {
  const { currentMonth, setCurrentMonth } = useRecibosMonthStore()
  const { proprietarios } = useProprietarioMap()
  const { properties, propertyMap } = usePropertyMap()
  const { data: allReservations = [] } = useReservations()
  const [selectedProprietarioId, setSelectedProprietarioId] = useState<string>("")
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("todos")
  const [viewMode, setViewMode] = useState<ViewMode>("mensal")

  const selectedProprietario = proprietarios.find((p) => p.id === selectedProprietarioId)
  const isAnnual = viewMode === "anual"

  const propProperties = useMemo(
    () => properties.filter((p) => p.proprietarioId === selectedProprietarioId),
    [properties, selectedProprietarioId],
  )
  const hasMultipleProperties = propProperties.length > 1

  // Reset filtro de imóvel ao trocar de proprietário
  useEffect(() => {
    setSelectedPropertyId("todos")
  }, [selectedProprietarioId])

  const ano = currentMonth.getFullYear()
  const mesNome = mesesExtenso[currentMonth.getMonth()]
  const periodStart = isAnnual ? startOfYear(currentMonth) : currentMonth
  const periodEnd = isAnnual ? endOfYear(currentMonth) : endOfMonth(currentMonth)
  const periodStartStr = `${periodStart.getFullYear()}-${pad(periodStart.getMonth() + 1)}-${pad(periodStart.getDate())}`
  const periodEndStr = `${periodEnd.getFullYear()}-${pad(periodEnd.getMonth() + 1)}-${pad(periodEnd.getDate())}`
  const ultimoDia = isAnnual ? 31 : endOfMonth(currentMonth).getDate()
  const dataAssinaturaMes = isAnnual ? "Dezembro" : mesNome

  function buildGroup(
    key: string,
    propertyName: string | null,
    targetProperties: Property[],
    reservations: Reservation[],
  ): ReceiptGroup {
    const targetIds = new Set(targetProperties.map((p) => p.id))
    const primeiroNome = selectedProprietario?.nomeCompleto.split(" ")[0]?.toUpperCase() ?? ""
    const rows: ReceiptRow[] = []
    let total = 0
    const usedIds = new Set<string>()

    for (const r of reservations) {
      if (r.status === "cancelada") continue
      if (r.fonte !== "airbnb") continue
      if (!targetIds.has(r.propriedadeId)) continue

      const paymentDateStr = addDaysToDateStr(toLocalDateStr(r.checkIn), 1)
      if (paymentDateStr < periodStartStr || paymentDateStr > periodEndStr) continue

      const prop = propertyMap.get(r.propriedadeId)
      const valor = calcValorRecibo(r, prop)
      total += valor
      usedIds.add(r.propriedadeId)

      const mNum = Number(paymentDateStr.split("-")[1])

      rows.push({
        local: prop?.nome ?? "",
        proprietaria: primeiroNome,
        hospede: r.nomeHospede.split(" ")[0]?.toUpperCase() ?? "",
        dataPagto: formatDateBR(paymentDateStr),
        mes: mesesExtenso[mNum - 1].toUpperCase(),
        ano,
        valor,
        status: r.pagamentoRecebido ? "OK" : "PENDENTE",
      })
    }

    rows.sort((a, b) => {
      const [ad, am, ay] = a.dataPagto.split("/").map(Number)
      const [bd, bm, by] = b.dataPagto.split("/").map(Number)
      return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime()
    })

    const usedProperties = targetProperties
      .filter((p) => usedIds.has(p.id))
      .map((p) => ({ nome: p.nome, endereco: p.endereco }))

    return { key, propertyName, rows, total, usedProperties }
  }

  const groups = useMemo<ReceiptGroup[]>(() => {
    if (!selectedProprietarioId) return []

    const filtered = selectedPropertyId === "todos"
      ? propProperties
      : propProperties.filter((p) => p.id === selectedPropertyId)

    const shouldGroupByProperty = isAnnual && selectedPropertyId === "todos" && filtered.length > 1

    if (shouldGroupByProperty) {
      return filtered
        .map((prop) => buildGroup(prop.id, prop.nome, [prop], allReservations))
        .filter((g) => g.rows.length > 0)
    }

    const onlyName = filtered.length === 1 ? filtered[0].nome : null
    // Chave do localStorage: usa o id do imóvel quando filtrado, "todos" quando agrega
    // Isso garante que a descrição editada de cada imóvel fique isolada
    const singleKey = selectedPropertyId === "todos" ? "todos" : selectedPropertyId
    const single = buildGroup(singleKey, onlyName, filtered, allReservations)
    return single.rows.length > 0 ? [single] : []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedProprietarioId,
    selectedPropertyId,
    isAnnual,
    propProperties,
    allReservations,
    propertyMap,
    selectedProprietario,
    periodStartStr,
    periodEndStr,
    ano,
  ])

  // Edição da descrição do imóvel (uma chave por grupo dentro do proprietário)
  const [descricoes, setDescricoes] = useState<Record<string, string>>({})
  const [editandoKey, setEditandoKey] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedProprietarioId) {
      setDescricoes({})
      return
    }
    const next: Record<string, string> = {}
    for (const g of groups) {
      const storageKey = `lox_recibo_desc_${selectedProprietarioId}_${g.key}`
      const saved = localStorage.getItem(storageKey)
      const def = defaultDescricao(g.usedProperties)
      next[g.key] = saved ?? def
    }
    setDescricoes(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProprietarioId, groups.map((g) => g.key).join(","), groups.map((g) => g.usedProperties.map((p) => p.nome + p.endereco).join("|")).join("||")])

  function defaultDescricao(used: { nome: string; endereco: string }[]): string {
    if (used.length === 0) return ""
    if (used.length === 1) return `do ${used[0].nome}, localizado na ${used[0].endereco}`
    return `dos imóveis: ${used.map((p) => `${p.nome}, localizado na ${p.endereco}`).join("; ")}`
  }

  function salvarDescricao(key: string) {
    setEditandoKey(null)
    if (selectedProprietarioId) {
      localStorage.setItem(`lox_recibo_desc_${selectedProprietarioId}_${key}`, descricoes[key] ?? "")
    }
  }

  function buildTextoRecibo(group: ReceiptGroup): string {
    if (!selectedProprietario) return ""
    const periodoTxt = isAnnual ? `no exercício de ${ano}` : `referente ao mês de ${mesNome.toLowerCase()} de ${ano}`
    const desc = descricoes[group.key] ?? defaultDescricao(group.usedProperties)
    return `Eu ${ADMIN_NOME}, portadora do CPF nº ${ADMIN_CPF}, CRECI-SC nº ${ADMIN_CRECI}, recebi de ${selectedProprietario.nomeCompleto}, a importância de ${formatCurrency(group.total)} (${valorPorExtenso(group.total)}) ${periodoTxt} referente a administração de locação de temporada ${desc}.`
  }

  function exportGroupPDF(group: ReceiptGroup) {
    const doc = new jsPDF()
    const texto = buildTextoRecibo(group)
    const pageHeight = doc.internal.pageSize.getHeight()
    const bottomMargin = 20
    const topMarginNewPage = 25

    // Título
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("RECIBO", 105, 30, { align: "center" })
    doc.setLineWidth(0.5)
    doc.line(82, 32, 128, 32)

    // Texto (justificado manualmente)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    const maxWidth = 170
    const lines: string[] = doc.splitTextToSize(texto, maxWidth)
    const lineHeight = 6
    let textY = 50
    for (let i = 0; i < lines.length; i++) {
      if (textY + lineHeight > pageHeight - bottomMargin) {
        doc.addPage()
        textY = topMarginNewPage
      }
      const line = lines[i]
      const isLast = i === lines.length - 1 || line.trim() === "" || (lines[i + 1] != null && lines[i + 1].trim() === "")
      if (isLast || line.trim() === "") {
        doc.text(line, 20, textY)
      } else {
        const words = line.split(" ")
        if (words.length <= 1) {
          doc.text(line, 20, textY)
        } else {
          const lineWidth = doc.getTextWidth(line)
          const extraSpace = (maxWidth - lineWidth) / (words.length - 1)
          let curX = 20
          for (let w = 0; w < words.length; w++) {
            doc.text(words[w], curX, textY)
            curX += doc.getTextWidth(words[w]) + doc.getTextWidth(" ") + extraSpace
          }
        }
      }
      textY += lineHeight
    }

    // Tabela
    const headers = ["LOCAL", "PROPRIETARIA", "HOSPEDE", "DATA PAGTO", "MES", "ANO", "VALOR", "STATUS"]
    const colWidths = [22, 24, 22, 22, 24, 14, 24, 18]
    const rowHeight = 8

    let tableY = textY + 15
    if (tableY + rowHeight * 2 > pageHeight - bottomMargin) {
      doc.addPage()
      tableY = topMarginNewPage
    }

    function drawTableHeader(y: number) {
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      let hx = 20
      for (let i = 0; i < headers.length; i++) {
        doc.rect(hx, y, colWidths[i], rowHeight)
        doc.text(headers[i], hx + 1.5, y + 5.5)
        hx += colWidths[i]
      }
      doc.setFont("helvetica", "normal")
    }

    drawTableHeader(tableY)
    let rowY = tableY + rowHeight

    // Linhas da tabela
    for (let rowIdx = 0; rowIdx < group.rows.length; rowIdx++) {
      if (rowY + rowHeight > pageHeight - bottomMargin) {
        doc.addPage()
        rowY = topMarginNewPage
        drawTableHeader(rowY)
        rowY += rowHeight
      }
      const row = group.rows[rowIdx]
      let cx = 20
      const values = [
        row.local.substring(0, 12),
        row.proprietaria.substring(0, 12),
        row.hospede.substring(0, 12),
        row.dataPagto,
        row.mes,
        String(row.ano),
        formatCurrency(row.valor),
        row.status,
      ]
      for (let i = 0; i < values.length; i++) {
        doc.rect(cx, rowY, colWidths[i], rowHeight)
        doc.text(values[i], cx + 1.5, rowY + 5.5)
        cx += colWidths[i]
      }
      rowY += rowHeight
    }

    // Rodapé + assinatura precisam de ~52mm (20 gap + texto + 25 espaço + assinatura)
    const footerBlockHeight = 52
    let footerY = rowY + 20
    if (footerY + footerBlockHeight - 20 > pageHeight - bottomMargin) {
      doc.addPage()
      footerY = topMarginNewPage
    }
    doc.setFontSize(11)
    doc.text(`Florianopolis, ${ultimoDia} de ${dataAssinaturaMes} de ${ano}.`, 20, footerY)

    const sigY = footerY + 25
    doc.line(20, sigY, 90, sigY)
    doc.text(ADMIN_NOME, 20, sigY + 7)

    const periodoFile = isAnnual ? String(ano) : slugify(mesNome)
    const nomeProprietario = slugify(selectedProprietario?.nomeCompleto.split(" ")[0] ?? "")
    const imovelSuffix = group.propertyName ? `_${slugify(group.propertyName)}` : ""
    doc.save(`recibo_${periodoFile}_${nomeProprietario}${imovelSuffix}.pdf`)
  }

  function exportAllPDFs() {
    for (let i = 0; i < groups.length; i++) {
      // pequeno delay entre downloads para o navegador aceitar múltiplos arquivos
      setTimeout(() => exportGroupPDF(groups[i]), i * 250)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4">
        <Select value={selectedProprietarioId} onValueChange={setSelectedProprietarioId}>
          <SelectTrigger className="w-full sm:w-[280px] min-h-[44px]">
            <SelectValue placeholder="Selecione o proprietário" />
          </SelectTrigger>
          <SelectContent>
            {proprietarios.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nomeCompleto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasMultipleProperties && (
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-full sm:w-[220px] min-h-[44px]">
              <SelectValue placeholder="Imóvel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos imóveis</SelectItem>
              {propProperties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="inline-flex rounded-md border bg-background overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode("mensal")}
            className={`min-h-[44px] px-4 text-sm font-medium transition-colors ${viewMode === "mensal" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setViewMode("anual")}
            className={`min-h-[44px] px-4 text-sm font-medium transition-colors ${viewMode === "anual" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Anual
          </button>
        </div>

        {isAnnual ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[80px] text-center text-base sm:text-lg font-semibold">{ano}</h2>
            <Button
              variant="outline"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
        )}

        {groups.length > 0 && (
          <Button onClick={exportAllPDFs} variant="outline" className="sm:ml-auto min-h-[44px]">
            <Download className="mr-2 h-4 w-4" />
            {groups.length > 1 ? `Exportar ${groups.length} PDFs` : "Exportar PDF"}
          </Button>
        )}
      </div>

      {!selectedProprietarioId && (
        <p className="text-muted-foreground text-sm">Selecione um proprietário para gerar o recibo.</p>
      )}

      {selectedProprietarioId && groups.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma reserva Airbnb encontrada para este proprietário no período selecionado.
        </p>
      )}

      {groups.map((group) => {
        const desc = descricoes[group.key] ?? defaultDescricao(group.usedProperties)
        return (
          <div
            key={group.key}
            className="rounded-lg border bg-white p-4 sm:p-8 shadow-sm max-w-4xl mx-auto space-y-6"
          >
            {/* Cabeçalho do grupo (só quando agrupado por imóvel) */}
            {group.propertyName && groups.length > 1 && (
              <div className="flex items-center justify-between gap-3 pb-3 border-b">
                <h3 className="text-base font-semibold">{group.propertyName}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportGroupPDF(group)}
                  className="min-h-[36px]"
                >
                  <Download className="mr-2 h-3 w-3" />
                  PDF
                </Button>
              </div>
            )}

            {/* Título */}
            <h2 className="text-xl font-bold text-center underline">RECIBO</h2>

            {/* Texto */}
            <div className="relative">
              <p className="text-sm leading-relaxed text-justify">
                {`Eu ${ADMIN_NOME}, portadora do CPF nº ${ADMIN_CPF}, CRECI-SC nº ${ADMIN_CRECI}, recebi de ${selectedProprietario?.nomeCompleto}, a importância de ${formatCurrency(group.total)} (${valorPorExtenso(group.total)}) ${isAnnual ? `no exercício de ${ano}` : `referente ao mês de ${mesNome.toLowerCase()} de ${ano}`} referente a administração de locação de temporada `}
                {editandoKey === group.key ? (
                  <span className="inline-flex items-center gap-1">
                    <Textarea
                      value={desc}
                      onChange={(e) => setDescricoes((prev) => ({ ...prev, [group.key]: e.target.value }))}
                      className="inline text-sm min-h-[60px] w-full mt-1"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => salvarDescricao(group.key)}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </span>
                ) : (
                  <span className="inline">
                    {desc}.
                    <Button variant="ghost" size="icon" className="h-5 w-5 inline-flex ml-1 align-middle" onClick={() => setEditandoKey(group.key)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </span>
                )}
              </p>
            </div>

            {/* Tabela */}
            <div className="rounded border overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">LOCAL</TableHead>
                    <TableHead className="text-xs">PROPRIETÁRIA</TableHead>
                    <TableHead className="text-xs">HÓSPEDE</TableHead>
                    <TableHead className="text-xs">DATA PAGTO</TableHead>
                    <TableHead className="text-xs">MÊS</TableHead>
                    <TableHead className="text-xs">ANO</TableHead>
                    <TableHead className="text-xs">VALOR</TableHead>
                    <TableHead className="text-xs">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.local}</TableCell>
                      <TableCell className="text-xs">{row.proprietaria}</TableCell>
                      <TableCell className="text-xs">{row.hospede}</TableCell>
                      <TableCell className="text-xs">{row.dataPagto}</TableCell>
                      <TableCell className="text-xs">{row.mes}</TableCell>
                      <TableCell className="text-xs">{row.ano}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(row.valor)}</TableCell>
                      <TableCell className="text-xs">{row.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Rodapé */}
            <p className="text-sm mt-8">
              Florianópolis, {ultimoDia} de {dataAssinaturaMes} de {ano}.
            </p>

            {/* Assinatura */}
            <div className="mt-10 w-48">
              <div className="border-t border-black" />
              <p className="text-sm mt-1">{ADMIN_NOME}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
