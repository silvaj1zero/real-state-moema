/**
 * Seleção de comparáveis "mais parecidos" com um imóvel-alvo (Story 8.2 → UI / AC4).
 * Pura e testável. Reusa o índice de aderência da metodologia (`methodology.ts`)
 * como critério de semelhança e deriva um valor indicativo pela mediana de R$/m².
 */
import {
  adherenceIndex,
  median,
  RAIO_PADRAO_M,
  DEFAULT_ACM_TESE,
  type AcmComparable,
  type AcmTarget,
  type AcmTese,
} from './methodology'

export interface SimilarComparable {
  endereco: string
  areaConstruida: number
  preco: number
  precoM2: number
  distancia: number | null
  /** Índice de aderência (0..1) — área 50% / terreno 20% / proximidade 30%. */
  aderencia: number
}

export interface SimilarResult {
  top: SimilarComparable[]
  medianaPrecoM2: number
  /** Valor indicativo do alvo = mediana R$/m² dos Top N × área construída do alvo. */
  valorIndicativo: number
  totalConsiderados: number
}

/** Ranqueia por aderência ao alvo e devolve os Top N + valor indicativo. */
export function selectMostSimilar(
  target: AcmTarget,
  comparaveis: AcmComparable[],
  topN: number = 10,
  raio: number = RAIO_PADRAO_M,
  tese: AcmTese = DEFAULT_ACM_TESE,
): SimilarResult {
  const scored = comparaveis
    .filter((c) => c.areaConstruida > 0 && c.preco > 0)
    .map((c) => ({ c, adh: adherenceIndex(target, c, raio, tese).indice }))
    .sort((a, b) => b.adh - a.adh)

  const top: SimilarComparable[] = scored.slice(0, Math.max(0, topN)).map(({ c, adh }) => ({
    endereco: c.endereco,
    areaConstruida: c.areaConstruida,
    preco: c.preco,
    precoM2: Math.round((c.preco / c.areaConstruida) * 100) / 100,
    distancia: c.distancia ?? null,
    aderencia: Math.round(adh * 1000) / 1000,
  }))

  const medianaPrecoM2 = Math.round(median(top.map((t) => t.precoM2)) * 100) / 100
  return {
    top,
    medianaPrecoM2,
    valorIndicativo: Math.round(medianaPrecoM2 * target.areaConstruida),
    totalConsiderados: scored.length,
  }
}
