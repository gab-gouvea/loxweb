import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { reservationService } from "@/services/reservation-service"
import type { Reservation, ReservationFormData } from "@/types/reservation"

export function useReservations() {
  return useQuery({
    queryKey: ["reservations"],
    queryFn: () => reservationService.getAll(),
  })
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ["reservations", id],
    queryFn: () => reservationService.getById(id),
    enabled: !!id,
  })
}

export function useReservationsByDateRange(start: string, end: string) {
  return useQuery({
    queryKey: ["reservations", "range", start, end],
    queryFn: () => reservationService.getByDateRange(start, end),
    enabled: !!start && !!end,
  })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ReservationFormData) => reservationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
    },
  })
}

export function useUpdateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReservationFormData> & Partial<Reservation> }) =>
      reservationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
    },
  })
}

export function useDeleteReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reservationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] })
    },
  })
}
