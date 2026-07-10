/**
 * Radar de subprecificação (Story 9.21).
 *
 * Quando o anúncio/pretendido está abaixo da faixa técnica, devolve nível +
 * ação (“não reduzir preço…”) — caso canônico Andrade Pertence 132.
 * Sem preço comercial → tudo null (Art. IV).
 */

export type NivelSubprecificacao = 'fraca' | 'moderada' | 'forte'

export interface SubprecificacaoInputs {
  /** Preço de anúncio ou pretendido (anúncio tem prioridade no call site). */
  precoComercial: number | null | undefined
  /** Referência ACM (ex.: headline.referencia.valorMercado). */
  referenciaConstrucao: number | null | undefined
  /** Mediana / valor implícito Top 5 (opt-in). */
  referenciaTop5?: number | null
  /** Co-âncora / lente de terreno (opt-in). */
  referenciaTerreno?: number | null
  /** Tempo de exposição em dias (opt-in). */
  tempoExposicaoDias?: number | null
  /** Nº de anúncios/publicações (opt-in). */
  nAnuncios?: number | null
  /** Flag de concorrência acirrada (opt-in). */
  concorrenciaAlta?: boolean | null
}

export interface SubprecificacaoRadar {
  /** null se sem anúncio ou se preço ≥ referência − limiar fraco. */
  nivel: NivelSubprecificacao | null
  /** (preço − ref) / ref · 100; negativo = abaixo. null se indefinido. */
  deltaPct: number | null
  acaoRecomendada: string | null
  narrativa: string | null
  gaps: {
    vsReferencia: number | null
    vsTop5: number | null
    vsTerreno: number | null
  }
  /** Metadados opt-in ecoados para a capa. */
  tempoExposicaoDias: number | null
  nAnuncios: number | null
  concorrenciaAlta: boolean
}

/** Limiares |delta| abaixo da ref (fração). Documentados. */
export const SUBPRECIFICACAO_LIMIARES = {
  /** |delta| ≥ 15% → forte (132 ~18%). */
  forte: 0.15,
  /** |delta| ≥ 8% → moderada. */
  moderada: 0.08,
  /** |delta| ≥ 5% → fraca (alinha com banda da tese 9.18). */
  fraca: 0.05,
} as const

function gapPct(preco: number, ref: number | null | undefined): number | null {
  if (ref == null || !(ref > 0) || !Number.isFinite(preco)) return null
  return Math.round(((preco - ref) / ref) * 1000) / 10
}

/**
 * Classifica subprecificação (AC1–AC5).
 * Só emite nível quando o preço está **abaixo** da referência de construção.
 */
export function classificarSubprecificacao(inp: SubprecificacaoInputs): SubprecificacaoRadar {
  const preco =
    inp.precoComercial != null && Number.isFinite(inp.precoComercial) && inp.precoComercial > 0
      ? inp.precoComercial
      : null
  const ref =
    inp.referenciaConstrucao != null &&
    Number.isFinite(inp.referenciaConstrucao) &&
    inp.referenciaConstrucao > 0
      ? inp.referenciaConstrucao
      : null

  const gaps = {
    vsReferencia: preco != null ? gapPct(preco, ref) : null,
    vsTop5: preco != null ? gapPct(preco, inp.referenciaTop5) : null,
    vsTerreno: preco != null ? gapPct(preco, inp.referenciaTerreno) : null,
  }

  const base: SubprecificacaoRadar = {
    nivel: null,
    deltaPct: gaps.vsReferencia,
    acaoRecomendada: null,
    narrativa: null,
    gaps,
    tempoExposicaoDias: inp.tempoExposicaoDias ?? null,
    nAnuncios: inp.nAnuncios ?? null,
    concorrenciaAlta: inp.concorrenciaAlta === true,
  }

  // AC5 — sem anúncio/preço ou sem ref → null, sem inventar
  if (preco == null || ref == null || gaps.vsReferencia == null) return base

  // Acima ou alinhado (≥ −5%) → sem radar de subprecificação
  if (gaps.vsReferencia > -SUBPRECIFICACAO_LIMIARES.fraca * 100) return base

  const absFrac = Math.abs(gaps.vsReferencia) / 100
  let nivel: NivelSubprecificacao
  if (absFrac >= SUBPRECIFICACAO_LIMIARES.forte) nivel = 'forte'
  else if (absFrac >= SUBPRECIFICACAO_LIMIARES.moderada) nivel = 'moderada'
  else nivel = 'fraca'

  const exposicaoNota =
    inp.tempoExposicaoDias != null && inp.tempoExposicaoDias >= 60
      ? ` Exposição prolongada (~${inp.tempoExposicaoDias} dias).`
      : inp.nAnuncios != null && inp.nAnuncios >= 20
        ? ` Muitos anúncios ativos (${inp.nAnuncios}).`
        : ''

  const terrenoNota =
    gaps.vsTerreno != null && gaps.vsTerreno < -5
      ? ` Também abaixo da lente de terreno (${gaps.vsTerreno}%).`
      : ''

  // H-3 Luciana (2026-07-10): texto canônico de subprecificação.
  const acao =
    nivel === 'forte'
      ? 'Subprecificado — não recomendo cortar. Reposicionar narrativa, fotos e distribuição; o gap é de percepção, não de teto técnico.'
      : nivel === 'moderada'
        ? 'Subprecificado — não recomendo cortar. Testar reposicionamento (mídia, copy, evidência ACM) antes de qualquer desconto.'
        : 'Monitorar: leve gap abaixo da referência — calibrar anúncio sem desconto defensivo.'

  const narrativa =
    `Preço ${gaps.vsReferencia}% vs referência ACM (${nivel}).` +
    exposicaoNota +
    terrenoNota +
    (inp.concorrenciaAlta ? ' Concorrência alta no raio.' : '')

  return {
    ...base,
    nivel,
    acaoRecomendada: acao,
    narrativa: narrativa.trim(),
  }
}
