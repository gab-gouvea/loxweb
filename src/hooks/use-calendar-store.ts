import { create } from "zustand"
import { addMonths, subMonths, startOfMonth } from "date-fns"

interface CalendarState {
  currentMonth: Date
  selectedPropertyIds: string[] | null
  selectedReservationId: string | null

  setCurrentMonth: (month: Date) => void
  goToPreviousMonth: () => void
  goToNextMonth: () => void
  goToToday: () => void
  setPropertyFilter: (ids: string[] | null) => void
  setSelectedReservation: (id: string | null) => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  currentMonth: startOfMonth(new Date()),
  selectedPropertyIds: null,
  selectedReservationId: null,

  setCurrentMonth: (month) => set({ currentMonth: startOfMonth(month) }),
  goToPreviousMonth: () =>
    set((state) => ({ currentMonth: subMonths(state.currentMonth, 1) })),
  goToNextMonth: () =>
    set((state) => ({ currentMonth: addMonths(state.currentMonth, 1) })),
  goToToday: () => set({ currentMonth: startOfMonth(new Date()) }),
  setPropertyFilter: (ids) => set({ selectedPropertyIds: ids }),
  setSelectedReservation: (id) => set({ selectedReservationId: id }),
}))
