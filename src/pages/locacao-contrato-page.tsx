import { useState, useMemo, useEffect, useRef, Fragment } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { toast } from "sonner"
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
const TESTEMUNHAS_KEY_PREFIX = "lox_contrato_testemunhas_"
const QUADRO_KEY_PREFIX = "lox_contrato_quadro_"
const MORADORES_KEY_PREFIX = "lox_contrato_moradores_"

interface PessoaAutorizada {
  nome: string
  cpf: string
  dataNascimento: string
}

interface MoradoresData {
  maxPessoas: number
  pessoas: PessoaAutorizada[]
}

interface Testemunha {
  nome: string
  cpf: string
}

const DEFAULT_TESTEMUNHAS: [Testemunha, Testemunha] = [
  { nome: "Fernanda Gouvea de Oliveira", cpf: "149.757.678-48" },
  { nome: "", cpf: "" },
]

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

interface Clausula {
  titulo: string
  texto: string
}

interface ContratoData {
  locadoraNome: string
  locadoraCpf: string
  locadoraProfissao: string
  locadoraEstadoCivil: string
  locadoraEndereco: string
  locatariaNome: string
  locatariaCpf: string
  locatariaProfissao: string
  locatariaEstadoCivil: string
  locatariaEndereco: string
  imovelEndereco: string
  imovelNome: string
  checkIn: string
  checkOut: string
  dias: number
  valorBruto: number
  valorLabel: string
  valorFormatado: string
  valorExtenso: string
  taxaLimpezaNum: number
  taxaLimpeza: string
  garantia: string
  numMoradores: number
  tipoPagamento: string
}

// ==================== TEXT RENDERING HELPERS (HTML) ====================

function renderBoldMarkers(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

function renderClauseTextJsx(text: string) {
  return text.split("\n").map((line, idx) => {
    if (!line.trim()) return <div key={idx} className="h-2" />

    // CLÁUSULA prefix → bold + underline
    const cm = line.match(/^(CL[ÁA]USULA\s+[\wÀ-ÿ]+(?:\s*[–-]\s*[^:]+)?:)\s*/)
    if (cm) {
      return (
        <p key={idx} className="text-justify">
          <strong className="underline">{cm[1]}</strong>{" "}
          {renderBoldMarkers(line.slice(cm[0].length))}
        </p>
      )
    }

    // PARÁGRAFO prefix → bold (handles both "PARÁGRAFO X:" and "PARÁGRAFO X -")
    const pm = line.match(/^(PAR[ÁA]GRAFO\s+[\wÀ-ÿ]+\s*[–-]\s*[A-ZÁÀÂÃÊÍÓÔÕÚÇ][A-ZÁÀÂÃÊÍÓÔÕÚÇ\s]+:|PAR[ÁA]GRAFO\s+[\wÀ-ÿ]+:|PAR[ÁA]GRAFO\s+[\wÀ-ÿ]+\s*[–-])\s*/)
    if (pm) {
      return (
        <p key={idx} className="text-justify">
          <strong>{pm[1]}</strong>{" "}
          {renderBoldMarkers(line.slice(pm[0].length))}
        </p>
      )
    }

    return <p key={idx} className="text-justify">{renderBoldMarkers(line)}</p>
  })
}

// ==================== PDF TEXT RENDERING HELPERS ====================

type PdfSeg = { text: string; bold: boolean; underline?: boolean }

function parsePdfSegments(line: string): PdfSeg[] {
  const segs: PdfSeg[] = []
  let rest = line

  // CLÁUSULA prefix
  const cm = rest.match(/^(CL[ÁA]USULA\s+[\wÀ-ÿ]+(?:\s*[–-]\s*[^:]+)?:)\s*/)
  if (cm) {
    segs.push({ text: cm[1], bold: true, underline: true })
    rest = rest.slice(cm[0].length)
  } else {
    // PARÁGRAFO prefix (handles both "PARÁGRAFO X:" and "PARÁGRAFO X -")
    const pm = rest.match(/^(PAR[ÁA]GRAFO\s+[\wÀ-ÿ]+\s*[–-]\s*[A-ZÁÀÂÃÊÍÓÔÕÚÇ][A-ZÁÀÂÃÊÍÓÔÕÚÇ\s]+:|PAR[ÁA]GRAFO\s+[\wÀ-ÿ]+:|PAR[ÁA]GRAFO\s+[\wÀ-ÿ]+\s*[–-])\s*/)
    if (pm) {
      segs.push({ text: pm[1], bold: true })
      rest = rest.slice(pm[0].length)
    }
  }

  // Parse **bold** markers in remaining text
  rest.split(/(\*\*[^*]+\*\*)/g).forEach((part) => {
    if (!part) return
    if (part.startsWith("**") && part.endsWith("**")) {
      segs.push({ text: part.slice(2, -2), bold: true })
    } else {
      segs.push({ text: part, bold: false })
    }
  })

  return segs
}

function pdfRenderSegments(
  doc: jsPDF,
  segs: PdfSeg[],
  x: number,
  y: number,
  maxW: number,
  lh: number,
): number {
  let cx = x
  let cy = y

  for (const seg of segs) {
    doc.setFont("helvetica", seg.bold ? "bold" : "normal")
    const words = seg.text.split(/\s+/).filter(Boolean)
    for (const w of words) {
      const ww = doc.getTextWidth(w)
      const sp = cx > x ? doc.getTextWidth(" ") : 0
      if (cx + sp + ww > x + maxW && cx > x) {
        cx = x
        cy += lh
      }
      const dx = cx > x ? cx + sp : cx
      doc.text(w, dx, cy)
      if (seg.underline) {
        doc.line(dx, cy + 0.5, dx + ww, cy + 0.5)
      }
      cx = dx + ww
    }
  }

  return cy + lh
}

// ==================== DEFAULT CLAUSES ====================

function getDefaultClausulas(data?: ContratoData | null): Clausula[] {
  const checkIn = data?.checkIn ?? "[data check-in]"
  const valorF = data?.valorFormatado ?? "R$ [valor]"
  const taxaF = data?.taxaLimpeza ?? "R$ [limpeza]"
  const totalF = data ? formatCurrency(data.valorBruto + data.taxaLimpezaNum) : "R$ [total]"
  const dias = data?.dias ?? "[X]"
  const locadoraNome = data?.locadoraNome?.toUpperCase() ?? "[LOCADORA]"

  return [
    {
      titulo: "DO OBJETO",
      texto: "CLÁUSULA PRIMEIRA: Locação para temporada de imóvel, no prazo determinado, mediante pagamento de aluguel devido a LOCADORA pela LOCATÁRIA, ambas qualificadas, tudo conforme especificado no quadro constante na página inicial, o quais ajustam e contratam, mediante as seguintes cláusulas e condições estabelecidas no presente contrato expresso.",
    },
    {
      titulo: "DO PRAZO",
      texto: `CLÁUSULA SEGUNDA: A locação tem início e término conforme acordado no quadro constante na primeira página do presente contrato tendo o valor da locação sido livremente ajustado em razão desse período integral, com condições comerciais especiais.\n\nPARÁGRAFO ÚNICO: Haverá uma tolerância de até **01 (uma) hora** após o horário de saída estabelecido. Ultrapassado esse período, será aplicada **multa diária correspondente a 10% (dez por cento) do valor do aluguel mensal**, por **cada dia de permanência indevida no imóvel**, independentemente do número de horas de atraso dentro do mesmo dia, em razão dos transtornos operacionais e do impedimento de nova ocupação do imóvel. Persistindo a ocupação após esse prazo, o LOCADOR poderá adotar as medidas legais cabíveis para retomada do imóvel.`,
    },
    {
      titulo: "DO PREÇO E DO PAGAMENTO",
      texto: `CLÁUSULA TERCEIRA: A LOCATÁRIA pagará pela locação a importância estabelecida na pagina inicial conforme fluxo abaixo:\n\n**DATA/VALOR:**\n\n**[data] (assinatura do contrato): R$ [valor] Caução**\n\n**${checkIn} (antes do check-in): ${valorF} + ${taxaF} (taxa de limpeza final) = ${totalF}**\n\nPARÁGRAFO PRIMEIRO: O valor da locação foi livremente ajustado em razão do período integral de ${dias} dias, considerando-se condições comerciais especiais e o bloqueio do imóvel para uso exclusivo da LOCATÁRIA durante todo esse período, razão pela qual, em caso de rescisão antecipada por iniciativa da LOCATÁRIA, por qualquer motivo, não haverá direito a reembolso, abatimento ou compensação de valores, permanecendo devido o valor total contratado, ressalvado apenas o caso de infração contratual imputável à LOCADORA.\n\nPARÁGRAFO SEGUNDO: O pagamento deverá ser feito através de DEPÓSITO ou TRANSFERÊNCIA BANCÁRIA na conta corrente especificada abaixo:\n\n**[BANCO], AG [XXXX], C.C: [XXXXXXX-X] em nome de ${locadoraNome}**`,
    },
    {
      titulo: "DO CONSUMO DE ÁGUA E ENERGIA ELÉTRICA",
      texto: `CLÁUSULA QUARTA – DO CONSUMO DE ÁGUA E ENERGIA ELÉTRICA:\nO valor da locação inclui um limite mensal de consumo de até R$300,00 (trezentos reais) para energia elétrica e R$150,00 (cento e cinquenta reais) para água. Caso o consumo mensal ultrapasse esses limites, a diferença será integralmente de responsabilidade da LOCATÁRIA, devendo ser paga mediante apresentação das respectivas faturas ou demonstrativo de consumo. A LOCADORA poderá efetuar a cobrança da diferença durante a vigência do contrato ou, se pendente, no encerramento da locação, podendo o valor devido ser descontado do caução, se houver saldo pendente.`,
    },
    {
      titulo: "DO IMÓVEL: CONSERVAÇÃO, OCUPAÇÃO, VISTORIA E ENTREGA DAS CHAVES",
      texto: `CLÁUSULA QUINTA: A LOCATÁRIA deve manter o imóvel, as instalações sanitárias e elétricas, fechos, vidros, torneiras, ralos, pisos e calçadas, bem como os demais móveis e utensílios em perfeito estado de conservação e em boas condições de higiene para assim restituí-los quando findo ou rescindido este contrato, no estado constante na vistoria recebida em vídeo juntamente com as instruções de check-in.\n\nCLÁUSULA SEXTA: Os eletrodomésticos, equipamentos e aparelhos do imóvel são entregues em pleno funcionamento, conforme vistoria. A LOCATÁRIA não será responsabilizada por falhas ou defeitos decorrentes de desgaste natural, tempo de uso, maresia, umidade ou vida útil do equipamento, desde que não haja indícios de mau uso, negligência, impacto, violação, queda de energia provocada por equipamentos da LOCATÁRIA ou qualquer outra conduta que tenha causado ou agravado o dano\n\nPARÁGRAFO PRIMEIRO: Se a LOCATÁRIA der falta de algum objeto quando da conferência da listagem ou divergir da vistoria, deverá comunicar imediatamente à LOCADORA.\n\nPARÁGRAFO SEGUNDO: Será cobrada uma taxa de limpeza no valor descrito no quadro inicial a ser paga pela LOCATÁRIA, conforme fluxo da Cláusula Terceira.\n\nPARÁGRAFO TERCEIRO: **DA LIMPEZA PERIÓDICA OBRIGATÓRIA** Em razão da duração da estadia, a LOCATÁRIA obriga-se a contratar, obrigatoriamente, serviço profissional de limpeza do imóvel periodicamente, durante todo o período da locação, como condição essencial para a manutenção da higiene, conservação e preservação do imóvel.\n\n**A limpeza deverá ser realizada exclusivamente pela equipe indicada pela LOCADORA, pelos valores abaixo estabelecidos, os quais permanecerão fixos e inalterados durante toda a vigência do contrato:**\n\nI – R$280,00 (duzentos e oitenta reais) por limpeza completa, incluindo lavagem e troca das roupas de cama e toalhas; ou\n\nII – R$220,00 (duzentos e vinte reais) por limpeza do imóvel, sem lavagem das roupas de cama e toalhas.\n\nO pagamento deverá ser efetuado diretamente à prestadora de serviço indicada pela LOCADORA, conforme datas previamente agendadas.\n\nNa hipótese de não pagamento, total ou parcial, a LOCADORA fica desde já autorizada a realizar o desconto correspondente do valor do caução, sem prejuízo de outras medidas previstas neste contrato.\n\nPARÁGRAFO QUARTO: É vedado à LOCATÁRIA a troca do segredo das fechaduras. Qualquer evento que ocorra que se faça necessária a troca de tal segredo, deverá ser comunicado à LOCADORA e só poderá ser efetuado mediante autorização expressa. No caso de perda ou extravio das chaves, será cobrado a cópia da LOCATÁRIA.\n\nPARÁGRAFO QUINTO: A LOCADORA não se responsabilizará por objetos ou utensílios deixados ou colocados pela LOCATÁRIA no imóvel locado.\n\nCLAUSULA SÉTIMA: É permitida a permanência no imóvel no número máximo de pessoas determinadas e identificadas no quadro inicial.`,
    },
    {
      titulo: "DA DESOCUPAÇÃO E ENTREGA",
      texto: `CLÁUSULA OITAVA: Após cumpridos todos os procedimentos de pagamentos e assinatura do contrato, a LOCADORA informará à LOCATÁRIA, no dia da sua chegada, as instruções de check-in e informações úteis da acomodação.\n\nCLÁUSULA NONA: Na desocupação, a LOCATÁRIA deverá entregar as chaves no dia e horário agendado, no imóvel, para a realização de vistoria de saída.\n\nPARÁGRAFO PRIMEIRO: Eventuais danos ao imóvel serão apontados na vistoria final, a ser realizada preferencialmente, mas não obrigatoriamente, no momento de devolução do imóvel. Caso não ocorra no momento de entrega do imóvel, a LOCADORA terá um prazo de 72 horas úteis para fazer a vistoria final.\n\nPARÁGRAFO SEGUNDO - Caso a vistoria final aponte a necessidade de reparos, reformas ou reposição de objetos, tais valores serão deduzidos da garantia ofertada pela LOCATÁRIA. Caso o valor supere a garantia, a LOCATÁRIA será informada por e-mail e deverá efetuar o depósito da diferença na conta bancária que realizou a reserva, sob pena de acréscimo de multa referente a um terço do valor total da locação e execução judicial da dívida reconhecidamente líquida e certa.\n\nPARÁGRAFO TERCEIRO – DA DEVOLUÇÃO DO CAUÇÃO: Concluída a vistoria final e, não havendo necessidade de realização de reparos que demandem orçamento, o saldo remanescente da caução será devolvido à LOCATÁRIA no prazo máximo de 5 (cinco) dias úteis, mediante transferência bancária para a conta por ela informada.\n\nPARÁGRAFO QUARTO - Caso esse prazo seja ultrapassado sem justificativa, o valor devido passará a ser corrigido por juros de mora de 1% (um por cento) ao mês, calculados pro rata die, até a efetiva devolução\n\nPARÁGRAFO QUINTO - Toda a bagagem e objetos pertencentes à LOCATÁRIA deverão ser retirados no dia da desocupação. Caso permaneçam bens no imóvel, a LOCADORA notificará a LOCATÁRIA, que terá o prazo de até 2 (dois) dias corridos para providenciar a retirada. Findo esse prazo, a LOCADORA poderá dar a destinação que entender adequada aos objetos remanescentes, sem qualquer responsabilidade.`,
    },
    {
      titulo: "DAS DISPOSIÇÕES GERAIS",
      texto: `CLÁUSULA DÉCIMA: Não será permitida a transferência deste contrato, nem a sublocação, cessão ou empréstimo total ou parcial do imóvel locado, sem a prévia autorização por escrito da LOCADORA.\n\nFica eleito o foro da Comarca da Capital/SC para todas as questões oriundas do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que for.\n\nE, por estarem de pleno acordo, as partes assinam o presente CONTRATO DE LOCAÇÃO DE TEMPORADA que é celebrado de forma eletrônica, com plena validade jurídica, nos termos da legislação vigente, e será disponibilizado às partes contratantes por meio digital, servindo cada cópia como original para todos os fins de direito juntamente com 2 (duas) testemunhas.`,
    },
  ]
}

// ==================== COMPONENT ====================

export function LocacaoContratoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: locacao, isLoading } = useLocacao(id!)
  const { propertyMap } = usePropertyMap()
  const { proprietarioMap } = useProprietarioMap()

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState("")

  const storageKey = `${STORAGE_KEY_PREFIX}${id}`
  const testemunhasKey = `${TESTEMUNHAS_KEY_PREFIX}${id}`
  const quadroKey = `${QUADRO_KEY_PREFIX}${id}`
  const moradoresKey = `${MORADORES_KEY_PREFIX}${id}`
  const [savedClausulas, setSavedClausulas] = useState<Clausula[] | null>(null)
  const [testemunhas, setTestemunhas] = useState<[Testemunha, Testemunha]>(DEFAULT_TESTEMUNHAS)
  const [savedQuadro, setSavedQuadro] = useState<(string | null)[]>(Array(8).fill(null))
  const [editingQuadroIdx, setEditingQuadroIdx] = useState<number | null>(null)
  const [editQuadroText, setEditQuadroText] = useState("")
  const [moradoresData, setMoradoresData] = useState<MoradoresData | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        setSavedClausulas(JSON.parse(saved))
      } catch { /* ignore */ }
    }
    const savedTest = localStorage.getItem(testemunhasKey)
    if (savedTest) {
      try {
        setTestemunhas(JSON.parse(savedTest))
      } catch { /* ignore */ }
    }
    const savedQ = localStorage.getItem(quadroKey)
    if (savedQ) {
      try {
        setSavedQuadro(JSON.parse(savedQ))
      } catch { /* ignore */ }
    }
    const savedM = localStorage.getItem(moradoresKey)
    if (savedM) {
      try {
        setMoradoresData(JSON.parse(savedM))
      } catch { /* ignore */ }
    }
    loadedRef.current = true
  }, [storageKey, testemunhasKey, quadroKey, moradoresKey])

  function updateTestemunha(index: 0 | 1, field: "nome" | "cpf", value: string) {
    const updated = [...testemunhas] as [Testemunha, Testemunha]
    updated[index] = { ...updated[index], [field]: value }
    setTestemunhas(updated)
    localStorage.setItem(testemunhasKey, JSON.stringify(updated))
  }

  const property = locacao ? propertyMap.get(locacao.propriedadeId) : undefined
  const proprietario = property?.proprietarioId ? proprietarioMap.get(property.proprietarioId) : undefined

  const contratoData = useMemo((): ContratoData | null => {
    if (!locacao || !property) return null

    const checkInDate = toLocalDateStr(locacao.checkIn)
    const checkOutDate = toLocalDateStr(locacao.checkOut)
    const dias = differenceInDays(parseISO(checkOutDate), parseISO(checkInDate))

    const meses = Math.ceil(dias / 30)
    const valorBruto = locacao.tipoPagamento === "avista"
      ? (locacao.valorTotal ?? 0)
      : (locacao.valorMensal ?? 0) * meses
    const valorLabel = "TOTAL DA TEMPORADA"
    const taxaLimpezaNum = property.taxaLimpeza ?? 0

    return {
      locadoraNome: proprietario?.nomeCompleto ?? "—",
      locadoraCpf: proprietario?.cpf ? formatCpf(proprietario.cpf) : "—",
      locadoraProfissao: proprietario?.profissao ?? "—",
      locadoraEstadoCivil: proprietario?.estadoCivil ? estadoCivilLabels[proprietario.estadoCivil] ?? proprietario.estadoCivil : "—",
      locadoraEndereco: proprietario?.endereco ?? "—",
      locatariaNome: locacao.nomeCompleto,
      locatariaCpf: locacao.cpf ? formatCpf(locacao.cpf) : "—",
      locatariaProfissao: locacao.profissao ?? "—",
      locatariaEstadoCivil: locacao.estadoCivil ? estadoCivilLabels[locacao.estadoCivil] ?? locacao.estadoCivil : "—",
      locatariaEndereco: locacao.endereco ?? "—",
      imovelEndereco: property.endereco ?? "—",
      imovelNome: property.nome,
      checkIn: format(parseISO(checkInDate), "dd/MM/yyyy"),
      checkOut: format(parseISO(checkOutDate), "dd/MM/yyyy"),
      dias,
      valorBruto,
      valorLabel,
      valorFormatado: formatCurrency(valorBruto),
      valorExtenso: valorPorExtenso(valorBruto),
      taxaLimpezaNum,
      taxaLimpeza: formatCurrency(taxaLimpezaNum),
      garantia: locacao.garantia ? garantiaLabels[locacao.garantia] ?? locacao.garantia : "—",
      numMoradores: locacao.numMoradores ?? 1,
      tipoPagamento: locacao.tipoPagamento === "avista" ? "À Vista" : "Mensal",
    }
  }, [locacao, property, proprietario])

  const clausulas = savedClausulas ?? getDefaultClausulas(contratoData)

  function saveClausulas(updated: Clausula[]) {
    setSavedClausulas(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  function handleSaveClausula() {
    if (editingIndex === null) return
    const updated = [...clausulas]
    updated[editingIndex] = { ...updated[editingIndex], texto: editText }
    saveClausulas(updated)
    setEditingIndex(null)
  }

  // ==================== QUADRO EDITABLE SECTIONS ====================
  // 0: Locadora, 1: Locatária, 2: Objeto, 3: Finalidade, 4: Prazo, 5: Valor, 6: Garantia, 7: Obs

  function getQuadroDefault(idx: number): string {
    if (!contratoData || !locacao) return ""
    const d = contratoData
    const dataNasc = locacao.dataNascimento ? format(parseISO(locacao.dataNascimento), "dd/MM/yyyy") : "—"
    switch (idx) {
      case 0: return `**${d.locadoraNome.toUpperCase()}**, Brasileira, ${d.locadoraEstadoCivil}, ${d.locadoraProfissao}, inscrita no CPF sob o nº ${d.locadoraCpf}, residente e domiciliado na ${d.locadoraEndereco}, doravante denominado LOCADORA.`
      case 1: return `**${d.locatariaNome.toUpperCase()}**, brasileira, ${d.locatariaEstadoCivil}, ${d.locatariaProfissao}, inscrito no CPF sob o nº ${d.locatariaCpf}, residente e domiciliado(a) na ${d.locatariaEndereco}, doravante denominada LOCATÁRIA.`
      case 2: return `**OBJETO: LOCAÇÃO RESIDENCIAL PARA TEMPORADA DO IMÓVEL** localizado na ${d.imovelEndereco}. **INCLUI MÓVEIS E UTENSÍLIOS em perfeitas condições de funcionamento.**`
      case 3: return `**FINALIDADE RESIDENCIAL:** Lazer`
      case 4: return `**PRAZO:** ${d.dias} DIAS, ENTRADA: Dia ${d.checkIn} às 16h, SAÍDA: ${d.checkOut} às 10h`
      case 5: return `**VALOR DO ALUGUEL e ENCARGOS*:**\n**${d.valorLabel}:** ${d.valorFormatado}\n**LIMPEZA:** ${d.taxaLimpeza}\n**(*) ENCARGOS INCLUSOS: internet e IPTU**\n**Água e luz inclusos até os limites mensais previstos neste contrato**`
      case 6: return `**Garantia: ${d.garantia}**`
      case 7: return `Obs.: - É obrigatória a apresentação de documento de cada menor que se hospedar junto com seus pais ou responsáveis legais. - **Não** é permitido fumar no interior do imóvel. Animais de estimação de médio a pequeno porte autorizados: [ x ] SIM [  ] NÃO - Horário habitual de entrada, às 16h e saída, às 10h. Exceções deverão ser combinadas com antecedência mínima de 24 horas. - O LOCADOR fornecerá itens de cama, mesa e banho.`
      default: return ""
    }
  }

  function quadroText(idx: number): string {
    return savedQuadro[idx] ?? getQuadroDefault(idx)
  }

  function startEditQuadro(idx: number) {
    setEditingQuadroIdx(idx)
    setEditQuadroText(savedQuadro[idx] ?? getQuadroDefault(idx))
  }

  function saveQuadro() {
    if (editingQuadroIdx === null) return
    const updated = [...savedQuadro]
    updated[editingQuadroIdx] = editQuadroText
    setSavedQuadro(updated)
    localStorage.setItem(quadroKey, JSON.stringify(updated))
    setEditingQuadroIdx(null)
  }

  function renderQuadroLines(text: string) {
    return text.split("\n").map((line, i) => (
      <p key={i}>{renderBoldMarkers(line)}</p>
    ))
  }

  function renderQuadroBox(idx: number, borderClass: string, rows = 3) {
    const isEditing = editingQuadroIdx === idx
    return (
      <div className={`${borderClass} p-3 text-sm text-justify group`}>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea value={editQuadroText} onChange={e => setEditQuadroText(e.target.value)} rows={rows} className="text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveQuadro}><Save className="h-3 w-3 mr-1" />Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingQuadroIdx(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">{renderQuadroLines(quadroText(idx))}</div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEditQuadro(idx)}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ==================== MORADORES / PESSOAS AUTORIZADAS ====================

  function getDefaultMoradores(): MoradoresData {
    if (!contratoData || !locacao) return { maxPessoas: 1, pessoas: [] }
    const dataNasc = locacao.dataNascimento ? format(parseISO(locacao.dataNascimento), "dd/MM/yyyy") : ""
    return {
      maxPessoas: contratoData.numMoradores,
      pessoas: [
        { nome: contratoData.locatariaNome, cpf: contratoData.locatariaCpf, dataNascimento: dataNasc },
      ],
    }
  }

  const moradores = moradoresData ?? getDefaultMoradores()

  function saveMoradores(data: MoradoresData) {
    setMoradoresData(data)
    localStorage.setItem(moradoresKey, JSON.stringify(data))
  }

  function updateMaxPessoas(value: string) {
    const num = value === "" ? 1 : Math.max(1, parseInt(value) || 1)
    saveMoradores({ ...moradores, maxPessoas: num })
  }

  function updatePessoa(idx: number, field: keyof PessoaAutorizada, value: string) {
    const updated = [...moradores.pessoas]
    updated[idx] = { ...updated[idx], [field]: value }
    saveMoradores({ ...moradores, pessoas: updated })
  }

  function addPessoa() {
    saveMoradores({ ...moradores, pessoas: [...moradores.pessoas, { nome: "", cpf: "", dataNascimento: "" }] })
  }

  function removePessoa(idx: number) {
    const updated = moradores.pessoas.filter((_, i) => i !== idx)
    saveMoradores({ ...moradores, pessoas: updated })
  }

  // ==================== PDF EXPORT ====================

  function exportPDF() {
    if (!contratoData || !locacao) return

    // Validar placeholders não preenchidos
    const placeholderRe = /\[\s*[A-Za-zÀ-ÿ]{2,}[A-Za-zÀ-ÿ\-\/\s]*\]/
    const quadroLabels = ["Locadora", "Locatária", "Objeto", "Finalidade", "Prazo", "Valor", "Garantia", "Observações"]
    for (let qi = 0; qi < 8; qi++) {
      if (placeholderRe.test(quadroText(qi))) {
        toast.error("Preencha todos os campos entre [colchetes] antes de exportar", {
          description: `Verifique a seção "${quadroLabels[qi]}"`,
        })
        return
      }
    }
    for (const clausula of clausulas) {
      if (placeholderRe.test(clausula.texto)) {
        toast.error("Preencha todos os campos entre [colchetes] nas cláusulas antes de exportar", {
          description: `Verifique a cláusula "${clausula.titulo}"`,
        })
        return
      }
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - margin * 2
    let y = 20
    const LH = 4.5 // line height for body text

    function checkPage(needed: number) {
      if (y + needed > 275) {
        doc.addPage()
        y = 20
      }
    }

    // ---- FIRST PAGE: Bordered "quadro inicial" ----
    const boxX = margin
    const boxW = maxWidth
    const boxStartY = y
    const sections: number[] = [] // Y positions for horizontal dividers

    // Title
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("CONTRATO DE LOCAÇÃO DE TEMPORADA", pageWidth / 2, y + 6, { align: "center" })
    y += 12
    sections.push(y)

    // Helper to render a quadro section in PDF
    function pdfQuadroSection(idx: number, fontSize = 9) {
      doc.setFontSize(fontSize)
      const text = quadroText(idx)
      const lines = text.split("\n")
      for (const line of lines) {
        const segs = parsePdfSegments(line)
        y = pdfRenderSegments(doc, segs, boxX + 3, y + 4, boxW - 6, LH)
      }
      y += 1
      sections.push(y)
    }

    // Locadora
    pdfQuadroSection(0)

    // Locatária
    pdfQuadroSection(1)

    // Objeto
    pdfQuadroSection(2)

    // Finalidade
    pdfQuadroSection(3)

    // Prazo
    pdfQuadroSection(4)

    // Valor
    pdfQuadroSection(5)

    // Garantia
    pdfQuadroSection(6)

    // Moradores + Pessoas autorizadas
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(`NÚMERO MÁXIMO DE PESSOAS: ${moradores.maxPessoas}.`, boxX + 3, y + 4)
    y += LH + 4
    doc.text("PESSOAS AUTORIZADAS:", boxX + 3, y)
    y += LH + 1

    // Table
    const colW = [(boxW - 6) * 0.45, (boxW - 6) * 0.27, (boxW - 6) * 0.28]
    const tX = boxX + 3
    const headers = ["Nome Ocupante", "CPF", "Data de Nascimento"]
    doc.setFont("helvetica", "bold")
    doc.rect(tX, y, colW[0], 5)
    doc.text(headers[0], tX + 1, y + 3.5)
    doc.rect(tX + colW[0], y, colW[1], 5)
    doc.text(headers[1], tX + colW[0] + 1, y + 3.5)
    doc.rect(tX + colW[0] + colW[1], y, colW[2], 5)
    doc.text(headers[2], tX + colW[0] + colW[1] + 1, y + 3.5)
    y += 5

    // Data rows from moradores state
    doc.setFont("helvetica", "normal")
    const minRows = Math.max(moradores.pessoas.length, 3)
    for (let r = 0; r < minRows; r++) {
      const p = moradores.pessoas[r]
      doc.rect(tX, y, colW[0], 5)
      doc.text(p?.nome || "", tX + 1, y + 3.5)
      doc.rect(tX + colW[0], y, colW[1], 5)
      doc.text(p?.cpf || "", tX + colW[0] + 1, y + 3.5)
      doc.rect(tX + colW[0] + colW[1], y, colW[2], 5)
      doc.text(p?.dataNascimento || "", tX + colW[0] + colW[1] + 1, y + 3.5)
      y += 5
    }
    y += 2
    sections.push(y)

    // Observações
    pdfQuadroSection(7, 8)
    const boxEndY = y

    // Draw outer border and section dividers
    doc.setDrawColor(0)
    doc.setLineWidth(0.3)
    doc.rect(boxX, boxStartY, boxW, boxEndY - boxStartY)
    for (const sy of sections) {
      doc.line(boxX, sy, boxX + boxW, sy)
    }

    y += 5

    // "Pelo presente instrumento..."
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    const peloPresente = "Pelo presente instrumento particular de contrato de locação de imóvel para temporada, que entre si fazem a LOCADORA e LOCATÁRIA acima qualificadas, ajustam e contratam, mediante as seguintes cláusulas e condições"
    const ppLines = doc.splitTextToSize(peloPresente, maxWidth)
    checkPage(ppLines.length * LH + 10)
    doc.text(ppLines, margin, y)
    y += ppLines.length * LH + 8

    // ---- CLAUSES ----
    doc.setLineWidth(0.2)
    for (const clausula of clausulas) {
      checkPage(20)

      // Section title — bold + underlined
      if (clausula.titulo) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        const tText = clausula.titulo
        doc.text(tText, margin, y)
        const tw = doc.getTextWidth(tText)
        doc.line(margin, y + 0.8, margin + tw, y + 0.8)
        y += 7
      }

      // Clause paragraphs
      doc.setFontSize(9)
      const paragrafos = clausula.texto.split("\n")
      for (const paragrafo of paragrafos) {
        if (!paragrafo.trim()) {
          y += 2
          continue
        }
        checkPage(LH + 2)
        const segs = parsePdfSegments(paragrafo)
        y = pdfRenderSegments(doc, segs, margin, y, maxWidth, LH)
        y += 1
      }
      y += 4
    }

    // ---- SIGNATURES ----
    checkPage(80)
    y += 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    doc.text(`Florianópolis, ${hoje}.`, pageWidth / 2, y, { align: "center" })
    y += 15

    // Locadora signature
    doc.line(margin, y, margin + 75, y)
    y += 5
    doc.setFont("helvetica", "bold")
    doc.text(`${contratoData.locadoraNome.toUpperCase()},`, margin, y)
    y += 5
    doc.setFont("helvetica", "normal")
    doc.text(`CPF: ${contratoData.locadoraCpf}`, margin, y)
    y += 15

    // Locatária signature
    doc.line(margin, y, margin + 75, y)
    y += 5
    doc.setFont("helvetica", "bold")
    doc.text(contratoData.locatariaNome.toUpperCase(), margin, y)
    y += 5
    doc.setFont("helvetica", "normal")
    doc.text(`CPF: ${contratoData.locatariaCpf}`, margin, y)
    y += 20

    // Witnesses
    checkPage(25)
    const mid = pageWidth / 2
    // Left witness
    doc.line(margin, y, margin + 55, y)
    doc.line(mid + 5, y, mid + 60, y)
    y += 5
    doc.text("TESTEMUNHA", margin, y)
    doc.text("TESTEMUNHA", mid + 5, y)
    y += 5
    doc.text(`NOME: ${testemunhas[0].nome}`, margin, y)
    doc.text(`NOME: ${testemunhas[1].nome}`, mid + 5, y)
    y += 5
    doc.text(`CPF: ${testemunhas[0].cpf}`, margin, y)
    doc.text(`CPF: ${testemunhas[1].cpf}`, mid + 5, y)

    const nomeProprietario = contratoData.locadoraNome.replace(/\s+/g, "_")
    const nomeInquilino = locacao.nomeCompleto.replace(/\s+/g, "_")
    const nomeArquivo = `Contrato_de_locação_de_Temporada_${nomeProprietario}_e_${nomeInquilino}.pdf`
    doc.save(nomeArquivo)
  }

  // ==================== RENDER ====================

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
          {/* ===== PRIMEIRA PÁGINA: QUADRO COM BORDAS ===== */}

          {/* Título */}
          <h2 className="text-lg font-bold text-center py-3 border border-b-0">
            CONTRATO DE LOCAÇÃO DE TEMPORADA
          </h2>

          {/* Locadora */}
          {renderQuadroBox(0, "border")}

          {/* Locatária */}
          {renderQuadroBox(1, "border border-t-0")}

          {/* Objeto */}
          {renderQuadroBox(2, "border border-t-0")}

          {/* Finalidade */}
          {renderQuadroBox(3, "border border-t-0")}

          {/* Prazo */}
          {renderQuadroBox(4, "border border-t-0")}

          {/* Valor */}
          {renderQuadroBox(5, "border border-t-0", 6)}

          {/* Garantia */}
          {renderQuadroBox(6, "border border-t-0")}

          {/* Moradores + Pessoas autorizadas */}
          <div className="border border-t-0 p-3 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span>NÚMERO MÁXIMO DE PESSOAS:</span>
              <input
                type="number"
                min={1}
                value={moradores.maxPessoas}
                onChange={e => updateMaxPessoas(e.target.value)}
                className="w-12 border-b border-dashed text-center outline-none bg-transparent"
              />
            </div>
            <p>PESSOAS AUTORIZADAS:</p>
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr>
                  <th className="border p-1.5 text-left font-semibold">Nome Ocupante</th>
                  <th className="border p-1.5 text-left font-semibold">CPF</th>
                  <th className="border p-1.5 text-left font-semibold">Data de Nascimento</th>
                  <th className="border p-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {moradores.pessoas.map((pessoa, i) => (
                  <tr key={i}>
                    <td className="border p-0.5">
                      <input
                        value={pessoa.nome}
                        onChange={e => updatePessoa(i, "nome", e.target.value)}
                        placeholder="Nome completo"
                        className="w-full px-1 py-1 outline-none bg-transparent"
                      />
                    </td>
                    <td className="border p-0.5">
                      <input
                        value={pessoa.cpf}
                        onChange={e => updatePessoa(i, "cpf", e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-1 py-1 outline-none bg-transparent"
                      />
                    </td>
                    <td className="border p-0.5">
                      <input
                        value={pessoa.dataNascimento}
                        onChange={e => updatePessoa(i, "dataNascimento", e.target.value)}
                        placeholder="dd/mm/aaaa"
                        className="w-full px-1 py-1 outline-none bg-transparent"
                      />
                    </td>
                    <td className="border p-0.5 text-center">
                      {moradores.pessoas.length > 1 && (
                        <button onClick={() => removePessoa(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addPessoa}>
              + Adicionar pessoa
            </Button>
          </div>

          {/* Observações */}
          {renderQuadroBox(7, "border border-t-0", 5)}

          {/* "Pelo presente instrumento..." — fora da caixa */}
          <div className="pt-6 pb-4 text-sm text-justify">
            <p>Pelo presente instrumento particular de contrato de locação de imóvel para temporada, que entre si fazem a LOCADORA e LOCATÁRIA acima qualificadas, ajustam e contratam, mediante as seguintes cláusulas e condições</p>
          </div>

          {/* ===== CLÁUSULAS — SEM BORDAS ===== */}
          {clausulas.map((clausula, i) => (
            <div key={i} className="space-y-2 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm underline underline-offset-4">{clausula.titulo}</h3>
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
                    rows={10}
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Use **texto** para negrito</p>
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
                <div className="text-sm space-y-1">
                  {renderClauseTextJsx(clausula.texto)}
                </div>
              )}
            </div>
          ))}

          {/* ===== ASSINATURAS ===== */}
          <div className="space-y-10 pt-8">
            <p className="text-sm text-center">
              Florianópolis, {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
            </p>

            {/* Locadora */}
            <div className="max-w-xs space-y-1">
              <div className="border-b border-black w-full" />
              <p className="text-sm font-bold">{contratoData.locadoraNome.toUpperCase()},</p>
              <p className="text-xs">CPF: {contratoData.locadoraCpf}</p>
            </div>

            {/* Locatária */}
            <div className="max-w-xs space-y-1">
              <div className="border-b border-black w-full" />
              <p className="text-sm font-bold">{contratoData.locatariaNome.toUpperCase()}</p>
              <p className="text-xs">CPF: {contratoData.locatariaCpf}</p>
            </div>

            {/* Testemunhas */}
            <div className="grid grid-cols-2 gap-8">
              {([0, 1] as const).map((i) => (
                <div key={i} className="space-y-1">
                  <div className="border-b border-black w-full" />
                  <p className="text-xs font-semibold">TESTEMUNHA</p>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="shrink-0">NOME:</span>
                    <input
                      type="text"
                      value={testemunhas[i].nome}
                      onChange={(e) => updateTestemunha(i, "nome", e.target.value)}
                      placeholder="Nome completo"
                      className="border-b border-dashed border-muted-foreground/40 bg-transparent text-xs outline-none flex-1 py-0.5"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="shrink-0">CPF:</span>
                    <input
                      type="text"
                      value={testemunhas[i].cpf}
                      onChange={(e) => updateTestemunha(i, "cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      className="border-b border-dashed border-muted-foreground/40 bg-transparent text-xs outline-none flex-1 py-0.5"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
