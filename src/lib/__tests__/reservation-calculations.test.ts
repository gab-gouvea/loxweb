import { describe, it, expect } from "vitest"
import {
  calcFaxinaReceita,
  calcDespesas,
  calcValorPagamento,
  calcTotalRecebido,
} from "../reservation-calculations"
import type { Reservation } from "@/types/reservation"
import type { Property } from "@/types/property"

// --------------- helpers ---------------

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    propriedadeId: "p1",
    nomeHospede: "João",
    checkIn: "2026-04-01T03:00:00Z",
    checkOut: "2026-04-05T03:00:00Z",
    status: "confirmada",
    precoTotal: 1000,
    fonte: "airbnb",
    numHospedes: 2,
    faxinaPorMim: false,
    criadoEm: "2026-01-01T00:00:00Z",
    atualizadoEm: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "p1",
    nome: "Apto 101",
    endereco: "Rua A, 1",
    tipo: "apartamento",
    quartos: 2,
    percentualComissao: 20,
    taxaLimpeza: 150,
    temHobbyBox: false,
    ativo: true,
    criadoEm: "2026-01-01T00:00:00Z",
    atualizadoEm: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

// --------------- calcFaxinaReceita ---------------

describe("calcFaxinaReceita", () => {
  it("retorna 0 para reserva cancelada", () => {
    const r = makeReservation({ status: "cancelada", faxinaStatus: "agendada", faxinaPorMim: true })
    expect(calcFaxinaReceita(r, makeProperty())).toBe(0)
  })

  it("retorna 0 quando faxina não agendada", () => {
    const r = makeReservation({ faxinaStatus: "nao_agendada" })
    expect(calcFaxinaReceita(r, makeProperty())).toBe(0)
  })

  it("retorna 0 quando faxinaStatus undefined", () => {
    const r = makeReservation({ faxinaStatus: undefined })
    expect(calcFaxinaReceita(r, makeProperty())).toBe(0)
  })

  it("retorna taxaLimpeza integral quando faxinaPorMim", () => {
    const r = makeReservation({ faxinaStatus: "agendada", faxinaPorMim: true })
    const p = makeProperty({ taxaLimpeza: 200 })
    expect(calcFaxinaReceita(r, p)).toBe(200)
  })

  it("retorna taxaLimpeza - custoEmpresa quando empresa faz faxina", () => {
    const r = makeReservation({
      faxinaStatus: "agendada",
      faxinaPorMim: false,
      custoEmpresaFaxina: 80,
    })
    const p = makeProperty({ taxaLimpeza: 200 })
    expect(calcFaxinaReceita(r, p)).toBe(120)
  })

  it("retorna taxaLimpeza quando empresa sem custo definido", () => {
    const r = makeReservation({
      faxinaStatus: "concluida",
      faxinaPorMim: false,
      custoEmpresaFaxina: undefined,
    })
    const p = makeProperty({ taxaLimpeza: 150 })
    expect(calcFaxinaReceita(r, p)).toBe(150)
  })

  it("retorna 0 quando property undefined", () => {
    const r = makeReservation({ faxinaStatus: "agendada", faxinaPorMim: true })
    expect(calcFaxinaReceita(r, undefined)).toBe(0)
  })
})

// --------------- calcDespesas ---------------

describe("calcDespesas", () => {
  it("retorna zeros quando sem despesas", () => {
    expect(calcDespesas(makeReservation())).toEqual({ reembolsavel: 0, naoReembolsavel: 0 })
  })

  it("retorna zeros quando despesas array vazio", () => {
    expect(calcDespesas(makeReservation({ despesas: [] }))).toEqual({ reembolsavel: 0, naoReembolsavel: 0 })
  })

  it("soma despesas reembolsáveis e não reembolsáveis", () => {
    const r = makeReservation({
      despesas: [
        { descricao: "Toalha", valor: 50, reembolsavel: true },
        { descricao: "Lâmpada", valor: 30, reembolsavel: false },
        { descricao: "Travesseiro", valor: 40, reembolsavel: true },
        { descricao: "Fechadura", valor: 100, reembolsavel: false },
      ],
    })
    expect(calcDespesas(r)).toEqual({ reembolsavel: 90, naoReembolsavel: 130 })
  })

  it("soma apenas reembolsáveis quando todas são reembolsáveis", () => {
    const r = makeReservation({
      despesas: [
        { descricao: "A", valor: 10, reembolsavel: true },
        { descricao: "B", valor: 20, reembolsavel: true },
      ],
    })
    expect(calcDespesas(r)).toEqual({ reembolsavel: 30, naoReembolsavel: 0 })
  })
})

// --------------- calcValorPagamento ---------------

describe("calcValorPagamento", () => {
  it("calcula comissão + taxaLimpeza corretamente", () => {
    // precoTotal=1000, taxaLimpeza=150, baseComissao=850, 20% comissão = 170
    // valorPagamento = 170 + 150 = 320
    const r = makeReservation({ precoTotal: 1000, percentualComissao: 20 })
    const p = makeProperty({ taxaLimpeza: 150, percentualComissao: 20 })
    expect(calcValorPagamento(r, p)).toBe(320)
  })

  it("usa percentualComissao da reserva (não da propriedade)", () => {
    const r = makeReservation({ precoTotal: 1000, percentualComissao: 10 })
    const p = makeProperty({ taxaLimpeza: 150, percentualComissao: 20 })
    // baseComissao=850, 10% = 85, + 150 = 235
    expect(calcValorPagamento(r, p)).toBe(235)
  })

  it("fallback para percentualComissao da propriedade quando reserva não tem", () => {
    const r = makeReservation({ precoTotal: 1000, percentualComissao: null })
    const p = makeProperty({ taxaLimpeza: 150, percentualComissao: 20 })
    // baseComissao=850, 20% = 170, + 150 = 320
    expect(calcValorPagamento(r, p)).toBe(320)
  })

  it("baseComissao não fica negativa quando precoTotal < taxaLimpeza", () => {
    const r = makeReservation({ precoTotal: 100, percentualComissao: 20 })
    const p = makeProperty({ taxaLimpeza: 150 })
    // Math.max(0, 100 - 150) = 0, comissão = 0, + 150 = 150
    expect(calcValorPagamento(r, p)).toBe(150)
  })

  it("retorna 0 quando tudo undefined", () => {
    const r = makeReservation({ precoTotal: undefined, percentualComissao: null })
    expect(calcValorPagamento(r, undefined)).toBe(0)
  })

  it("calcula com precoTotal = 0", () => {
    const r = makeReservation({ precoTotal: 0, percentualComissao: 20 })
    const p = makeProperty({ taxaLimpeza: 100 })
    // baseComissao = max(0, 0-100) = 0, comissão = 0, + 100 = 100
    expect(calcValorPagamento(r, p)).toBe(100)
  })
})

// --------------- calcTotalRecebido ---------------

describe("calcTotalRecebido", () => {
  it("retorna valorRecebidoCancelamento para reserva cancelada", () => {
    const r = makeReservation({ status: "cancelada", valorRecebidoCancelamento: 250 })
    expect(calcTotalRecebido(r, makeProperty())).toBe(250)
  })

  it("retorna 0 para cancelada sem valorRecebidoCancelamento", () => {
    const r = makeReservation({ status: "cancelada" })
    expect(calcTotalRecebido(r, makeProperty())).toBe(0)
  })

  it("calcula comissão + faxina - despesas não reembolsáveis", () => {
    const r = makeReservation({
      precoTotal: 1000,
      percentualComissao: 20,
      faxinaStatus: "agendada",
      faxinaPorMim: true,
      despesas: [{ descricao: "Lampada", valor: 30, reembolsavel: false }],
    })
    const p = makeProperty({ taxaLimpeza: 150 })
    // comissão: (1000-150)*20/100 = 170
    // faxina: 150 (por mim)
    // despesas NR: 30
    // total = 170 + 150 - 30 = 290
    // Opa, calcTotalRecebido usa calcValorPagamento que é comissão + taxaLimpeza = 170 + 150 = 320
    // Não! Relendo o código: calcTotalRecebido calcula valorComissao separadamente, não chama calcValorPagamento
    // valorComissao = (850 * 20) / 100 = 170
    // receitaFaxina = 150 (por mim)
    // naoReembolsavel = 30
    // total = 170 + 150 - 30 = 290
    expect(calcTotalRecebido(r, p)).toBe(290)
  })

  it("sem faxina e sem despesas, retorna só comissão", () => {
    const r = makeReservation({
      precoTotal: 2000,
      percentualComissao: 15,
      faxinaStatus: "nao_agendada",
    })
    const p = makeProperty({ taxaLimpeza: 200 })
    // baseComissao = 2000-200 = 1800, 15% = 270
    // faxina = 0 (não agendada)
    // despesas NR = 0
    // total = 270
    expect(calcTotalRecebido(r, p)).toBe(270)
  })
})
