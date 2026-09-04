import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Radix (Select) precisa dessas APIs, que o jsdom não tem
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any
globalThis.DOMRect = globalThis.DOMRect ?? (class {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any)
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false)
Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {})
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {})
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {})

vi.mock("@/hooks/use-properties", () => ({
  useProperties: () => ({
    data: [{ id: "p1", nome: "LIBERTY", ativo: true, percentualComissao: 15, taxaLimpeza: 0 }],
  }),
}))
vi.mock("@/hooks/use-locacoes", () => ({
  useLocacoes: () => ({ data: [] }),
}))

const { LocacaoForm } = await import("../locacao-form")

/** Preenche o mínimo para chegar no bloco de taxa de intermediação. */
async function montarSemAdministracao() {
  const user = userEvent.setup()
  render(
    <LocacaoForm
      locacao={{
        id: "l1",
        propriedadeId: "p1",
        tipoLocacao: "anual",
        nomeCompleto: "Janine",
        checkIn: new Date(2026, 8, 10).toISOString(),
        checkOut: new Date(2027, 8, 10).toISOString(),
        numMoradores: 1,
        tipoPagamento: "mensal",
        valorMensal: 2500,
        semAdministracao: true,
        percentualPrimeiroAluguel: 100,
        parcelasTaxa: [{ mes: 10, ano: 2026, valor: 2500 }],
        status: "ativa",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any}
      onSubmit={() => {}}
      onCancel={() => {}}
    />,
  )
  return user
}

/** Locação sem parcelas gravadas: o form gera a parcela padrão (estado de criação). */
async function montarSemParcelas() {
  const user = userEvent.setup()
  render(
    <LocacaoForm
      locacao={{
        id: "l2",
        propriedadeId: "p1",
        tipoLocacao: "anual",
        nomeCompleto: "Janine",
        checkIn: new Date(2026, 8, 10).toISOString(),
        checkOut: new Date(2027, 8, 10).toISOString(),
        numMoradores: 1,
        tipoPagamento: "mensal",
        valorMensal: 2500,
        semAdministracao: true,
        status: "ativa",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any}
      onSubmit={() => {}}
      onCancel={() => {}}
    />,
  )
  return user
}

describe("parcela padrão (sem parcelas gravadas)", () => {
  it("aceita digitar o valor da parcela", async () => {
    const user = await montarSemParcelas()
    const input = screen.getAllByPlaceholderText("R$")[0] as HTMLInputElement
    await user.type(input, "1250")
    expect(input.value).toBe("1250")
  })

  it("aceita digitar o valor depois de preencher o %", async () => {
    const user = await montarSemParcelas()
    const pct = screen.getByPlaceholderText("Ex: 100") as HTMLInputElement
    await user.type(pct, "100")

    const input = screen.getAllByPlaceholderText("R$")[0] as HTMLInputElement
    await user.clear(input)
    await user.type(input, "1250")
    expect(input.value).toBe("1250")
  })
})

/** Sem datas preenchidas — situação de criação antes de escolher check-in/check-out. */
function montarSemDatas() {
  render(
    <LocacaoForm
      locacao={{
        id: "l3",
        propriedadeId: "p1",
        tipoLocacao: "anual",
        nomeCompleto: "Janine",
        checkIn: "",
        checkOut: "",
        numMoradores: 1,
        tipoPagamento: "mensal",
        valorMensal: 2500,
        semAdministracao: true,
        percentualPrimeiroAluguel: 100,
        parcelasTaxa: [{ mes: 10, ano: 2026, valor: 2500 }],
        status: "ativa",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any}
      onSubmit={() => {}}
      onCancel={() => {}}
    />,
  )
}

describe("select de mês da parcela", () => {
  it("oferece opções mesmo sem datas de check-in preenchidas", async () => {
    const user = userEvent.setup()
    montarSemDatas()
    await user.click(screen.getByRole("combobox", { name: "Mês do recebimento 1" }))
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0)
  })

  it("sempre inclui o mês já selecionado entre as opções", async () => {
    const user = userEvent.setup()
    montarSemDatas()
    await user.click(screen.getByRole("combobox", { name: "Mês do recebimento 1" }))
    const nomes = screen.getAllByRole("option").map((o) => o.textContent)
    expect(nomes.some((n) => /outubro\/2026/i.test(n ?? ""))).toBe(true)
  })
})

describe("input de valor da parcela no formulário real", () => {
  it("mostra o valor gravado da parcela", async () => {
    await montarSemAdministracao()
    const inputs = screen.getAllByPlaceholderText("R$") as HTMLInputElement[]
    expect(inputs).toHaveLength(1)
    expect(inputs[0].value).toBe("2500")
  })

  it("aceita digitar um novo valor", async () => {
    const user = await montarSemAdministracao()
    const input = screen.getAllByPlaceholderText("R$")[0] as HTMLInputElement
    await user.clear(input)
    await user.type(input, "1250")
    expect(input.value).toBe("1250")
  })
})
