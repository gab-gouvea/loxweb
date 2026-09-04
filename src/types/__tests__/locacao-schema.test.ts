import { describe, it, expect } from "vitest"
import { locacaoFormSchema } from "../locacao"

describe("locacaoFormSchema", () => {
  const validTemporada = {
    propriedadeId: "p1",
    tipoLocacao: "temporada" as const,
    nomeCompleto: "Maria Silva",
    checkIn: "2026-04-01",
    checkOut: "2026-06-01",
    numMoradores: 2,
    tipoPagamento: "mensal" as const,
    valorMensal: 3000,
    percentualComissao: 10,
  }

  const validAnual = {
    propriedadeId: "p1",
    tipoLocacao: "anual" as const,
    nomeCompleto: "Carlos Souza",
    checkIn: "2026-04-01",
    checkOut: "2027-04-01",
    numMoradores: 1,
    tipoPagamento: "mensal" as const,
    valorMensal: 2500,
    percentualComissao: 15,
  }

  it("valida temporada válida", () => {
    const result = locacaoFormSchema.safeParse(validTemporada)
    expect(result.success).toBe(true)
  })

  it("valida anual válida", () => {
    const result = locacaoFormSchema.safeParse(validAnual)
    expect(result.success).toBe(true)
  })

  it("rejeita temporada com mais de 3 meses", () => {
    const result = locacaoFormSchema.safeParse({
      ...validTemporada,
      checkOut: "2026-08-01", // 4 meses
    })
    expect(result.success).toBe(false)
  })

  it("aceita temporada com exatamente 3 meses", () => {
    const result = locacaoFormSchema.safeParse({
      ...validTemporada,
      checkIn: "2026-04-01",
      checkOut: "2026-07-01", // exatamente 3 meses
    })
    expect(result.success).toBe(true)
  })

  it("aceita anual com exatamente 36 meses", () => {
    const result = locacaoFormSchema.safeParse({
      ...validAnual,
      checkIn: "2026-01-01",
      checkOut: "2029-01-01", // exatamente 36 meses
    })
    expect(result.success).toBe(true)
  })

  it("rejeita anual com mais de 36 meses", () => {
    const result = locacaoFormSchema.safeParse({
      ...validAnual,
      checkIn: "2026-01-01",
      checkOut: "2029-02-01", // 37 meses
    })
    expect(result.success).toBe(false)
  })

  it("rejeita checkOut antes do checkIn", () => {
    const result = locacaoFormSchema.safeParse({
      ...validTemporada,
      checkIn: "2026-06-01",
      checkOut: "2026-04-01",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita pagamento mensal sem valorMensal", () => {
    const result = locacaoFormSchema.safeParse({
      ...validTemporada,
      tipoPagamento: "mensal",
      valorMensal: undefined,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita pagamento à vista sem valorTotal", () => {
    const result = locacaoFormSchema.safeParse({
      ...validTemporada,
      tipoPagamento: "avista",
      valorTotal: undefined,
      valorMensal: undefined,
    })
    expect(result.success).toBe(false)
  })

  it("aceita pagamento à vista com valorTotal", () => {
    const result = locacaoFormSchema.safeParse({
      ...validTemporada,
      tipoPagamento: "avista",
      valorTotal: 9000,
    })
    expect(result.success).toBe(true)
  })

  it("rejeita nome vazio", () => {
    const result = locacaoFormSchema.safeParse({ ...validTemporada, nomeCompleto: "" })
    expect(result.success).toBe(false)
  })

  it("rejeita comissão zero", () => {
    const result = locacaoFormSchema.safeParse({ ...validTemporada, percentualComissao: 0 })
    expect(result.success).toBe(false)
  })

  it("rejeita comissão maior que 100", () => {
    const result = locacaoFormSchema.safeParse({ ...validTemporada, percentualComissao: 101 })
    expect(result.success).toBe(false)
  })

  // valorMensal 2500 × 60% = taxa de R$ 1.500,00
  const validSemAdministracao = {
    ...validAnual,
    percentualComissao: undefined,
    semAdministracao: true,
    percentualPrimeiroAluguel: 60,
    parcelasTaxa: [{ dia: 10, mes: 5, ano: 2026, valor: 1500 }],
  }

  it("valida anual sem administração (dispensa comissão mensal)", () => {
    const result = locacaoFormSchema.safeParse(validSemAdministracao)
    expect(result.success).toBe(true)
  })

  it("aceita 100% do primeiro aluguel", () => {
    const result = locacaoFormSchema.safeParse({
      ...validSemAdministracao,
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [{ dia: 10, mes: 5, ano: 2026, valor: 2500 }],
    })
    expect(result.success).toBe(true)
  })

  it("aceita a taxa dividida em duas parcelas", () => {
    const result = locacaoFormSchema.safeParse({
      ...validSemAdministracao,
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [
        { mes: 10, ano: 2026, valor: 1250 },
        { mes: 11, ano: 2026, valor: 1250 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejeita parcelas que somam mais que a taxa", () => {
    const result = locacaoFormSchema.safeParse({
      ...validSemAdministracao,
      percentualPrimeiroAluguel: 100, // taxa = 2500
      parcelasTaxa: [
        { mes: 10, ano: 2026, valor: 2000 },
        { mes: 11, ano: 2026, valor: 1000 },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("aceita parcelas que somam menos que a taxa", () => {
    const result = locacaoFormSchema.safeParse({
      ...validSemAdministracao,
      parcelasTaxa: [{ mes: 5, ano: 2026, valor: 1000 }],
    })
    expect(result.success).toBe(true)
  })

  it("rejeita sem administração sem nenhuma parcela", () => {
    const result = locacaoFormSchema.safeParse({ ...validSemAdministracao, parcelasTaxa: [] })
    expect(result.success).toBe(false)
  })

  it("rejeita parcela sem mês ou ano", () => {
    const result = locacaoFormSchema.safeParse({
      ...validSemAdministracao,
      parcelasTaxa: [{ dia: 10, mes: "", ano: "", valor: 1500 }],
    })
    expect(result.success).toBe(false)
  })

  it("dia é opcional na parcela", () => {
    const result = locacaoFormSchema.safeParse({
      ...validSemAdministracao,
      parcelasTaxa: [{ mes: 5, ano: 2026, valor: 1500 }],
    })
    expect(result.success).toBe(true)
  })

  it("rejeita sem administração sem % do primeiro aluguel", () => {
    const result = locacaoFormSchema.safeParse({ ...validSemAdministracao, percentualPrimeiroAluguel: undefined })
    expect(result.success).toBe(false)
  })

  it("rejeita sem administração com % do primeiro aluguel zero", () => {
    const result = locacaoFormSchema.safeParse({ ...validSemAdministracao, percentualPrimeiroAluguel: 0 })
    expect(result.success).toBe(false)
  })

  it("rejeita sem administração com % do primeiro aluguel acima de 100", () => {
    const result = locacaoFormSchema.safeParse({ ...validSemAdministracao, percentualPrimeiroAluguel: 101 })
    expect(result.success).toBe(false)
  })

  it("temporada marcada como sem administração ainda exige comissão", () => {
    const result = locacaoFormSchema.safeParse({
      ...validTemporada,
      percentualComissao: undefined,
      semAdministracao: true,
      percentualPrimeiroAluguel: 60,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita numMoradores < 1", () => {
    const result = locacaoFormSchema.safeParse({ ...validTemporada, numMoradores: 0 })
    expect(result.success).toBe(false)
  })
})
