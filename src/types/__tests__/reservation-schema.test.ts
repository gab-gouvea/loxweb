import { describe, it, expect } from "vitest"
import { reservationFormSchema, despesaSchema } from "../reservation"

describe("despesaSchema", () => {
  it("valida despesa válida", () => {
    const result = despesaSchema.safeParse({
      descricao: "Lâmpada",
      valor: 30,
      reembolsavel: false,
    })
    expect(result.success).toBe(true)
  })

  it("rejeita despesa sem descrição", () => {
    const result = despesaSchema.safeParse({
      descricao: "",
      valor: 30,
      reembolsavel: false,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita valor negativo", () => {
    const result = despesaSchema.safeParse({
      descricao: "Teste",
      valor: -10,
      reembolsavel: false,
    })
    expect(result.success).toBe(false)
  })

  it("aceita mes e ano opcionais", () => {
    const result = despesaSchema.safeParse({
      descricao: "Água",
      valor: 100,
      reembolsavel: true,
      mes: 4,
      ano: 2026,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.mes).toBe(4)
      expect(result.data.ano).toBe(2026)
    }
  })
})

describe("reservationFormSchema", () => {
  const validData = {
    propriedadeId: "p1",
    nomeHospede: "João Silva",
    checkIn: "2026-04-10",
    checkOut: "2026-04-15",
    status: "confirmada" as const,
    fonte: "airbnb" as const,
    numHospedes: 2,
    faxinaPorMim: false,
  }

  it("valida dados válidos", () => {
    const result = reservationFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("rejeita propriedade vazia", () => {
    const result = reservationFormSchema.safeParse({ ...validData, propriedadeId: "" })
    expect(result.success).toBe(false)
  })

  it("rejeita nome hóspede vazio", () => {
    const result = reservationFormSchema.safeParse({ ...validData, nomeHospede: "" })
    expect(result.success).toBe(false)
  })

  it("rejeita checkOut antes do checkIn", () => {
    const result = reservationFormSchema.safeParse({
      ...validData,
      checkIn: "2026-04-15",
      checkOut: "2026-04-10",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita checkOut igual ao checkIn", () => {
    const result = reservationFormSchema.safeParse({
      ...validData,
      checkIn: "2026-04-10",
      checkOut: "2026-04-10",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita numHospedes < 1", () => {
    const result = reservationFormSchema.safeParse({ ...validData, numHospedes: 0 })
    expect(result.success).toBe(false)
  })

  it("aceita precoTotal como string vazia (para input limpo)", () => {
    const result = reservationFormSchema.safeParse({ ...validData, precoTotal: "" })
    expect(result.success).toBe(true)
  })

  it("aceita status válidos", () => {
    for (const status of ["pendente", "confirmada", "em andamento", "concluída", "cancelada"]) {
      const result = reservationFormSchema.safeParse({ ...validData, status })
      expect(result.success).toBe(true)
    }
  })

  it("rejeita status inválido", () => {
    const result = reservationFormSchema.safeParse({ ...validData, status: "inexistente" })
    expect(result.success).toBe(false)
  })

  it("aceita fontes válidas", () => {
    for (const fonte of ["airbnb", "booking", "direto", "outro"]) {
      const result = reservationFormSchema.safeParse({ ...validData, fonte })
      expect(result.success).toBe(true)
    }
  })
})
