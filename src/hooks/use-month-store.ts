import { create } from "zustand"
import { startOfMonth } from "date-fns"

interface MonthState {
  currentMonth: Date
  setCurrentMonth: (month: Date) => void
}

function createMonthStore() {
  return create<MonthState>((set) => ({
    currentMonth: startOfMonth(new Date()),
    setCurrentMonth: (month) => set({ currentMonth: startOfMonth(month) }),
  }))
}

export const useReportsMonthStore = createMonthStore()
export const useMaintenanceReportMonthStore = createMonthStore()
export const useExpensesReportMonthStore = createMonthStore()
export const useFaxinaMonthStore = createMonthStore()
export const useFaxinaPagamentosMonthStore = createMonthStore()
export const useRecibosMonthStore = createMonthStore()
