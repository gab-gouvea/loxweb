import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import type { Reservation } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"
import type { Property } from "@/types/property"

/** "Hoje" fixo para os testes: 15/10/2026. */
const HOJE = new Date(2026, 9, 15, 12, 0, 0)

const property = { id: "p1", nome: "LIBERTY", percentualComissao: 15, taxaLimpeza: 0 } as Property

// Estado que cada teste ajusta antes de renderizar o hook
const estado = {
  reservations: [] as Reservation[],
  locacoes: [] as Locacao[],
  recebidoSet: new Set<string>(),
}

vi.mock("@/hooks/use-reservations", () => ({
  useReservations: () => ({ data: estado.reservations }),
}))
vi.mock("@/hooks/use-locacoes", () => ({
  useLocacoes: () => ({ data: estado.locacoes }),
}))
vi.mock("@/hooks/use-locacao-recebido-set", () => ({
  useLocacaoRecebidoSet: () => estado.recebidoSet,
}))
vi.mock("@/hooks/use-property-map", () => ({
  usePropertyMap: () => ({
    properties: [property],
    propertyMap: new Map([["p1", property]]),
  }),
}))
vi.mock("@/hooks/use-property-details", () => ({
  useAllPropertyComponents: () => ({ data: [] }),
  useAllPendingScheduledMaintenances: () => ({ data: [] }),
}))

const { useAlerts } = await import("../use-alerts")

function pagamentos() {
  const { result } = renderHook(() => useAlerts())
  return result.current.alerts.filter(
    (a) => a.type === "pagamento_pendente" || a.type === "locacao_pagamento_pendente",
  )
}

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
    pagamentoRecebido: true,
    ...overrides,
  } as Reservation
}

function locacao(overrides: Partial<Locacao> = {}): Locacao {
  return {
    id: "l1",
    propriedadeId: "p1",
    tipoLocacao: "temporada",
    nomeCompleto: "Alice",
    checkIn: new Date(2026, 3, 10).toISOString(),
    checkOut: new Date(2026, 5, 10).toISOString(),
    tipoPagamento: "mensal",
    valorMensal: 2500,
    percentualComissao: 15,
    status: "ativa",
    ...overrides,
  } as Locacao
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(HOJE)
  estado.reservations = []
  estado.locacoes = []
  estado.recebidoSet = new Set()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("alerta de pagamento de reserva", () => {
  it("dispara quando venceu e não foi confirmado", () => {
    estado.reservations = [reserva({ pagamentoRecebido: false })]
    const alertas = pagamentos()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].type).toBe("pagamento_pendente")
    expect(alertas[0].description).toContain("Andreia")
  })

  it("não dispara depois de confirmado", () => {
    estado.reservations = [reserva({ pagamentoRecebido: true })]
    expect(pagamentos()).toHaveLength(0)
  })
})

describe("alerta de extensão", () => {
  it("cada extensão vencida gera alerta próprio, com etiqueta EXTENSÃO", () => {
    estado.reservations = [
      reserva({
        extensoes: [
          { dataInicio: new Date(2026, 9, 5).toISOString(), valor: 400 },
          { dataInicio: new Date(2026, 9, 10).toISOString(), valor: 200 },
        ],
      }),
    ]
    const alertas = pagamentos()
    expect(alertas).toHaveLength(2)
    expect(alertas.every((a) => a.badge?.startsWith("EXTENSÃO"))).toBe(true)
  })

  it("extensão confirmada não alerta", () => {
    estado.reservations = [
      reserva({
        extensoes: [{ dataInicio: new Date(2026, 9, 5).toISOString(), valor: 400, pagamentoRecebido: true }],
      }),
    ]
    expect(pagamentos()).toHaveLength(0)
  })
})

describe("locação encerrada — regressão", () => {
  it("temporada encerrada em junho não alerta em outubro", () => {
    estado.locacoes = [locacao({ status: "encerrada" })]
    expect(pagamentos()).toHaveLength(0)
  })

  it("à vista encerrada não alerta", () => {
    estado.locacoes = [
      locacao({ status: "encerrada", tipoPagamento: "avista", valorTotal: 18000 }),
    ]
    expect(pagamentos()).toHaveLength(0)
  })

  it("sem administração encerrada não alerta", () => {
    estado.locacoes = [
      locacao({
        status: "encerrada",
        tipoLocacao: "anual",
        semAdministracao: true,
        percentualPrimeiroAluguel: 100,
        parcelasTaxa: [{ mes: 5, ano: 2026, valor: 2500 }],
      }),
    ]
    expect(pagamentos()).toHaveLength(0)
  })
})

describe("locação ativa à vista — confirmação em mês antigo", () => {
  const avista = () =>
    locacao({
      tipoPagamento: "avista",
      valorTotal: 18000,
      checkOut: new Date(2026, 11, 10).toISOString(),
    })

  it("alerta enquanto não confirmada", () => {
    estado.locacoes = [avista()]
    const alertas = pagamentos()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].type).toBe("locacao_pagamento_pendente")
  })

  it("para de alertar quando o recebimento de abril está no set", () => {
    estado.locacoes = [avista()]
    // Pagamento ancorado no mês do check-in (abril), fora da janela mês atual/anterior
    estado.recebidoSet = new Set(["l1-4-2026"])
    expect(pagamentos()).toHaveLength(0)
  })
})

describe("locação sem administração", () => {
  const semAdm = () =>
    locacao({
      tipoLocacao: "anual",
      checkOut: new Date(2027, 3, 10).toISOString(),
      semAdministracao: true,
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [
        { mes: 5, ano: 2026, valor: 1250 },
        { mes: 6, ano: 2026, valor: 1250 },
      ],
    })

  it("alerta por parcela vencida, com etiqueta SEM ADM.", () => {
    estado.locacoes = [semAdm()]
    const alertas = pagamentos()
    expect(alertas).toHaveLength(2)
    expect(alertas[0].title).toContain("Taxa de Intermediação")
    expect(alertas.every((a) => a.badge?.startsWith("SEM ADM."))).toBe(true)
  })

  it("parcela confirmada em mês antigo para de alertar", () => {
    estado.locacoes = [semAdm()]
    estado.recebidoSet = new Set(["l1-5-2026", "l1-6-2026"])
    expect(pagamentos()).toHaveLength(0)
  })

  it("não gera alerta de reajuste anual", () => {
    estado.locacoes = [semAdm()]
    const { result } = renderHook(() => useAlerts())
    expect(result.current.alerts.some((a) => a.type === "locacao_reajuste_anual")).toBe(false)
  })
})
