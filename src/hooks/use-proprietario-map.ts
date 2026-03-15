import { useMemo } from "react"
import { useProprietarios } from "./use-proprietarios"
import type { Proprietario } from "@/types/proprietario"

export function useProprietarioMap() {
  const { data: proprietarios = [] } = useProprietarios()

  const proprietarioMap = useMemo(() => {
    const map = new Map<string, Proprietario>()
    for (const p of proprietarios) map.set(p.id, p)
    return map
  }, [proprietarios])

  return { proprietarios, proprietarioMap }
}
