import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SummaryCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  valueClassName?: string
  onClick?: () => void
}

export function SummaryCard({ title, value, icon: Icon, valueClassName, onClick }: SummaryCardProps) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : undefined}
      onClick={onClick}
    >
      <CardHeader className={`${Icon ? "flex flex-row items-start justify-between pb-2 min-h-[3rem]" : ""}`}>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${valueClassName ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
