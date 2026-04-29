import { describe, it, expect } from "vitest"
import { calcProximoReajuste, shouldAlertReajuste } from "../locacao-reajuste"

describe("calcProximoReajuste", () => {
  it("retorna checkIn + 12 meses quando ultimoReajuste é undefined", () => {
    const result = calcProximoReajuste("2025-04-01T03:00:00Z")
    expect(result).toBe("2026-04-01")
  })

  it("retorna checkIn + 12 meses quando ultimoReajuste é null", () => {
    const result = calcProximoReajuste("2025-04-01T03:00:00Z", null)
    expect(result).toBe("2026-04-01")
  })

  it("retorna ultimoReajuste + 12 meses quando ultimoReajuste é definido", () => {
    const result = calcProximoReajuste("2024-01-01T03:00:00Z", "2025-06-15T03:00:00Z")
    expect(result).toBe("2026-06-15")
  })

  it("aceita string YYYY-MM-DD para ultimoReajuste", () => {
    const result = calcProximoReajuste("2024-01-01T03:00:00Z", "2025-06-15")
    expect(result).toBe("2026-06-15")
  })

  it("preserva o dia ao avançar 12 meses (29 fev → 28 fev)", () => {
    // 29/02/2024 (ano bissexto) + 12 meses = 28/02/2025
    const result = calcProximoReajuste("2024-02-29T03:00:00Z")
    expect(result).toBe("2025-02-28")
  })
})

describe("shouldAlertReajuste", () => {
  const checkOut = "2027-12-31T03:00:00Z"

  it("retorna true quando reajuste é hoje", () => {
    expect(shouldAlertReajuste("2026-04-28", checkOut, "2026-04-28")).toBe(true)
  })

  it("retorna true quando reajuste é em 30 dias (limite da janela)", () => {
    expect(shouldAlertReajuste("2026-05-28", checkOut, "2026-04-28")).toBe(true)
  })

  it("retorna false quando reajuste é em 31 dias (fora da janela)", () => {
    expect(shouldAlertReajuste("2026-05-29", checkOut, "2026-04-28")).toBe(false)
  })

  it("retorna true quando reajuste já passou (atraso)", () => {
    expect(shouldAlertReajuste("2026-04-01", checkOut, "2026-04-28")).toBe(true)
  })

  it("retorna false quando reajuste cai depois do checkOut", () => {
    expect(shouldAlertReajuste("2028-05-01", "2027-12-31T03:00:00Z", "2027-11-01")).toBe(false)
  })

  it("retorna false quando reajuste cai exatamente no dia do checkOut", () => {
    // Locação termina nesse dia — não faz sentido reajustar
    expect(shouldAlertReajuste("2027-12-31", "2027-12-31T03:00:00Z", "2027-12-15")).toBe(false)
  })

  it("aceita janela customizada", () => {
    expect(shouldAlertReajuste("2026-06-01", checkOut, "2026-04-28", 60)).toBe(true)
    expect(shouldAlertReajuste("2026-07-01", checkOut, "2026-04-28", 60)).toBe(false)
  })
})
