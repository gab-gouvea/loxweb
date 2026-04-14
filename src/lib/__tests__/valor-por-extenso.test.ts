import { describe, it, expect } from "vitest"
import { valorPorExtenso } from "../valor-por-extenso"

describe("valorPorExtenso", () => {
  it("zero reais", () => {
    expect(valorPorExtenso(0)).toBe("zero reais")
  })

  it("um real (singular)", () => {
    expect(valorPorExtenso(1)).toBe("Um real")
  })

  it("dois reais (plural)", () => {
    expect(valorPorExtenso(2)).toBe("Dois reais")
  })

  it("unidades simples", () => {
    expect(valorPorExtenso(5)).toBe("Cinco reais")
    expect(valorPorExtenso(9)).toBe("Nove reais")
  })

  it("especiais (10-19)", () => {
    expect(valorPorExtenso(10)).toBe("Dez reais")
    expect(valorPorExtenso(11)).toBe("Onze reais")
    expect(valorPorExtenso(15)).toBe("Quinze reais")
    expect(valorPorExtenso(19)).toBe("Dezenove reais")
  })

  it("dezenas redondas", () => {
    expect(valorPorExtenso(20)).toBe("Vinte reais")
    expect(valorPorExtenso(50)).toBe("Cinquenta reais")
    expect(valorPorExtenso(90)).toBe("Noventa reais")
  })

  it("dezenas com unidades", () => {
    expect(valorPorExtenso(21)).toBe("Vinte e um reais")
    expect(valorPorExtenso(37)).toBe("Trinta e sete reais")
    expect(valorPorExtenso(99)).toBe("Noventa e nove reais")
  })

  it("cem (exato)", () => {
    expect(valorPorExtenso(100)).toBe("Cem reais")
  })

  it("cento e ...", () => {
    expect(valorPorExtenso(101)).toBe("Cento e um reais")
    expect(valorPorExtenso(150)).toBe("Cento e cinquenta reais")
    expect(valorPorExtenso(199)).toBe("Cento e noventa e nove reais")
  })

  it("centenas redondas", () => {
    expect(valorPorExtenso(200)).toBe("Duzentos reais")
    expect(valorPorExtenso(500)).toBe("Quinhentos reais")
    expect(valorPorExtenso(900)).toBe("Novecentos reais")
  })

  it("mil exato", () => {
    expect(valorPorExtenso(1000)).toBe("Mil reais")
  })

  it("mil e centenas", () => {
    expect(valorPorExtenso(1500)).toBe("Mil quinhentos reais")
  })

  it("mil com valor < 100", () => {
    expect(valorPorExtenso(1050)).toBe("Mil e cinquenta reais")
  })

  it("milhares", () => {
    expect(valorPorExtenso(2000)).toBe("Dois mil reais")
    expect(valorPorExtenso(5000)).toBe("Cinco mil reais")
  })

  it("valor típico de reserva", () => {
    // 3.143,83
    expect(valorPorExtenso(3143.83)).toBe(
      "Três mil cento e quarenta e três reais e oitenta e três centavos"
    )
  })

  it("valor com centavos singular", () => {
    expect(valorPorExtenso(1.01)).toBe("Um real e um centavo")
  })

  it("valor com centavos plural", () => {
    expect(valorPorExtenso(5.50)).toBe("Cinco reais e cinquenta centavos")
  })

  it("apenas centavos", () => {
    expect(valorPorExtenso(0.99)).toBe("Noventa e nove centavos")
  })

  it("um milhão", () => {
    expect(valorPorExtenso(1000000)).toBe("Um milhão reais")
  })

  it("dois milhões", () => {
    expect(valorPorExtenso(2000000)).toBe("Dois milhões reais")
  })

  it("valor grande misto", () => {
    expect(valorPorExtenso(1234567.89)).toBe(
      "Um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais e oitenta e nove centavos"
    )
  })
})
