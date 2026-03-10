import { useState, useMemo } from "react"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { useCalendarStore } from "@/hooks/use-calendar-store"
import { useReservationsByDateRange } from "@/hooks/use-reservations"
import { useProperties } from "@/hooks/use-properties"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { CalendarGrid } from "@/components/calendar/calendar-grid"
import { ReservationDialog } from "@/components/reservations/reservation-dialog"
import type { Reservation } from "@/types/reservation"

export function CalendarPage() {
  const { currentMonth, selectedPropertyIds } = useCalendarStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | undefined>()
  const [defaultCheckIn, setDefaultCheckIn] = useState<Date | undefined>()

  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const start = startOfWeek(monthStart, { weekStartsOn: 0 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return { start: start.toISOString(), end: end.toISOString() }
  }, [currentMonth])

  const { data: reservations = [] } = useReservationsByDateRange(dateRange.start, dateRange.end)
  const { data: properties = [] } = useProperties()

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
        currentMonth={currentMonth}
        reservations={reservations}
        properties={properties}
        selectedPropertyIds={selectedPropertyIds}
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
