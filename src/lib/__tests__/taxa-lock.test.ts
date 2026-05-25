import { describe, it, expect } from "vitest"
import { shouldLockTaxa, getItemsToLockTaxa } from "../taxa-lock"

// --------------- shouldLockTaxa ---------------

describe("shouldLockTaxa", () => {
  it("retorna true quando taxa muda de um número para outro", () => {
    expect(shouldLockTaxa(100, 150)).toBe(true)
  })

  it("retorna true quando taxa muda de número para undefined", () => {
    expect(shouldLockTaxa(100, undefined)).toBe(true)
  })

  it("retorna true quando taxa muda de número para null", () => {
    expect(shouldLockTaxa(100, null)).toBe(true)
  })

  it("retorna true quando taxa muda para 0 (zero é diferente de 100)", () => {
    expect(shouldLockTaxa(100, 0)).toBe(true)
  })

  it("retorna false quando taxa é igual", () => {
    expect(shouldLockTaxa(150, 150)).toBe(false)
  })

  it("retorna false quando ambos são undefined", () => {
    expect(shouldLockTaxa(undefined, undefined)).toBe(false)
  })

  it("retorna false quando oldTaxa é undefined", () => {
    // Não há valor antigo para travar
    expect(shouldLockTaxa(undefined, 150)).toBe(false)
  })

  it("retorna false quando oldTaxa é null", () => {
    expect(shouldLockTaxa(null, 150)).toBe(false)
  })

  it("retorna true quando old=0 e new=100 (0 é valor válido)", () => {
    expect(shouldLockTaxa(0, 100)).toBe(true)
  })

  it("retorna false quando old=0 e new=0", () => {
    expect(shouldLockTaxa(0, 0)).toBe(false)
  })
})

// --------------- getItemsToLockTaxa ---------------

type Item = {
  id: string
  propriedadeId: string
  checkOut: string
  taxaLimpeza?: number | null
}

const today = "2026-05-25"

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "i1",
    propriedadeId: "p1",
    checkOut: "2026-04-01T03:00:00Z", // passada
    taxaLimpeza: null,
    ...overrides,
  }
}

describe("getItemsToLockTaxa", () => {
  it("retorna array vazio quando items é undefined", () => {
    expect(getItemsToLockTaxa(undefined, "p1", today)).toEqual([])
  })

  it("retorna array vazio quando items é vazio", () => {
    expect(getItemsToLockTaxa([], "p1", today)).toEqual([])
  })

  it("inclui item passado com taxaLimpeza null", () => {
    const items = [makeItem()]
    expect(getItemsToLockTaxa(items, "p1", today)).toHaveLength(1)
  })

  it("inclui item passado com taxaLimpeza undefined", () => {
    const items = [makeItem({ taxaLimpeza: undefined })]
    expect(getItemsToLockTaxa(items, "p1", today)).toHaveLength(1)
  })

  it("exclui item de outra propriedade", () => {
    const items = [makeItem({ propriedadeId: "p2" })]
    expect(getItemsToLockTaxa(items, "p1", today)).toEqual([])
  })

  it("exclui item futuro (checkOut > hoje)", () => {
    const items = [makeItem({ checkOut: "2026-08-01T03:00:00Z" })]
    expect(getItemsToLockTaxa(items, "p1", today)).toEqual([])
  })

  it("exclui item de hoje (checkOut == hoje, não é passado)", () => {
    const items = [makeItem({ checkOut: "2026-05-25T03:00:00Z" })]
    expect(getItemsToLockTaxa(items, "p1", today)).toEqual([])
  })

  it("exclui item já com taxaLimpeza travada (valor numérico)", () => {
    const items = [makeItem({ taxaLimpeza: 100 })]
    expect(getItemsToLockTaxa(items, "p1", today)).toEqual([])
  })

  it("exclui item travado com 0 (0 é considerado travado)", () => {
    const items = [makeItem({ taxaLimpeza: 0 })]
    expect(getItemsToLockTaxa(items, "p1", today)).toEqual([])
  })

  it("filtra mix corretamente", () => {
    const items = [
      makeItem({ id: "1" }), // passado, p1, null → inclui
      makeItem({ id: "2", propriedadeId: "p2" }), // outra propriedade → exclui
      makeItem({ id: "3", checkOut: "2026-12-01T03:00:00Z" }), // futuro → exclui
      makeItem({ id: "4", taxaLimpeza: 200 }), // já travada → exclui
      makeItem({ id: "5", checkOut: "2026-03-15T03:00:00Z" }), // passado, null → inclui
    ]
    const result = getItemsToLockTaxa(items, "p1", today)
    expect(result.map((i) => i.id)).toEqual(["1", "5"])
  })

  it("usa fronteira de timezone local (não UTC)", () => {
    // checkOut "2026-05-24T23:00:00Z" → no UTC-3 (Brasil) é 2026-05-24 20:00 local → passada
    // hoje = "2026-05-25"
    const items = [makeItem({ checkOut: "2026-05-24T23:00:00Z" })]
    expect(getItemsToLockTaxa(items, "p1", today)).toHaveLength(1)
  })

  it("preserva campos extras dos items (genérico)", () => {
    type Extra = Item & { custom: string }
    const items: Extra[] = [{ ...makeItem(), custom: "abc" }]
    const result = getItemsToLockTaxa(items, "p1", today)
    expect(result[0].custom).toBe("abc")
  })
})
