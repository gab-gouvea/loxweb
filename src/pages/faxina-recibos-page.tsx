import { useMemo, useState, useEffect } from "react"
import { endOfMonth, endOfYear, startOfYear, addYears, subYears } from "date-fns"
import { Download, Pencil, Check, ChevronLeft, ChevronRight } from "lucide-react"
import jsPDF from "jspdf"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { TabNavigation } from "@/components/shared/tab-navigation"
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
import { useLocacoes } from "@/hooks/use-locacoes"
import { useFaxinaRecibosMonthStore } from "@/hooks/use-month-store"
import { toLocalDateStr } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { valorPorExtenso } from "@/lib/valor-por-extenso"

// Dados da empresa de faxina (hardcoded)
const EMPRESA_RESPONSAVEL = "Carolina Bugmann Yanes"
const EMPRESA_NOME = "Bela Faxina"
const EMPRESA_CNPJ = "50.764.417/0001-07"

// Dados da contratante (Fernanda — admin do sistema)
const CONTRATANTE_NOME = "Fernanda Gouvea de Oliveira"
const CONTRATANTE_CPF = "149.757.678-48"
const CONTRATANTE_CRECI = "49596"

const mesesExtenso = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

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

type ViewMode = "mensal" | "anual"

export function FaxinaRecibosPage() {
  const { currentMonth, setCurrentMonth } = useFaxinaRecibosMonthStore()
  const { proprietarioMap } = useProprietarioMap()
  const { properties, propertyMap } = usePropertyMap()
  const { data: allReservations = [] } = useReservations()
  const { data: allLocacoes = [] } = useLocacoes()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
  const [viewMode, setViewMode] = useState<ViewMode>("mensal")

  const isAnnual = viewMode === "anual"
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId)

  const ano = currentMonth.getFullYear()
  const mesNome = mesesExtenso[currentMonth.getMonth()]
  const periodStart = isAnnual ? startOfYear(currentMonth) : currentMonth
  const periodEnd = isAnnual ? endOfYear(currentMonth) : endOfMonth(currentMonth)
  const periodStartStr = `${periodStart.getFullYear()}-${pad(periodStart.getMonth() + 1)}-${pad(periodStart.getDate())}`
  const periodEndStr = `${periodEnd.getFullYear()}-${pad(periodEnd.getMonth() + 1)}-${pad(periodEnd.getDate())}`
  const ultimoDia = isAnnual ? 31 : endOfMonth(currentMonth).getDate()
  const dataAssinaturaMes = isAnnual ? "Dezembro" : mesNome

  const { rows, total } = useMemo(() => {
    if (!selectedPropertyId) return { rows: [] as ReceiptRow[], total: 0 }

    const property = propertyMap.get(selectedPropertyId)
    const proprietario = property?.proprietarioId
      ? proprietarioMap.get(property.proprietarioId)
      : undefined
    const propProprietariaNome = proprietario?.nomeCompleto.split(" ")[0]?.toUpperCase() ?? ""

    const receiptRows: ReceiptRow[] = []
    let totalSum = 0

    // Reservas com faxina terceirizada paga no período
    for (const r of allReservations) {
      if (r.status === "cancelada") continue
      if (r.propriedadeId !== selectedPropertyId) continue
      if (r.faxinaPorMim !== false) continue
      if (r.faxinaStatus !== "agendada") continue
      if (!r.faxinaPaga) continue
      const valor = r.custoEmpresaFaxina ?? 0
      if (valor <= 0) continue

      const baseDate = r.faxinaData
        ? toLocalDateStr(r.faxinaData)
        : toLocalDateStr(r.checkOut)
      if (baseDate < periodStartStr || baseDate > periodEndStr) continue

      const mNum = Number(baseDate.split("-")[1])
      totalSum += valor

      receiptRows.push({
        local: property?.nome ?? "",
        proprietaria: propProprietariaNome,
        hospede: r.nomeHospede.split(" ")[0]?.toUpperCase() ?? "",
        dataPagto: formatDateBR(baseDate),
        mes: mesesExtenso[mNum - 1].toUpperCase(),
        ano,
        valor,
        status: "OK",
      })
    }

    // Locações com faxina terceirizada paga no período
    for (const l of allLocacoes) {
      if (l.propriedadeId !== selectedPropertyId) continue
      if (l.faxinaPorMim !== false) continue
      if (l.faxinaStatus !== "agendada") continue
      if (!l.faxinaPaga) continue
      const valor = l.custoEmpresaFaxina ?? 0
      if (valor <= 0) continue

      const baseDate = l.faxinaData
        ? toLocalDateStr(l.faxinaData)
        : toLocalDateStr(l.checkOut)
      if (baseDate < periodStartStr || baseDate > periodEndStr) continue

      const mNum = Number(baseDate.split("-")[1])
      totalSum += valor

      receiptRows.push({
        local: property?.nome ?? "",
        proprietaria: propProprietariaNome,
        hospede: l.nomeCompleto.split(" ")[0]?.toUpperCase() ?? "",
        dataPagto: formatDateBR(baseDate),
        mes: mesesExtenso[mNum - 1].toUpperCase(),
        ano,
        valor,
        status: "OK",
      })
    }

    receiptRows.sort((a, b) => {
      const [ad, am, ay] = a.dataPagto.split("/").map(Number)
      const [bd, bm, by] = b.dataPagto.split("/").map(Number)
      return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime()
    })

    return { rows: receiptRows, total: totalSum }
  }, [
    selectedPropertyId,
    allReservations,
    allLocacoes,
    propertyMap,
    proprietarioMap,
    periodStartStr,
    periodEndStr,
    ano,
  ])

  const descricaoImovelDefault = useMemo(() => {
    if (!selectedProperty) return ""
    return `do ${selectedProperty.nome}, localizado na ${selectedProperty.endereco}`
  }, [selectedProperty])

  const [descricaoImovel, setDescricaoImovel] = useState("")
  const [editandoDescricao, setEditandoDescricao] = useState(false)

  const storageKey = selectedPropertyId
    ? `lox_faxina_recibo_desc_${selectedPropertyId}`
    : ""

  useEffect(() => {
    if (!storageKey) return
    const saved = localStorage.getItem(storageKey)
    setDescricaoImovel(saved ?? descricaoImovelDefault)
  }, [storageKey, descricaoImovelDefault])

  function salvarDescricao() {
    setEditandoDescricao(false)
    if (storageKey) {
      localStorage.setItem(storageKey, descricaoImovel)
    }
  }

  const periodoTxt = isAnnual ? `no exercício de ${ano}` : `referente ao mês de ${mesNome.toLowerCase()} de ${ano}`
  const textoRecibo = selectedProperty && rows.length > 0
    ? `Eu ${EMPRESA_RESPONSAVEL} responsável pela Empresa ${EMPRESA_NOME}, CNPJ ${EMPRESA_CNPJ}, recebi de ${CONTRATANTE_NOME}, portadora do CPF nº ${CONTRATANTE_CPF}, CRECI-SC nº ${CONTRATANTE_CRECI}, a importância de ${formatCurrency(total)} (${valorPorExtenso(total)}) ${periodoTxt} referente a limpeza pós hospedagem ${descricaoImovel}.`
    : ""

  function exportPDF() {
    const doc = new jsPDF()
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
    const lines: string[] = doc.splitTextToSize(textoRecibo, maxWidth)
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

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      if (rowY + rowHeight > pageHeight - bottomMargin) {
        doc.addPage()
        rowY = topMarginNewPage
        drawTableHeader(rowY)
        rowY += rowHeight
      }
      const row = rows[rowIdx]
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

    // Rodapé + assinatura precisam de espaço (gap + texto + assinatura ~ 32mm)
    const footerBlockHeight = 32
    let footerY = rowY + 20
    if (footerY + footerBlockHeight > pageHeight - bottomMargin) {
      doc.addPage()
      footerY = topMarginNewPage
    }
    doc.setFontSize(11)
    doc.text(`Florianopolis, ${ultimoDia} de ${dataAssinaturaMes} de ${ano}.`, 20, footerY)

    // Assinatura (Empresa de faxina)
    const sigY = footerY + 25
    doc.line(20, sigY, 90, sigY)
    doc.text(EMPRESA_RESPONSAVEL, 20, sigY + 7)

    const periodoFile = isAnnual ? String(ano) : slugify(mesNome)
    const imovelSlug = slugify(selectedProperty?.nome ?? "")
    doc.save(`recibo_faxina_${periodoFile}_${imovelSlug}.pdf`)
  }

  return (
    <div className="space-y-6">
      <TabNavigation tabs={[
        { label: "Faxinas", to: "/faxina-terceirizada" },
        { label: "Pagamentos", to: "/faxina-terceirizada/pagamentos" },
        { label: "Recibos", to: "/faxina-terceirizada/recibos" },
      ]} />

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-full sm:w-[280px] min-h-[44px]">
            <SelectValue placeholder="Selecione o imóvel" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        {rows.length > 0 && (
          <Button onClick={exportPDF} variant="outline" className="sm:ml-auto min-h-[44px]">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        )}
      </div>

      {!selectedPropertyId && (
        <p className="text-muted-foreground text-sm">Selecione um imóvel para gerar o recibo.</p>
      )}

      {selectedPropertyId && rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhuma faxina terceirizada paga encontrada para este imóvel no período selecionado.
        </p>
      )}

      {rows.length > 0 && (
        <div className="rounded-lg border bg-white p-4 sm:p-8 shadow-sm max-w-4xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-center underline">RECIBO</h2>

          <div className="relative">
            <p className="text-sm leading-relaxed text-justify">
              {`Eu ${EMPRESA_RESPONSAVEL} responsável pela Empresa ${EMPRESA_NOME}, CNPJ ${EMPRESA_CNPJ}, recebi de ${CONTRATANTE_NOME}, portadora do CPF nº ${CONTRATANTE_CPF}, CRECI-SC nº ${CONTRATANTE_CRECI}, a importância de ${formatCurrency(total)} (${valorPorExtenso(total)}) ${periodoTxt} referente a limpeza pós hospedagem `}
              {editandoDescricao ? (
                <span className="inline-flex items-center gap-1">
                  <Textarea
                    value={descricaoImovel}
                    onChange={(e) => setDescricaoImovel(e.target.value)}
                    className="inline text-sm min-h-[60px] w-full mt-1"
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={salvarDescricao}>
                    <Check className="h-3 w-3" />
                  </Button>
                </span>
              ) : (
                <span className="inline">
                  {descricaoImovel}.
                  <Button variant="ghost" size="icon" className="h-5 w-5 inline-flex ml-1 align-middle" onClick={() => setEditandoDescricao(true)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </span>
              )}
            </p>
          </div>

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
                {rows.map((row, i) => (
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

          <p className="text-sm mt-8">
            Florianópolis, {ultimoDia} de {dataAssinaturaMes} de {ano}.
          </p>

          <div className="mt-10 w-48">
            <div className="border-t border-black" />
            <p className="text-sm mt-1">{EMPRESA_RESPONSAVEL}</p>
          </div>
        </div>
      )}
    </div>
  )
}
