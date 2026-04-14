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

  it("rejeita anual com mais de 30 meses", () => {
    const result = locacaoFormSchema.safeParse({
      ...validAnual,
      checkIn: "2026-01-01",
      checkOut: "2028-08-01", // 31 meses
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

  it("rejeita numMoradores < 1", () => {
    const result = locacaoFormSchema.safeParse({ ...validTemporada, numMoradores: 0 })
    expect(result.success).toBe(false)
  })
})
