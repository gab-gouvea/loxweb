import type { Reservation, ReservationFormData } from "@/types/reservation"
import type { ReservationService } from "../reservation-service"
import { mockDelay } from "./delay"
import { initialReservations } from "./mock-data"

export class MockReservationService implements ReservationService {
  private reservations: Reservation[] = [...initialReservations]

  async getAll(): Promise<Reservation[]> {
    await mockDelay()
    return [...this.reservations]
  }

  async getById(id: string): Promise<Reservation | null> {
    await mockDelay()
    return this.reservations.find((r) => r.id === id) ?? null
  }

  async getByPropertyId(propertyId: string): Promise<Reservation[]> {
    await mockDelay()
    return this.reservations.filter((r) => r.propriedadeId === propertyId)
  }

  async getByDateRange(start: string, end: string): Promise<Reservation[]> {
    await mockDelay()
    return this.reservations.filter((r) => r.checkOut > start && r.checkIn < end)
  }

  async create(data: ReservationFormData): Promise<Reservation> {
    await mockDelay()
    const reservation: Reservation = {
      ...data,
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    }
    this.reservations.push(reservation)
    return reservation
  }

  async update(id: string, data: Partial<ReservationFormData>): Promise<Reservation> {
    await mockDelay()
    const index = this.reservations.findIndex((r) => r.id === id)
    if (index === -1) throw new Error("Reserva não encontrada")
    this.reservations[index] = {
      ...this.reservations[index],
      ...data,
      atualizadoEm: new Date().toISOString(),
    }
    return this.reservations[index]
  }

  async delete(id: string): Promise<void> {
    await mockDelay()
    this.reservations = this.reservations.filter((r) => r.id !== id)
  }
}
