import { useState, useMemo } from "react"
import { Check, X, Trash2 } from "lucide-react"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { MonthNavigation } from "@/components/shared/month-navigation"
import { TabNavigation } from "@/components/shared/tab-navigation"
import { SummaryCard } from "@/components/shared/summary-card"
import { PropertyFilterSelect } from "@/components/shared/property-filter-select"
import { Button } from "@/components/ui/button"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePropertyMap } from "@/hooks/use-property-map"
import { useMaintenanceRecords, useUpdateMaintenanceRecord, useDeleteMaintenanceRecord } from "@/hooks/use-property-details"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import { groupByProperty } from "@/lib/collection-utils"
import type { Property } from "@/types/property"
import type { MaintenanceRecord } from "@/types/property-detail"

export function MaintenanceReportPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [pagoFilter, setPagoFilter] = useState<string>("todos")

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const { properties, propertyMap } = usePropertyMap()
  const updateMaintenanceRecord = useUpdateMaintenanceRecord()
  const deleteMaintenanceRecord = useDeleteMaintenanceRecord()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: maintenanceRecords = [] } = useMaintenanceRecords(
    format(monthStart, "yyyy-MM-dd"),
    format(monthEnd, "yyyy-MM-dd"),
    propertyFilter !== "todos" ? propertyFilter : undefined,
  )

  const filteredRecords = useMemo(() => {
    if (pagoFilter === "todos") return maintenanceRecords
    const isPago = pagoFilter === "pago"
    return maintenanceRecords.filter((m) => m.pago === isPago)
  }, [maintenanceRecords, pagoFilter])

  const maintenanceByProperty = useMemo(() => groupByProperty(filteredRecords), [filteredRecords])

  const maintenancePropertyIds = useMemo(() => Array.from(maintenanceByProperty.keys()), [maintenanceByProperty])

  const maintenanceSummary = useMemo(() => {
    const total = filteredRecords.reduce((sum, m) => sum + m.valor, 0)
    const pendente = filteredRecords.filter((m) => !m.pago).reduce((sum, m) => sum + m.valor, 0)
    return { total, pendente }
  }, [filteredRecords])



  return (
    <div className="space-y-6">
      <TabNavigation tabs={[
        { label: "Recebimentos", to: "/relatorios" },
        { label: "Manutenções", to: "/relatorios/manutencoes" },
        { label: "Despesas", to: "/relatorios/despesas" },
      ]} />

      {/* Month navigation + property filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

        <div className="flex items-center gap-2">
          <PropertyFilterSelect value={propertyFilter} onValueChange={setPropertyFilter} properties={properties} />

          <Select value={pagoFilter} onValueChange={setPagoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="pago">Pagas</SelectItem>
              <SelectItem value="nao_pago">Não pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard title="Total Manutenções" value={formatCurrency(maintenanceSummary.total)} />
        <SummaryCard title="Pagamento Pendente" value={formatCurrency(maintenanceSummary.pendente)} valueClassName={maintenanceSummary.pendente > 0 ? "text-red-600" : ""} />
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
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propMaintenance.map((record) => (
                    <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/propriedades/${record.propriedadeId}`)}>
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
                          onClick={(e) => {
                            e.stopPropagation()
                            updateMaintenanceRecord.mutate({
                              id: record.id,
                              data: { pago: !record.pago },
                            })
                          }}
                          disabled={updateMaintenanceRecord.isPending}
                        >
                          {record.pago ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Remover registro"
                          onClick={(e) => { e.stopPropagation(); setDeletingId(record.id) }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro de manutenção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  deleteMaintenanceRecord.mutate(deletingId, {
                    onSuccess: () => setDeletingId(null),
                  })
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
