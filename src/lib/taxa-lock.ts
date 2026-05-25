import { toLocalDateStr } from "@/lib/date-utils"

/** Retorna true se o valor antigo da taxa deve ser travado nas reservas/locações passadas. */
export function shouldLockTaxa(
  oldTaxa: number | null | undefined,
  newTaxa: number | null | undefined,
): boolean {
  return oldTaxa != null && oldTaxa !== newTaxa
}

/**
 * Filtra reservas/locações que precisam ter taxa travada:
 * - Pertencem à propriedade
 * - checkOut < hoje (já passadas)
 * - taxaLimpeza ainda null (não travada ainda)
 */
export function getItemsToLockTaxa<
  T extends { propriedadeId: string; checkOut: string; taxaLimpeza?: number | null },
>(items: T[] | undefined, propertyId: string, today: string): T[] {
  if (!items) return []
  return items.filter(
    (i) =>
      i.propriedadeId === propertyId &&
      i.taxaLimpeza == null &&
      toLocalDateStr(i.checkOut) < today,
  )
}
