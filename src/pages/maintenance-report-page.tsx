import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Wrench, Check, X } from "lucide-react"
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProperties } from "@/hooks/use-properties"
import { useMaintenanceRecords, useUpdateMaintenanceRecord } from "@/hooks/use-property-details"
import { formatDate } from "@/lib/date-utils"
import type { Property } from "@/types/property"
import type { MaintenanceRecord } from "@/types/property-detail"

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function MaintenanceReportPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")

  const { data: properties = [] } = useProperties()
  const updateMaintenanceRecord = useUpdateMaintenanceRecord()

  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>()
    for (const p of properties) map.set(p.id, p)
    return map
  }, [properties])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: maintenanceRecords = [] } = useMaintenanceRecords(
    monthStart.toISOString(),
    monthEnd.toISOString(),
    propertyFilter !== "todos" ? propertyFilter : undefined,
  )

  const maintenanceByProperty = useMemo(() => {
    const groups = new Map<string, MaintenanceRecord[]>()
    for (const m of maintenanceRecords) {
      const existing = groups.get(m.propriedadeId) || []
      existing.push(m)
      groups.set(m.propriedadeId, existing)
    }
    return groups
  }, [maintenanceRecords])

  const maintenancePropertyIds = useMemo(() => {
    return Array.from(maintenanceByProperty.keys())
  }, [maintenanceByProperty])

  const maintenanceSummary = useMemo(() => {
    const total = maintenanceRecords.reduce((sum, m) => sum + m.valor, 0)
    const pendente = maintenanceRecords.filter((m) => !m.pago).reduce((sum, m) => sum + m.valor, 0)
    return { total, pendente }
  }, [maintenanceRecords])

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Header with tab navigation */}
      <div className="flex items-center gap-6 border-b">
        <Link
          to="/relatorios"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Recebimentos
        </Link>
        <span className="pb-2 text-sm font-medium border-b-2 border-primary">
          Manutenções
        </span>
        <Link
          to="/relatorios/despesas"
          className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Despesas
        </Link>
      </div>

      {/* Month navigation + property filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize">
            {monthLabel}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
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
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Manutenções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(maintenanceSummary.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagamento Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${maintenanceSummary.pendente > 0 ? "text-red-600" : ""}`}>
              {formatCurrency(maintenanceSummary.pendente)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance grouped by property */}
      {maintenancePropertyIds.map((propertyId) => {
        const property = propertyMap.get(propertyId)
        if (!property) return null
        const propMaintenance = maintenanceByProperty.get(propertyId) || []

        return (
          <div key={propertyId} className="space-y-3">
            <h3 className="text-lg font-semibold">{property.nome}</h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Prestador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propMaintenance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.nomeServico}</TableCell>
                      <TableCell>{record.prestador || "—"}</TableCell>
                      <TableCell>{formatDate(record.data)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${record.pago ? "text-green-600" : "text-red-500"}`}
                          onClick={() =>
                            updateMaintenanceRecord.mutate({
                              id: record.id,
                              data: { pago: !record.pago },
                            })
                          }
                          disabled={updateMaintenanceRecord.isPending}
                        >
                          {record.pago ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )
      })}

      {maintenancePropertyIds.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          Nenhuma manutenção registrada neste período.
        </div>
      )}
    </div>
  )
}
