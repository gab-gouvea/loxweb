import type { PropertyColor } from "@/types/property"

export const propertyColorMap: Record<PropertyColor, { bg: string; text: string; light: string; border: string }> = {
  blue:   { bg: "bg-blue-500",   text: "text-blue-700",   light: "bg-blue-100",   border: "border-blue-500" },
  green:  { bg: "bg-green-500",  text: "text-green-700",  light: "bg-green-100",  border: "border-green-500" },
  orange: { bg: "bg-orange-500", text: "text-orange-700", light: "bg-orange-100", border: "border-orange-500" },
  purple: { bg: "bg-purple-500", text: "text-purple-700", light: "bg-purple-100", border: "border-purple-500" },
  pink:   { bg: "bg-pink-500",   text: "text-pink-700",   light: "bg-pink-100",   border: "border-pink-500" },
  teal:   { bg: "bg-teal-500",   text: "text-teal-700",   light: "bg-teal-100",   border: "border-teal-500" },
  red:    { bg: "bg-red-500",    text: "text-red-700",    light: "bg-red-100",    border: "border-red-500" },
  yellow: { bg: "bg-yellow-500", text: "text-yellow-700", light: "bg-yellow-100", border: "border-yellow-500" },
  indigo: { bg: "bg-indigo-500", text: "text-indigo-700", light: "bg-indigo-100", border: "border-indigo-500" },
  cyan:   { bg: "bg-cyan-500",   text: "text-cyan-700",   light: "bg-cyan-100",   border: "border-cyan-500" },
}
