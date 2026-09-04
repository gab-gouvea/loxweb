import { describe, it, expect } from "vitest"
import type { Locacao } from "@/types/locacao"
import {
  calcReceitaNoMes,
  calcTaxaIntermediacao,
  getParcelaDate,
  getParcelasNoMes,
  getParcelasTaxa,
  getTaxaDate,
  getTaxaMesAno,
  getTaxaYM,
  hasRecebimentoNoMes,
  isSemAdministracao,
} from "../locacao-calculations"

/** Locação anual de 12 meses com check-in em 10/03/2026 e aluguel de R$ 2.500. */
function makeLocacao(overrides: Partial<Locacao> = {}): Locacao {
  return {
    id: "l1",
    propriedadeId: "p1",
    tipoLocacao: "anual",
    nomeCompleto: "Carlos Souza",
    checkIn: new Date(2026, 2, 10).toISOString(),
    checkOut: new Date(2027, 2, 10).toISOString(),
    tipoPagamento: "mensal",
    valorMensal: 2500,
    status: "ativa",
    criadoEm: new Date(2026, 1, 1).toISOString(),
    atualizadoEm: new Date(2026, 1, 1).toISOString(),
    ...overrides,
  } as Locacao
}

const semAdm = (overrides: Partial<Locacao> = {}) =>
  makeLocacao({ semAdministracao: true, percentualPrimeiroAluguel: 60, ...overrides })

describe("isSemAdministracao", () => {
  it("só vale para locação anual", () => {
    expect(isSemAdministracao(semAdm())).toBe(true)
    expect(isSemAdministracao(semAdm({ tipoLocacao: "temporada" }))).toBe(false)
    expect(isSemAdministracao(makeLocacao({ percentualComissao: 15 }))).toBe(false)
  })
})

describe("getTaxaMesAno", () => {
  it("usa o mês seguinte ao check-in quando não há mês gravado", () => {
    expect(getTaxaMesAno(semAdm())).toEqual({ mes: 4, ano: 2026 })
  })

  it("respeita o mês/ano gravados", () => {
    expect(getTaxaMesAno(semAdm({ mesTaxa: 6, anoTaxa: 2026 }))).toEqual({ mes: 6, ano: 2026 })
  })

  it("vira o ano quando o check-in é em dezembro", () => {
    const l = semAdm({ checkIn: new Date(2026, 11, 20).toISOString() })
    expect(getTaxaMesAno(l)).toEqual({ mes: 1, ano: 2027 })
  })

  it("formata o mês da taxa como yyyy-MM", () => {
    expect(getTaxaYM(semAdm())).toBe("2026-04")
  })
})

describe("getTaxaDate", () => {
  it("usa o dia do check-in dentro do mês da taxa", () => {
    const d = getTaxaDate(semAdm())
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 4, 10])
  })

  it("não estoura o fim do mês (31/jan → 28/fev)", () => {
    const l = semAdm({ checkIn: new Date(2026, 0, 31).toISOString() })
    const d = getTaxaDate(l)
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 2, 28])
  })
})

describe("calcTaxaIntermediacao", () => {
  it("aplica o percentual negociado sobre o primeiro aluguel", () => {
    expect(calcTaxaIntermediacao(semAdm({ percentualPrimeiroAluguel: 60 }))).toBe(1500)
    expect(calcTaxaIntermediacao(semAdm({ percentualPrimeiroAluguel: 100 }))).toBe(2500)
  })

  it("usa o valor total quando o pagamento é à vista", () => {
    const l = semAdm({ tipoPagamento: "avista", valorTotal: 30000, percentualPrimeiroAluguel: 10 })
    expect(calcTaxaIntermediacao(l)).toBe(3000)
  })
})

describe("hasRecebimentoNoMes — sem administração", () => {
  it("recebe só no mês da taxa", () => {
    const l = semAdm()
    expect(hasRecebimentoNoMes(l, "2026-03")).toBe(false) // mês do check-in
    expect(hasRecebimentoNoMes(l, "2026-04")).toBe(true)
    expect(hasRecebimentoNoMes(l, "2026-05")).toBe(false)
    expect(hasRecebimentoNoMes(l, "2026-12")).toBe(false)
  })

  it("segue o mês editado manualmente", () => {
    const l = semAdm({ mesTaxa: 6, anoTaxa: 2026 })
    expect(hasRecebimentoNoMes(l, "2026-04")).toBe(false)
    expect(hasRecebimentoNoMes(l, "2026-06")).toBe(true)
  })
})

describe("hasRecebimentoNoMes — com administração", () => {
  it("recebe em todo ciclo mensal até o checkout", () => {
    const l = makeLocacao({ percentualComissao: 15 })
    expect(hasRecebimentoNoMes(l, "2026-03")).toBe(true)
    expect(hasRecebimentoNoMes(l, "2026-04")).toBe(true)
    expect(hasRecebimentoNoMes(l, "2026-12")).toBe(true)
    expect(hasRecebimentoNoMes(l, "2027-03")).toBe(false) // mês do checkout não tem pagamento
    expect(hasRecebimentoNoMes(l, "2026-02")).toBe(false)
  })

  it("à vista recebe só no mês do check-in", () => {
    const l = makeLocacao({ tipoPagamento: "avista", valorTotal: 30000, percentualComissao: 15 })
    expect(hasRecebimentoNoMes(l, "2026-03")).toBe(true)
    expect(hasRecebimentoNoMes(l, "2026-04")).toBe(false)
  })
})

describe("calcReceitaNoMes", () => {
  it("sem administração: taxa única no mês da taxa, zero nos demais", () => {
    const l = semAdm()
    expect(calcReceitaNoMes(l, "2026-04")).toBe(1500)
    expect(calcReceitaNoMes(l, "2026-05")).toBe(0)
    expect(calcReceitaNoMes(l, "2026-03")).toBe(0)
  })

  it("com administração: comissão sobre o aluguel em todo mês", () => {
    const l = makeLocacao({ percentualComissao: 15 })
    expect(calcReceitaNoMes(l, "2026-04")).toBe(375)
  })

  it("o valor confirmado prevalece (preserva o histórico antes do reajuste)", () => {
    const l = makeLocacao({ percentualComissao: 15 })
    expect(calcReceitaNoMes(l, "2026-04", 300)).toBe(300)
  })

  it("valor confirmado não vaza para um mês sem recebimento", () => {
    const l = semAdm()
    expect(calcReceitaNoMes(l, "2026-05", 1500)).toBe(0)
  })
})

describe("parcelas da taxa", () => {
  it("registro sem parcelas vira uma parcela única com a taxa inteira", () => {
    const parcelas = getParcelasTaxa(semAdm())
    expect(parcelas).toHaveLength(1)
    expect(parcelas[0]).toMatchObject({ mes: 4, ano: 2026, valor: 1500 })
  })

  it("ordena as parcelas por ano e mês", () => {
    const l = semAdm({
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [
        { mes: 1, ano: 2027, valor: 500 },
        { mes: 11, ano: 2026, valor: 1250 },
        { mes: 10, ano: 2026, valor: 750 },
      ],
    })
    expect(getParcelasTaxa(l).map((p) => `${p.ano}-${p.mes}`)).toEqual(["2026-10", "2026-11", "2027-1"])
  })

  it("usa o dia do check-in quando a parcela não tem dia", () => {
    const l = semAdm({ parcelasTaxa: [{ mes: 10, ano: 2026, valor: 1500 }] })
    const d = getParcelaDate(l, getParcelasTaxa(l)[0])
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 10])
  })

  it("respeita o dia informado na parcela", () => {
    const l = semAdm({ parcelasTaxa: [{ dia: 25, mes: 10, ano: 2026, valor: 1500 }] })
    const d = getParcelaDate(l, getParcelasTaxa(l)[0])
    expect(d.getDate()).toBe(25)
  })
})

describe("taxa dividida em vários meses", () => {
  // 100% de R$ 2.500 dividido: metade em outubro, metade em novembro
  const dividida = semAdm({
    percentualPrimeiroAluguel: 100,
    parcelasTaxa: [
      { mes: 10, ano: 2026, valor: 1250 },
      { mes: 11, ano: 2026, valor: 1250 },
    ],
  })

  it("gera recebimento em cada mês de parcela", () => {
    expect(hasRecebimentoNoMes(dividida, "2026-10")).toBe(true)
    expect(hasRecebimentoNoMes(dividida, "2026-11")).toBe(true)
    expect(hasRecebimentoNoMes(dividida, "2026-09")).toBe(false)
    expect(hasRecebimentoNoMes(dividida, "2026-12")).toBe(false)
  })

  it("cada mês recebe o valor da sua parcela", () => {
    expect(calcReceitaNoMes(dividida, "2026-10")).toBe(1250)
    expect(calcReceitaNoMes(dividida, "2026-11")).toBe(1250)
    expect(calcReceitaNoMes(dividida, "2026-12")).toBe(0)
  })

  it("a soma das parcelas fecha a taxa total", () => {
    const soma = getParcelasTaxa(dividida).reduce((acc, p) => acc + p.valor, 0)
    expect(soma).toBe(calcTaxaIntermediacao(dividida))
  })

  it("soma parcelas que caem no mesmo mês", () => {
    const l = semAdm({
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [
        { dia: 5, mes: 10, ano: 2026, valor: 1000 },
        { dia: 20, mes: 10, ano: 2026, valor: 1500 },
      ],
    })
    expect(getParcelasNoMes(l, "2026-10")).toHaveLength(2)
    expect(calcReceitaNoMes(l, "2026-10")).toBe(2500)
  })

  it("divisão desigual (60/40) é respeitada", () => {
    const l = semAdm({
      percentualPrimeiroAluguel: 100,
      parcelasTaxa: [
        { mes: 10, ano: 2026, valor: 1500 },
        { mes: 11, ano: 2026, valor: 1000 },
      ],
    })
    expect(calcReceitaNoMes(l, "2026-10")).toBe(1500)
    expect(calcReceitaNoMes(l, "2026-11")).toBe(1000)
  })
})
