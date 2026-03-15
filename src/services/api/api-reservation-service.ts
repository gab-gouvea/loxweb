import { api } from "@/lib/api"
import type { Reservation, ReservationFormData } from "@/types/reservation"
import type { ReservationService } from "../reservation-service"

export class ApiReservationService implements ReservationService {
  async getAll(): Promise<Reservation[]> {
    const { data } = await api.get<Reservation[]>("/reservations")
    return data
  }

  async getById(id: string): Promise<Reservation | null> {
    const { data } = await api.get<Reservation>(`/reservations/${id}`)
    return data
  }

  async getByPropertyId(propertyId: string): Promise<Reservation[]> {
    const { data } = await api.get<Reservation[]>("/reservations", {
      params: { propertyId },
    })
    return data
  }

  async getByDateRange(start: string, end: string): Promise<Reservation[]> {
    const { data } = await api.get<Reservation[]>("/reservations", {
      params: { start, end },
    })
    return data
  }

  async create(formData: ReservationFormData): Promise<Reservation> {
    const { data } = await api.post<Reservation>("/reservations", formData)
    return data
  }

  async update(id: string, formData: Partial<ReservationFormData> & Partial<Reservation>): Promise<Reservation> {
    const { data } = await api.put<Reservation>(`/reservations/${id}`, formData)
    return data
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/reservations/${id}`)
  }
}
