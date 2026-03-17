import { useMemo } from "react"
import { addDays, differenceInDays, format, parseISO } from "date-fns"
import { useReservations } from "./use-reservations"
import { usePropertyMap } from "./use-property-map"
import { useAllPropertyComponents, useAllPendingScheduledMaintenances } from "./use-property-details"
import { toLocalDateStr, getTodayStr } from "@/lib/date-utils"

export type AlertType =
  | "checkin_hoje"
  | "checkout_hoje"
  | "faxina_hoje"
  | "faxina_nao_paga"
  | "manutencao_atrasada"
  | "manutencao_agendada_hoje"
  | "manutencao_agendada_7dias"

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
  manutencao_agendada_hoje: "Manutenção Agendada Hoje",
  manutencao_agendada_7dias: "Manutenção em 7 Dias",
}

export function useAlerts() {
  const { data: reservations = [] } = useReservations()
  const { propertyMap } = usePropertyMap()
  const { data: components = [] } = useAllPropertyComponents()
  const { data: pendingMaintenances = [] } = useAllPendingScheduledMaintenances()

  const alerts = useMemo(() => {
    const today = getTodayStr()
    const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd")
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

    // Manutenções atrasadas (recorrentes)
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

    // Manutenções agendadas (scheduled) — atrasadas, hoje e próximos 7 dias
    for (const sm of pendingMaintenances) {
      const dataPrevista = sm.dataPrevista // já é YYYY-MM-DD
      const propNome = propertyMap.get(sm.propriedadeId)?.nome ?? "Propriedade"

      if (dataPrevista < today) {
        result.push({
          id: `sched-atrasada-${sm.id}`,
          type: "manutencao_atrasada",
          title: alertLabels.manutencao_atrasada,
          description: `${sm.nome} — ${propNome}`,
          link: `/propriedades/${sm.propriedadeId}`,
        })
      } else if (dataPrevista === today) {
        result.push({
          id: `sched-hoje-${sm.id}`,
          type: "manutencao_agendada_hoje",
          title: alertLabels.manutencao_agendada_hoje,
          description: `${sm.nome} — ${propNome}`,
          link: `/propriedades/${sm.propriedadeId}`,
        })
      } else if (dataPrevista <= in7days) {
        const diasRestantes = differenceInDays(parseISO(dataPrevista), new Date())
        result.push({
          id: `sched-7d-${sm.id}`,
          type: "manutencao_agendada_7dias",
          title: `Manutenção em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`,
          description: `${sm.nome} — ${propNome}`,
          link: `/propriedades/${sm.propriedadeId}`,
        })
      }
    }

    return result
  }, [reservations, components, pendingMaintenances, propertyMap])

  return { alerts, count: alerts.length }
}
