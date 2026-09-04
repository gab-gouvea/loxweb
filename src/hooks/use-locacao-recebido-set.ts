import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { addMonths } from "date-fns"
import { locacaoService } from "@/services/locacao-service"
import { useRecebimentosLocacao } from "./use-locacoes"
import { isSemAdministracao } from "@/lib/locacao-calculations"
import type { Locacao } from "@/types/locacao"

/**
 * Set de recebimentos de locação já confirmados, no formato "locacaoId-mes-ano".
 *
 * As queries por mês só cobrem o mês atual e o anterior. Isso não basta para locações cujo
 * pagamento fica ancorado num mês antigo:
 *  - à vista, ancorado no mês do check-in;
 *  - sem administração, ancorado no mês de cada parcela da taxa (normalmente o 2º mês do contrato).
 * Para essas, buscamos todos os recebimentos da locação, senão o alerta de pagamento dispara
 * para sempre mesmo depois de confirmado.
 */
export function useLocacaoRecebidoSet(locacoes: Locacao[]): Set<string> {
  const agora = new Date()
  const anterior = addMonths(agora, -1)
  const { data: recebimentosCur = [] } = useRecebimentosLocacao(agora.getMonth() + 1, agora.getFullYear())
  const { data: recebimentosPrev = [] } = useRecebimentosLocacao(
    anterior.getMonth() + 1,
    anterior.getFullYear(),
  )

  // Locações ativas cujo pagamento pode estar num mês fora da janela atual/anterior
  const ancoraNoPassado = locacoes.filter(
    (l) => l.status === "ativa" && (l.tipoPagamento === "avista" || isSemAdministracao(l)),
  )

  // Mesma queryKey de useRecebimentosByLocacao — compartilha cache e é invalidada junto
  const queries = useQueries({
    queries: ancoraNoPassado.map((l) => ({
      queryKey: ["recebimentos-locacao", "by-locacao", l.id],
      queryFn: () => locacaoService.getRecebimentosByLocacao(l.id),
      enabled: !!l.id,
    })),
  })

  const historicoSig = queries
    .map((q) => (q.data ?? []).map((r) => `${r.locacaoId}-${r.mes}-${r.ano}`).join("|"))
    .join("||")
  const mensalSig = [...recebimentosCur, ...recebimentosPrev]
    .map((r) => `${r.locacaoId}-${r.mes}-${r.ano}`)
    .join("|")

  return useMemo(() => {
    const s = new Set<string>()
    for (const q of queries) {
      for (const r of q.data ?? []) s.add(`${r.locacaoId}-${r.mes}-${r.ano}`)
    }
    for (const r of [...recebimentosCur, ...recebimentosPrev]) {
      s.add(`${r.locacaoId}-${r.mes}-${r.ano}`)
    }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicoSig, mensalSig])
}
