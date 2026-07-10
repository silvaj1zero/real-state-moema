/**
 * Tese comercial automática (Story 9.18).
 *
 * Classifica se o preço de anúncio/pretendido está acima, alinhado ou abaixo
 * da referência ACM — evita narrativa única de “deságio” quando o correto é
 * “não cortar” (caso Andrade Pertence 132).
 *
 * Limiares default ±5% (configuráveis). Sem preço comercial → `indefinida`
 * (Art. IV — não inventa tese).
 */

export type TeseComercialKind = 'acima' | 'alinhado' | 'abaixo' | 'indefinida'

export interface TeseComercialLimiares {
  /** Fração acima da ref para `acima` (default 0,05 = +5%). */
  acima: number
  /** Fração abaixo da ref para `abaixo` (default 0,05 = −5%). */
  abaixo: number
}

/** Defaults documentados (AC1). */
export const TESE_LIMIARES_DEFAULT: TeseComercialLimiares = {
  acima: 0.05,
  abaixo: 0.05,
}

export interface TeseComercial {
  tese: TeseComercialKind
  /** (preço − ref) / ref · 100; null se indefinida. */
  deltaPct: number | null
  /** Rótulo curto p/ badge na capa. */
  label: string
  /** Uma frase de tese (capa / Lite). */
  frase: string
  /** Preço comercial usado (anúncio real tem prioridade sobre pretendido). */
  precoComercial: number | null
  /** Referência ACM usada (tipicamente valor de mercado do cenário aderente). */
  referencia: number | null
  /** Qual preço entrou: anuncio | pretendido | nenhum. */
  fontePreco: 'anuncio' | 'pretendido' | 'nenhum'
}

const LABELS: Record<TeseComercialKind, string> = {
  acima: 'Acima do mercado',
  alinhado: 'Alinhado ao mercado',
  abaixo: 'Abaixo do mercado',
  indefinida: 'Tese indefinida',
}

/**
 * Classifica tese comercial (AC1).
 * @param referenciaAcm valor de referência (ex.: headline.referencia.valorMercado)
 * @param precoAnuncioReal preço de anúncio publicado (prioridade)
 * @param precoPretendido expectativa do proprietário
 */
export function classificarTeseComercial(
  referenciaAcm: number | null | undefined,
  precoAnuncioReal?: number | null,
  precoPretendido?: number | null,
  limiares: TeseComercialLimiares = TESE_LIMIARES_DEFAULT,
): TeseComercial {
  const ref =
    referenciaAcm != null && Number.isFinite(referenciaAcm) && referenciaAcm > 0
      ? referenciaAcm
      : null

  let preco: number | null = null
  let fontePreco: TeseComercial['fontePreco'] = 'nenhum'
  if (precoAnuncioReal != null && Number.isFinite(precoAnuncioReal) && precoAnuncioReal > 0) {
    preco = precoAnuncioReal
    fontePreco = 'anuncio'
  } else if (precoPretendido != null && Number.isFinite(precoPretendido) && precoPretendido > 0) {
    preco = precoPretendido
    fontePreco = 'pretendido'
  }

  if (ref == null || preco == null) {
    return {
      tese: 'indefinida',
      deltaPct: null,
      label: LABELS.indefinida,
      frase: 'Sem preço comercial e/ou referência ACM — tese não classificada.',
      precoComercial: preco,
      referencia: ref,
      fontePreco,
    }
  }

  const deltaPct = Math.round(((preco - ref) / ref) * 1000) / 10 // 1 casa decimal
  const limAcima = limiares.acima
  const limAbaixo = limiares.abaixo

  let tese: TeseComercialKind
  if (preco >= ref * (1 + limAcima)) tese = 'acima'
  else if (preco <= ref * (1 - limAbaixo)) tese = 'abaixo'
  else tese = 'alinhado'

  // Copy H-3 (Luciana 2026-07-10): "Subprecificado — não recomendo cortar"
  const frase =
    tese === 'acima'
      ? `Preço ${deltaPct > 0 ? '+' : ''}${deltaPct}% vs referência ACM — tese de realismo de mercado (deságio de captura).`
      : tese === 'abaixo'
        ? `Preço ${deltaPct}% vs referência ACM — Subprecificado — não recomendo cortar.`
        : `Preço dentro de ±${Math.round(limAcima * 100)}% da referência ACM — tese de execução e diferenciação.`

  return {
    tese,
    deltaPct,
    label: LABELS[tese],
    frase,
    precoComercial: preco,
    referencia: ref,
    fontePreco,
  }
}
