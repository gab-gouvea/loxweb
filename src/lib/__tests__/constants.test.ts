import { describe, it, expect } from "vitest"
import { formatCurrency, formatCpf } from "../constants"

describe("formatCurrency", () => {
  it("formata valor inteiro", () => {
    expect(formatCurrency(1000)).toBe("R$ 1.000,00")
  })

  it("formata valor com centavos", () => {
    expect(formatCurrency(1234.56)).toBe("R$ 1.234,56")
  })

  it("formata zero", () => {
    expect(formatCurrency(0)).toBe("R$ 0,00")
  })

  it("formata valor grande", () => {
    expect(formatCurrency(999999.99)).toBe("R$ 999.999,99")
  })

  it("formata valor pequeno", () => {
    expect(formatCurrency(0.5)).toBe("R$ 0,50")
  })
})

describe("formatCpf", () => {
  it("formata CPF com 11 dígitos", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01")
  })

  it("formata CPF já formatado (extrai dígitos)", () => {
    expect(formatCpf("123.456.789-01")).toBe("123.456.789-01")
  })

  it("retorna traço quando undefined", () => {
    expect(formatCpf(undefined)).toBe("—")
  })

  it("retorna traço quando string vazia", () => {
    expect(formatCpf("")).toBe("—")
  })

  it("formata CPF parcial", () => {
    // Com 9 dígitos deve aplicar o que conseguir
    const result = formatCpf("123456789")
    expect(result).toBe("123.456.789")
  })
})
