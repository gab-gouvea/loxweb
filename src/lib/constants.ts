// Labels de exibição reutilizados em múltiplos componentes/páginas.
// As chaves correspondem aos valores dos tipos definidos em src/types/.

export const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  "em andamento": "Em Andamento",
  cancelada: "Cancelada",
  concluída: "Concluída",
}

export const sourceLabels: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  direto: "Direto",
  outro: "Outro",
}

export const tipoLabels: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  studio: "Studio",
  chalé: "Chalé",
  flat: "Flat",
  outro: "Outro",
}

export const estadoCivilLabels: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  separado: "Separado(a)",
  uniao_estavel: "União Estável",
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatCpf(cpf?: string): string {
  if (!cpf) return "—"
  const digits = cpf.replace(/\D/g, "").slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}
