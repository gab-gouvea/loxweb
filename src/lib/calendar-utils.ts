import { parseISO, startOfDay, differenceInCalendarDays } from "date-fns"
import type { Reservation, ReservationStatus } from "@/types/reservation"

export interface TimelineSegment {
  reservationId: string
  propertyId: string
  guestName: string
  status: ReservationStatus
  precoTotal: number | undefined
  startOffset: number
  endOffset: number
  isClippedStart: boolean
  isClippedEnd: boolean
  faxinaPorMim: boolean
}

export function computeTimelineSegments(
  reservations: Reservation[],
  startDate: Date,
  visibleDays: number,
): TimelineSegment[] {
  const segments: TimelineSegment[] = []

  for (const reservation of reservations) {
    const checkIn = startOfDay(parseISO(reservation.checkIn))
    const checkOut = startOfDay(parseISO(reservation.checkOut))

    const rawStart = differenceInCalendarDays(checkIn, startDate)
    const rawEnd = differenceInCalendarDays(checkOut, startDate) + 1

    // Skip if completely outside visible range
    if (rawEnd <= 0 || rawStart >= visibleDays) continue

    const startOffset = Math.max(0, rawStart)
    const endOffset = Math.min(visibleDays, rawEnd)

    if (endOffset <= startOffset) continue

    segments.push({
      reservationId: reservation.id,
      propertyId: reservation.propriedadeId,
      guestName: reservation.nomeHospede,
      status: reservation.status,
      precoTotal: reservation.precoTotal,
      startOffset,
      endOffset,
      isClippedStart: rawStart < 0,
      isClippedEnd: rawEnd > visibleDays,
      faxinaPorMim: reservation.faxinaPorMim ?? false,
    })
  }

  return segments
}
