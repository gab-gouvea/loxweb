import { useMemo } from "react"
import { useProperties } from "./use-properties"
import type { Property } from "@/types/property"

export function usePropertyMap() {
  const { data: properties = [] } = useProperties()

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) map.set(p.id, p)
    return map
  }, [properties])

  return { properties, propertyMap }
}
