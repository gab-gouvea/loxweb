import { create } from "zustand"
import { addDays, subDays, startOfDay } from "date-fns"

interface CalendarState {
  startDate: Date
  visibleDays: number
  selectedPropertyIds: string[] | null
  selectedReservationId: string | null
  showCheckoutsFaxinas: boolean

  goForward: () => void
  goBack: () => void
  goToToday: () => void
  setStartDate: (date: Date) => void
  setPropertyFilter: (ids: string[] | null) => void
  setSelectedReservation: (id: string | null) => void
  toggleCheckoutsFaxinas: () => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  startDate: startOfDay(subDays(new Date(), 2)),
  visibleDays: 14,
  selectedPropertyIds: null,
  selectedReservationId: null,
  showCheckoutsFaxinas: false,

  goForward: () =>
    set((state) => ({ startDate: addDays(state.startDate, 7) })),
  goBack: () =>
    set((state) => ({ startDate: subDays(state.startDate, 7) })),
  goToToday: () =>
    set({ startDate: startOfDay(subDays(new Date(), 2)) }),
  setStartDate: (date) => set({ startDate: startOfDay(date) }),
  setPropertyFilter: (ids) => set({ selectedPropertyIds: ids }),
  setSelectedReservation: (id) => set({ selectedReservationId: id }),
  toggleCheckoutsFaxinas: () =>
    set((state) => ({ showCheckoutsFaxinas: !state.showCheckoutsFaxinas })),
}))
