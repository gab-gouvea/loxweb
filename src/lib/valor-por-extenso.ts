const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"]
const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]
const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]
const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"]

function extensoGrupo(n: number): string {
  if (n === 0) return ""
  if (n === 100) return "cem"

  const c = Math.floor(n / 100)
  const resto = n % 100
  const d = Math.floor(resto / 10)
  const u = resto % 10

  const partes: string[] = []
  if (c > 0) partes.push(centenas[c])

  if (d === 1) {
    partes.push(especiais[u])
  } else {
    if (d > 0) partes.push(dezenas[d])
    if (u > 0) partes.push(unidades[u])
  }

  return partes.join(" e ")
}

export function valorPorExtenso(valor: number): string {
  if (valor === 0) return "zero reais"

  const inteiro = Math.floor(Math.abs(valor))
  const centavosNum = Math.round((Math.abs(valor) - inteiro) * 100)

  const partes: string[] = []

  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000)
    const restoMilhao = inteiro % 1000000
    const milhares = Math.floor(restoMilhao / 1000)
    const restoMilhar = restoMilhao % 1000

    if (milhoes > 0) {
      partes.push(milhoes === 1 ? "um milhão" : extensoGrupo(milhoes) + " milhões")
    }

    if (milhares > 0) {
      if (milhares === 1) {
        partes.push("mil")
      } else {
        partes.push(extensoGrupo(milhares) + " mil")
      }
    }

    if (restoMilhar > 0) {
      if ((milhoes > 0 || milhares > 0) && restoMilhar < 100) {
        partes.push("e " + extensoGrupo(restoMilhar))
      } else {
        partes.push(extensoGrupo(restoMilhar))
      }
    }

    partes.push(inteiro === 1 ? "real" : "reais")
  }

  if (centavosNum > 0) {
    if (inteiro > 0) partes.push("e")
    partes.push(extensoGrupo(centavosNum))
    partes.push(centavosNum === 1 ? "centavo" : "centavos")
  }

  const resultado = partes.join(" ").replace(/\s+/g, " ").trim()
  return resultado.charAt(0).toUpperCase() + resultado.slice(1)
}
