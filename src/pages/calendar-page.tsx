import { useState, useMemo } from "react"
import { addDays } from "date-fns"
import { useCalendarStore } from "@/hooks/use-calendar-store"
import { useReservationsByDateRange } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { CalendarGrid } from "@/components/calendar/calendar-grid"
import { ReservationDialog } from "@/components/reservations/reservation-dialog"
import type { Reservation } from "@/types/reservation"

export function CalendarPage() {
  const { startDate, visibleDays, selectedPropertyIds } = useCalendarStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | undefined>()
  const [defaultCheckIn, setDefaultCheckIn] = useState<Date | undefined>()

  const dateRange = useMemo(() => {
    const start = startDate.toISOString()
    const end = addDays(startDate, visibleDays).toISOString()
    return { start, end }
  }, [startDate, visibleDays])

  const { data: reservations = [] } = useReservationsByDateRange(dateRange.start, dateRange.end)
  const { data: properties = [] } = useProperties()

  const filteredProperties = useMemo(() => {
    if (!selectedPropertyIds) return properties
    return properties.filter((p) => selectedPropertyIds.includes(p.id))
  }, [properties, selectedPropertyIds])

  function handleDayClick(date: Date) {
    setEditingReservation(undefined)
    setDefaultCheckIn(date)
    setDialogOpen(true)
  }

  function handleReservationClick(reservationId: string) {
    const reservation = reservations.find((r) => r.id === reservationId)
    if (reservation) {
      setEditingReservation(reservation)
      setDefaultCheckIn(undefined)
      setDialogOpen(true)
    }
  }

  function handleNewReservation() {
    setEditingReservation(undefined)
    setDefaultCheckIn(undefined)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingReservation(undefined)
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
        onDayClick={handleDayClick}
        onReservationClick={handleReservationClick}
      />

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        reservation={editingReservation}
        defaultCheckIn={defaultCheckIn}
      />
    </div>
  )
}
