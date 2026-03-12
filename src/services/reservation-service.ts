import type { Reservation, ReservationFormData } from "@/types/reservation"
import { MockReservationService } from "./mock/mock-reservations"

export interface ReservationService {
  getAll(): Promise<Reservation[]>
  getById(id: string): Promise<Reservation | null>
  getByPropertyId(propertyId: string): Promise<Reservation[]>
  getByDateRange(start: string, end: string): Promise<Reservation[]>
  create(data: ReservationFormData): Promise<Reservation>
  update(id: string, data: Partial<ReservationFormData> & Partial<Reservation>): Promise<Reservation>
  delete(id: string): Promise<void>
}

export const reservationService: ReservationService = new MockReservationService()
