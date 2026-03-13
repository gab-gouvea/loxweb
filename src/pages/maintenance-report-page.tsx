import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Check, X, Trash2 } from "lucide-react"
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Link, useNavigate } from "react-router-dom"
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
import { useProperties } from "@/hooks/use-properties"
import { useMaintenanceRecords, useUpdateMaintenanceRecord, useDeleteMaintenanceRecord } from "@/hooks/use-property-details"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import type { Property } from "@/types/property"
import type { MaintenanceRecord } from "@/types/property-detail"

export function MaintenanceReportPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [pagoFilter, setPagoFilter] = useState<string>("todos")

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const { data: properties = [] } = useProperties()
  const updateMaintenanceRecord = useUpdateMaintenanceRecord()
  const deleteMaintenanceRecord = useDeleteMaintenanceRecord()

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

  const filteredRecords = useMemo(() => {
    if (pagoFilter === "todos") return maintenanceRecords
    const isPago = pagoFilter === "pago"
    return maintenanceRecords.filter((m) => m.pago === isPago)
  }, [maintenanceRecords, pagoFilter])

  const maintenanceByProperty = useMemo(() => {
    const groups = new Map<string, MaintenanceRecord[]>()
    for (const m of filteredRecords) {
      const existing = groups.get(m.propriedadeId) || []
      existing.push(m)
      groups.set(m.propriedadeId, existing)
    }
    return groups
  }, [filteredRecords])

  const maintenancePropertyIds = useMemo(() => {
    return Array.from(maintenanceByProperty.keys())
  }, [maintenanceByProperty])

  const maintenanceSummary = useMemo(() => {
    const total = filteredRecords.reduce((sum, m) => sum + m.valor, 0)
    const pendente = filteredRecords.filter((m) => !m.pago).reduce((sum, m) => sum + m.valor, 0)
    return { total, pendente }
  }, [filteredRecords])

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

        <div className="flex items-center gap-2">
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
