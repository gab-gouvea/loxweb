import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReservationExtensionsSection } from "../reservation-extensions-section"
import type { Reservation } from "@/types/reservation"

/** Reserva com duas extensões: a primeira já recebida, a segunda não. */
function makeReservation(): Reservation {
  return {
    id: "r1",
    propriedadeId: "p1",
    nomeHospede: "Andreia",
    checkIn: new Date(2026, 8, 18).toISOString(),
    checkOut: new Date(2026, 9, 5).toISOString(),
    status: "confirmada",
    precoTotal: 1000,
    percentualComissao: 15,
    pagamentoRecebido: false,
    extensoes: [
      { dataInicio: new Date(2026, 8, 20).toISOString(), valor: 300, pagamentoRecebido: true },
      { dataInicio: new Date(2026, 9, 1).toISOString(), valor: 400 },
    ],
  } as Reservation
}

function montar() {
  const onMutate = vi.fn()
  render(
    <ReservationExtensionsSection
      reservation={makeReservation()}
      onMutate={onMutate}
      isPending={false}
    />,
  )
  return { onMutate, user: userEvent.setup() }
}

describe("confirmação de pagamento por extensão", () => {
  it("mostra um botão de confirmar para cada extensão", () => {
    montar()
    const confirmar = screen.getAllByRole("button", { name: "Confirmar pagamento" })
    const desmarcar = screen.getAllByRole("button", { name: "Desmarcar pagamento" })
    // A primeira já está recebida, a segunda não
    expect(desmarcar).toHaveLength(1)
    expect(confirmar).toHaveLength(1)
  })

  it("confirmar uma extensão não mexe no estado da outra", async () => {
    const { onMutate, user } = montar()
    await user.click(screen.getByRole("button", { name: "Confirmar pagamento" }))

    expect(onMutate).toHaveBeenCalledTimes(1)
    const enviado = onMutate.mock.calls[0][0] as { extensoes: { valor: number; pagamentoRecebido?: boolean }[] }
    expect(enviado.extensoes).toHaveLength(2)
    expect(enviado.extensoes[0]).toMatchObject({ valor: 300, pagamentoRecebido: true })
    expect(enviado.extensoes[1]).toMatchObject({ valor: 400, pagamentoRecebido: true })
  })

  it("desmarcar volta só a extensão escolhida para não recebida", async () => {
    const { onMutate, user } = montar()
    await user.click(screen.getByRole("button", { name: "Desmarcar pagamento" }))

    const enviado = onMutate.mock.calls[0][0] as { extensoes: { valor: number; pagamentoRecebido?: boolean }[] }
    expect(enviado.extensoes[0]).toMatchObject({ valor: 300, pagamentoRecebido: false })
    expect(enviado.extensoes[1]).toMatchObject({ valor: 400 })
    expect(enviado.extensoes[1].pagamentoRecebido).toBeFalsy()
  })

  it("editar a extensão já confirmada não apaga a confirmação dela", async () => {
    // A extensão editada é a última — é ela que corre risco de perder o flag ao ser recriada
    const onMutate = vi.fn()
    const reserva = makeReservation()
    reserva.extensoes![1] = { ...reserva.extensoes![1], pagamentoRecebido: true }
    render(
      <ReservationExtensionsSection reservation={reserva} onMutate={onMutate} isPending={false} />,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Editar extensão" }))
    const valor = screen.getByPlaceholderText("R$") as HTMLInputElement
    await user.clear(valor)
    await user.type(valor, "500")
    const data = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(data, { target: { value: "2026-10-10" } })
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    const enviado = onMutate.mock.calls[0][0] as { extensoes: { valor: number; pagamentoRecebido?: boolean }[] }
    expect(enviado.extensoes[1]).toMatchObject({ valor: 500, pagamentoRecebido: true })
    // E a outra continua intacta
    expect(enviado.extensoes[0]).toMatchObject({ valor: 300, pagamentoRecebido: true })
  })
})
