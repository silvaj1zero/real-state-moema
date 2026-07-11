/**
 * C-5 — Validação anúncio↔venda com confiança graduada (Story 9.26 / N-4).
 *
 * Contrato determinístico para a Fase B web (D-2/9.5): gradua CONFIRMADO /
 * PARCIAL / NÃO RECUPERÁVEL e mede deságio real só quando confirmado.
 *
 * Prior SP 8–12% é REFERÊNCIA EXTERNA declarada (sanity-check) — nunca ajusta o
 * número (Art. IV).
 */

import {
  median,
  normalizeStreet,
  type AcmComparable,
  type AvisoAcm,
} from '@/lib/acm/methodology'

/** Prior de deságio oferta→transação típico em SP (fração). Fonte: ROADMAP §10.10. */
export const DESAGIO_PRIOR_SP = { min: 0.08, max: 0.12 } as const

export type NivelConfiancaC5 = 'confirmado' | 'parcial' | 'nao_recuperavel'

export interface AnuncioInput {
  /** Endereço do anúncio (pode ser o mesmo da venda quando a ficha é a própria linha). */
  endereco?: string | null
  /** Número da porta, se separado do endereço. */
  numero?: string | null
  /** Área anunciada (m²). */
  area?: number | null
  /** Preço pedido no anúncio. */
  precoPedido?: number | null
}

export interface VendaInput {
  endereco: string
  areaConstruida: number
  /** Preço de fechamento (ITBI). */
  preco: number
  precoPedido?: number | null
  isVendaReal?: boolean
}

export interface ValidacaoAnuncioVenda {
  nivel: NivelConfiancaC5
  pistas: string[]
  /**
   * Deságio real = 1 − preco/precoPedido (fração positiva se vendeu abaixo do pedido).
   * Só quando nivel = confirmado e ambos os preços > 0; senão null.
   */
  desagioReal: number | null
}

export interface DesagioMedidoGraduado {
  /** Mediana do deságio % no sentido legado (preco − pedido)/pedido · 100 — negativo se vendeu abaixo. */
  percent: number | null
  nConfirmado: number
  nParcial: number
  nNaoRecuperavel: number
  /** Deságios reais (fração AC1) só dos confirmados. */
  desagiosReais: number[]
}

const AREA_TOL = 0.02

/** Extrai o último token numérico de porta (ex.: "101", "45A"). */
export function extractDoorNumber(endereco: string | null | undefined): string | null {
  if (endereco == null || !endereco.trim()) return null
  // Preferir número após vírgula: "Rua X, 101"
  const aposVirgula = endereco.match(/,\s*(\d+[A-Za-z]?)\b/)
  if (aposVirgula) return aposVirgula[1].toLowerCase()
  // Formato banco: "R DR X 110"
  const final = endereco.match(/\s(\d+[A-Za-z]?)\s*$/)
  if (final) return final[1].toLowerCase()
  return null
}

/**
 * Gradua a confiança do cruzamento anúncio↔venda (AC1).
 *
 * - confirmado = número E (área ±2% OU mesma rua)
 * - parcial = mesma rua sem casar número
 * - nao_recuperavel = sem anúncio / sem pista
 */
export function validarAnuncioVenda(
  venda: VendaInput,
  anuncio: AnuncioInput | null | undefined,
): ValidacaoAnuncioVenda {
  if (anuncio == null) {
    return { nivel: 'nao_recuperavel', pistas: [], desagioReal: null }
  }

  const temPrecoPedido =
    anuncio.precoPedido != null && anuncio.precoPedido > 0
      ? anuncio.precoPedido
      : venda.precoPedido != null && venda.precoPedido > 0
        ? venda.precoPedido
        : null

  const endAnuncio = anuncio.endereco?.trim() || null
  // Sem qualquer rastro de anúncio (endereço, número, área, preço) → não recuperável
  if (
    endAnuncio == null &&
    anuncio.numero == null &&
    anuncio.area == null &&
    temPrecoPedido == null
  ) {
    return { nivel: 'nao_recuperavel', pistas: [], desagioReal: null }
  }

  const pistas: string[] = []

  const numVenda = extractDoorNumber(venda.endereco)
  const numAnuncio =
    anuncio.numero != null && String(anuncio.numero).trim()
      ? String(anuncio.numero).trim().toLowerCase()
      : extractDoorNumber(endAnuncio)
  const numeroBate =
    numVenda != null && numAnuncio != null && numVenda === numAnuncio
  if (numeroBate) pistas.push('numero_porta')

  const areaAnuncio = anuncio.area
  const areaBate =
    areaAnuncio != null &&
    areaAnuncio > 0 &&
    venda.areaConstruida > 0 &&
    Math.abs(areaAnuncio - venda.areaConstruida) / venda.areaConstruida <= AREA_TOL
  if (areaBate) pistas.push('area_pm2pct')

  const ruaAnuncio = endAnuncio ?? (numeroBate ? venda.endereco : null)
  const mesmaRua =
    ruaAnuncio != null &&
    normalizeStreet(venda.endereco) === normalizeStreet(ruaAnuncio)
  if (mesmaRua) pistas.push('mesma_rua')

  // Anúncio na própria linha ITBI (precoPedido sem ficha externa separada):
  // só quando não há endereço de anúncio OU o número da porta é o mesmo.
  // Diferente número na mesma rua → PARCIAL (não promove a confirmado).
  const mesmoNumeroSeInformado =
    endAnuncio == null ||
    (numVenda != null &&
      extractDoorNumber(endAnuncio) != null &&
      numVenda === extractDoorNumber(endAnuncio))
  const anuncioNaPropriaLinha =
    temPrecoPedido != null &&
    anuncio.numero == null &&
    anuncio.area == null &&
    (endAnuncio == null ||
      (normalizeStreet(endAnuncio) === normalizeStreet(venda.endereco) && mesmoNumeroSeInformado))
  if (anuncioNaPropriaLinha && numVenda != null) {
    if (!pistas.includes('numero_porta')) pistas.push('numero_porta')
    if (!pistas.includes('mesma_rua')) pistas.push('mesma_rua')
  }

  let nivel: NivelConfiancaC5
  const numOk = pistas.includes('numero_porta')
  const areaOk = pistas.includes('area_pm2pct')
  const ruaOk = pistas.includes('mesma_rua')

  if (numOk && (areaOk || ruaOk)) {
    nivel = 'confirmado'
  } else if (ruaOk && !numOk) {
    nivel = 'parcial'
  } else if (temPrecoPedido != null && anuncioNaPropriaLinha && numOk) {
    nivel = 'confirmado'
  } else if (pistas.length === 0 && temPrecoPedido == null) {
    nivel = 'nao_recuperavel'
  } else if (pistas.length === 0) {
    // Tem preço pedido mas nenhuma pista espacial → não recuperável o casamento
    nivel = 'nao_recuperavel'
  } else {
    nivel = 'parcial'
  }

  let desagioReal: number | null = null
  if (
    nivel === 'confirmado' &&
    temPrecoPedido != null &&
    temPrecoPedido > 0 &&
    venda.preco > 0
  ) {
    desagioReal = Math.round((1 - venda.preco / temPrecoPedido) * 10000) / 10000
  }

  return { nivel, pistas, desagioReal }
}

/**
 * Agrega deságio só dos confirmados; expõe n por nível (AC2).
 * `percent` no sentido legado (negativo se vendeu abaixo) para zero drift com
 * `desagioMedido()` quando o conjunto confirmado coincide com precoPedido+ITBI.
 */
export function desagioMedidoGraduado(comparaveis: AcmComparable[]): DesagioMedidoGraduado {
  let nConfirmado = 0
  let nParcial = 0
  let nNaoRecuperavel = 0
  const desagiosReais: number[] = []
  const desagiosLegado: number[] = []

  for (const c of comparaveis) {
    const anuncio: AnuncioInput = {
      endereco: c.endereco,
      precoPedido: c.precoPedido,
      area: c.areaConstruida,
    }
    const v = validarAnuncioVenda(
      {
        endereco: c.endereco,
        areaConstruida: c.areaConstruida,
        preco: c.preco,
        precoPedido: c.precoPedido,
        isVendaReal: c.isVendaReal,
      },
      c.precoPedido != null && c.precoPedido > 0 ? anuncio : null,
    )

    if (v.nivel === 'confirmado') nConfirmado += 1
    else if (v.nivel === 'parcial') nParcial += 1
    else nNaoRecuperavel += 1

    if (
      v.nivel === 'confirmado' &&
      c.precoPedido != null &&
      c.precoPedido > 0 &&
      c.isVendaReal
    ) {
      if (v.desagioReal != null) desagiosReais.push(v.desagioReal)
      desagiosLegado.push((c.preco - c.precoPedido) / c.precoPedido)
    }
  }

  const percent =
    desagiosLegado.length === 0
      ? null
      : Math.round(median(desagiosLegado) * 1000) / 10

  return {
    percent,
    nConfirmado,
    nParcial,
    nNaoRecuperavel,
    desagiosReais,
  }
}

/**
 * Aviso informativo quando o deságio medido (fração absoluta) sai da banda prior SP.
 * Nunca ajusta o número — só sinaliza (AC3).
 */
export function avisoDesagioForaPrior(
  desagioMedidoPercent: number | null,
): AvisoAcm | null {
  if (desagioMedidoPercent == null) return null
  const absFrac = Math.abs(desagioMedidoPercent) / 100
  if (absFrac >= DESAGIO_PRIOR_SP.min && absFrac <= DESAGIO_PRIOR_SP.max) return null
  return {
    codigo: 'desagio_fora_prior_sp',
    severidade: 'info',
    mensagem: `Deságio medido ${desagioMedidoPercent.toLocaleString('pt-BR')}% está fora do prior SP 8–12% (referência externa declarada §10.10 — não ajusta o número).`,
  }
}
