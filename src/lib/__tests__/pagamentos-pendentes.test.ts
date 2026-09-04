import { describe, it, expect } from "vitest"
import { buildPagamentosPendentes } from "../pagamentos-pendentes"
import type { Reservation } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"
import type { Property } from "@/types/property"

const HOJE = "2026-10-15"

const property = { id: "p1", nome: "LIBERTY", percentualComissao: 15, taxaLimpeza: 0 } as Property
const propertyMap = new Map<string, Property>([["p1", property]])

function reserva(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    propriedadeId: "p1",
    nomeHospede: "Andreia",
    checkIn: new Date(2026, 9, 1).toISOString(),
    checkOut: new Date(2026, 9, 5).toISOString(),
    status: "confirmada",
    precoTotal: 1000,
    percentualComissao: 15,
    taxaLimpeza: 0,
    ...overrides,
  } as Reservation
}

function locacao(overrides: Partial<Locacao> = {}): Locacao {
  return {
    id: "l1",
    propriedadeId: "p1",
    tipoLocacao: "anual",
    nomeCompleto: "Janine",
    checkIn: new Date(2026, 8, 10).toISOString(),
    checkOut: new Date(2027, 8, 10).toISOString(),
    tipoPagamento: "mensal",
    valorMensal: 2500,
    percentualComissao: 15,
    status: "ativa",
    ...overrides,
  } as Locacao
}

function build(reservations: Reservation[], locacoes: Locacao[], recebidos: string[] = []) {
  return buildPagamentosPendentes({
    reservations,
    locacoes,
    propertyMap,
    recebidoSet: new Set(recebidos),
    today: HOJE,
  })
}

describe("reserva base", () => {
  it("entra quando venceu e não foi confirmada", () => {
    const itens = build([reserva()], [])
    expect(itens).toHaveLength(1)
    expect(itens[0]).toMatchObject({ origem: "reserva", nome: "Andreia", valor: 150 })
  })

  it("sai quando confirmada", () => {
    expect(build([reserva({ pagamentoRecebido: true })], [])).toHaveLength(0)
  })

  it("não entra antes do vencimento", () => {
    const futura = reserva({ checkIn: new Date(2026, 10, 20).toISOString() })
    expect(build([futura], [])).toHaveLength(0)
  })

  it("ignora reserva cancelada", () => {
    expect(build([reserva({ status: "cancelada" })], [])).toHaveLength(0)
  })
})

describe("extensões", () => {
  it("cada extensão vencida e não confirmada vira uma linha própria", () => {
    const r = reserva({
      pagamentoRecebido: true,
      extensoes: [
        { dataInicio: new Date(2026, 9, 5).toISOString(), valor: 400 },
        { dataInicio: new Date(2026, 9, 10).toISOString(), valor: 200 },
      ],
    })
    const itens = build([r], [])
    expect(itens).toHaveLength(2)
    expect(itens.every((i) => i.origem === "extensao")).toBe(true)
    // 15% de 400 e de 200
    expect(itens.map((i) => i.valor).sort((a, b) => a - b)).toEqual([30, 60])
  })

  it("extensão confirmada não aparece, e não afeta as outras", () => {
    const r = reserva({
      pagamentoRecebido: true,
      extensoes: [
        { dataInicio: new Date(2026, 9, 5).toISOString(), valor: 400, pagamentoRecebido: true },
        { dataInicio: new Date(2026, 9, 10).toISOString(), valor: 200 },
      ],
    })
    const itens = build([r], [])
    expect(itens).toHaveLength(1)
    expect(itens[0].valor).toBe(30)
  })

  it("recebe etiqueta EXTENSÃO, numerada quando há mais de uma", () => {
    const uma = reserva({
      pagamentoRecebido: true,
      extensoes: [{ dataInicio: new Date(2026, 9, 5).toISOString(), valor: 400 }],
    })
    expect(build([uma], [])[0].badge).toBe("EXTENSÃO")

    const duas = reserva({
      pagamentoRecebido: true,
      extensoes: [
        { dataInicio: new Date(2026, 9, 5).toISOString(), valor: 400 },
        { dataInicio: new Date(2026, 9, 10).toISOString(), valor: 200 },
      ],
    })
    expect(build([duas], [])[0].badge).toMatch(/EXTENSÃO \d\/2/)
  })
})

describe("locação sem administração", () => {
  const semAdm = (parcelas: Locacao["parcelasTaxa"]) =>
    locacao({ semAdministracao: true, percentualPrimeiroAluguel: 100, parcelasTaxa: parcelas })

  it("cada parcela vencida vira uma linha", () => {
    const l = semAdm([
      { mes: 10, ano: 2026, valor: 1250 },
      { mes: 11, ano: 2026, valor: 1250 },
    ])
    const itens = build([], [l])
    // Só a de outubro venceu; novembro ainda não
    expect(itens).toHaveLength(1)
    expect(itens[0]).toMatchObject({ origem: "taxa_intermediacao", valor: 1250 })
  })

  it("parcela confirmada some da lista", () => {
    const l = semAdm([{ mes: 10, ano: 2026, valor: 1250 }])
    expect(build([], [l], ["l1-10-2026"])).toHaveLength(0)
  })

  it("recebe etiqueta SEM ADM.", () => {
    const l = semAdm([{ mes: 10, ano: 2026, valor: 1250 }])
    expect(build([], [l])[0].badge).toBe("SEM ADM.")
  })

  it("não gera cobrança mensal de comissão", () => {
    const l = semAdm([{ mes: 12, ano: 2026, valor: 2500 }])
    // A parcela é futura, então nada pendente — e nenhum ciclo mensal deve aparecer
    expect(build([], [l])).toHaveLength(0)
  })
})

describe("locação administrada", () => {
  it("cobra a comissão do ciclo corrente", () => {
    const itens = build([], [locacao()])
    expect(itens).toHaveLength(1)
    expect(itens[0]).toMatchObject({ origem: "locacao", valor: 375 })
    expect(itens[0].badge).toBeUndefined()
  })

  it("ciclo confirmado some da lista", () => {
    // Ciclo corrente em 10/10/2026 (check-in dia 10)
    expect(build([], [locacao()], ["l1-10-2026"])).toHaveLength(0)
  })
})

describe("locação encerrada", () => {
  it("não gera cobrança depois do fim do contrato", () => {
    // Temporada de abril a junho, já encerrada — não pode alertar em outubro
    const encerrada = locacao({
      tipoLocacao: "temporada",
      status: "encerrada",
      checkIn: new Date(2026, 3, 10).toISOString(),
      checkOut: new Date(2026, 5, 10).toISOString(),
    })
    expect(build([], [encerrada])).toHaveLength(0)
  })

  it("à vista encerrada também não alerta", () => {
    const encerrada = locacao({
      tipoLocacao: "temporada",
      status: "encerrada",
      tipoPagamento: "avista",
      valorTotal: 18000,
      checkIn: new Date(2026, 3, 10).toISOString(),
      checkOut: new Date(2026, 5, 10).toISOString(),
    })
    expect(build([], [encerrada])).toHaveLength(0)
  })

  it("sem administração encerrada também não alerta", () => {
    const encerrada = locacao({
      status: "encerrada",
      semAdministracao: true,
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [{ mes: 10, ano: 2026, valor: 2500 }],
    })
    expect(build([], [encerrada])).toHaveLength(0)
  })
})

describe("ordenação", () => {
  it("mostra os vencimentos mais recentes primeiro", () => {
    const antiga = reserva({ id: "r1", checkIn: new Date(2026, 8, 1).toISOString() })
    const recente = reserva({ id: "r2", checkIn: new Date(2026, 9, 10).toISOString() })
    const itens = build([antiga, recente], [])
    expect(itens.map((i) => i.key)).toEqual(["reserva-r2", "reserva-r1"])
  })
})
