import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Property } from "@/types/property"

interface PropertyFilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  properties: Property[]
}

export function PropertyFilterSelect({ value, onValueChange, properties }: PropertyFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Propriedade" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todas propriedades</SelectItem>
        {properties.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
