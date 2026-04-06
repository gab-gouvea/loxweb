import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLocacoes } from "@/hooks/use-locacoes"
import { usePropertyMap } from "@/hooks/use-property-map"
import { LocacaoDialog } from "@/components/locacoes/locacao-dialog"
import { LocacaoDeleteDialog } from "@/components/locacoes/locacao-delete-dialog"
import { LocacaoStatusBadge } from "@/components/locacoes/locacao-status-badge"
import { addMonths, parseISO } from "date-fns"
import { formatDate, toLocalDateStr } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/constants"
import type { Locacao, LocacaoStatus } from "@/types/locacao"

function calcValorTotal(loc: Locacao): number {
  if (loc.tipoPagamento === "avista") return loc.valorTotal ?? 0
  const checkIn = parseISO(toLocalDateStr(loc.checkIn))
  const checkOut = parseISO(toLocalDateStr(loc.checkOut))
  let meses = 0
  let cur = checkIn
  while (cur < checkOut) { meses++; cur = addMonths(cur, 1) }
  return (loc.valorMensal ?? 0) * meses
}

const PAGE_SIZE = 20

export function LocacoesPage() {
  const navigate = useNavigate()
  const { data: locacoes = [], isLoading } = useLocacoes()
  const { properties, propertyMap } = usePropertyMap()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingLocacao, setDeletingLocacao] = useState<Locacao | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [propertyFilter, setPropertyFilter] = useState<string>("todos")
  const [sortBy, setSortBy] = useState<string>("recente")
  const [searchName, setSearchName] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = locacoes
    if (statusFilter !== "todos") {
      result = result.filter((l) => l.status === statusFilter)
    }
    if (propertyFilter !== "todos") {
      result = result.filter((l) => l.propriedadeId === propertyFilter)
    }
    if (searchName.trim()) {
      const term = searchName.trim().toLowerCase()
      result = result.filter((l) => l.nomeCompleto.toLowerCase().includes(term))
    }

    switch (sortBy) {
      case "recente":
        return [...result].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      case "antigo":
        return [...result].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
      case "nome_az":
        return [...result].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR"))
      case "nome_za":
        return [...result].sort((a, b) => b.nomeCompleto.localeCompare(a.nomeCompleto, "pt-BR"))
      default:
        return result
    }
  }, [locacoes, statusFilter, propertyFilter, sortBy, searchName])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginatedLocacoes = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1) }
  const handlePropertyFilter = (v: string) => { setPropertyFilter(v); setPage(1) }
  const handleSortBy = (v: string) => { setSortBy(v); setPage(1) }
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchName(e.target.value); setPage(1) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Longa Temporada / Anual</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Locação
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por inquilino..."
            value={searchName}
            onChange={handleSearch}
            className="w-[200px] pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="encerrada">Encerrada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={handlePropertyFilter}>
          <SelectTrigger className="w-[200px]">
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

        <Select value={sortBy} onValueChange={handleSortBy}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recente">Mais recentes</SelectItem>
            <SelectItem value="antigo">Mais antigas</SelectItem>
            <SelectItem value="nome_az">Nome A → Z</SelectItem>
            <SelectItem value="nome_za">Nome Z → A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="max-w-[150px]">Inquilino</TableHead>
                <TableHead className="max-w-[130px]">Propriedade</TableHead>
                <TableHead className="whitespace-nowrap">Entrada</TableHead>
                <TableHead className="whitespace-nowrap">Saída</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right whitespace-nowrap">Valor</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLocacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma locação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLocacoes.map((locacao) => {
                  const property = propertyMap.get(locacao.propriedadeId)
                  return (
                    <TableRow
                      key={locacao.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/longatemporada/${locacao.id}`)}
                    >
                      <TableCell className="font-medium max-w-[150px] truncate">{locacao.nomeCompleto}</TableCell>
                      <TableCell className="max-w-[130px] truncate">{property?.nome}</TableCell>
                      <TableCell>{formatDate(locacao.checkIn)}</TableCell>
                      <TableCell>{formatDate(locacao.checkOut)}</TableCell>
                      <TableCell>
                        <LocacaoStatusBadge status={locacao.status as LocacaoStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(calcValorTotal(locacao))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingLocacao(locacao)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filtered.length} locaç{filtered.length !== 1 ? "ões" : "ão"} — Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <LocacaoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <LocacaoDeleteDialog
        open={!!deletingLocacao}
        onOpenChange={(open) => !open && setDeletingLocacao(null)}
        locacao={deletingLocacao}
      />
    </div>
  )
}
