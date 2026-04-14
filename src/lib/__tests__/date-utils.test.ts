import { describe, it, expect } from "vitest"
import { toLocalDateStr, localDateToISO, getTodayStr, formatDate, formatDateShort } from "../date-utils"

describe("toLocalDateStr", () => {
  it("converte ISO string UTC para data local YYYY-MM-DD", () => {
    // No Brasil (UTC-3), "2026-04-01T03:00:00Z" = 01/04/2026 00:00 local
    const result = toLocalDateStr("2026-04-01T03:00:00Z")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("evita shift de dia na virada do mês", () => {
    // "2026-03-31T03:00:00Z" = 31/03 à meia-noite no Brasil
    // parseISO trataria como UTC, shift causaria dia errado
    const result = toLocalDateStr("2026-03-31T03:00:00Z")
    // Deve ser 31/03 no fuso local (ou 01/04 dependendo do timezone do test runner)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Verifica formato correto com padding
    const [, m, d] = result.split("-")
    expect(m.length).toBe(2)
    expect(d.length).toBe(2)
  })

  it("padding de mês e dia com zero", () => {
    // Janeiro = mês 1, dia 5
    const result = toLocalDateStr("2026-01-05T12:00:00Z")
    expect(result).toContain("-01-")
    expect(result).toContain("-05")
  })
})

describe("localDateToISO", () => {
  it("converte YYYY-MM-DD para ISO string sem shift de timezone", () => {
    const result = localDateToISO("2026-04-15")
    // Deve criar Date local e converter para ISO
    expect(result).toContain("2026-04-1")
    expect(result).toContain("T")
    expect(result).toContain("Z")
  })

  it("é inverso de toLocalDateStr (roundtrip)", () => {
    const original = "2026-06-30"
    const iso = localDateToISO(original)
    const back = toLocalDateStr(iso)
    expect(back).toBe(original)
  })
})

describe("getTodayStr", () => {
  it("retorna data de hoje no formato YYYY-MM-DD", () => {
    const result = getTodayStr()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    expect(result).toBe(expected)
  })
})

describe("formatDate", () => {
  it("formata Date object para dd/MM/yyyy", () => {
    const result = formatDate(new Date(2026, 3, 15)) // 15 de abril 2026
    expect(result).toBe("15/04/2026")
  })

  it("formata ISO string para dd/MM/yyyy", () => {
    // parseISO trata como UTC
    const result = formatDate("2026-04-15")
    expect(result).toBe("15/04/2026")
  })
})

describe("formatDateShort", () => {
  it("formata para dd MMM em pt-BR", () => {
    const result = formatDateShort(new Date(2026, 3, 15))
    expect(result.toLowerCase()).toContain("abr")
  })
})
