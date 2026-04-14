import { describe, it, expect } from "vitest"
import { groupByProperty } from "../collection-utils"

describe("groupByProperty", () => {
  it("agrupa itens por propriedadeId", () => {
    const items = [
      { propriedadeId: "p1", nome: "A" },
      { propriedadeId: "p2", nome: "B" },
      { propriedadeId: "p1", nome: "C" },
    ]
    const result = groupByProperty(items)
    expect(result.size).toBe(2)
    expect(result.get("p1")).toHaveLength(2)
    expect(result.get("p2")).toHaveLength(1)
  })

  it("retorna mapa vazio para array vazio", () => {
    const result = groupByProperty([])
    expect(result.size).toBe(0)
  })

  it("mantém a ordem dos itens dentro do grupo", () => {
    const items = [
      { propriedadeId: "p1", valor: 10 },
      { propriedadeId: "p1", valor: 20 },
      { propriedadeId: "p1", valor: 30 },
    ]
    const result = groupByProperty(items)
    const group = result.get("p1")!
    expect(group.map((i) => i.valor)).toEqual([10, 20, 30])
  })
})
