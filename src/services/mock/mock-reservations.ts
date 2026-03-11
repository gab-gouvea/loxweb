import { startOfDay, parseISO } from "date-fns"
import type { Reservation, ReservationFormData, ReservationStatus } from "@/types/reservation"
import type { ReservationService } from "../reservation-service"
import { mockDelay } from "./delay"
import { initialReservations } from "./mock-data"

function computeAutoStatus(status: ReservationStatus, checkIn: string, checkOut: string): ReservationStatus {
  if (status === "cancelada" || status === "concluída" || status === "pendente") {
    return status
  }

  const today = startOfDay(new Date())
  const checkInDate = startOfDay(parseISO(checkIn))
  const checkOutDate = startOfDay(parseISO(checkOut))

  if (status === "confirmada") {
    if (today >= checkOutDate) return "concluída"
    if (today >= checkInDate) return "em andamento"
  }

  if (status === "em andamento") {
    if (today >= checkOutDate) return "concluída"
  }

  return status
}

function applyAutoStatus(reservation: Reservation): Reservation {
  const autoStatus = computeAutoStatus(reservation.status, reservation.checkIn, reservation.checkOut)
  if (autoStatus !== reservation.status) {
    return { ...reservation, status: autoStatus }
  }
  return reservation
}

export class MockReservationService implements ReservationService {
  private reservations: Reservation[] = [...initialReservations]

  async getAll(): Promise<Reservation[]> {
    await mockDelay()
    return this.reservations.map(applyAutoStatus)
  }

  async getById(id: string): Promise<Reservation | null> {
    await mockDelay()
    const r = this.reservations.find((r) => r.id === id)
    return r ? applyAutoStatus(r) : null
  }

  async getByPropertyId(propertyId: string): Promise<Reservation[]> {
    await mockDelay()
    return this.reservations
      .filter((r) => r.propriedadeId === propertyId)
      .map(applyAutoStatus)
  }

  async getByDateRange(start: string, end: string): Promise<Reservation[]> {
    await mockDelay()
    return this.reservations
      .filter((r) => r.checkOut > start && r.checkIn < end)
      .map(applyAutoStatus)
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
    return applyAutoStatus(this.reservations[index])
  }

  async delete(id: string): Promise<void> {
    await mockDelay()
    this.reservations = this.reservations.filter((r) => r.id !== id)
  }
}
