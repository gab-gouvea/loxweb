import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { addDays } from "date-fns"
import { useCalendarStore } from "@/hooks/use-calendar-store"
import { useReservationsByDateRange } from "@/hooks/use-reservations"
import { useLocacoesByDateRange } from "@/hooks/use-locacoes"
import { useProperties } from "@/hooks/use-properties"
import { useProprietarioMap } from "@/hooks/use-proprietario-map"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { CalendarGrid } from "@/components/calendar/calendar-grid"
import { ReservationDialog } from "@/components/reservations/reservation-dialog"
import { LocacaoDialog } from "@/components/locacoes/locacao-dialog"

export function CalendarPage() {
  const navigate = useNavigate()
  const { startDate, visibleDays, selectedPropertyIds, showCheckoutsFaxinas } = useCalendarStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [locacaoDialogOpen, setLocacaoDialogOpen] = useState(false)
  const [defaultCheckIn, setDefaultCheckIn] = useState<Date | undefined>()
  const [defaultPropertyId, setDefaultPropertyId] = useState<string | undefined>()

  const dateRange = useMemo(() => {
    // Fetch 1 day before to catch reservations whose checkout falls on startDate
    // (the bar renders checkout day, but the API uses checkOut > start which misses exact matches)
    const start = addDays(startDate, -1).toISOString()
    const end = addDays(startDate, visibleDays).toISOString()
    return { start, end }
  }, [startDate, visibleDays])

  const { data: allReservations = [] } = useReservationsByDateRange(dateRange.start, dateRange.end)
  const { data: allLocacoes = [] } = useLocacoesByDateRange(dateRange.start, dateRange.end)
  const { data: properties = [] } = useProperties()
  const { proprietarioMap } = useProprietarioMap()

  const reservations = useMemo(() => {
    return allReservations.filter((r) => r.status !== "cancelada")
  }, [allReservations])

  const locacoes = allLocacoes

  const filteredProperties = useMemo(() => {
    const active = properties.filter((p) => p.ativo)
    const list = !selectedPropertyIds
      ? [...active]
      : active.filter((p) => selectedPropertyIds.includes(p.id))
    // Sort by owner name
    return list.sort((a, b) => {
      const ownerA = proprietarioMap.get(a.proprietarioId ?? "")?.nomeCompleto ?? ""
      const ownerB = proprietarioMap.get(b.proprietarioId ?? "")?.nomeCompleto ?? ""
      return ownerA.localeCompare(ownerB, "pt-BR")
    })
  }, [properties, selectedPropertyIds, proprietarioMap])

  function handleDayClick(date: Date, propertyId: string) {
    setDefaultCheckIn(date)
    setDefaultPropertyId(propertyId)
    setDialogOpen(true)
  }

  function handleReservationClick(reservationId: string) {
    navigate(`/reservas/${reservationId}`)
  }

  function handleLocacaoClick(locacaoId: string) {
    navigate(`/longatemporada/${locacaoId}`)
  }

  function handleNewReservation() {
    setDefaultCheckIn(undefined)
    setDefaultPropertyId(undefined)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setDefaultCheckIn(undefined)
      setDefaultPropertyId(undefined)
    }
  }

  return (
    <div className="space-y-4">
      <CalendarHeader onNewReservation={handleNewReservation} onNewLocacao={() => setLocacaoDialogOpen(true)} />
      <CalendarGrid
        startDate={startDate}
        visibleDays={visibleDays}
        reservations={reservations}
        locacoes={locacoes}
        properties={filteredProperties}
        proprietarioMap={proprietarioMap}
        onDayClick={handleDayClick}
        onReservationClick={handleReservationClick}
        onLocacaoClick={handleLocacaoClick}
        showCheckoutsFaxinas={showCheckoutsFaxinas}
      />

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        defaultCheckIn={defaultCheckIn}
        defaultPropertyId={defaultPropertyId}
      />

      <LocacaoDialog
        open={locacaoDialogOpen}
        onOpenChange={setLocacaoDialogOpen}
      />
    </div>
  )
}
