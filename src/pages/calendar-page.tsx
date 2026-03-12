import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { addDays } from "date-fns"
import { useCalendarStore } from "@/hooks/use-calendar-store"
import { useReservationsByDateRange } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { useProprietarios } from "@/hooks/use-proprietarios"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { CalendarGrid } from "@/components/calendar/calendar-grid"
import { ReservationDialog } from "@/components/reservations/reservation-dialog"

export function CalendarPage() {
  const navigate = useNavigate()
  const { startDate, visibleDays, selectedPropertyIds, showCheckoutsFaxinas } = useCalendarStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultCheckIn, setDefaultCheckIn] = useState<Date | undefined>()

  const dateRange = useMemo(() => {
    const start = startDate.toISOString()
    const end = addDays(startDate, visibleDays).toISOString()
    return { start, end }
  }, [startDate, visibleDays])

  const { data: allReservations = [] } = useReservationsByDateRange(dateRange.start, dateRange.end)
  const { data: properties = [] } = useProperties()
  const { data: proprietarios = [] } = useProprietarios()

  const ownerNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of proprietarios) {
      map.set(p.id, p.nomeCompleto)
    }
    return map
  }, [proprietarios])

  const reservations = useMemo(() => {
    return allReservations.filter((r) => r.status !== "cancelada")
  }, [allReservations])

  const filteredProperties = useMemo(() => {
    if (!selectedPropertyIds) return properties
    return properties.filter((p) => selectedPropertyIds.includes(p.id))
  }, [properties, selectedPropertyIds])

  function handleDayClick(date: Date) {
    setDefaultCheckIn(date)
    setDialogOpen(true)
  }

  function handleReservationClick(reservationId: string) {
    navigate(`/reservas/${reservationId}`)
  }

  function handleNewReservation() {
    setDefaultCheckIn(undefined)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setDefaultCheckIn(undefined)
    }
  }

  return (
    <div className="space-y-4">
      <CalendarHeader onNewReservation={handleNewReservation} />
      <CalendarGrid
        startDate={startDate}
        visibleDays={visibleDays}
        reservations={reservations}
        properties={filteredProperties}
        ownerNames={ownerNames}
        onDayClick={handleDayClick}
        onReservationClick={handleReservationClick}
        showCheckoutsFaxinas={showCheckoutsFaxinas}
      />

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        defaultCheckIn={defaultCheckIn}
      />
    </div>
  )
}
