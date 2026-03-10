import { cn } from "@/lib/utils"
import { propertyColors, type PropertyColor } from "@/types/property"
import { propertyColorMap } from "@/lib/colors"

interface PropertyColorPickerProps {
  value: PropertyColor
  onChange: (color: PropertyColor) => void
}

export function PropertyColorPicker({ value, onChange }: PropertyColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {propertyColors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-transform",
            propertyColorMap[color].bg,
            value === color ? "scale-110 border-foreground" : "border-transparent hover:scale-105",
          )}
        />
      ))}
    </div>
  )
}
