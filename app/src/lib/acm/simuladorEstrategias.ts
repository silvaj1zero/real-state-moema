/**
 * Simulador de 3 estratégias de preço (Story 9.24).
 *
 * Composição pura a partir do `AcmLaudoComputation` — zero recálculo de mediana
 * (ADR-EPIC8-001 / padrão H-4). Todo número vem do computation; prazos/percentuais
 * novos são proibidos (Art. IV).
 */

import type { AcmLaudoComputation } from '@/lib/acm/methodology'

export type EstrategiaChave = 'rapida' | 'defensavel' | 'agressiva'

export interface EstrategiaPreco {
  chave: EstrategiaChave
  /** Preço de anúncio sugerido (R$). */
  precoAnuncio: number
  /** Faixa de fechamento esperada (R$). */
  faixaFechamento: { min: number; max: number }
  /** Racional curto citando evidência do ACM. */
  racional: string
  /** Riscos declarados (qualitativos quando sem dado). */
  riscos: string[]
  /**
   * Prazo de venda — SEMPRE qualitativo nesta story (Art. IV):
   * sem dado de prazo no computation → nota explícita.
   */
  prazoNota: string
}

export interface SimularEstrategiasOpts {
  /** Nota opcional de concorrência (só se informada — não inventa). */
  concorrenciaNota?: string | null
}

const PRAZO_SEM_DADO = 'sem dado de prazo nesta emissão'

/**
 * Monta as 3 estratégias de preço a partir do computation.
 *
 * - **defensável** = referência do headline (cenário aderente) + liquidez
 * - **rápida** = piso da faixa de fechamento (venda acelerada)
 * - **agressiva** = teto de mercado / cenário 0% de deságio de estado
 *
 * Ordem garantida em anúncio: rápida ≤ defensável ≤ agressiva.
 */
export function simularEstrategias(
  computation: AcmLaudoComputation,
  opts: SimularEstrategiasOpts = {},
): EstrategiaPreco[] {
  const ref = computation.headline.referencia.valorMercado
  const fech = computation.headline.fechamento
  const merc = computation.headline.mercado
  const pisoFechamento = Math.min(computation.faixaFechamento.min, fech.min)
  const tetoMercado = Math.max(
    merc.max,
    computation.headline.teto.valorMercado,
    computation.desagioTratado.valorMercadoPorCenario.agressivo,
  )
  const desagioPct = computation.desagioTratado.desagioEstadoPct
  const desagioMedido = computation.desagioMedidoPercent
  const sub = computation.subprecificacao
  const tese = computation.teseComercial
  const subprecificado = tese.tese === 'abaixo' || sub.nivel != null

  // --- preços base (depois normaliza ordem) ---
  const defensavelAnuncio = Math.round(ref)
  let rapidaAnuncio = Math.round(pisoFechamento)
  let agressivaAnuncio = Math.round(tetoMercado)

  // Garante rapida ≤ defensavel ≤ agressiva sem inventar % novos
  if (rapidaAnuncio > defensavelAnuncio) rapidaAnuncio = defensavelAnuncio
  if (agressivaAnuncio < defensavelAnuncio) agressivaAnuncio = defensavelAnuncio

  const faixaRapida = {
    min: Math.round(Math.min(pisoFechamento, rapidaAnuncio)),
    max: Math.round(Math.min(defensavelAnuncio, fech.max)),
  }
  const faixaDef = {
    min: Math.round(Math.min(fech.min, defensavelAnuncio)),
    max: Math.round(Math.max(fech.max, Math.min(defensavelAnuncio, merc.max))),
  }
  const faixaAgr = {
    min: Math.round(Math.min(fech.max, defensavelAnuncio)),
    max: Math.round(Math.max(agressivaAnuncio, merc.max)),
  }

  const citaDesagio =
    desagioMedido != null
      ? `deságio medido ${desagioMedido.toLocaleString('pt-BR')}%`
      : desagioPct != null
        ? `deságio de estado declarado ${(desagioPct * 100).toLocaleString('pt-BR')}%`
        : 'liquidez da amostra (fatores declarados)'

  const radarNota =
    sub.nivel != null
      ? `radar de subprecificação ${sub.nivel}${sub.deltaPct != null ? ` (${sub.deltaPct}%)` : ''}`
      : null

  const concorrencia =
    opts.concorrenciaNota?.trim() ||
    (sub.concorrenciaAlta ? 'concorrência alta informada na meta' : null)

  // AC4 — subprecificado: rápida NÃO recomenda corte
  const racionalRapida = subprecificado
    ? `Subprecificado — não recomendo cortar. Piso de fechamento ${formatCompact(rapidaAnuncio)} ancora liquidez sem ceder ao corte; ${citaDesagio}.`
    : `Venda acelerada no piso da faixa de fechamento (${formatCompact(rapidaAnuncio)}); racional de liquidez: ${citaDesagio}.`

  const riscosRapida = subprecificado
    ? [
        'Risco de deixar valor na mesa se cortar além do piso',
        PRAZO_SEM_DADO,
      ]
    : [
        'Menor captura de upside vs referência aderente',
        PRAZO_SEM_DADO,
      ]

  const racionalDef = `Âncora no cenário aderente do headline (${computation.headline.referencia.cenario}, n=${computation.headline.referencia.n}) = ${formatCompact(defensavelAnuncio)}; faixa de fechamento reflete fatores de liquidez já aplicados no computation.`

  const racionalAgr = [
    `Teto de mercado / cenário 0% de deságio de estado = ${formatCompact(agressivaAnuncio)}`,
    radarNota,
    concorrencia ? `concorrência: ${concorrencia}` : null,
  ]
    .filter(Boolean)
    .join('; ')
    .concat('.')

  return [
    {
      chave: 'rapida',
      precoAnuncio: rapidaAnuncio,
      faixaFechamento: faixaRapida,
      racional: racionalRapida,
      riscos: riscosRapida,
      prazoNota: PRAZO_SEM_DADO,
    },
    {
      chave: 'defensavel',
      precoAnuncio: defensavelAnuncio,
      faixaFechamento: faixaDef,
      racional: racionalDef,
      riscos: [
        'Depende da confirmação do estado (ficha A–E) na vistoria',
        PRAZO_SEM_DADO,
      ],
      prazoNota: PRAZO_SEM_DADO,
    },
    {
      chave: 'agressiva',
      precoAnuncio: agressivaAnuncio,
      faixaFechamento: faixaAgr,
      racional: racionalAgr,
      riscos: [
        'Maior risco de prazo e de realismo se o teto superar a demanda',
        PRAZO_SEM_DADO,
      ],
      prazoNota: PRAZO_SEM_DADO,
    },
  ]
}

function formatCompact(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR')}`
}
