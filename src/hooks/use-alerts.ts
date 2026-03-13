import { useMemo } from "react"
import { useReservations } from "./use-reservations"
import { usePropertyMap } from "./use-property-map"
import { useAllPropertyComponents } from "./use-property-details"
import { toLocalDateStr, getTodayStr } from "@/lib/date-utils"

export type AlertType =
  | "checkin_hoje"
  | "checkout_hoje"
  | "faxina_hoje"
  | "faxina_nao_paga"
  | "manutencao_atrasada"

export interface Alert {
  id: string
  type: AlertType
  title: string
  description: string
  /** Link para navegar ao clicar */
  link?: string
}

const alertLabels: Record<AlertType, string> = {
  checkin_hoje: "Check-in Hoje",
  checkout_hoje: "Checkout Hoje",
  faxina_hoje: "Faxina Hoje",
  faxina_nao_paga: "Faxina Não Paga",
  manutencao_atrasada: "Manutenção Atrasada",
}

export function useAlerts() {
  const { data: reservations = [] } = useReservations()
  const { propertyMap } = usePropertyMap()
  const { data: components = [] } = useAllPropertyComponents()

  const alerts = useMemo(() => {
    const today = getTodayStr()
    const result: Alert[] = []

    // Reservas ativas (não canceladas)
    const ativas = reservations.filter(
      (r) => r.status !== "cancelada"
    )

    for (const r of ativas) {
      const checkInDate = toLocalDateStr(r.checkIn)
      const checkOutDate = toLocalDateStr(r.checkOut)
      const propNome = propertyMap.get(r.propriedadeId)?.nome ?? "Propriedade"

      // Check-in hoje
      if (checkInDate === today) {
        result.push({
          id: `checkin-${r.id}`,
          type: "checkin_hoje",
          title: alertLabels.checkin_hoje,
          description: `${r.nomeHospede} — ${propNome}`,
          link: `/reservas/${r.id}`,
        })
      }

      // Checkout hoje
      if (checkOutDate === today) {
        result.push({
          id: `checkout-${r.id}`,
          type: "checkout_hoje",
          title: alertLabels.checkout_hoje,
          description: `${r.nomeHospede} — ${propNome}`,
          link: `/reservas/${r.id}`,
        })
      }

      // Faxina hoje (agendada para hoje, exceto empresa parceira já paga)
      const empresaPaga = !r.faxinaPorMim && r.faxinaPaga === true
      if (
        r.faxinaData &&
        r.faxinaStatus === "agendada" &&
        toLocalDateStr(r.faxinaData) === today &&
        !empresaPaga
      ) {
        result.push({
          id: `faxina-hoje-${r.id}`,
          type: "faxina_hoje",
          title: alertLabels.faxina_hoje,
          description: `${r.nomeHospede} — ${propNome}`,
          link: `/reservas/${r.id}`,
        })
      }
    }

    // Faxinas não pagas (empresa parceira, não paga)
    for (const r of reservations) {
      if (
        !r.faxinaPorMim &&
        r.faxinaPaga === false &&
        r.faxinaStatus &&
        r.faxinaStatus !== "nao_agendada"
      ) {
        const propNome = propertyMap.get(r.propriedadeId)?.nome ?? "Propriedade"
        result.push({
          id: `faxina-paga-${r.id}`,
          type: "faxina_nao_paga",
          title: alertLabels.faxina_nao_paga,
          description: `${r.nomeHospede} — ${propNome}`,
          link: `/faxina-terceirizada/pagamentos`,
        })
      }
    }

    // Manutenções atrasadas
    for (const c of components) {
      const proxDate = toLocalDateStr(c.proximaManutencao)
      if (proxDate < today) {
        const propNome = propertyMap.get(c.propriedadeId)?.nome ?? "Propriedade"
        result.push({
          id: `manut-${c.id}`,
          type: "manutencao_atrasada",
          title: alertLabels.manutencao_atrasada,
          description: `${c.nome} — ${propNome}`,
          link: `/propriedades/${c.propriedadeId}`,
        })
      }
    }

    return result
  }, [reservations, components, propertyMap])

  return { alerts, count: alerts.length }
}
