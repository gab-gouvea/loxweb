import { useState, useMemo, useEffect } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { ArrowLeft, Download, Pencil, Save } from "lucide-react"
import { format, parseISO, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import jsPDF from "jspdf"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useLocacao } from "@/hooks/use-locacoes"
import { usePropertyMap } from "@/hooks/use-property-map"
import { useProprietarioMap } from "@/hooks/use-proprietario-map"
import { formatCpf, formatCurrency } from "@/lib/constants"
import { toLocalDateStr } from "@/lib/date-utils"
import { valorPorExtenso } from "@/lib/valor-por-extenso"

const STORAGE_KEY_PREFIX = "lox_contrato_clausulas_"

const estadoCivilLabels: Record<string, string> = {
  solteiro: "solteiro(a)",
  casado: "casado(a)",
  divorciado: "divorciado(a)",
  viuvo: "viúvo(a)",
  separado: "separado(a)",
  uniao_estavel: "em união estável",
}

const garantiaLabels: Record<string, string> = {
  caucao: "Caução",
  seguro_fianca: "Seguro Fiança",
}

function getDefaultClausulas() {
  return [
    {
      titulo: "DO OBJETO",
      texto: "CLÁUSULA PRIMEIRA: Locação para temporada de imóvel, no prazo determinado, mediante pagamento de aluguel devido a LOCADORA pela LOCATÁRIA, ambas qualificadas, tudo conforme especificado no quadro constante na página inicial, o quais ajustam e contratam, mediante as seguintes cláusulas e condições estabelecidas no presente contrato expresso.",
    },
    {
      titulo: "DO PRAZO",
      texto: "CLÁUSULA SEGUNDA: A locação tem início e término conforme acordado no quadro constante na primeira página do presente contrato tendo o valor da locação sido livremente ajustado em razão desse período integral, com condições comerciais especiais.\n\nPARÁGRAFO ÚNICO: Haverá uma tolerância de até 01 (uma) hora após o horário de saída estabelecido. Ultrapassado esse período, será aplicada multa diária correspondente a 10% (dez por cento) do valor do aluguel mensal, por cada dia de permanência indevida no imóvel, independentemente do número de horas de atraso dentro do mesmo dia, em razão dos transtornos operacionais e do impedimento de nova ocupação do imóvel. Persistindo a ocupação após esse prazo, o LOCADOR poderá adotar as medidas legais cabíveis para retomada do imóvel.",
    },
    {
      titulo: "DO PREÇO E DO PAGAMENTO",
      texto: "CLÁUSULA TERCEIRA: A LOCATÁRIA pagará pela locação a importância estabelecida na página inicial.\n\nPARÁGRAFO PRIMEIRO: O valor da locação foi livremente ajustado em razão do período integral, considerando-se condições comerciais especiais e o bloqueio do imóvel para uso exclusivo da LOCATÁRIA durante todo esse período, razão pela qual, em caso de rescisão antecipada por iniciativa da LOCATÁRIA, por qualquer motivo, não haverá direito a reembolso, abatimento ou compensação de valores, permanecendo devido o valor total contratado, ressalvado apenas o caso de infração contratual imputável à LOCADORA.\n\nPARÁGRAFO SEGUNDO: O pagamento deverá ser feito através de DEPÓSITO ou TRANSFERÊNCIA BANCÁRIA.",
    },
    {
      titulo: "DO CONSUMO DE ÁGUA E ENERGIA ELÉTRICA",
      texto: "CLÁUSULA QUARTA: O valor da locação inclui um limite mensal de consumo de até R$300,00 (trezentos reais) para energia elétrica e R$150,00 (cento e cinquenta reais) para água. Caso o consumo mensal ultrapasse esses limites, a diferença será integralmente de responsabilidade da LOCATÁRIA, devendo ser paga mediante apresentação das respectivas faturas ou demonstrativo de consumo. A LOCADORA poderá efetuar a cobrança da diferença durante a vigência do contrato ou, se pendente, no encerramento da locação, podendo o valor devido ser descontado do caução, se houver saldo pendente.",
    },
    {
      titulo: "DO IMÓVEL: CONSERVAÇÃO, OCUPAÇÃO, VISTORIA E ENTREGA DAS CHAVES",
      texto: "CLÁUSULA QUINTA: A LOCATÁRIA deve manter o imóvel, as instalações sanitárias e elétricas, fechos, vidros, torneiras, ralos, pisos e calçadas, bem como os demais móveis e utensílios em perfeito estado de conservação e em boas condições de higiene para assim restituí-los quando findo ou rescindido este contrato, no estado constante na vistoria recebida em vídeo juntamente com as instruções de check-in.\n\nCLÁUSULA SEXTA: Os eletrodomésticos, equipamentos e aparelhos do imóvel são entregues em pleno funcionamento, conforme vistoria. A LOCATÁRIA não será responsabilizada por falhas ou defeitos decorrentes de desgaste natural, tempo de uso, maresia, umidade ou vida útil do equipamento, desde que não haja indícios de mau uso, negligência, impacto, violação, queda de energia provocada por equipamentos da LOCATÁRIA ou qualquer outra conduta que tenha causado ou agravado o dano.\n\nPARÁGRAFO PRIMEIRO: Se a LOCATÁRIA der falta de algum objeto quando da conferência da listagem ou divergir da vistoria, deverá comunicar imediatamente à LOCADORA.\n\nPARÁGRAFO SEGUNDO: Será cobrada uma taxa de limpeza no valor descrito no quadro inicial a ser paga pela LOCATÁRIA.\n\nPARÁGRAFO TERCEIRO: DA LIMPEZA PERIÓDICA OBRIGATÓRIA — Em razão da duração da estadia, a LOCATÁRIA obriga-se a contratar, obrigatoriamente, serviço profissional de limpeza do imóvel periodicamente, durante todo o período da locação, como condição essencial para a manutenção da higiene, conservação e preservação do imóvel. A limpeza deverá ser realizada exclusivamente pela equipe indicada pela LOCADORA. O pagamento deverá ser efetuado diretamente à prestadora de serviço indicada pela LOCADORA, conforme datas previamente agendadas.\n\nPARÁGRAFO QUARTO: É vedado à LOCATÁRIA a troca do segredo das fechaduras. Qualquer evento que ocorra que se faça necessária a troca de tal segredo, deverá ser comunicado à LOCADORA e só poderá ser efetuado mediante autorização expressa. No caso de perda ou extravio das chaves, será cobrado a cópia da LOCATÁRIA.\n\nPARÁGRAFO QUINTO: A LOCADORA não se responsabilizará por objetos ou utensílios deixados ou colocados pela LOCATÁRIA no imóvel locado.\n\nCLAUSULA SÉTIMA: É permitida a permanência no imóvel no número máximo de pessoas determinadas e identificadas no quadro inicial.",
    },
    {
      titulo: "DA DESOCUPAÇÃO E ENTREGA",
      texto: "CLÁUSULA OITAVA: Após cumpridos todos os procedimentos de pagamentos e assinatura do contrato, a LOCADORA informará à LOCATÁRIA, no dia da sua chegada, as instruções de check-in e informações úteis da acomodação.\n\nCLÁUSULA NONA: Na desocupação, a LOCATÁRIA deverá entregar as chaves no dia e horário agendado, no imóvel, para a realização de vistoria de saída.\n\nPARÁGRAFO PRIMEIRO: Eventuais danos ao imóvel serão apontados na vistoria final, a ser realizada preferencialmente, mas não obrigatoriamente, no momento de devolução do imóvel. Caso não ocorra no momento de entrega do imóvel, a LOCADORA terá um prazo de 72 horas úteis para fazer a vistoria final.\n\nPARÁGRAFO SEGUNDO: Caso a vistoria final aponte a necessidade de reparos, reformas ou reposição de objetos, tais valores serão deduzidos da garantia ofertada pela LOCATÁRIA. Caso o valor supere a garantia, a LOCATÁRIA será informada por e-mail e deverá efetuar o depósito da diferença na conta bancária que realizou a reserva, sob pena de acréscimo de multa referente a um terço do valor total da locação e execução judicial da dívida reconhecidamente líquida e certa.\n\nPARÁGRAFO TERCEIRO – DA DEVOLUÇÃO DO CAUÇÃO: Concluída a vistoria final e, não havendo necessidade de realização de reparos que demandem orçamento, o saldo remanescente da caução será devolvido à LOCATÁRIA no prazo máximo de 5 (cinco) dias úteis, mediante transferência bancária para a conta por ela informada.\n\nPARÁGRAFO QUARTO: Caso esse prazo seja ultrapassado sem justificativa, o valor devido passará a ser corrigido por juros de mora de 1% (um por cento) ao mês, calculados pro rata die, até a efetiva devolução.\n\nPARÁGRAFO QUINTO: Toda a bagagem e objetos pertencentes à LOCATÁRIA deverão ser retirados no dia da desocupação. Caso permaneçam bens no imóvel, a LOCADORA notificará a LOCATÁRIA, que terá o prazo de até 2 (dois) dias corridos para providenciar a retirada. Findo esse prazo, a LOCADORA poderá dar a destinação que entender adequada aos objetos remanescentes, sem qualquer responsabilidade.",
    },
    {
      titulo: "DAS DISPOSIÇÕES GERAIS",
      texto: "CLÁUSULA DÉCIMA: Não será permitida a transferência deste contrato, nem a sublocação, cessão ou empréstimo total ou parcial do imóvel locado, sem a prévia autorização por escrito da LOCADORA.\n\nFica eleito o foro da Comarca da Capital/SC para todas as questões oriundas do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que for.\n\nE, por estarem de pleno acordo, as partes assinam o presente CONTRATO DE LOCAÇÃO DE TEMPORADA que é celebrado de forma eletrônica, com plena validade jurídica, nos termos da legislação vigente, e será disponibilizado às partes contratantes por meio digital, servindo cada cópia como original para todos os fins de direito juntamente com 2 (duas) testemunhas.",
    },
  ]
}

export function LocacaoContratoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: locacao, isLoading } = useLocacao(id!)
  const { propertyMap } = usePropertyMap()
  const { proprietarioMap } = useProprietarioMap()

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState("")

  // Carregar cláusulas do localStorage ou usar default
  const storageKey = `${STORAGE_KEY_PREFIX}${id}`
  const [clausulas, setClausulas] = useState(getDefaultClausulas)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try { setClausulas(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [storageKey])

  function saveClausulas(updated: typeof clausulas) {
    setClausulas(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  function handleSaveClausula() {
    if (editingIndex === null) return
    const updated = [...clausulas]
    updated[editingIndex] = { ...updated[editingIndex], texto: editText }
    saveClausulas(updated)
    setEditingIndex(null)
  }

  const property = locacao ? propertyMap.get(locacao.propriedadeId) : undefined
  const proprietario = property?.proprietarioId ? proprietarioMap.get(property.proprietarioId) : undefined

  const contratoData = useMemo(() => {
    if (!locacao || !property) return null

    const checkInDate = toLocalDateStr(locacao.checkIn)
    const checkOutDate = toLocalDateStr(locacao.checkOut)
    const dias = differenceInDays(parseISO(checkOutDate), parseISO(checkInDate))

    const valorBruto = locacao.tipoPagamento === "avista"
      ? (locacao.valorTotal ?? 0)
      : (locacao.valorMensal ?? 0)
    const valorLabel = locacao.tipoPagamento === "avista" ? "TOTAL DA TEMPORADA" : "VALOR MENSAL"
    const taxaLimpeza = property.taxaLimpeza ?? 0

    return {
      // Locadora (proprietária)
      locadoraNome: proprietario?.nomeCompleto ?? "—",
      locadoraCpf: proprietario?.cpf ? formatCpf(proprietario.cpf) : "—",
      locadoraProfissao: proprietario?.profissao ?? "—",
      locadoraEstadoCivil: proprietario?.estadoCivil ? estadoCivilLabels[proprietario.estadoCivil] ?? proprietario.estadoCivil : "—",
      locadoraEndereco: proprietario?.endereco ?? "—",
      // Locatária (inquilina)
      locatariaNome: locacao.nomeCompleto,
      locatariaCpf: locacao.cpf ? formatCpf(locacao.cpf) : "—",
      locatariaProfissao: locacao.profissao ?? "—",
      locatariaEstadoCivil: locacao.estadoCivil ? estadoCivilLabels[locacao.estadoCivil] ?? locacao.estadoCivil : "—",
      locatariaEndereco: locacao.endereco ?? "—",
      // Imóvel
      imovelEndereco: property.endereco ?? "—",
      imovelNome: property.nome,
      // Datas
      checkIn: format(parseISO(checkInDate), "dd/MM/yyyy"),
      checkOut: format(parseISO(checkOutDate), "dd/MM/yyyy"),
      dias,
      // Valores
      valorBruto,
      valorLabel,
      valorFormatado: formatCurrency(valorBruto),
      valorExtenso: valorPorExtenso(valorBruto),
      taxaLimpeza: formatCurrency(taxaLimpeza),
      // Garantia
      garantia: locacao.garantia ? garantiaLabels[locacao.garantia] ?? locacao.garantia : "—",
      // Moradores
      numMoradores: locacao.numMoradores ?? 1,
      // Pagamento
      tipoPagamento: locacao.tipoPagamento === "avista" ? "À Vista" : "Mensal",
    }
  }, [locacao, property, proprietario])

  function exportPDF() {
    if (!contratoData || !locacao) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    let y = 25

    function checkPage(needed: number) {
      if (y + needed > 270) {
        doc.addPage()
        y = 25
      }
    }

    // Título
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("CONTRATO DE LOCAÇÃO DE TEMPORADA", pageWidth / 2, y, { align: "center" })
    y += 15

    // Locadora
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const locadoraText = `${contratoData.locadoraNome}, ${contratoData.locadoraEstadoCivil}, ${contratoData.locadoraProfissao}, inscrita no CPF sob o nº ${contratoData.locadoraCpf}, residente e domiciliado na ${contratoData.locadoraEndereco}, doravante denominado LOCADORA.`
    const locadoraLines = doc.splitTextToSize(locadoraText, maxWidth)
    doc.text(locadoraLines, margin, y)
    y += locadoraLines.length * 5 + 5

    // Locatária
    const locatariaText = `${contratoData.locatariaNome}, ${contratoData.locatariaEstadoCivil}, ${contratoData.locatariaProfissao}, inscrito no CPF sob o nº ${contratoData.locatariaCpf}, residente e domiciliado(a) na ${contratoData.locatariaEndereco}, doravante denominada LOCATÁRIA.`
    const locatariaLines = doc.splitTextToSize(locatariaText, maxWidth)
    doc.text(locatariaLines, margin, y)
    y += locatariaLines.length * 5 + 8

    // Objeto
    doc.setFont("helvetica", "bold")
    doc.text("OBJETO: ", margin, y)
    doc.setFont("helvetica", "normal")
    const objetoText = `LOCAÇÃO RESIDENCIAL PARA TEMPORADA DO IMÓVEL localizado na ${contratoData.imovelEndereco}. INCLUI MÓVEIS E UTENSÍLIOS em perfeitas condições de funcionamento.`
    const objetoLines = doc.splitTextToSize(objetoText, maxWidth - 18)
    doc.text(objetoLines, margin + 18, y)
    y += objetoLines.length * 5 + 5

    // Dados resumo
    doc.setFont("helvetica", "normal")
    const resumoLines = [
      `FINALIDADE RESIDENCIAL: Lazer`,
      `PRAZO: ${contratoData.dias} DIAS, ENTRADA: Dia ${contratoData.checkIn} às 16h, SAÍDA: ${contratoData.checkOut} às 10h`,
      `VALOR DO ALUGUEL e ENCARGOS*:`,
      `${contratoData.valorLabel}: ${contratoData.valorFormatado} (${contratoData.valorExtenso})`,
      `LIMPEZA: ${contratoData.taxaLimpeza}`,
      `(*) ENCARGOS INCLUSOS: internet e IPTU`,
      `Água e luz inclusos até os limites mensais previstos neste contrato`,
      `Garantia: ${contratoData.garantia}`,
      `NÚMERO MÁXIMO DE PESSOAS: ${contratoData.numMoradores}`,
    ]
    for (const line of resumoLines) {
      checkPage(6)
      const isLabel = line.startsWith("VALOR") || line.startsWith("PRAZO") || line.startsWith("NÚMERO") || line.startsWith("Garantia")
      doc.setFont("helvetica", isLabel ? "bold" : "normal")
      const wrapped = doc.splitTextToSize(line, maxWidth)
      doc.text(wrapped, margin, y)
      y += wrapped.length * 5
    }
    y += 3

    // Observações
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    const obs = "Obs.: - É obrigatória a apresentação de documento de cada menor que se hospedar junto com seus pais ou responsáveis legais. - Não é permitido fumar no interior do imóvel. - Horário habitual de entrada, às 16h e saída, às 10h. Exceções deverão ser combinadas com antecedência mínima de 24 horas. - O LOCADOR fornecerá itens de cama, mesa e banho."
    const obsLines = doc.splitTextToSize(obs, maxWidth)
    checkPage(obsLines.length * 4)
    doc.text(obsLines, margin, y)
    y += obsLines.length * 4 + 5

    // Pelo presente instrumento...
    doc.setFontSize(9)
    doc.setFont("helvetica", "italic")
    const peloPresente = "Pelo presente instrumento particular de contrato de locação de imóvel para temporada, que entre si fazem a LOCADORA e LOCATÁRIA acima qualificadas, ajustam e contratam, mediante as seguintes cláusulas e condições"
    const ppLines = doc.splitTextToSize(peloPresente, maxWidth)
    checkPage(ppLines.length * 4.5)
    doc.text(ppLines, margin, y)
    y += ppLines.length * 4.5 + 8

    // Cláusulas
    for (const clausula of clausulas) {
      checkPage(20)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(clausula.titulo, margin, y)
      y += 7

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      const paragrafos = clausula.texto.split("\n")
      for (const paragrafo of paragrafos) {
        if (!paragrafo.trim()) { y += 3; continue }
        const lines = doc.splitTextToSize(paragrafo, maxWidth)
        checkPage(lines.length * 4.5 + 2)
        doc.text(lines, margin, y)
        y += lines.length * 4.5 + 2
      }
      y += 5
    }

    // Assinaturas
    checkPage(60)
    y += 10
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    doc.text(`Florianópolis, ${hoje}.`, margin, y)
    y += 20

    // Linhas de assinatura
    doc.line(margin, y, margin + 70, y)
    doc.text(contratoData.locadoraNome, margin, y + 5)
    doc.text(`CPF: ${contratoData.locadoraCpf}`, margin, y + 10)

    doc.line(pageWidth - margin - 70, y, pageWidth - margin, y)
    doc.text(contratoData.locatariaNome, pageWidth - margin - 70, y + 5)
    doc.text(`CPF: ${contratoData.locatariaCpf}`, pageWidth - margin - 70, y + 10)

    y += 25
    checkPage(20)
    doc.line(margin, y, margin + 60, y)
    doc.text("TESTEMUNHA", margin, y + 5)

    doc.line(pageWidth - margin - 60, y, pageWidth - margin, y)
    doc.text("TESTEMUNHA", pageWidth - margin - 60, y + 5)

    const nomeArquivo = `contrato_${locacao.nomeCompleto.split(" ")[0].toLowerCase()}_${property?.nome?.split(" ")[0].toLowerCase() ?? "imovel"}.pdf`
    doc.save(nomeArquivo)
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/longatemporada")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">{locacao.nomeCompleto}</h1>
        </div>
        <Button onClick={exportPDF} disabled={!contratoData}>
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b">
        <Link
          to={`/longatemporada/${id}`}
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Detalhes
        </Link>
        <span className="pb-2 text-sm font-medium border-b-2 border-primary">
          Contrato
        </span>
      </div>

      {/* Preview do contrato */}
      {contratoData && (
        <div className="max-w-3xl space-y-0">
          {/* Título */}
          <h2 className="text-lg font-bold text-center py-3 border border-b-0">CONTRATO DE LOCAÇÃO DE TEMPORADA</h2>

          {/* Locadora */}
          <div className="border p-3 text-sm">
            <span className="font-bold">{contratoData.locadoraNome.toUpperCase()}</span>, {contratoData.locadoraEstadoCivil}, {contratoData.locadoraProfissao}, inscrita no CPF sob o nº {contratoData.locadoraCpf}, residente e domiciliado na {contratoData.locadoraEndereco}, doravante denominado LOCADORA.
          </div>

          {/* Locatária */}
          <div className="border border-t-0 p-3 text-sm">
            <span className="font-bold">{contratoData.locatariaNome.toUpperCase()}</span>, {contratoData.locatariaEstadoCivil}, {contratoData.locatariaProfissao}, inscrito no CPF sob o nº {contratoData.locatariaCpf}, residente e domiciliado(a) na {contratoData.locatariaEndereco}, doravante denominada LOCATÁRIA.
          </div>

          {/* Objeto */}
          <div className="border border-t-0 p-3 text-sm">
            <span className="font-bold">OBJETO: LOCAÇÃO RESIDENCIAL PARA TEMPORADA DO IMÓVEL</span> localizado na {contratoData.imovelEndereco}. INCLUI MÓVEIS E UTENSÍLIOS em perfeitas condições de funcionamento.
          </div>

          {/* Finalidade */}
          <div className="border border-t-0 p-3 text-sm">
            <span className="font-bold">FINALIDADE RESIDENCIAL:</span> Lazer
          </div>

          {/* Prazo */}
          <div className="border border-t-0 p-3 text-sm">
            <span className="font-bold">PRAZO:</span> {contratoData.dias} DIAS, ENTRADA: Dia {contratoData.checkIn} às 16h, SAÍDA: {contratoData.checkOut} às 10h
          </div>

          {/* Valor */}
          <div className="border border-t-0 p-3 text-sm space-y-1">
            <p><span className="font-bold">VALOR DO ALUGUEL e ENCARGOS*:</span></p>
            <p><span className="font-bold">{contratoData.valorLabel}:</span> {contratoData.valorFormatado}</p>
            <p><span className="font-bold">LIMPEZA:</span> {contratoData.taxaLimpeza}</p>
            <p><span className="font-bold">(*) ENCARGOS INCLUSOS: internet e IPTU</span></p>
            <p><span className="font-bold">Água e luz inclusos até os limites mensais previstos neste contrato</span></p>
          </div>

          {/* Garantia */}
          <div className="border border-t-0 p-3 text-sm">
            <span className="font-bold">Garantia: {contratoData.garantia}</span>
          </div>

          {/* Moradores + Pessoas autorizadas */}
          <div className="border border-t-0 p-3 text-sm space-y-2">
            <p>NÚMERO MÁXIMO DE PESSOAS: {contratoData.numMoradores}.</p>
            <p>PESSOAS AUTORIZADAS:</p>
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr>
                  <th className="border p-1.5 text-left font-semibold">Nome Ocupante</th>
                  <th className="border p-1.5 text-left font-semibold">CPF</th>
                  <th className="border p-1.5 text-left font-semibold">Data de Nascimento</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-1.5">{contratoData.locatariaNome}</td>
                  <td className="border p-1.5">{contratoData.locatariaCpf}</td>
                  <td className="border p-1.5">{locacao?.dataNascimento ? format(parseISO(locacao.dataNascimento), "dd/MM/yyyy") : "—"}</td>
                </tr>
                <tr><td className="border p-1.5">&nbsp;</td><td className="border p-1.5"></td><td className="border p-1.5"></td></tr>
                <tr><td className="border p-1.5">&nbsp;</td><td className="border p-1.5"></td><td className="border p-1.5"></td></tr>
              </tbody>
            </table>
          </div>

          {/* Observações */}
          <div className="border border-t-0 p-3 text-sm">
            <p>Obs.: - É obrigatória a apresentação de documento de cada menor que se hospedar junto com seus pais ou responsáveis legais. - <span className="font-bold underline">Não</span> é permitido fumar no interior do imóvel. Animais de estimação de médio a pequeno porte autorizados: [ ] SIM [ ] NÃO - Horário habitual de entrada, às 16h e saída, às 10h. Exceções deverão ser combinadas com antecedência mínima de 24 horas. - O LOCADOR fornecerá itens de cama, mesa e banho.</p>
          </div>

          {/* Pelo presente instrumento */}
          <div className="pt-4 pb-2 text-sm">
            <p>Pelo presente instrumento particular de contrato de locação de imóvel para temporada, que entre si fazem a LOCADORA e LOCATÁRIA acima qualificadas, ajustam e contratam, mediante as seguintes cláusulas e condições</p>
          </div>

          <hr />

          {/* Cláusulas editáveis */}
          {clausulas.map((clausula, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{clausula.titulo}</h3>
                {editingIndex !== i && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => { setEditingIndex(i); setEditText(clausula.texto) }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
              {editingIndex === i ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={8}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveClausula}>
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{clausula.texto}</p>
              )}
            </div>
          ))}

          <hr />

          {/* Assinaturas */}
          <div className="space-y-8 pt-4">
            <p className="text-sm">Florianópolis, {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.</p>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <div className="border-b border-black w-full" />
                <p className="text-sm font-semibold">{contratoData.locadoraNome}</p>
                <p className="text-xs text-muted-foreground">CPF: {contratoData.locadoraCpf}</p>
              </div>
              <div className="space-y-1">
                <div className="border-b border-black w-full" />
                <p className="text-sm font-semibold">{contratoData.locatariaNome}</p>
                <p className="text-xs text-muted-foreground">CPF: {contratoData.locatariaCpf}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <div className="border-b border-black w-full" />
                <p className="text-xs text-muted-foreground">TESTEMUNHA</p>
              </div>
              <div className="space-y-1">
                <div className="border-b border-black w-full" />
                <p className="text-xs text-muted-foreground">TESTEMUNHA</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
