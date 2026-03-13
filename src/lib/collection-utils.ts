/** Agrupa itens por propriedadeId em um Map */
export function groupByProperty<T extends { propriedadeId: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const existing = groups.get(item.propriedadeId) || []
    existing.push(item)
    groups.set(item.propriedadeId, existing)
  }
  return groups
}
