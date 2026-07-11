/**
 * C-3 — Índice de bairro próprio como triangulação de coerência (Story 9.27).
 *
 * NUNCA âncora de valor: só sanity-check do headline vs mediana bairro×tipologia
 * do nosso ITBI (deflacionado). Guard estrutural testado (AC3).
 */

import {
  deflacionarComparaveis,
  median,
  type AcmComparable,
  type AvisoAcm,
  type HomogeneizacaoOptions,
} from '@/lib/acm/methodology'

/**
 * Banda default de divergência headline vs índice (%).
 * Fonte: protótipo 12-mediana-bairro (banda ~20% entre bairros vizinhos no raio).
 * PARÂMETRO — não inventado; traça à medição 09-Jul.
 */
export const INDICE_BAIRRO_BANDA_DEFAULT_PCT = 20

export interface VendaIndiceBairro {
  bairroReal?: string | null
  tipologia?: { valor: string } | string | null
  preco: number
  areaConstruida: number
  dataVenda?: string | null
}

export interface IndiceBairroLinha {
  bairro: string
  tipologia: string
  n: number
  medianaPrecoM2: number
}

export interface IndiceBairroResult {
  porBairro: IndiceBairroLinha[]
  /** Competência / índice usado na deflação, se houver. */
  referencia: {
    homogeneizacaoAplicada: boolean
    dataReferencia: string | null
    indice: string | null
  }
}

export interface CalcularIndiceBairroOpts {
  homogeneizacao?: HomogeneizacaoOptions | null
  /** Segmentar por tipologia (default true — protótipo mostrou peso da tipologia). */
  segmentarTipologia?: boolean
}

export interface TriangulacaoBairroOpts {
  /** Banda de divergência % (default 20). */
  bandaPct?: number
  /** Bairro do alvo (obrigatório p/ casar o índice). */
  bairroAlvo?: string | null
  /** Tipologia do alvo (casa/apartamento/…). */
  tipologiaAlvo?: string | null
  /** R$/m² homogeneizado da referência do headline. */
  headlinePrecoM2?: number | null
}

export interface TriangulacaoBairro {
  aplicada: boolean
  indicePrecoM2: number | null
  headlinePrecoM2: number | null
  divergenciaPct: number | null
  bandaPct: number
  incoerente: boolean
  linha: IndiceBairroLinha | null
  aviso: AvisoAcm | null
  /** Texto informativo p/ fundamentação (nunca entra em mediana/headline). */
  notaFundamentacao: string | null
}

function tipologiaDe(v: VendaIndiceBairro): string {
  if (v.tipologia == null) return 'indefinido'
  if (typeof v.tipologia === 'string') return v.tipologia || 'indefinido'
  return v.tipologia.valor || 'indefinido'
}

/**
 * Agrega mediana R$/m² por bairro×tipologia (AC1).
 * Deflação reutiliza `deflacionarComparaveis` quando `opts.homogeneizacao` presente.
 */
export function calcularIndiceBairro(
  vendas: VendaIndiceBairro[],
  opts: CalcularIndiceBairroOpts = {},
): IndiceBairroResult {
  const segmentar = opts.segmentarTipologia !== false

  let rows: Array<VendaIndiceBairro & { precoAjustado: number }> = vendas
    .filter((v) => v.preco > 0 && v.areaConstruida > 0)
    .map((v) => ({ ...v, precoAjustado: v.preco }))

  let homogeneizacaoAplicada = false
  let dataReferencia: string | null = null
  let indice: string | null = null

  if (opts.homogeneizacao) {
    const asComp: AcmComparable[] = rows.map((v, i) => ({
      endereco: `idx-${i}-${v.bairroReal ?? 'x'}`,
      areaConstruida: v.areaConstruida,
      preco: v.preco,
      dataVenda: v.dataVenda,
      bairroReal: v.bairroReal,
    }))
    const def = deflacionarComparaveis(asComp, opts.homogeneizacao)
    homogeneizacaoAplicada = def.relatorio.aplicada
    dataReferencia = def.relatorio.dataReferencia
    indice = def.relatorio.indice
    rows = def.comparaveis.map((c, i) => ({
      ...rows[i],
      precoAjustado: c.preco,
    }))
  }

  const buckets = new Map<string, number[]>()
  for (const v of rows) {
    const bairro = (v.bairroReal && v.bairroReal.trim()) || 'não verificado'
    const tipo = segmentar ? tipologiaDe(v) : 'todas'
    const key = `${bairro}||${tipo}`
    const m2 = v.precoAjustado / v.areaConstruida
    const list = buckets.get(key) ?? []
    list.push(m2)
    buckets.set(key, list)
  }

  const porBairro: IndiceBairroLinha[] = [...buckets.entries()]
    .map(([key, vals]) => {
      const [bairro, tipologia] = key.split('||')
      return {
        bairro,
        tipologia,
        n: vals.length,
        medianaPrecoM2: Math.round(median(vals) * 100) / 100,
      }
    })
    .sort((a, b) => a.bairro.localeCompare(b.bairro) || a.tipologia.localeCompare(b.tipologia))

  return {
    porBairro,
    referencia: { homogeneizacaoAplicada, dataReferencia, indice },
  }
}

/**
 * Compara headline vs índice do bairro×tipologia do alvo (AC2).
 * Opt-in: sem dados de índice / bairro → inerte (AC4).
 * Nunca altera computation — só devolve aviso + nota (AC3).
 */
export function triangularComIndiceBairro(
  indice: IndiceBairroResult | null | undefined,
  opts: TriangulacaoBairroOpts = {},
): TriangulacaoBairro {
  const bandaPct = opts.bandaPct ?? INDICE_BAIRRO_BANDA_DEFAULT_PCT
  const base: TriangulacaoBairro = {
    aplicada: false,
    indicePrecoM2: null,
    headlinePrecoM2: opts.headlinePrecoM2 ?? null,
    divergenciaPct: null,
    bandaPct,
    incoerente: false,
    linha: null,
    aviso: null,
    notaFundamentacao: null,
  }

  if (indice == null || indice.porBairro.length === 0) return base
  if (opts.bairroAlvo == null || !opts.bairroAlvo.trim()) return base
  if (opts.headlinePrecoM2 == null || !(opts.headlinePrecoM2 > 0)) return base

  const bairro = opts.bairroAlvo.trim()
  const tipo = (opts.tipologiaAlvo ?? 'indefinido').trim() || 'indefinido'

  const linha =
    indice.porBairro.find((l) => l.bairro === bairro && l.tipologia === tipo) ??
    indice.porBairro.find((l) => l.bairro === bairro && l.tipologia === 'todas') ??
    indice.porBairro.find((l) => l.bairro === bairro) ??
    null

  if (linha == null || !(linha.medianaPrecoM2 > 0)) return base

  const divergenciaPct =
    Math.round(
      ((opts.headlinePrecoM2 - linha.medianaPrecoM2) / linha.medianaPrecoM2) * 1000,
    ) / 10
  const incoerente = Math.abs(divergenciaPct) > bandaPct

  const notaFundamentacao = `Triangulação de coerência: índice do bairro ${linha.bairro} (${linha.tipologia}, n=${linha.n}) = ${linha.medianaPrecoM2.toLocaleString('pt-BR')} R$/m²; headline ${opts.headlinePrecoM2.toLocaleString('pt-BR')} R$/m² (Δ ${divergenciaPct}%). Nunca âncora de valor.`

  const aviso: AvisoAcm | null = incoerente
    ? {
        codigo: 'bairro_incoerente',
        severidade: 'atencao',
        mensagem: `Headline diverge ${divergenciaPct}% do índice de bairro ${linha.bairro}/${linha.tipologia} (banda ${bandaPct}%). Revisar amostra — índice é triangulação, não âncora.`,
      }
    : null

  return {
    aplicada: true,
    indicePrecoM2: linha.medianaPrecoM2,
    headlinePrecoM2: opts.headlinePrecoM2,
    divergenciaPct,
    bandaPct,
    incoerente,
    linha,
    aviso,
    notaFundamentacao,
  }
}
