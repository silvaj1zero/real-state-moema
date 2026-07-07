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
  /** Competência da venda 'YYYY-MM' (ITBI). Habilita a deflação temporal (Story 9.11). */
  dataVenda?: string | null
  /**
   * Bairro REAL verificado via CEP — auditoria 03-Jul §3.1: o laudo Honduras
   * rotulava 16/23 comparáveis com bairro incorreto. Campo opt-in.
   */
  bairroReal?: string | null
}

/** Imóvel-alvo da avaliação. */
export interface AcmTarget {
  areaConstruida: number
  areaTerreno: number
  /** Endereço do alvo — habilita o guard-rail anti-auto-referência. */
  endereco?: string | null
  vagas?: number | null
  /**
   * Preço pedido/pretendido pela proprietária. NUNCA entra como evidência de
   * mercado (Story 9.8 / incidente Honduras 639) — usado apenas para detectar
   * anúncios do próprio alvo disfarçados de comparável.
   */
  precoPretendido?: number | null
}

/** Comparável excluído pelo guard-rail anti-auto-referência, com motivos. */
export interface SelfReferenceFinding {
  endereco: string
  motivos: string[]
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

/**
 * Envelope min/max entre os cenários de sensibilidade (Todos/Top5/Top3).
 * Base de dado para reportar FAIXA em vez de ponto único — o headline não deve
 * ser o cenário de maior valor sem justificativa (auditoria 03-Jul-2026, §3.1).
 */
export interface SensitivityRange {
  mercadoMin: number
  mercadoMax: number
  fechamentoMin: number
  fechamentoMax: number
}

/**
 * Headline em faixa — decisão do founder 06-Jul-2026 (auditoria 03-Jul §3.1 /
 * Frente 1.2): o laudo reporta FAIXA entre os cenários de sensibilidade, com o
 * cenário ADERENTE como referência principal e o recorte amplo como teto. O
 * headline nunca é o cenário de maior valor apresentado como ponto único.
 */
export interface HeadlineFaixa {
  /** Envelope min–max de valor de mercado entre os cenários. */
  mercado: { min: number; max: number }
  /** Envelope min–max de valor de fechamento entre os cenários. */
  fechamento: { min: number; max: number }
  /**
   * Cenário aderente de referência: entre top5/top3, o de MENOR valor de
   * mercado (conservador); empate resolve para o de maior n (top5).
   */
  referencia: SensitivityScenario
  /** Cenário-teto: o de MAIOR valor de mercado (tipicamente 'todos'). */
  teto: SensitivityScenario
}

// ---------------------------------------------------------------------------
// Homogeneização temporal + bairro real — Story 9.11 (auditoria Frente 1.3)
// ---------------------------------------------------------------------------

/** Ponto mensal de um índice de preços (decisão founder 06-Jul: FipeZap). */
export interface IndiceMensalPonto {
  /** Competência no formato 'YYYY-MM'. */
  mes: string
  /** Número-índice. Só RAZÕES entre pontos são usadas — a base é livre. */
  indice: number
}

export interface HomogeneizacaoOptions {
  /** Nome do índice, para rastreabilidade nos artefatos (ex.: 'FipeZap'). */
  indice: string
  /** Série mensal do índice cobrindo as competências das vendas. */
  serie: IndiceMensalPonto[]
  /** Competência de referência 'YYYY-MM' — valor presente do laudo. */
  dataReferencia: string
}

/** Ajuste temporal aplicado a um comparável (rastreável por endereço). */
export interface AjusteTemporalFinding {
  endereco: string
  dataVenda: string
  /** fator = índice(referência) / índice(venda). */
  fator: number
  precoOriginal: number
  precoAjustado: number
}

export interface HomogeneizacaoRelatorio {
  aplicada: boolean
  indice: string | null
  dataReferencia: string | null
  ajustes: AjusteTemporalFinding[]
  /** Endereços sem `dataVenda` ou sem competência na série — entram SEM ajuste. */
  semAjuste: string[]
}

/** Composição da amostra por bairro real verificado (CEP). */
export interface BairroComposicao {
  /** `bairroReal` do comparável, ou 'não verificado' quando ausente. */
  bairro: string
  n: number
  medianaPrecoM2: number
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
  faixaSensibilidade: SensitivityRange
  /** Headline em faixa com cenário aderente de referência (decisão 06-Jul). */
  headline: HeadlineFaixa
  desagioMedidoPercent: number | null
  /** Comparáveis rejeitados por serem o próprio alvo (guard-rail Story 9.8). */
  autoReferenciasExcluidas: SelfReferenceFinding[]
  /** Relatório da deflação temporal (Story 9.11). Inerte sem `opts.homogeneizacao`. */
  homogeneizacao: HomogeneizacaoRelatorio
  /** Composição da amostra por bairro real verificado (Story 9.11). */
  composicaoBairros: BairroComposicao[]
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
// Guard-rail anti-auto-referência — Story 9.8 (incidente Honduras 639)
// ---------------------------------------------------------------------------

/** Tolerâncias do fingerprint de auto-referência (Story 9.8). */
export const SELF_REFERENCE_TOLERANCE = {
  /** Distância máxima ao alvo (m) para considerar "mesmo ponto" na mesma rua. */
  distanciaM: 50,
  /** Desvio relativo máximo de área construída. */
  areaPct: 0.02,
  /** Desvio relativo máximo entre preço do item e preço pretendido do alvo. */
  precoPct: 0.05,
} as const

const STREET_PREFIX_RE =
  /^(rua|r\.?|avenida|av\.?|alameda|al\.?|travessa|tv\.?|praca|pc\.?|estrada|est\.?)\s+/

/** Nome da via normalizado: sem acentos, sem prefixo de logradouro, sem número. */
function normalizeStreet(endereco: string): string {
  return endereco
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(',')[0]
    .trim()
    .replace(STREET_PREFIX_RE, '')
    .trim()
}

/**
 * Detecta se um comparável/oferta é (provavelmente) o PRÓPRIO imóvel-alvo —
 * a auto-referência circular que quase contaminou o laudo Honduras v4
 * (anúncio "Honduras 639" = alvo 629). Regras, qualquer uma basta:
 *   R1: mesma rua E distância < 50 m.
 *   R2: fingerprint raro — área ±2% E vagas iguais E preço ±5% do pretendido.
 *   R3: mesma rua E área ±2% E (vagas iguais OU preço ±5% do pretendido).
 * Sem `target.endereco`/`vagas`/`precoPretendido`, as regras dependentes ficam
 * inertes (guard-rail opt-in — não altera casos legados).
 */
export function isSelfReference(
  target: AcmTarget,
  comp: AcmComparable,
): SelfReferenceFinding | null {
  const tol = SELF_REFERENCE_TOLERANCE
  const motivos: string[] = []

  const mesmaRua =
    target.endereco != null && normalizeStreet(comp.endereco) === normalizeStreet(target.endereco)
  const perto = comp.distancia != null && comp.distancia < tol.distanciaM
  const areaIgual =
    target.areaConstruida > 0 &&
    Math.abs(comp.areaConstruida - target.areaConstruida) / target.areaConstruida <= tol.areaPct
  const vagasIguais = target.vagas != null && comp.vagas != null && comp.vagas === target.vagas
  const precoAlvo = target.precoPretendido
  const precoIgual =
    precoAlvo != null &&
    precoAlvo > 0 &&
    [comp.preco, comp.precoPedido].some(
      (p) => p != null && p > 0 && Math.abs(p - precoAlvo) / precoAlvo <= tol.precoPct,
    )

  if (mesmaRua && perto) motivos.push(`mesma rua a <${tol.distanciaM}m do alvo`)
  if (areaIgual && vagasIguais && precoIgual)
    motivos.push('fingerprint raro: área, vagas e preço batem com o alvo')
  if (mesmaRua && areaIgual && (vagasIguais || precoIgual))
    motivos.push('mesma rua com área e vagas/preço batendo com o alvo')

  return motivos.length > 0 ? { endereco: comp.endereco, motivos } : null
}

/** Separa comparáveis legítimos das auto-referências detectadas. */
export function screenSelfReferences(
  target: AcmTarget,
  comparaveis: AcmComparable[],
): { aceitos: AcmComparable[]; excluidos: SelfReferenceFinding[] } {
  const aceitos: AcmComparable[] = []
  const excluidos: SelfReferenceFinding[] = []
  for (const comp of comparaveis) {
    const finding = isSelfReference(target, comp)
    if (finding) excluidos.push(finding)
    else aceitos.push(comp)
  }
  return { aceitos, excluidos }
}

// ---------------------------------------------------------------------------
// Homogeneização temporal — Story 9.11 (auditoria Frente 1.3, índice FipeZap)
// ---------------------------------------------------------------------------

/**
 * Deflaciona os preços dos comparáveis para a competência de referência usando
 * a série mensal do índice (fator = índice(ref) / índice(venda)). Regras
 * determinísticas:
 *   - Comparável sem `dataVenda` ou com competência fora da série entra SEM
 *     ajuste e é reportado em `semAjuste` — nunca inventamos data ou índice.
 *   - `preco` e `precoPedido` são ajustados pelo MESMO fator: o deságio medido
 *     (anúncio → fechamento) é uma razão da mesma competência e permanece
 *     invariante à deflação.
 *   - `dataReferencia` ausente da série é erro de configuração → throw.
 */
export function deflacionarComparaveis(
  comparaveis: AcmComparable[],
  opts: HomogeneizacaoOptions,
): { comparaveis: AcmComparable[]; relatorio: HomogeneizacaoRelatorio } {
  const porMes = new Map(opts.serie.map((p) => [p.mes, p.indice]))
  const indiceRef = porMes.get(opts.dataReferencia)
  if (indiceRef == null || indiceRef <= 0) {
    throw new Error(
      `dataReferencia ${opts.dataReferencia} ausente (ou inválida) na série do índice ${opts.indice}`,
    )
  }

  const ajustes: AjusteTemporalFinding[] = []
  const semAjuste: string[] = []
  const ajustados = comparaveis.map((c) => {
    const indiceVenda = c.dataVenda != null ? porMes.get(c.dataVenda) : undefined
    if (c.dataVenda == null || indiceVenda == null || indiceVenda <= 0) {
      semAjuste.push(c.endereco)
      return c
    }
    const fator = indiceRef / indiceVenda
    const precoAjustado = Math.round(c.preco * fator)
    ajustes.push({
      endereco: c.endereco,
      dataVenda: c.dataVenda,
      fator,
      precoOriginal: c.preco,
      precoAjustado,
    })
    return {
      ...c,
      preco: precoAjustado,
      precoPedido: c.precoPedido != null ? Math.round(c.precoPedido * fator) : c.precoPedido,
    }
  })

  return {
    comparaveis: ajustados,
    relatorio: {
      aplicada: true,
      indice: opts.indice,
      dataReferencia: opts.dataReferencia,
      ajustes,
      semAjuste,
    },
  }
}

/** Composição da amostra por `bairroReal` (mediana R$/m² por bairro; n desc). */
export function composicaoPorBairro(comparaveis: AcmComparable[]): BairroComposicao[] {
  const grupos = new Map<string, number[]>()
  for (const c of comparaveis) {
    const bairro = c.bairroReal ?? 'não verificado'
    const lista = grupos.get(bairro) ?? []
    if (c.areaConstruida > 0) lista.push(c.preco / c.areaConstruida)
    grupos.set(bairro, lista)
  }
  return [...grupos.entries()]
    .map(([bairro, precos]) => ({
      bairro,
      n: precos.length,
      medianaPrecoM2: Math.round(median(precos) * 100) / 100,
    }))
    .sort((a, b) => b.n - a.n || a.bairro.localeCompare(b.bairro, 'pt-BR'))
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

/**
 * Deriva o headline em faixa dos cenários de sensibilidade (decisão do founder
 * 06-Jul-2026). Regras determinísticas (gate anti-viés da auditoria §3.1):
 *   - referência = entre os cenários aderentes (top5/top3), o de MENOR valor de
 *     mercado — escolha conservadora; empate resolve para o de maior n (top5).
 *     Sem cenário aderente na lista, cai para o de menor valor entre todos.
 *   - teto = cenário de MAIOR valor de mercado (tipicamente 'todos').
 *   - faixas mercado/fechamento = envelope min–max entre os cenários.
 */
export function headlineFaixa(sensibilidade: SensitivityScenario[]): HeadlineFaixa {
  if (sensibilidade.length === 0) {
    throw new Error('headlineFaixa requer ao menos um cenário de sensibilidade')
  }
  const aderentes = sensibilidade.filter((s) => s.cenario !== 'todos')
  const pool = aderentes.length > 0 ? aderentes : sensibilidade
  const referencia = [...pool].sort(
    (a, b) => a.valorMercado - b.valorMercado || b.n - a.n,
  )[0]
  const teto = [...sensibilidade].sort((a, b) => b.valorMercado - a.valorMercado)[0]
  const mercados = sensibilidade.map((s) => s.valorMercado)
  const fechamentos = sensibilidade.map((s) => s.valorFechamento)
  return {
    mercado: { min: Math.min(...mercados), max: Math.max(...mercados) },
    fechamento: { min: Math.min(...fechamentos), max: Math.max(...fechamentos) },
    referencia,
    teto,
  }
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
  /**
   * Deflação temporal a valor presente (Story 9.11). Se ausente, os preços
   * entram como estão (comportamento legado) e o relatório sai `aplicada: false`.
   */
  homogeneizacao?: HomogeneizacaoOptions
}

/** Computa o pacote completo do laudo a partir dos comparáveis. */
export function computeLaudo(opts: ComputeLaudoOptions): AcmLaudoComputation {
  const { target } = opts
  const raio = opts.raio ?? RAIO_PADRAO_M
  const fatores = opts.fatoresLiquidez ?? []

  // Guard-rail Story 9.8: auto-referências saem ANTES de qualquer estatística.
  // A detecção usa preços ORIGINAIS (fingerprint contra o preço pretendido atual),
  // por isso o screening precede a deflação.
  const screened = screenSelfReferences(target, opts.comparaveis)
  const autoReferenciasExcluidas = screened.excluidos

  // Homogeneização temporal Story 9.11: deflaciona a valor presente (opt-in).
  let comparaveis = screened.aceitos
  let homogeneizacao: HomogeneizacaoRelatorio = {
    aplicada: false,
    indice: null,
    dataReferencia: null,
    ajustes: [],
    semAjuste: [],
  }
  if (opts.homogeneizacao) {
    const deflacionado = deflacionarComparaveis(comparaveis, opts.homogeneizacao)
    comparaveis = deflacionado.comparaveis
    homogeneizacao = deflacionado.relatorio
  }

  const precosM2 = comparaveis.map((c) => c.preco / c.areaConstruida)
  const medianaPrecoM2 = Math.round(median(precosM2) * 100) / 100
  const scoreAlvo = opts.scoreAlvo ?? classifyScore(medianaPrecoM2, null, target.areaConstruida)

  const valorMercado = marketValue(medianaPrecoM2, target.areaConstruida, scoreAlvo)
  const valorFechamento = liquidityAdjustment(valorMercado, fatores)

  const ranking = rankByAdherence(target, comparaveis, raio)
  const sensibilidade = sensitivityScenarios(target, comparaveis, scoreAlvo, fatores, raio)
  const coAncoraTerreno = opts.residual ? residualLandValue(opts.residual) : null
  const faixaSensibilidade: SensitivityRange = {
    mercadoMin: Math.min(...sensibilidade.map((s) => s.valorMercado)),
    mercadoMax: Math.max(...sensibilidade.map((s) => s.valorMercado)),
    fechamentoMin: Math.min(...sensibilidade.map((s) => s.valorFechamento)),
    fechamentoMax: Math.max(...sensibilidade.map((s) => s.valorFechamento)),
  }

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
    faixaSensibilidade,
    headline: headlineFaixa(sensibilidade),
    desagioMedidoPercent: desagioMedido(comparaveis),
    autoReferenciasExcluidas,
    homogeneizacao,
    composicaoBairros: composicaoPorBairro(comparaveis),
  }
}
