/**
 * Camada de cálculo ACM — Story 8.2.
 *
 * Biblioteca PURA (sem deps Next.js/React) que reproduz a metodologia do laudo
 * Rua Honduras (`docs/reference/acm-honduras/`). Cada constante traça à seção do
 * material de referência (Art. IV — No Invention). Testada por regressão contra
 * o caso Honduras em `methodology.test.ts`.
 *
 * Pipeline conceitual:
 *   comparáveis (acm_comparaveis) → mediana R$/m² → valor de mercado (× Capex Score)
 *   → valor de fechamento (× fatores de liquidez compostos)
 *   + índice de aderência (50/20/30) → Top N
 *   + efeito-escala do terreno + valor residual do incorporador → co-âncora de terreno
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Score = 'AAA' | 'AA' | 'A' | 'B'

/** Comparável de entrada para a metodologia (superset desacoplado do tipo do DB). */
export interface AcmComparable {
  endereco: string
  /** Área construída em m² (lente do comprador-usuário). */
  areaConstruida: number
  /** Área de terreno em m² (lente do comprador-terreno). Opcional. */
  areaTerreno?: number | null
  /** Valor da transação (ITBI) ou pedido (anúncio). */
  preco: number
  /** Distância em metros ao imóvel-alvo. Opcional (necessária p/ aderência). */
  distancia?: number | null
  suites?: number | null
  vagas?: number | null
  /** Preço pedido no anúncio, quando recuperado (p/ deságio). */
  precoPedido?: number | null
  isVendaReal?: boolean
}

/** Imóvel-alvo da avaliação. */
export interface AcmTarget {
  areaConstruida: number
  areaTerreno: number
}

export interface AdherenceBreakdown {
  endereco: string
  simAreaConstruida: number
  simAreaTerreno: number
  proximidade: number
  indice: number
}

export interface LotSizeBand {
  faixa: '<500' | '500-800' | '>800'
  n: number
  medianaPrecoM2Terreno: number
}

export interface ResidualLandParams {
  /** VGV por m² da casa nova (saída AAA). Honduras: 34.000. */
  vgvPerM2: number
  /** Área construída da casa nova. Honduras: 800. */
  areaNova: number
  /** Custo de obra por m². Honduras: 10.500. */
  custoObraPerM2: number
  /** Custo de demolição (valor absoluto). Honduras: 200.000. */
  demolicao: number
  /** Comercialização + impostos, fração do VGV. Honduras: 0.08. */
  comercializacaoPct: number
  /** Custo financeiro / projeto / aprovações, fração do VGV. Honduras: 0.05. */
  custoFinanceiroPct: number
  /** Margem do incorporador, fração do VGV. Honduras: 0.20. */
  margemPct: number
}

export interface SensitivityScenario {
  cenario: 'todos' | 'top5' | 'top3'
  n: number
  medianaPrecoM2: number
  valorMercado: number
  valorFechamento: number
  precoM2Fechamento: number
}

export interface AcmLaudoComputation {
  target: AcmTarget
  totalComparaveis: number
  medianaPrecoM2: number
  /** Score do alvo (lente construção). */
  scoreAlvo: Score | null
  valorMercado: number
  valorFechamento: number
  faixaFechamento: { min: number; max: number }
  ranking: AdherenceBreakdown[]
  top5: AdherenceBreakdown[]
  top3: AdherenceBreakdown[]
  efeitoEscalaTerreno: LotSizeBand[]
  coAncoraTerreno: number | null
  sensibilidade: SensitivityScenario[]
  desagioMedidoPercent: number | null
}

// ---------------------------------------------------------------------------
// Constantes da metodologia (traçam aos PDFs de referência)
// ---------------------------------------------------------------------------

/**
 * Ajuste de Capex por Score, aplicado à mediana de R$/m² para chegar ao valor de
 * mercado. Derivado da reconciliação Honduras (Laudo Sec. 9 / Resumo): o "Todos os
 * 23" tem valor de mercado 12.419.520 = 18.264 × 800 × 0.85 → Capex Score B = 0.15.
 * Apenas B é evidenciado no caso; demais ficam 0 até haver caso que os calibre.
 */
export const CAPEX_BY_SCORE: Record<Score, number> = {
  AAA: 0,
  AA: 0,
  A: 0,
  B: 0.15,
}

/** Pesos do índice de aderência (Material Didático Parte 1.3). */
export const ADHERENCE_WEIGHTS = {
  areaConstruida: 0.5,
  areaTerreno: 0.2,
  proximidade: 0.3,
} as const

/** Raio de análise padrão em metros (Material Didático Parte 1.1). */
export const RAIO_PADRAO_M = 1000

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Mediana de uma lista numérica (ignora vazios). 0 se lista vazia. */
export function median(values: number[]): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Similaridade normalizada 0..1: 1 - |x - alvo| / alvo, com clamp em [0,1]. */
function similaridade(valor: number, alvo: number): number {
  if (alvo <= 0) return 0
  return Math.max(0, Math.min(1, 1 - Math.abs(valor - alvo) / alvo))
}

// ---------------------------------------------------------------------------
// Score — Material Didático Parte 1.2
// ---------------------------------------------------------------------------

/**
 * Classifica o patamar do produto pela régua de R$/m² construído, reforçada por
 * suítes/vagas e área (Material Didático Parte 1.2):
 *   AAA: ≥40.000 + (4+ suítes/vagas OU área ≥500 m²)
 *   AA : ≥30.000 + 3+ suítes/vagas
 *   A  : ≥22.000
 *   B  : <22.000
 */
export function classifyScore(
  precoM2Construido: number,
  suitesOuVagas?: number | null,
  areaConstruida?: number | null,
): Score {
  const luxo = Math.max(suitesOuVagas ?? 0, 0)
  const area = areaConstruida ?? 0
  if (precoM2Construido >= 40000 && (luxo >= 4 || area >= 500)) return 'AAA'
  if (precoM2Construido >= 30000 && luxo >= 3) return 'AA'
  if (precoM2Construido >= 22000) return 'A'
  return 'B'
}

// ---------------------------------------------------------------------------
// Índice de aderência — Material Didático Parte 1.3
// ---------------------------------------------------------------------------

/** Aderência = 0,50·simÁreaConstr + 0,20·simÁreaTerreno + 0,30·proximidade. */
export function adherenceIndex(
  target: AcmTarget,
  comp: AcmComparable,
  raio: number = RAIO_PADRAO_M,
): AdherenceBreakdown {
  const simAreaConstruida = similaridade(comp.areaConstruida, target.areaConstruida)
  const simAreaTerreno =
    comp.areaTerreno != null
      ? similaridade(comp.areaTerreno, target.areaTerreno)
      : 0
  const proximidade =
    comp.distancia != null ? Math.max(0, Math.min(1, 1 - comp.distancia / raio)) : 0
  const indice =
    ADHERENCE_WEIGHTS.areaConstruida * simAreaConstruida +
    ADHERENCE_WEIGHTS.areaTerreno * simAreaTerreno +
    ADHERENCE_WEIGHTS.proximidade * proximidade
  return { endereco: comp.endereco, simAreaConstruida, simAreaTerreno, proximidade, indice }
}

/** Ordena comparáveis por aderência decrescente. */
export function rankByAdherence(
  target: AcmTarget,
  comparaveis: AcmComparable[],
  raio: number = RAIO_PADRAO_M,
): AdherenceBreakdown[] {
  return comparaveis
    .map((c) => adherenceIndex(target, c, raio))
    .sort((a, b) => b.indice - a.indice)
}

// ---------------------------------------------------------------------------
// Efeito-escala do terreno — Laudo Sec. 8a / Material Didático Parte 2.2
// ---------------------------------------------------------------------------

/** R$/m² de terreno mediano por faixa de tamanho de lote (efeito-escala). */
export function landPriceByLotSize(comparaveis: AcmComparable[]): LotSizeBand[] {
  const bands: Array<{ faixa: LotSizeBand['faixa']; test: (t: number) => boolean }> = [
    { faixa: '<500', test: (t) => t < 500 },
    { faixa: '500-800', test: (t) => t >= 500 && t <= 800 },
    { faixa: '>800', test: (t) => t > 800 },
  ]
  return bands.map(({ faixa, test }) => {
    const precos = comparaveis
      .filter((c) => c.areaTerreno != null && c.areaTerreno > 0 && test(c.areaTerreno))
      .map((c) => c.preco / (c.areaTerreno as number))
    return { faixa, n: precos.length, medianaPrecoM2Terreno: Math.round(median(precos) * 100) / 100 }
  })
}

// ---------------------------------------------------------------------------
// Valor residual do terreno (incorporador) — Laudo Sec. 8b
// ---------------------------------------------------------------------------

/** VGV − obra − demolição − comercialização − custo financeiro − margem. */
export function residualLandValue(p: ResidualLandParams): number {
  const vgv = p.vgvPerM2 * p.areaNova
  const residual =
    vgv -
    p.custoObraPerM2 * p.areaNova -
    p.demolicao -
    p.comercializacaoPct * vgv -
    p.custoFinanceiroPct * vgv -
    p.margemPct * vgv
  return Math.round(residual)
}

// ---------------------------------------------------------------------------
// Valor de mercado e fechamento — Laudo Sec. 1, 2, 9
// ---------------------------------------------------------------------------

/** Valor de mercado (via construção) = mediana R$/m² × área × (1 − Capex Score). */
export function marketValue(
  medianaPrecoM2: number,
  areaConstruida: number,
  score: Score,
): number {
  return Math.round(medianaPrecoM2 * areaConstruida * (1 - CAPEX_BY_SCORE[score]))
}

/**
 * Aplica fatores de liquidez/condição de forma COMPOSTA (multiplicativa) sobre o
 * valor de mercado → valor de fechamento (Laudo Sec. 2: "aplicação composta").
 * Os fatores são INPUTS por imóvel definidos pela consultora (ex.: Honduras
 * [0.07, 0.05, 0.03, 0.04]), não constantes do código.
 */
export function liquidityAdjustment(valorMercado: number, fatores: number[]): number {
  const composto = fatores.reduce((acc, f) => acc * (1 - f), 1)
  return Math.round(valorMercado * composto)
}

// ---------------------------------------------------------------------------
// Sensibilidade — Laudo Sec. 9
// ---------------------------------------------------------------------------

/** Aplica a mesma estratégia de cálculo a 3 recortes (Todos / Top 5 / Top 3). */
export function sensitivityScenarios(
  target: AcmTarget,
  comparaveis: AcmComparable[],
  score: Score,
  fatoresLiquidez: number[],
  raio: number = RAIO_PADRAO_M,
): SensitivityScenario[] {
  const ranked = rankByAdherence(target, comparaveis, raio)
  const byEndereco = new Map(comparaveis.map((c) => [c.endereco, c]))
  const precoM2 = (c: AcmComparable) => c.preco / c.areaConstruida

  const recortes: Array<{ cenario: SensitivityScenario['cenario']; set: AcmComparable[] }> = [
    { cenario: 'todos', set: comparaveis },
    {
      cenario: 'top5',
      set: ranked.slice(0, 5).map((r) => byEndereco.get(r.endereco)!).filter(Boolean),
    },
    {
      cenario: 'top3',
      set: ranked.slice(0, 3).map((r) => byEndereco.get(r.endereco)!).filter(Boolean),
    },
  ]

  return recortes.map(({ cenario, set }) => {
    const med = median(set.map(precoM2))
    const valorMercado = marketValue(med, target.areaConstruida, score)
    const valorFechamento = liquidityAdjustment(valorMercado, fatoresLiquidez)
    return {
      cenario,
      n: set.length,
      medianaPrecoM2: Math.round(med * 100) / 100,
      valorMercado,
      valorFechamento,
      precoM2Fechamento: Math.round(valorFechamento / target.areaConstruida),
    }
  })
}

// ---------------------------------------------------------------------------
// Deságio medido (anúncio → fechamento) — Laudo Sec. 7.1
// ---------------------------------------------------------------------------

/** Mediana do deságio % medido nos comparáveis com anúncio recuperado. null se nenhum. */
export function desagioMedido(comparaveis: AcmComparable[]): number | null {
  const desagios = comparaveis
    .filter((c) => c.precoPedido != null && c.precoPedido > 0 && c.isVendaReal)
    .map((c) => (c.preco - (c.precoPedido as number)) / (c.precoPedido as number))
  if (desagios.length === 0) return null
  return Math.round(median(desagios) * 1000) / 10 // % com 1 casa
}

// ---------------------------------------------------------------------------
// Orquestrador
// ---------------------------------------------------------------------------

export interface ComputeLaudoOptions {
  target: AcmTarget
  comparaveis: AcmComparable[]
  /** Score do alvo; se ausente, é classificado pela mediana de R$/m². */
  scoreAlvo?: Score
  /** Fatores de liquidez por imóvel (frações). Default: nenhum (sem ajuste). */
  fatoresLiquidez?: number[]
  raio?: number
  /** Parâmetros do valor residual do terreno; se ausente, co-âncora fica null. */
  residual?: ResidualLandParams
}

/** Computa o pacote completo do laudo a partir dos comparáveis. */
export function computeLaudo(opts: ComputeLaudoOptions): AcmLaudoComputation {
  const { target, comparaveis } = opts
  const raio = opts.raio ?? RAIO_PADRAO_M
  const fatores = opts.fatoresLiquidez ?? []

  const precosM2 = comparaveis.map((c) => c.preco / c.areaConstruida)
  const medianaPrecoM2 = Math.round(median(precosM2) * 100) / 100
  const scoreAlvo = opts.scoreAlvo ?? classifyScore(medianaPrecoM2, null, target.areaConstruida)

  const valorMercado = marketValue(medianaPrecoM2, target.areaConstruida, scoreAlvo)
  const valorFechamento = liquidityAdjustment(valorMercado, fatores)

  const ranking = rankByAdherence(target, comparaveis, raio)
  const sensibilidade = sensitivityScenarios(target, comparaveis, scoreAlvo, fatores, raio)
  const coAncoraTerreno = opts.residual ? residualLandValue(opts.residual) : null

  return {
    target,
    totalComparaveis: comparaveis.length,
    medianaPrecoM2,
    scoreAlvo,
    valorMercado,
    valorFechamento,
    faixaFechamento: { min: valorFechamento, max: valorMercado },
    ranking,
    top5: ranking.slice(0, 5),
    top3: ranking.slice(0, 3),
    efeitoEscalaTerreno: landPriceByLotSize(comparaveis),
    coAncoraTerreno,
    sensibilidade,
    desagioMedidoPercent: desagioMedido(comparaveis),
  }
}
