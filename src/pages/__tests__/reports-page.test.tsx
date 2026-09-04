import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import type { Reservation } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"
import type { Property } from "@/types/property"

// Radix/jsdom
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any

const property = { id: "p1", nome: "LIBERTY", percentualComissao: 15, taxaLimpeza: 0 } as Property

const estado = {
  reservations: [] as Reservation[],
  locacoes: [] as Locacao[],
  recebimentos: [] as { locacaoId: string; mes: number; ano: number; valorRecebido: number }[],
}

vi.mock("@/hooks/use-reservations", () => ({
  useReservations: () => ({ data: estado.reservations }),
  useUpdateReservation: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock("@/hooks/use-locacoes", () => ({
  useLocacoes: () => ({ data: estado.locacoes }),
  useRecebimentosLocacao: () => ({ data: estado.recebimentos }),
}))
vi.mock("@/hooks/use-property-map", () => ({
  usePropertyMap: () => ({ properties: [property], propertyMap: new Map([["p1", property]]) }),
}))
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/relatorios" }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
// O relatório sempre abre em outubro/2026 nos testes
vi.mock("@/hooks/use-month-store", () => ({
  useReportsMonthStore: () => ({ currentMonth: new Date(2026, 9, 1), setCurrentMonth: vi.fn() }),
}))

const { ReportsPage } = await import("../reports-page")

function reserva(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    propriedadeId: "p1",
    nomeHospede: "Andreia",
    checkIn: new Date(2026, 9, 1).toISOString(),
    checkOut: new Date(2026, 9, 5).toISOString(),
    status: "confirmada",
    fonte: "airbnb",
    precoTotal: 1000,
    percentualComissao: 15,
    taxaLimpeza: 0,
    ...overrides,
  } as Reservation
}

/**
 * Valor do card de resumo pelo título. Busca entre os cards para não colidir com o
 * cabeçalho "Recebido" da tabela, que tem o mesmo texto.
 */
function cardValue(titulo: string): string {
  const cards = [...document.querySelectorAll('[data-slot="card"]')]
  const card = cards.find(
    (c) => c.querySelector('[data-slot="card-title"]')?.textContent?.trim() === titulo,
  )
  if (!card) throw new Error(`Card de resumo "${titulo}" não encontrado`)
  return card.querySelector('[data-slot="card-content"]')?.textContent?.trim() ?? ""
}

beforeEach(() => {
  estado.reservations = []
  estado.locacoes = []
  estado.recebimentos = []
})

describe("confirmação por linha", () => {
  const comExtensao = (extPaga: boolean) =>
    reserva({
      pagamentoRecebido: true,
      // Extensão começa em outubro, então cai no mesmo mês do relatório
      extensoes: [
        { dataInicio: new Date(2026, 9, 5).toISOString(), valor: 400, pagamentoRecebido: extPaga },
      ],
    })

  // precoTotal (1000) inclui a extensão, então a linha base vale 1000 - 400 = 600.
  // Comissão de 15%: base = R$ 90,00, extensão = R$ 60,00.
  it("extensão não confirmada entra em 'A Receber', não em 'Recebido'", () => {
    estado.reservations = [comExtensao(false)]
    render(<ReportsPage />)
    expect(cardValue("Recebido")).toContain("90,00")
    expect(cardValue("A Receber")).toContain("60,00")
  })

  it("extensão confirmada soma em 'Recebido'", () => {
    estado.reservations = [comExtensao(true)]
    render(<ReportsPage />)
    expect(cardValue("Recebido")).toContain("150,00")
    expect(cardValue("A Receber")).toContain("0,00")
  })

  it("mostra ✓ na linha da extensão confirmada", () => {
    estado.reservations = [comExtensao(true)]
    render(<ReportsPage />)
    const linhaExtensao = screen.getByText("EXTENSÃO").closest("tr")!
    expect(within(linhaExtensao).getByText("✓")).toBeTruthy()
  })

  it("não mostra ✓ na linha da extensão pendente", () => {
    estado.reservations = [comExtensao(false)]
    render(<ReportsPage />)
    const linhaExtensao = screen.getByText("EXTENSÃO").closest("tr")!
    expect(within(linhaExtensao).queryByText("✓")).toBeNull()
  })
})

describe("comissão quando a limpeza passa do bruto", () => {
  // Caso real: bruto 290,04 com taxa de limpeza 348,00
  const invertida = () =>
    reserva({ precoTotal: 290.04, taxaLimpeza: 348, pagamentoRecebido: false })

  /** Célula "Comissão" da linha (índice 6: nome, entrada, saída, bruto, líquido, %, comissão). */
  function celulaComissao(): string {
    const linha = screen.getByText("Andreia").closest("tr")!
    return linha.querySelectorAll("td")[6].textContent?.trim() ?? ""
  }

  it("zera a comissão em vez de deixá-la negativa", () => {
    estado.reservations = [invertida()]
    render(<ReportsPage />)
    // Sem o clamp sairia "R$ -8,69"
    expect(celulaComissao()).toBe("R$ 0,00")
  })

  it("o líquido do proprietário continua negativo — a limpeza é real", () => {
    estado.reservations = [invertida()]
    render(<ReportsPage />)
    const linha = screen.getByText("Andreia").closest("tr")!
    // Coluna Líquido (índice 4): 290,04 - 348 = -57,96
    expect(linha.querySelectorAll("td")[4].textContent).toContain("57,96")
  })
})

describe("locação sem administração", () => {
  const semAdm = (mes: number): Locacao =>
    ({
      id: "l1",
      propriedadeId: "p1",
      tipoLocacao: "anual",
      nomeCompleto: "Janine",
      checkIn: new Date(2026, 8, 10).toISOString(),
      checkOut: new Date(2027, 8, 10).toISOString(),
      tipoPagamento: "mensal",
      valorMensal: 2500,
      status: "ativa",
      semAdministracao: true,
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [{ mes, ano: 2026, valor: 2500 }],
    }) as Locacao

  it("aparece no mês da parcela", () => {
    estado.locacoes = [semAdm(10)]
    render(<ReportsPage />)
    expect(screen.getByText("Janine")).toBeTruthy()
    expect(cardValue("A Receber")).toContain("2.500,00")
  })

  it("não aparece em mês sem parcela", () => {
    estado.locacoes = [semAdm(11)]
    render(<ReportsPage />)
    expect(screen.queryByText("Janine")).toBeNull()
  })

  it("conta como recebida quando o recebimento do mês está confirmado", () => {
    estado.locacoes = [semAdm(10)]
    estado.recebimentos = [{ locacaoId: "l1", mes: 10, ano: 2026, valorRecebido: 2500 }]
    render(<ReportsPage />)
    expect(cardValue("Recebido")).toContain("2.500,00")
    expect(cardValue("A Receber")).toContain("0,00")
  })
})
