/**
 * Tribunal — Teste de Robustez da Tese (Story 9.25).
 *
 * Leave-one-out sobre o conjunto do cenário aderente de referência (Top 5 ou
 * Top 3 do headline) + quadro de testemunhas A/B/C (passaportes 9.15).
 * Função pura, determinística, sem Date/random.
 */

import {
  median,
  type AcmLaudoComputation,
  type AvisoAcm,
  type ConfiancaGrau,
} from '@/lib/acm/methodology'

/**
 * Limiar default de amplitude leave-one-out (%).
 * PARÂMETRO DE ARBÍTRIO — não é verdade estatística; default 10% com justificativa
 * operacional (desvio de um ponto que move a referência em >10% pede atenção).
 */
export const ROBUSTEZ_LIMIAR_DEFAULT_PCT = 10

export interface RobustezOpts {
  /**
   * Amplitude máxima relativa (%) antes de `sensivel`.
   * Default: {@link ROBUSTEZ_LIMIAR_DEFAULT_PCT}.
   */
  limiarPct?: number
}

export interface LeaveOneOutItem {
  endereco: string
  /** Mediana R$/m² do conjunto sem este item. */
  medianaSemItem: number
  /** Desvio relativo vs mediana de referência: (sem − ref) / ref · 100. */
  desvioPct: number
}

export interface TestemunhaQuadro {
  endereco: string
  nivel: ConfiancaGrau
  motivos: string[]
  status: 'incluido' | 'excluido'
}

export interface RobustezTese {
  /** Cenário do headline usado como conjunto (top5 | top3). */
  cenarioReferencia: 'top5' | 'top3' | 'todos'
  nConjunto: number
  /** Mediana R$/m² do conjunto completo de referência. */
  medianaReferencia: number
  /**
   * Amplitude leave-one-out (%): max |desvio| relativo à mediana de referência.
   *
   * Fórmula (JSDoc AC4):
   *   para cada i ∈ conjunto:
   *     m_i = mediana({ precoM2_j | j ≠ i })
   *     d_i = (m_i − m_ref) / m_ref · 100
   *   amplitude = max_i |d_i|
   */
  amplitudeLeaveOneOutPct: number
  comparavelMaisInfluente: string | null
  leaveOneOut: LeaveOneOutItem[]
  veredicto: 'robusta' | 'sensivel'
  limiarPct: number
  testemunhas: TestemunhaQuadro[]
}

/**
 * Testa se a referência do headline depende de um comparável isolado.
 *
 * Usa `precoM2` aditivo em `AdherenceBreakdown` (Story 9.25) dos membros do
 * conjunto top5/top3 conforme `headline.referencia.cenario`. Passaportes entram
 * só como formatação do quadro de testemunhas (zero recomputo de confiança).
 */
export function testarRobustez(
  computation: AcmLaudoComputation,
  opts: RobustezOpts = {},
): RobustezTese {
  const limiarPct = opts.limiarPct ?? ROBUSTEZ_LIMIAR_DEFAULT_PCT
  const cenario = computation.headline.referencia.cenario
  const cenarioReferencia: RobustezTese['cenarioReferencia'] =
    cenario === 'top3' ? 'top3' : cenario === 'todos' ? 'todos' : 'top5'

  const membros =
    cenarioReferencia === 'top3'
      ? computation.top3
      : cenarioReferencia === 'todos'
        ? computation.ranking
        : computation.top5

  const valores = membros
    .map((m) => ({
      endereco: m.endereco,
      precoM2: m.precoM2 ?? 0,
    }))
    .filter((m) => m.precoM2 > 0)

  const precos = valores.map((v) => v.precoM2)
  const medianaReferencia =
    precos.length > 0
      ? Math.round(median(precos) * 100) / 100
      : computation.headline.referencia.medianaPrecoM2

  const leaveOneOut: LeaveOneOutItem[] = []
  if (valores.length >= 2 && medianaReferencia > 0) {
    for (let i = 0; i < valores.length; i++) {
      const sem = valores.filter((_, j) => j !== i).map((v) => v.precoM2)
      const medianaSemItem = Math.round(median(sem) * 100) / 100
      const desvioPct =
        Math.round(((medianaSemItem - medianaReferencia) / medianaReferencia) * 1000) / 10
      leaveOneOut.push({
        endereco: valores[i].endereco,
        medianaSemItem,
        desvioPct,
      })
    }
  }

  let amplitudeLeaveOneOutPct = 0
  let comparavelMaisInfluente: string | null = null
  for (const item of leaveOneOut) {
    const abs = Math.abs(item.desvioPct)
    if (abs >= amplitudeLeaveOneOutPct) {
      amplitudeLeaveOneOutPct = abs
      comparavelMaisInfluente = item.endereco
    }
  }
  // Arredonda amplitude a 1 casa (determinístico)
  amplitudeLeaveOneOutPct = Math.round(amplitudeLeaveOneOutPct * 10) / 10

  const veredicto: RobustezTese['veredicto'] =
    amplitudeLeaveOneOutPct > limiarPct ? 'sensivel' : 'robusta'

  const testemunhas: TestemunhaQuadro[] = computation.passaportes.map((p) => ({
    endereco: p.endereco,
    nivel: p.confianca,
    motivos: p.motivos,
    status: p.status,
  }))

  return {
    cenarioReferencia,
    nConjunto: valores.length,
    medianaReferencia,
    amplitudeLeaveOneOutPct,
    comparavelMaisInfluente,
    leaveOneOut,
    veredicto,
    limiarPct,
    testemunhas,
  }
}

/** Código canônico do aviso quando a tese é sensível a um único comparável. */
export const AVISO_REFERENCE_SENSITIVE = 'reference_sensitive_to_single_comp'

/**
 * Monta o aviso de sensibilidade (AC2) — para o MODEL anexar, sem mutar computation.
 */
export function avisoRobustezSensivel(r: RobustezTese): AvisoAcm | null {
  if (r.veredicto !== 'sensivel') return null
  const quem = r.comparavelMaisInfluente ?? 'um comparável'
  return {
    codigo: AVISO_REFERENCE_SENSITIVE,
    severidade: 'atencao',
    mensagem: `Referência sensível a um único comparável: amplitude leave-one-out ${r.amplitudeLeaveOneOutPct}% (limiar ${r.limiarPct}%). Mais influente: ${quem}.`,
  }
}
