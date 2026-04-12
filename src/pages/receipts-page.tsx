import { useMemo, useState, useEffect } from "react"
import { endOfMonth, format } from "date-fns"
import { Download, Pencil, Check } from "lucide-react"
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
import { calcValorPagamento } from "@/lib/reservation-calculations"
import { toLocalDateStr } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { valorPorExtenso } from "@/lib/valor-por-extenso"

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

export function ReceiptsPage() {
  const { currentMonth, setCurrentMonth } = useRecibosMonthStore()
  const { proprietarios } = useProprietarioMap()
  const { properties, propertyMap } = usePropertyMap()
  const { data: allReservations = [] } = useReservations()
  const [selectedProprietarioId, setSelectedProprietarioId] = useState<string>("")

  const selectedProprietario = proprietarios.find((p) => p.id === selectedProprietarioId)

  const monthStart = format(currentMonth, "yyyy-MM-dd")
  const monthEndDate = endOfMonth(currentMonth)
  const monthEnd = format(monthEndDate, "yyyy-MM-dd")
  const mesNome = mesesExtenso[currentMonth.getMonth()]
  const ano = currentMonth.getFullYear()
  const ultimoDia = monthEndDate.getDate()

  const { rows, total, usedProperties } = useMemo(() => {
    if (!selectedProprietarioId) return { rows: [] as ReceiptRow[], total: 0, usedProperties: [] as { nome: string; endereco: string }[] }

    const propProperties = properties.filter((p) => p.proprietarioId === selectedProprietarioId)
    const propPropertyIds = new Set(propProperties.map((p) => p.id))
    const primeiroNome = selectedProprietario?.nomeCompleto.split(" ")[0]?.toUpperCase() ?? ""

    const receiptRows: ReceiptRow[] = []
    let totalSum = 0
    const usedPropertyIds = new Set<string>()

    for (const r of allReservations) {
      if (r.status === "cancelada") continue
      if (r.fonte !== "airbnb") continue
      if (!propPropertyIds.has(r.propriedadeId)) continue

      const paymentDateStr = addDaysToDateStr(toLocalDateStr(r.checkIn), 1)
      if (paymentDateStr < monthStart || paymentDateStr > monthEnd) continue

      const prop = propertyMap.get(r.propriedadeId)
      const valor = calcValorPagamento(r, prop)
      totalSum += valor
      usedPropertyIds.add(r.propriedadeId)

      receiptRows.push({
        local: prop?.nome ?? "",
        proprietaria: primeiroNome,
        hospede: r.nomeHospede.split(" ")[0]?.toUpperCase() ?? "",
        dataPagto: formatDateBR(paymentDateStr),
        mes: mesNome.toUpperCase(),
        ano,
        valor,
        status: r.pagamentoRecebido ? "OK" : "PENDENTE",
      })
    }

    receiptRows.sort((a, b) => a.dataPagto.localeCompare(b.dataPagto))

    const usedProps = propProperties
      .filter((p) => usedPropertyIds.has(p.id))
      .map((p) => ({ nome: p.nome, endereco: p.endereco }))

    return { rows: receiptRows, total: totalSum, usedProperties: usedProps }
  }, [selectedProprietarioId, properties, allReservations, currentMonth, propertyMap, selectedProprietario, monthStart, monthEnd, mesNome, ano])

  const descricaoImovelDefault = useMemo(() => {
    if (usedProperties.length === 0) return ""
    if (usedProperties.length === 1)
      return `do ${usedProperties[0].nome}, localizado na ${usedProperties[0].endereco}`
    return `dos imóveis: ${usedProperties.map((p) => `${p.nome}, localizado na ${p.endereco}`).join("; ")}`
  }, [usedProperties])

  const [descricaoImovel, setDescricaoImovel] = useState("")
  const [editandoDescricao, setEditandoDescricao] = useState(false)

  const storageKey = selectedProprietarioId
    ? `lox_recibo_desc_${selectedProprietarioId}`
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

  const textoRecibo = selectedProprietario && rows.length > 0
    ? `Eu ${ADMIN_NOME}, portadora do CPF nº ${ADMIN_CPF}, CRECI-SC nº ${ADMIN_CRECI}, recebi de ${selectedProprietario.nomeCompleto}, a importância de ${formatCurrency(total)} (${valorPorExtenso(total)}) referente a administração de locação de temporada ${descricaoImovel}.`
    : ""

  function exportPDF() {
    const doc = new jsPDF()

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
      const line = lines[i]
      const isLast = i === lines.length - 1 || line.trim() === "" || (lines[i + 1] != null && lines[i + 1].trim() === "")
      if (isLast || line.trim() === "") {
        // Última linha do parágrafo ou linha vazia: alinhamento esquerdo
        doc.text(line, 20, textY)
      } else {
        // Justificar: distribuir espaço extra entre palavras
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
    const tableTop = textY + 15
    const headers = ["LOCAL", "PROPRIETARIA", "HOSPEDE", "DATA PAGTO", "MES", "ANO", "VALOR", "STATUS"]
    const colWidths = [22, 24, 22, 22, 24, 14, 24, 18]
    const rowHeight = 8
    let x = 20

    // Header da tabela
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    for (let i = 0; i < headers.length; i++) {
      doc.rect(x, tableTop, colWidths[i], rowHeight)
      doc.text(headers[i], x + 1.5, tableTop + 5.5)
      x += colWidths[i]
    }

    // Linhas da tabela
    doc.setFont("helvetica", "normal")
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx]
      const y = tableTop + rowHeight * (rowIdx + 1)
      x = 20
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
        doc.rect(x, y, colWidths[i], rowHeight)
        doc.text(values[i], x + 1.5, y + 5.5)
        x += colWidths[i]
      }
    }

    // Rodapé
    const footerY = tableTop + rowHeight * (rows.length + 1) + 20
    doc.setFontSize(11)
    doc.text(`Florianopolis, ${ultimoDia} de ${mesNome} de ${ano}.`, 20, footerY)

    // Assinatura
    const sigY = footerY + 25
    doc.line(20, sigY, 90, sigY)
    doc.text(ADMIN_NOME, 20, sigY + 7)

    const mesFileName = mesNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const nomeProprietario = (selectedProprietario?.nomeCompleto.split(" ")[0] ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    doc.save(`recibo_${mesFileName}_${nomeProprietario}.pdf`)
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

        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        {rows.length > 0 && (
          <Button onClick={exportPDF} variant="outline" className="sm:ml-auto min-h-[44px]">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        )}
      </div>

      {!selectedProprietarioId && (
        <p className="text-muted-foreground text-sm">Selecione um proprietário para gerar o recibo.</p>
      )}

      {selectedProprietarioId && rows.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma reserva Airbnb encontrada para este proprietário no mês selecionado.</p>
      )}

      {rows.length > 0 && (
        <div className="rounded-lg border bg-white p-4 sm:p-8 shadow-sm max-w-4xl mx-auto space-y-6">
          {/* Título */}
          <h2 className="text-xl font-bold text-center underline">RECIBO</h2>

          {/* Texto */}
          <div className="relative">
            <p className="text-sm leading-relaxed text-justify">
              {`Eu ${ADMIN_NOME}, portadora do CPF nº ${ADMIN_CPF}, CRECI-SC nº ${ADMIN_CRECI}, recebi de ${selectedProprietario?.nomeCompleto}, a importância de ${formatCurrency(total)} (${valorPorExtenso(total)}) referente a administração de locação de temporada `}
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

          {/* Rodapé */}
          <p className="text-sm mt-8">
            Florianópolis, {ultimoDia} de {mesNome} de {ano}.
          </p>

          {/* Assinatura */}
          <div className="mt-10 w-48">
            <div className="border-t border-black" />
            <p className="text-sm mt-1">{ADMIN_NOME}</p>
          </div>
        </div>
      )}
    </div>
  )
}
