import { describe, it, expect } from "vitest"
import { computeTimelineSegments } from "../calendar-utils"
import type { Reservation } from "@/types/reservation"
import type { Locacao } from "@/types/locacao"

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    propriedadeId: "p1",
    nomeHospede: "João",
    checkIn: "2026-04-10T03:00:00Z",
    checkOut: "2026-04-15T03:00:00Z",
    status: "confirmada",
    precoTotal: 1000,
    fonte: "airbnb",
    numHospedes: 2,
    faxinaPorMim: false,
    criadoEm: "2026-01-01T00:00:00Z",
    atualizadoEm: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("computeTimelineSegments", () => {
  const startDate = new Date(2026, 3, 9) // 9 de abril (Thu)

  it("cria segmento para reserva dentro do range visível", () => {
    const reservation = makeReservation()
    const segments = computeTimelineSegments([reservation], startDate, 10)
    expect(segments).toHaveLength(1)
    expect(segments[0].reservationId).toBe("r1")
    expect(segments[0].guestName).toBe("João")
  })

  it("ignora reserva completamente fora do range", () => {
    const reservation = makeReservation({
      checkIn: "2026-05-01T03:00:00Z",
      checkOut: "2026-05-05T03:00:00Z",
    })
    const segments = computeTimelineSegments([reservation], startDate, 10)
    expect(segments).toHaveLength(0)
  })

  it("clipa reserva que começa antes do range", () => {
    const reservation = makeReservation({
      checkIn: "2026-04-07T03:00:00Z",
      checkOut: "2026-04-12T03:00:00Z",
    })
    const segments = computeTimelineSegments([reservation], startDate, 10)
    expect(segments).toHaveLength(1)
    expect(segments[0].startOffset).toBe(0) // clipped to start
    expect(segments[0].isClippedStart).toBe(true)
  })

  it("detecta back-to-back entre reservas (divide célula ao meio)", () => {
    const r1 = makeReservation({
      id: "r1",
      checkIn: "2026-04-10T03:00:00Z",
      checkOut: "2026-04-13T03:00:00Z",
    })
    const r2 = makeReservation({
      id: "r2",
      checkIn: "2026-04-13T03:00:00Z",
      checkOut: "2026-04-16T03:00:00Z",
    })
    const segments = computeTimelineSegments([r1, r2], startDate, 10)
    expect(segments).toHaveLength(2)
    // r1 endOffset should be trimmed (checkout day = checkin day of r2)
    // r2 startOffset should be shifted by 0.5
    const seg1 = segments.find((s) => s.reservationId === "r1")!
    const seg2 = segments.find((s) => s.reservationId === "r2")!
    // Back-to-back: seg1 endOffset should have .5 and seg2 startOffset should have .5
    expect(seg2.startOffset % 1).toBe(0.5)
    expect(seg1.endOffset % 1).toBe(0.5)
  })

  it("detecta back-to-back cross-entity (reserva + locação)", () => {
    const reservation = makeReservation({
      checkIn: "2026-04-13T03:00:00Z",
      checkOut: "2026-04-16T03:00:00Z",
    })
    const locacao: Locacao = {
      id: "l1",
      propriedadeId: "p1",
      nomeCompleto: "Maria",
      checkIn: "2026-04-10T03:00:00Z",
      checkOut: "2026-04-13T03:00:00Z",
      status: "encerrada",
      criadoEm: "2026-01-01T00:00:00Z",
      atualizadoEm: "2026-01-01T00:00:00Z",
    }
    const segments = computeTimelineSegments([reservation], startDate, 10, [locacao])
    expect(segments).toHaveLength(1)
    // reservation starts on same day locação ends — should shift start by 0.5
    expect(segments[0].startOffset % 1).toBe(0.5)
  })
})
