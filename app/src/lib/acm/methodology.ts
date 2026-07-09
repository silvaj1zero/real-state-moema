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

  // --- Proveniência para o passaporte de confiabilidade (Story 9.15) --------
  // Campos OPT-IN preenchidos pela ingestão (9.4/9.17) à medida que a origem do
  // dado é conhecida. Ausentes → o passaporte assume o pior grau conhecido
  // (Art. IV — No Invention: nunca presumimos "oficial" sem evidência).
  /** Tipologia do comparável e como foi determinada (guia oficial > heurística > visual). */
  tipologia?: { valor: string; fonte: 'guia' | 'heuristica' | 'visual' | 'desconhecida' } | null
  /** Origem da área construída informada. */
  areaConstruidaFonte?: 'oficial' | 'anuncio' | 'estimada' | null
  /** Origem da área de terreno informada. */
  areaTerrenoFonte?: 'oficial' | 'estimada' | null
  /** `dataVenda` confirmada em fonte oficial (guia/ITBI) vs inferida. */
  dataVendaConfirmada?: boolean | null
  /** Precisão do geocoding do comparável. */
  geocode?: 'exato' | 'rua' | 'cep' | 'aproximado' | null
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

// ---------------------------------------------------------------------------
// Avisos de robustez + passaporte de confiabilidade — Story 9.15 (N-1)
// ---------------------------------------------------------------------------

export type AvisoSeveridade = 'info' | 'atencao' | 'critico'

/**
 * Aviso determinístico de robustez da amostra. Emitido por regra pura (nunca
 * julgamento LLM). O laudo "grita o que não sabe" — a capa lista os avisos para
 * que a tese de preço se sustente sob contraditório (veredito ROI v3 §1).
 */
export interface AvisoAcm {
  codigo: string
  severidade: AvisoSeveridade
  mensagem: string
}

/**
 * Grau de confiabilidade do comparável como EVIDÊNCIA de preço:
 *   A = transação ITBI fechada e enriquecida (terreno + distância → aderência plena)
 *   B = transação ITBI fechada, porém esparsa (sem enriquecimento de terreno/distância)
 *   C = preço pedido/anúncio (não é fechamento) ou área construída ausente
 *   rejeitado = excluído pelo guard-rail anti-auto-referência (Story 9.8)
 * A força vem da ORIGEM DO PREÇO (ITBI > anúncio); tipologia/geocode incertos
 * geram avisos próprios, não rebaixam o grau abaixo de B para um fechamento real.
 */
export type ConfiancaGrau = 'A' | 'B' | 'C' | 'rejeitado'

/** Passaporte de confiabilidade v1 de um comparável (Story 9.15 AC3). */
export interface ComparavelPassport {
  endereco: string
  /** Origem do preço: transação ITBI fechada vs anúncio (pedido). */
  fontePreco: 'itbi_oficial' | 'anuncio' | 'desconhecida'
  /** Tipologia e como foi determinada. `ausente` quando não há dado. */
  tipologia: { valor: string; confianca: 'alta' | 'media' | 'baixa'; fonte: 'guia' | 'heuristica' | 'visual' | 'ausente' }
  areaConstrFonte: 'oficial' | 'anuncio' | 'estimada' | 'nao_rastreada'
  areaTerrenoFonte: 'oficial' | 'estimada' | 'ausente'
  dataVendaFonte: 'confirmada' | 'inferida' | 'ausente'
  geocode: 'exato' | 'rua' | 'cep' | 'aproximado' | 'ausente'
  status: 'incluido' | 'excluido'
  motivos: string[]
  confianca: ConfiancaGrau
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
  /** Avisos determinísticos de robustez da amostra (Story 9.15). */
  avisos: AvisoAcm[]
  /**
   * Passaporte de confiabilidade por comparável (Story 9.15). Inclui os aceitos
   * (grau A/B/C) e os excluídos pelo guard-rail 9.8 (grau `rejeitado`).
   * length = totalComparaveis + autoReferenciasExcluidas.length.
   */
  passaportes: ComparavelPassport[]
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
// Passaporte de confiabilidade — Story 9.15 (derivação determinística)
// ---------------------------------------------------------------------------

/**
 * Deriva o passaporte de um comparável a partir dos campos disponíveis, sem
 * inventar origem (Art. IV): dado ausente vira o pior grau conhecido. O grau de
 * confiança reflete a força do PREÇO como evidência (ITBI fechado > anúncio).
 */
export function derivarPassaporte(
  comp: AcmComparable,
  status: 'incluido' | 'excluido',
  motivos: string[] = [],
): ComparavelPassport {
  const itbi = comp.isVendaReal === true
  const fontePreco: ComparavelPassport['fontePreco'] = itbi
    ? 'itbi_oficial'
    : comp.precoPedido != null || comp.preco > 0
      ? 'anuncio'
      : 'desconhecida'

  const tipoFonteRaw = comp.tipologia?.fonte ?? 'ausente'
  // 'desconhecida' no comparável mapeia para 'ausente' no passaporte.
  const tipoFonte: ComparavelPassport['tipologia']['fonte'] =
    tipoFonteRaw === 'desconhecida' ? 'ausente' : tipoFonteRaw
  const tipoConfianca: 'alta' | 'media' | 'baixa' =
    tipoFonte === 'guia' ? 'alta' : tipoFonte === 'visual' ? 'media' : tipoFonte === 'heuristica' ? 'baixa' : 'baixa'

  const areaConstrFonte: ComparavelPassport['areaConstrFonte'] =
    comp.areaConstruidaFonte ?? 'nao_rastreada'
  const areaTerrenoFonte: ComparavelPassport['areaTerrenoFonte'] =
    comp.areaTerreno != null && comp.areaTerreno > 0 ? (comp.areaTerrenoFonte ?? 'estimada') : 'ausente'
  const dataVendaFonte: ComparavelPassport['dataVendaFonte'] =
    comp.dataVenda == null ? 'ausente' : comp.dataVendaConfirmada ? 'confirmada' : 'inferida'
  const geocode: ComparavelPassport['geocode'] = comp.geocode ?? 'ausente'

  let confianca: ConfiancaGrau
  if (status === 'excluido') {
    confianca = 'rejeitado'
  } else if (!itbi || !(comp.areaConstruida > 0)) {
    confianca = 'C' // anúncio (não é fechamento) ou sem área construída
  } else if (comp.areaTerreno != null && comp.areaTerreno > 0 && comp.distancia != null) {
    confianca = 'A' // ITBI fechado e enriquecido (habilita aderência plena)
  } else {
    confianca = 'B' // ITBI fechado, porém esparso
  }

  return {
    endereco: comp.endereco,
    fontePreco,
    tipologia: {
      valor: comp.tipologia?.valor ?? 'desconhecida',
      confianca: tipoConfianca,
      fonte: tipoFonte,
    },
    areaConstrFonte,
    areaTerrenoFonte,
    dataVendaFonte,
    geocode,
    status,
    motivos,
    confianca,
  }
}

/** Passaportes de todos os comparáveis: aceitos (A/B/C) + excluídos 9.8 (rejeitado). */
export function derivarPassaportes(
  aceitos: AcmComparable[],
  excluidos: SelfReferenceFinding[],
  excluidosOriginais: AcmComparable[] = [],
): ComparavelPassport[] {
  const byEndereco = new Map(excluidosOriginais.map((c) => [c.endereco, c]))
  const passAceitos = aceitos.map((c) => derivarPassaporte(c, 'incluido'))
  const passExcluidos = excluidos.map((f) => {
    const original = byEndereco.get(f.endereco)
    return original
      ? derivarPassaporte(original, 'excluido', f.motivos)
      : {
          endereco: f.endereco,
          fontePreco: 'desconhecida' as const,
          tipologia: { valor: 'desconhecida', confianca: 'baixa' as const, fonte: 'ausente' as const },
          areaConstrFonte: 'nao_rastreada' as const,
          areaTerrenoFonte: 'ausente' as const,
          dataVendaFonte: 'ausente' as const,
          geocode: 'ausente' as const,
          status: 'excluido' as const,
          motivos: f.motivos,
          confianca: 'rejeitado' as const,
        }
  })
  return [...passAceitos, ...passExcluidos]
}

/** Contagem agregada de graus na amostra INCLUÍDA (para a capa). */
export function agregarConfianca(
  passaportes: ComparavelPassport[],
): Record<ConfiancaGrau, number> {
  const acc: Record<ConfiancaGrau, number> = { A: 0, B: 0, C: 0, rejeitado: 0 }
  for (const p of passaportes) acc[p.confianca] += 1
  return acc
}

// ---------------------------------------------------------------------------
// Avisos de robustez — Story 9.15 (regras puras + códigos canônicos)
// ---------------------------------------------------------------------------

/** Span em meses entre a menor e a maior competência 'YYYY-MM' (0 se <2 datas). */
function spanMesesDataVenda(comparaveis: AcmComparable[]): number {
  const meses = comparaveis
    .map((c) => c.dataVenda)
    .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}$/.test(d))
    .map((d) => {
      const [y, m] = d.split('-').map(Number)
      return y * 12 + (m - 1)
    })
  if (meses.length < 2) return 0
  return Math.max(...meses) - Math.min(...meses)
}

interface AvisosInputs {
  target: AcmTarget
  aceitos: AcmComparable[]
  passaportes: ComparavelPassport[]
  computation: Pick<
    AcmLaudoComputation,
    'top3' | 'top5' | 'efeitoEscalaTerreno' | 'composicaoBairros' | 'coAncoraTerreno' | 'autoReferenciasExcluidas'
  >
  fatoresLiquidez: number[]
  homogeneizacaoAplicada: boolean
  estadoAlvoConfirmado: boolean
}

/**
 * Coleta os avisos determinísticos de robustez (Story 9.15 AC2). Cada regra é
 * pura e independente; a ausência de dado nunca gera falso "OK" — gera aviso.
 */
export function coletarAvisos(inp: AvisosInputs): AvisoAcm[] {
  const avisos: AvisoAcm[] = []
  const push = (codigo: string, severidade: AvisoSeveridade, mensagem: string) =>
    avisos.push({ codigo, severidade, mensagem })

  const { aceitos, passaportes, computation, target } = inp
  const incluidos = passaportes.filter((p) => p.status === 'incluido')

  // sample_size_low_top3 — amostra de referência frágil
  if (computation.top3.length < 3 || aceitos.length < 5) {
    push(
      'sample_size_low_top3',
      'critico',
      `Amostra pequena: ${aceitos.length} comparáveis (Top 3 = ${computation.top3.length}). Tese sensível a cada ponto.`,
    )
  }

  // mixed_neighborhood_sample — mais de um bairro real verificado
  const bairrosVerificados = computation.composicaoBairros.filter((b) => b.bairro !== 'não verificado')
  if (bairrosVerificados.length > 1) {
    push(
      'mixed_neighborhood_sample',
      'atencao',
      `Amostra multi-bairro (${bairrosVerificados.map((b) => `${b.bairro}: ${b.n}`).join(', ')}) sem segmentação.`,
    )
  }

  // typology_heuristic_present — algum comparável tipado só por heurística
  if (aceitos.some((c) => c.tipologia?.fonte === 'heuristica')) {
    push(
      'typology_heuristic_present',
      'atencao',
      'Há comparáveis com tipologia por heurística (não confirmada em guia oficial — ver Regra R5).',
    )
  }

  // target_land_area_unconfirmed — terreno do alvo ausente/provisório
  if (target.areaTerreno == null || target.areaTerreno <= 0) {
    push(
      'target_land_area_unconfirmed',
      'atencao',
      'Área de terreno do alvo ausente/provisória — a lente de terreno é indicativa.',
    )
  }

  // temporal_dispersion_high — datas espalhadas sem homogeneização
  if (!inp.homogeneizacaoAplicada && spanMesesDataVenda(aceitos) > 12) {
    push(
      'temporal_dispersion_high',
      'atencao',
      'Vendas dispersas em mais de 12 meses sem homogeneização temporal (índice off).',
    )
  }

  // terrain_lens_low_n — banda de terreno ou residual com n < 3
  const bandaAlvo = computation.efeitoEscalaTerreno.find((b) =>
    target.areaTerreno > 800 ? b.faixa === '>800' : target.areaTerreno >= 500 ? b.faixa === '500-800' : b.faixa === '<500',
  )
  if (computation.coAncoraTerreno != null && bandaAlvo != null && bandaAlvo.n < 3) {
    push(
      'terrain_lens_low_n',
      'atencao',
      `Lente de terreno com base fraca: banda ${bandaAlvo.faixa} tem n=${bandaAlvo.n} (<3). Co-âncora indicativa.`,
    )
  }

  // liquidity_factors_unvalidated — fatores de liquidez não elicitados
  if (inp.fatoresLiquidez.length === 0) {
    push(
      'liquidity_factors_unvalidated',
      'atencao',
      'Fatores de liquidez/condição não elicitados — valor de fechamento = valor de mercado (sem ajuste).',
    )
  }

  // same_street_missing_due_normalization — gap conhecido do guard-rail 9.8
  if (target.endereco != null) {
    const ruaAlvo = normalizeStreet(target.endereco)
    const alvoTemVirgula = target.endereco.includes(',')
    const suspeitos = aceitos.filter(
      (c) => normalizeStreet(c.endereco) === ruaAlvo && c.endereco.includes(',') !== alvoTemVirgula,
    )
    if (suspeitos.length > 0) {
      push(
        'same_street_missing_due_normalization',
        'info',
        `Mesma rua do alvo com formato de endereço divergente (${suspeitos.length}): revisar guard-rail 9.8 (vírgula/normalização).`,
      )
    }
  }

  // target_condition_unconfirmed — ficha/estado do alvo ausente (cruza 9.14)
  if (!inp.estadoAlvoConfirmado) {
    push(
      'target_condition_unconfirmed',
      'atencao',
      'Estado/ficha do imóvel-alvo não confirmado — faixa reportada de forma conservadora (ver Story 9.14).',
    )
  }

  // confidence_low_in_top5 — Top 5 (por aderência) com passaporte C
  const top5Enderecos = new Set(computation.top5.map((t) => t.endereco))
  const top5Baixo = incluidos.filter((p) => top5Enderecos.has(p.endereco) && p.confianca === 'C')
  if (top5Baixo.length > 0) {
    push(
      'confidence_low_in_top5',
      'critico',
      `Top 5 contém ${top5Baixo.length} comparáve${top5Baixo.length === 1 ? 'l' : 'is'} de confiança C (anúncio/sem fechamento).`,
    )
  }

  // AUTO_REF_EXCLUIDAS — info se houve exclusões pelo guard-rail 9.8
  if (computation.autoReferenciasExcluidas.length > 0) {
    push(
      'AUTO_REF_EXCLUIDAS',
      'info',
      `${computation.autoReferenciasExcluidas.length} comparável(is) excluído(s) por auto-referência (guard-rail 9.8).`,
    )
  }

  return avisos
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
  /**
   * Estado/ficha do alvo confirmado (Story 9.14). Quando falso/ausente, emite o
   * aviso `target_condition_unconfirmed` e o laudo reporta faixa conservadora.
   */
  estadoAlvoConfirmado?: boolean
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
  // Guarda os objetos originais dos excluídos p/ o passaporte (Story 9.15).
  const excluidosEnderecos = new Set(autoReferenciasExcluidas.map((f) => f.endereco))
  const excluidosOriginais = opts.comparaveis.filter((c) => excluidosEnderecos.has(c.endereco))

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

  const top5 = ranking.slice(0, 5)
  const top3 = ranking.slice(0, 3)
  const efeitoEscalaTerreno = landPriceByLotSize(comparaveis)
  const composicaoBairros = composicaoPorBairro(comparaveis)

  // Passaporte de confiabilidade + avisos de robustez (Story 9.15).
  const passaportes = derivarPassaportes(comparaveis, autoReferenciasExcluidas, excluidosOriginais)
  const avisos = coletarAvisos({
    target,
    aceitos: comparaveis,
    passaportes,
    computation: { top3, top5, efeitoEscalaTerreno, composicaoBairros, coAncoraTerreno, autoReferenciasExcluidas },
    fatoresLiquidez: fatores,
    homogeneizacaoAplicada: homogeneizacao.aplicada,
    estadoAlvoConfirmado: opts.estadoAlvoConfirmado === true,
  })

  return {
    target,
    totalComparaveis: comparaveis.length,
    medianaPrecoM2,
    scoreAlvo,
    valorMercado,
    valorFechamento,
    faixaFechamento: { min: valorFechamento, max: valorMercado },
    ranking,
    top5,
    top3,
    efeitoEscalaTerreno,
    coAncoraTerreno,
    sensibilidade,
    faixaSensibilidade,
    headline: headlineFaixa(sensibilidade),
    desagioMedidoPercent: desagioMedido(comparaveis),
    autoReferenciasExcluidas,
    homogeneizacao,
    composicaoBairros,
    avisos,
    passaportes,
  }
}
