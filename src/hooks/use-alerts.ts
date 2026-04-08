import { useMemo } from "react"
import { addDays, addMonths, differenceInDays, format, isBefore, parseISO } from "date-fns"
import { useReservations } from "./use-reservations"
import { useLocacoes, useRecebimentosLocacao } from "./use-locacoes"
import { usePropertyMap } from "./use-property-map"
import { useAllPropertyComponents, useAllPendingScheduledMaintenances } from "./use-property-details"
import { toLocalDateStr, getTodayStr } from "@/lib/date-utils"
import { calcValorPagamento } from "@/lib/reservation-calculations"

export type AlertType =
  | "checkin_hoje"
  | "checkout_hoje"
  | "faxina_hoje"
  | "faxina_nao_paga"
  | "pagamento_pendente"
  | "manutencao_atrasada"
  | "manutencao_agendada_hoje"
  | "manutencao_agendada_7dias"
  | "propriedade_inativa"
  | "locacao_checkin_hoje"
  | "locacao_checkout_hoje"
  | "locacao_faxina_atrasada"
  | "locacao_faxina_proxima"
  | "locacao_pagamento_pendente"
  | "locacao_expirando"
  | "locacao_expirando_urgente"

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
  pagamento_pendente: "Pagamento Pendente",
  manutencao_atrasada: "Manutenção Atrasada",
  manutencao_agendada_hoje: "Manutenção Agendada Hoje",
  manutencao_agendada_7dias: "Manutenção em 7 Dias",
  propriedade_inativa: "Propriedade Inativa",
  locacao_checkin_hoje: "Entrada Locação Hoje",
  locacao_checkout_hoje: "Saída Locação Hoje",
  locacao_faxina_atrasada: "Faxina Atrasada (Locação)",
  locacao_faxina_proxima: "Faxina Próxima (Locação)",
  locacao_pagamento_pendente: "Pagamento Locação Pendente",
  locacao_expirando: "Locação Expirando",
  locacao_expirando_urgente: "Locação Expirando!",
}

export function useAlerts() {
  const { data: reservations = [] } = useReservations()
  const { data: locacoes = [] } = useLocacoes()
  const { propertyMap } = usePropertyMap()
  const { data: components = [] } = useAllPropertyComponents()
  const { data: pendingMaintenances = [] } = useAllPendingScheduledMaintenances()

  // Buscar recebimentos do mês atual e anterior para checar pagamentos confirmados
  const now = new Date()
  const curMes = now.getMonth() + 1
  const curAno = now.getFullYear()
  const prevDate = addMonths(now, -1)
  const prevMes = prevDate.getMonth() + 1
  const prevAno = prevDate.getFullYear()
  const { data: recebimentosCur = [] } = useRecebimentosLocacao(curMes, curAno)
  const { data: recebimentosPrev = [] } = useRecebimentosLocacao(prevMes, prevAno)

  const alerts = useMemo(() => {
    // Set de recebimentos confirmados: "locacaoId-mes-ano"
    const recebidoSet = new Set<string>()
    for (const r of [...recebimentosCur, ...recebimentosPrev]) {
      recebidoSet.add(`${r.locacaoId}-${r.mes}-${r.ano}`)
    }

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
      if (checkInDate === today && !r.checkinConfirmado) {
        result.push({
          id: `checkin-${r.id}`,
          type: "checkin_hoje",
          title: alertLabels.checkin_hoje,
          description: `${r.nomeHospede} — ${propNome}`,
          link: `/reservas/${r.id}`,
        })
      }

      // Checkout hoje
      if (checkOutDate === today && !r.checkoutConfirmado) {
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

      // Pagamento pendente (checkIn + 1 dia <= hoje e não recebido)
      const paymentDate = format(addDays(parseISO(checkInDate), 1), "yyyy-MM-dd")
      if (paymentDate <= today && !r.pagamentoRecebido) {
        const prop = propertyMap.get(r.propriedadeId)
        const valorPagamento = calcValorPagamento(r, prop)
        const valorFormatado = valorPagamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        result.push({
          id: `pagamento-${r.id}`,
          type: "pagamento_pendente",
          title: paymentDate === today ? "Pagamento Hoje" : "Pagamento Pendente",
          description: `${valorFormatado} — ${r.nomeHospede} — ${propNome}`,
          link: `/reservas/${r.id}`,
        })
      }
    }

    // Faxinas não pagas (empresa parceira, agendada, a partir de 1 dia antes do checkout)
    for (const r of reservations) {
      if (
        !r.faxinaPorMim &&
        r.faxinaPaga === false &&
        r.faxinaStatus === "agendada"
      ) {
        const checkOutDate = toLocalDateStr(r.checkOut)
        const oneDayBefore = format(addDays(parseISO(checkOutDate), -1), "yyyy-MM-dd")
        if (today >= oneDayBefore) {
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

    // Propriedades inativas com data se aproximando (7 dias)
    for (const [, prop] of propertyMap) {
      if (!prop.ativo && prop.inativoAte) {
        const inativoAteDate = toLocalDateStr(prop.inativoAte)
        const diasRestantes = differenceInDays(parseISO(inativoAteDate), new Date())
        if (diasRestantes >= 0 && diasRestantes <= 7) {
          result.push({
            id: `prop-inativa-${prop.id}`,
            type: "propriedade_inativa",
            title: diasRestantes === 0
              ? `${prop.nome} ficará inativa até hoje!`
              : `${prop.nome} ficará inativa por mais ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`,
            description: prop.observacaoInatividade || "Continua inativa?",
            link: `/propriedades/${prop.id}`,
          })
        }
      }
    }

    // ---- Alertas de Locações ----
    const locacoesAtivas = locacoes.filter((l) => l.status === "ativa")

    for (const l of locacoesAtivas) {
      const checkInDate = toLocalDateStr(l.checkIn)
      const checkOutDate = toLocalDateStr(l.checkOut)
      const propNome = propertyMap.get(l.propriedadeId)?.nome ?? "Propriedade"

      // Entrada hoje
      if (checkInDate === today) {
        result.push({
          id: `loc-checkin-${l.id}`,
          type: "locacao_checkin_hoje",
          title: alertLabels.locacao_checkin_hoje,
          description: `${l.nomeCompleto} — ${propNome}`,
          link: `/longatemporada/${l.id}`,
        })
      }

      // Saída hoje
      if (checkOutDate === today) {
        result.push({
          id: `loc-checkout-${l.id}`,
          type: "locacao_checkout_hoje",
          title: alertLabels.locacao_checkout_hoje,
          description: `${l.nomeCompleto} — ${propNome}`,
          link: `/longatemporada/${l.id}`,
        })
      }

      // Faxina de rotina atrasada
      if (l.proximaFaxina) {
        const proxFaxina = toLocalDateStr(l.proximaFaxina)
        if (proxFaxina < today) {
          result.push({
            id: `loc-faxina-atrasada-${l.id}`,
            type: "locacao_faxina_atrasada",
            title: alertLabels.locacao_faxina_atrasada,
            description: `${l.nomeCompleto} — ${propNome}`,
            link: `/longatemporada/${l.id}`,
          })
        } else if (proxFaxina <= format(addDays(new Date(), 3), "yyyy-MM-dd")) {
          const dias = differenceInDays(parseISO(proxFaxina), new Date())
          result.push({
            id: `loc-faxina-prox-${l.id}`,
            type: "locacao_faxina_proxima",
            title: dias === 0 ? "Faxina Hoje (Locação)" : `Faxina em ${dias} dia${dias > 1 ? "s" : ""} (Locação)`,
            description: `${l.nomeCompleto} — ${propNome}`,
            link: `/longatemporada/${l.id}`,
          })
        }
      }

      // Pagamento locação — paga e mora: pagamento no dia da entrada de cada mês
      {
        const checkInParsed = parseISO(checkInDate)
        const todayParsed = parseISO(today)
        const isAvista = l.tipoPagamento === "avista"

        // Calcular ciclo atual (mesmo algoritmo da detail page)
        let cicloStart = checkInParsed
        while (isBefore(addMonths(cicloStart, 1), todayParsed) || addMonths(cicloStart, 1).getTime() === todayParsed.getTime()) {
          cicloStart = addMonths(cicloStart, 1)
        }
        if (isBefore(todayParsed, checkInParsed)) cicloStart = checkInParsed

        // À vista: pagamento só no checkIn; mensal: pagamento a cada ciclo
        const pagDate = isAvista ? checkInDate : format(cicloStart, "yyyy-MM-dd")
        const pagMes = isAvista ? checkInParsed.getMonth() + 1 : cicloStart.getMonth() + 1
        const pagAno = isAvista ? checkInParsed.getFullYear() : cicloStart.getFullYear()

        // Só alertar se a data de pagamento já chegou e não foi confirmado
        // Não alertar se pagDate >= checkOut (dia do checkout não tem pagamento)
        if (pagDate <= today && pagDate < checkOutDate && !recebidoSet.has(`${l.id}-${pagMes}-${pagAno}`)) {
          const valorBruto = isAvista ? (l.valorTotal ?? 0) : (l.valorMensal ?? 0)
          const comissao = valorBruto * (l.percentualComissao ?? 0) / 100
          const valorFormatado = comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

          result.push({
            id: `loc-pagamento-${l.id}-${pagMes}-${pagAno}`,
            type: "locacao_pagamento_pendente",
            title: pagDate === today ? "Pagamento Locação Hoje" : "Pagamento Locação Pendente",
            description: `${valorFormatado} — ${l.nomeCompleto} — ${propNome}`,
            link: `/longatemporada/${l.id}`,
          })
        }
      }

      // Locação expirando
      const diasRestantes = differenceInDays(parseISO(checkOutDate), new Date())
      if (diasRestantes > 0 && diasRestantes <= 3) {
        // Urgente: faltam 3 dias ou menos
        result.push({
          id: `loc-expirando-urgente-${l.id}`,
          type: "locacao_expirando_urgente",
          title: `Locação expira em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}!`,
          description: `${l.nomeCompleto} — ${propNome}`,
          link: `/longatemporada/${l.id}`,
        })
      } else if (diasRestantes > 3 && diasRestantes <= 20) {
        result.push({
          id: `loc-expirando-${l.id}`,
          type: "locacao_expirando",
          title: diasRestantes <= 15
            ? `Locação expira em ${diasRestantes} dias (prazo de extensão encerrado)`
            : `Locação expira em ${diasRestantes} dias`,
          description: `${l.nomeCompleto} — ${propNome}`,
          link: `/longatemporada/${l.id}`,
        })
      }
    }

    return result
  }, [reservations, locacoes, components, pendingMaintenances, propertyMap, recebimentosCur, recebimentosPrev])

  return { alerts, count: alerts.length }
}
