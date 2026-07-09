/**
 * View-model puro do Laudo Técnico ACM completo (Story 8.3b).
 *
 * Continuação da 8.3a: enquanto o `resumoModel` monta a versão sucinta (3 págs),
 * este monta a versão técnica completa — as 10 seções do
 * `docs/reference/acm-honduras/LAUDO_ACM_Rua_Honduras_RE-MAX_v4_NOVO.pdf` (~18 págs).
 *
 * Princípios:
 * - **Zero recálculo de metodologia** (ADR-EPIC8-001): todos os números-âncora vêm
 *   do `AcmLaudoComputation` da Story 8.2 (valor de mercado, fechamento, Top N,
 *   efeito-escala, residual/co-âncora, sensibilidade, deságio). As agregações de
 *   exibição (percentis de terreno, ticket mediano por faixa, breakdown do residual)
 *   são montagem de view-model sobre os MESMOS dados — não nova metodologia.
 * - **Art. IV (No Invention):** rótulos, colunas e o texto-modelo das 10 seções
 *   traçam ao laudo de referência (extraído via `pdftotext -layout`). Os textos de
 *   argumentação/parecer são TEMPLATES factuais sobre os números (defaults do caso
 *   Honduras), sobrescrevíveis por `LaudoInput`.
 *
 * Reusa os primitivos da 8.3a: `theme.ts` (branding), `staticMap.ts` (mapa) e o
 * padrão de view-model do `resumoModel.ts` (faixa de 5 cards e helpers).
 */
import { formatBRL } from '@/lib/format'
import type {
  AcmLaudoComputation,
  AvisoAcm,
  ConfiancaGrau,
  DesagioTratado,
  ResidualLandParams,
  SensitivityScenario,
} from '@/lib/acm/methodology'
import { agregarConfianca } from '@/lib/acm/methodology'
import { classificarTeseComercial } from '@/lib/acm/teseComercial'
import type { ResumoFaixaItem, ResumoInput, ResumoSourceComparable } from './resumoModel'

// ===========================================================================
// Entradas
// ===========================================================================

/** Comparável-fonte rico para a tabela completa (Sec. 5) e rastreabilidade (Sec. 7.1). */
export interface LaudoSourceComparable extends ResumoSourceComparable {
  /** Código/ref. cadastral (ex.: "PMSP-0431"). */
  codigoRef?: string | null
  /** Bairro do comparável (ex.: "Jardim América"). */
  bairro?: string | null
  dormitorios?: number | null
  suites?: number | null
  vagas?: number | null
  /** R$/m² construído (derivado de preço/áreaConstr quando ausente). */
  precoM2Construido?: number | null
  /** SQL/número cadastral (GeoSampa). */
  sqlCadastral?: string | null
  /** Status do anúncio (ex.: "off-market", "anúncio confirmado"). */
  statusAnuncio?: string | null
  /** Fonte/anúncio com label textual (ex.: "ITBImap (consulta SQL)"). */
  fonteAnuncio?: string | null
  /** URL real do anúncio para revisão humana (quando ainda disponível). null = não recuperável. */
  anuncioUrl?: string | null
  /** Coordenadas reais (para pins do mapa). Ausentes até a RPC expor lat/lng. */
  lat?: number | null
  lng?: number | null
  isVendaReal?: boolean
}

export interface LaudoFatorLiquidez {
  fator: string
  calibracao: string
  /** Ajuste como fração negativa-equivalente (ex.: 0.07 = -7%). */
  ajuste: number
}

export interface LaudoOfertaAtiva {
  rua: string
  area: number | null
  pedido: number | null
  precoM2: number | null
  distancia: number | null
}

export interface LaudoCriterio {
  criterio: string
  parametro: string
  justificativa: string
}

export interface LaudoReguaScoreRow {
  score: string
  criterio: string
  leitura: string
}

export interface LaudoConcorrente {
  rua: string
  area: number | null
  programa: string | null
  pedido: number | null
  precoM2: number | null
  leitura: string
}

/** Campos do alvo/consultor não computados — defaults templados do caso Honduras. */
export interface LaudoInput extends ResumoInput {
  /** Proprietário(a) do imóvel-alvo (ex.: "Clarisia Ramos"). */
  proprietario?: string | null
  /** Texto da classe de qualidade ao lado do Score (ex.: "Necessita Ajustes / Retrofit Leve"). */
  classeTexto?: string | null

  // --- Sumário Executivo
  objetivos?: string[] | null
  conclusoesPrincipais?: string[] | null

  // --- Sec. 1 Posicionamento
  refAnuncioReal?: string | null // "Cheznous, ref. 73232"
  precoM2Pretendido?: number | null
  precoM2ConstrPedido?: number | null
  precoM2TerrenoPedido?: number | null
  diferencaPercent?: number | null
  diferencaNota?: string | null
  parecerTecnico?: string | null
  desagioFechamentoNota?: string | null

  // --- Sec. 2 Liquidez
  fatoresLiquidezDetalhe?: LaudoFatorLiquidez[] | null
  eixosArgumentacao?: string[] | null

  // --- Sec. 3 Localização
  ofertasAtivas?: LaudoOfertaAtiva[] | null
  composicaoBairro?: string | null
  notaOfertas?: string | null

  // --- Sec. 4 Critérios
  criteriosSelecao?: LaudoCriterio[] | null
  reguaScore?: LaudoReguaScoreRow[] | null
  notaRegua?: string | null

  // --- Sec. 6 Concorrência
  concorrentesDiretos?: LaudoConcorrente[] | null
  referenciasSuperiores?: LaudoConcorrente[] | null
  concorrenciaJustificativa?: string | null

  // --- Sec. 7 Top N
  motivosSelecao?: string[] | null
  notaEfeitoEscala?: string | null
  // Sec. 7.1
  rastreabilidadeNota?: string | null
  desagioMedido?: string[] | null
  desagioConclusao?: string | null

  // --- Sec. 8 Terreno
  /** Params do residual (Sec. 8b). Reusa ResidualLandParams da 8.2. */
  residualParams?: ResidualLandParams | null
  abordagemADescricao?: string | null
  coefAproveitamento?: string | null
  convergenciaTerreno?: string | null
  perfisComprador?: string[] | null

  // --- Sec. 9 Sensibilidade
  sensibilidadeLeitura?: string | null

  // --- Sec. 10 Parecer
  ponderacaoValor?: string | null
  fundamentacao?: string[] | null
  estrategiaComercial?: string[] | null
  condicionantes?: string[] | null
  parecerFinal?: string | null
}

// ===========================================================================
// Saída (view-model)
// ===========================================================================

export interface LaudoTopRow {
  rank: number
  faixa: string // "Top 3" | "Top 5"
  endereco: string
  construido: number | null
  terreno: number | null
  distancia: number | null
  precoM2Construido: number | null
  precoM2Terreno: number | null
}

export interface LaudoComparavelRow {
  codigoRef: string
  topMark: string // "★★★" | "★" | ""
  bairroRua: string
  construido: number | null
  svd: string
  valorTotal: number
  precoM2Construido: number | null
  precoM2Terreno: number | null
}

export interface LaudoRastreabilidadeRow {
  rank: number
  endereco: string
  sql: string
  status: string
  fonte: string
  /** Link real do anúncio (revisão humana) ou null = não recuperável. */
  anuncioUrl: string | null
}

export interface LaudoMetricaTerrenoRow {
  metrica: string
  min: number | null
  p25: number | null
  mediana: number | null
  p75: number | null
  max: number | null
}

export interface LaudoEscalaRow {
  faixa: string // "<500 m²" | "500–800 m²" | ">800 m² (perfil do alvo)"
  n: number
  precoM2TerrenoMediano: number | null
  ticketMediano: number | null
}

export interface LaudoResidualRow {
  rotulo: string
  valor: number
  /** true = subtração (exibida com sinal negativo). */
  deducao?: boolean
  /** true = linha de resultado (residual total). */
  total?: boolean
}

export interface LaudoSensRow {
  cenario: string
  n: number
  medianaPrecoM2: number
  valorMercado: number
  valorFechamento: number
  precoM2Fechamento: number
}

export interface LaudoConclusaoRow {
  rotulo: string
  valor: number | null
  faixa?: { min: number; max: number } | null
  destaque?: boolean
}

/** Bloco de robustez da capa (Story 9.15): avisos + contagem A/B/C da amostra. */
export interface LaudoRobustez {
  avisos: AvisoAcm[]
  confiabilidade: Record<ConfiancaGrau, number>
  /** Total de comparáveis incluídos (A+B+C) — denominador da leitura da capa. */
  totalIncluidos: number
}

/** Um dos três preços obrigatórios da capa (Story 9.14 — nunca colapsar em um só). */
export interface LaudoPrecoLinha {
  rotulo: string
  descricao: string
  valor: number | null
  faixa: { min: number; max: number } | null
}

/** Bloco de arbítrio de estado + três preços (Story 9.14). Renderizado na capa. */
export interface LaudoDesagio {
  /** Técnico provável · Comercial de captação · Estratégico de anúncio. */
  tresPrecos: LaudoPrecoLinha[]
  /** Três cenários de deságio de estado (conservador/provável/agressivo). */
  cenarios: Array<{ chave: 'conservador' | 'provavel' | 'agressivo'; rotulo: string; percentual: number; valor: number; aplicado: boolean }>
  /** Nota de arbítrio (origem do cenário, pendência de H-3 quando provisório). */
  notaArbitrio: string
}

export interface LaudoModel {
  header: {
    titulo: string
    subtitulo: string
    dataEmissao: string
    proprietario: string | null
    localizacao: string
    bairro: string | null
    programa: {
      construido: number
      terreno: number
      dormSuites: string | null
      garagem: string | null
    }
    score: string | null
    classeTexto: string | null
  }
  /** Avisos de robustez + graus de confiança (Story 9.15). Renderizado na capa. */
  robustez: LaudoRobustez
  /** Arbítrio de estado + três preços (Story 9.14). Renderizado na capa. */
  desagio: LaudoDesagio
  /**
   * Tese comercial automática (Story 9.18). Badge + frase na capa; omitido
   * visualmente quando `tese === 'indefinida'`.
   */
  teseComercial: {
    tese: 'acima' | 'alinhado' | 'abaixo' | 'indefinida'
    label: string
    frase: string
    deltaPct: number | null
  }
  faixa: ResumoFaixaItem[]
  sumario: {
    objetivos: string[]
    paragrafo: string
    conclusoes: string[]
  }
  sec1: {
    pretendido: { valor: number | null; nota: string }
    pedidoReal: { valor: number | null; nota: string }
    /** Headline em faixa (decisão 06-Jul): `faixa` presente → renderizar min–max. */
    valorMercado: { valor: number | null; faixa: { min: number; max: number } | null; nota: string }
    diferenca: { percent: number | null; nota: string }
    parecerTecnico: string
    fechamentoEstrategico: { valor: number; nota: string; desagioNota: string }
  }
  sec2: {
    intro: string
    fatores: LaudoFatorLiquidez[]
    composicaoNota: string
    eixos: string[]
  }
  sec3: {
    mapaUrl: string | null
    legenda: string
    indice: LaudoTopRow[]
    composicaoBairro: string
    ofertas: LaudoOfertaAtiva[]
    notaOfertas: string
  }
  sec4: {
    intro: string
    criterios: LaudoCriterio[]
    regua: LaudoReguaScoreRow[]
    notaRegua: string
  }
  sec5: {
    intro: string
    linhas: LaudoComparavelRow[]
  }
  sec6: {
    intro: string
    diretos: LaudoConcorrente[]
    superiores: LaudoConcorrente[]
    justificativa: string
  }
  sec7: {
    intro: string
    linhas: LaudoTopRow[]
    motivos: string[]
    notaEscala: string
    rastreabilidade: {
      intro: string
      linhas: LaudoRastreabilidadeRow[]
      notaSql: string
      desagioIntro: string
      desagios: string[]
      desagioConclusao: string
    }
  }
  sec8: {
    intro: string
    metricas: LaudoMetricaTerrenoRow[]
    escala: LaudoEscalaRow[]
    notaEscala: string
    coefAproveitamento: string
    abordagemA: string
    residual: LaudoResidualRow[]
    convergencia: string
    perfis: string[]
  }
  sec9: {
    intro: string
    cenarios: LaudoSensRow[]
    leitura: string
  }
  sec10: {
    intro: string
    ponderacao: string
    tabela: LaudoConclusaoRow[]
    fundamentacao: string[]
    estrategia: string[]
    condicionantes: string[]
    parecerFinal: string
    assinatura: string
  }
}

// ===========================================================================
// Helpers
// ===========================================================================

const round2 = (v: number) => Math.round(v * 100) / 100

/** "R$ 10,0M" — compacto em milhões, padrão do laudo. */
function milhoes(v: number | null | undefined): string {
  if (v == null) return '—'
  return `R$ ${(v / 1e6).toFixed(1).replace('.', ',')}M`
}

function intMetros(v: number | null | undefined): string {
  return v == null ? '—' : `${Math.round(v).toLocaleString('pt-BR')} m²`
}

function faixaTexto(f: { min: number; max: number }): string {
  return `${formatBRL(f.min)}–${formatBRL(f.max)}`
}

/** Mediana de uma lista (ignora não-finitos). null se vazia. */
function medianaOrNull(values: number[]): number | null {
  const s = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (s.length === 0) return null
  const mid = Math.floor(s.length / 2)
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Percentil (interpolação linear) sobre lista ascendente. null se vazia. */
function percentil(values: number[], p: number): number | null {
  const s = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (s.length === 0) return null
  if (s.length === 1) return s[0]
  const idx = (s.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}

function svdLabel(c: LaudoSourceComparable): string {
  const partes: string[] = []
  if (c.suites != null) partes.push(`${c.suites}s`)
  if (c.vagas != null) partes.push(`${c.vagas}v`)
  if (c.dormitorios != null) partes.push(`${c.dormitorios}d`)
  return partes.length ? partes.join(' / ') : '—'
}

function precoM2ConstrDe(c: LaudoSourceComparable): number | null {
  if (c.precoM2Construido != null) return c.precoM2Construido
  if (c.areaConstruida > 0) return round2(c.preco / c.areaConstruida)
  return null
}

function precoM2TerrenoDe(c: LaudoSourceComparable): number | null {
  if (c.precoM2Terreno != null) return c.precoM2Terreno
  if (c.areaTerreno != null && c.areaTerreno > 0) return round2(c.preco / c.areaTerreno)
  return null
}

function faixaTop(rank: number): string {
  return rank <= 3 ? 'Top 3' : 'Top 5'
}

/** Rótulo curto do cenário de sensibilidade ("Top 5" / "Top 3" / "todos os N"). */
function cenarioCurto(s: SensitivityScenario): string {
  if (s.cenario === 'todos') return `todos os ${s.n}`
  return s.cenario === 'top5' ? 'Top 5' : 'Top 3'
}

// ===========================================================================
// Defaults templados (caso Honduras — Art. IV: traçam ao laudo de referência)
// ===========================================================================

const OBJETIVOS_DEFAULT = [
  'Determinar o valor de mercado e a faixa de fechamento estratégico do imóvel, com base em evidência real e rastreável.',
  'Ancorar a precificação em transações efetivamente fechadas (ITBI/PMSP) e na concorrência ativa da microrregião, evitando a distorção do preço pedido.',
  'Avaliar o ativo sob as duas óticas de comprador — uso/retrofit e terreno/reconstrução — estabelecendo teto e piso técnicos de valor.',
  'Subsidiar a estratégia de captação e a conversa de alinhamento de preço com a proprietária, com argumentação defensável.',
]

const EIXOS_ARGUMENTACAO_DEFAULT = [
  'Tempo de exposição de mercado: listagens com histórico longo exigem reposicionamento de valor para converter compradores qualificados em oferta firme.',
  'Due diligence documental: recomenda-se provisão para averbação de ampliações na matrícula, evitando retenção/desconto do comprador no fechamento.',
  'Capex de modernização: o mercado deduz do teto de liquidez o investimento de adequação — antecipá-lo no preço acelera a venda.',
  'Liquidez do produto: área ampla com programa de dormitórios enxuto reduz o público-alvo; o preço deve refletir essa liquidez específica.',
  'Custo de carrego: o foco estratégico é o custo de manter o ativo improdutivo — um ciclo curto a valor calibrado supera a prorrogação da oferta.',
]

const FATORES_LIQUIDEZ_DEFAULT: LaudoFatorLiquidez[] = [
  { fator: 'Ajuste por tempo de exposição de mercado', calibracao: 'Calibração de liquidez para conversão em oferta firme', ajuste: 0.07 },
  { fator: 'Provisão para regularização cadastral', calibracao: 'Averbação de ampliações na matrícula (due diligence)', ajuste: 0.05 },
  { fator: 'Provisão de Capex de modernização', calibracao: 'Adequação incremental do padrão construtivo', ajuste: 0.03 },
  { fator: 'Ajuste de liquidez do produto', calibracao: 'Área ampla com programa de dormitórios enxuto', ajuste: 0.04 },
]

const CRITERIOS_DEFAULT: LaudoCriterio[] = [
  { criterio: 'Geográfico', parametro: 'Raio de 1.000 m do imóvel-alvo', justificativa: 'Microrregião de valorização homogênea (ver seção 3)' },
  { criterio: 'Tipologia', parametro: 'Casa unifamiliar horizontal', justificativa: 'Exclui apartamento, comercial e terreno — mesma tipicidade' },
  { criterio: 'Uso (IPTU)', parametro: 'Residência', justificativa: 'Garante uso estritamente residencial' },
  { criterio: 'Segmento de valor', parametro: 'R$ 5.000.000 ou mais', justificativa: 'Recorte de alto padrão; mesma classe construtiva/condição do alvo' },
  { criterio: 'Classe de qualidade', parametro: 'Score B', justificativa: 'Mesma classe do alvo (produto a reposicionar)' },
  { criterio: 'Período', parametro: '2024–2026 (ITBI)', justificativa: 'Atualidade das transações de fechamento' },
  { criterio: 'Evidência', parametro: 'Vendidos (ITBI) + anunciados', justificativa: 'Fechamentos reais (âncora) + concorrência ativa (teto)' },
]

const REGUA_SCORE_DEFAULT: LaudoReguaScoreRow[] = [
  { score: 'AAA', criterio: 'R$/m² 40k+ e 4+ suítes/vagas (ou área 500 m²+)', leitura: 'Ícone / superluxo' },
  { score: 'AA', criterio: 'R$/m² 30k+ e 3+ suítes/vagas', leitura: 'Alto padrão consolidado' },
  { score: 'A', criterio: 'R$/m² 22–25k', leitura: 'Bom produto' },
  { score: 'B', criterio: 'R$/m² < 22k', leitura: 'Produto a reposicionar (caso do alvo)' },
]

const PERFIS_COMPRADOR_DEFAULT = [
  'Comprador-usuário (retrofit): compra o imóvel para morar com modernização. Paga pelo construído ajustado (R$/m² × área).',
  'Comprador-terreno (reconstrução/adaptação): compra a terra + localização, demole/reconstrói uma casa nova ampla no lote. Paga o valor residual do terreno.',
  'O diferencial do lote grande: as duas balizas se encontram no mesmo patamar — a reconstrução fica tão competitiva quanto o retrofit, criando duas frentes reais de demanda que se reforçam e sustentam o valor.',
  'Implicação de marketing: o anúncio deve falar às duas audiências — metragem de terreno, testada e potencial construtivo (comprador-terreno) e a possibilidade de retrofit/morar (comprador-usuário) — ampliando o funil e a liquidez.',
]

const CONDICIONANTES_DEFAULT = [
  'Confirmar na matrícula/IPTU a metragem oficial do terreno e a averbação das ampliações.',
  'Validar a natureza do imóvel (residencial × comercial) e reconciliar com o uso residencial da venda.',
  'Reconciliar o programa de dormitórios (anúncio × informação da proprietária) — confirmar a configuração atual.',
]

// ===========================================================================
// Builder
// ===========================================================================

/** Rótulo pt-BR do cenário de deságio. */
const CENARIO_ROTULO: Record<'conservador' | 'provavel' | 'agressivo', string> = {
  conservador: 'Conservador',
  provavel: 'Provável',
  agressivo: 'Agressivo',
}

/**
 * Monta o bloco de arbítrio de estado + três preços da capa (Story 9.14).
 * Os três preços NUNCA colapsam em um só (regra do veredito ROI §2).
 */
function buildDesagio(
  d: DesagioTratado,
  precos: {
    tecnico: number | null
    tecnicoFaixa: { min: number; max: number } | null
    captacao: { min: number; max: number }
    anuncio: number | null
  },
): LaudoDesagio {
  const cenarios = (['agressivo', 'provavel', 'conservador'] as const).map((chave) => ({
    chave,
    rotulo: CENARIO_ROTULO[chave],
    percentual: d.cenarios[chave],
    valor: d.valorMercadoPorCenario[chave],
    aplicado: d.cenarioAplicado === chave,
  }))

  let notaArbitrio: string
  if (d.cenarioAplicado == null) {
    notaArbitrio =
      'Estado do imóvel-alvo não confirmado: os três cenários de deságio são exibidos e a faixa é reportada de forma conservadora (sem escolher −15% automaticamente). Confirmar o estado em vistoria (ficha do alvo).'
  } else {
    const provisorio = d.origemDefault === 'ficha-provisoria-pre-H3'
    notaArbitrio = `Cenário aplicado: ${CENARIO_ROTULO[d.cenarioAplicado]} (−${Math.round(
      d.cenarios[d.cenarioAplicado] * 100,
    )}%)${d.estadoConservacao ? `, estado declarado ${d.estadoConservacao}` : ''}.${
      provisorio ? ' Régua A–D e defaults PROVISÓRIOS — pendentes de validação com a consultora (H-3).' : ''
    }${d.foraDaReguaSimples ? ' Estado D: fora da régua simples — exige tratamento dedicado.' : ''}`
  }

  const tresPrecos: LaudoPrecoLinha[] = [
    { rotulo: 'Valor técnico provável', descricao: 'Mediana ITBI saneada (evidência de fechamento)', valor: precos.tecnico, faixa: precos.tecnicoFaixa },
    { rotulo: 'Comercial de captação', descricao: 'Técnico ajustado por condição/liquidez', valor: null, faixa: precos.captacao },
    { rotulo: 'Estratégico de anúncio', descricao: 'Posicionamento vs concorrência ativa', valor: precos.anuncio, faixa: null },
  ]

  return { tresPrecos, cenarios, notaArbitrio }
}

export function buildLaudoModel(
  computation: AcmLaudoComputation,
  comparaveis: LaudoSourceComparable[],
  input: LaudoInput,
): LaudoModel {
  const byEndereco = new Map(comparaveis.map((c) => [c.endereco, c]))
  const metaFechamento = input.metaFechamento ?? computation.faixaFechamento
  const nTotal = comparaveis.length

  // --- Headline em faixa (decisão founder 06-Jul · methodology.headlineFaixa)
  // Faixa min–max entre cenários; ponto único apenas quando os cenários coincidem.
  const h = computation.headline
  const mercadoFaixa = h.mercado.min !== h.mercado.max ? h.mercado : null
  const mercadoTexto = mercadoFaixa
    ? faixaTexto(mercadoFaixa)
    : formatBRL(h.referencia.valorMercado)
  const referenciaNota = mercadoFaixa
    ? `referência: cenário aderente ${cenarioCurto(h.referencia)} = ${formatBRL(
        h.referencia.valorMercado,
      )}`
    : ''

  // --- Faixa de 5 cards (mesma da 8.3a) ----------------------------------
  const faixa: ResumoFaixaItem[] = [
    { rotulo: 'Pretendido', valor: input.precoPretendido ?? null },
    { rotulo: 'Anúncio real', valor: input.precoPedidoReal ?? null },
    {
      rotulo: 'Mercado (ACM)',
      valor: mercadoFaixa ? null : h.referencia.valorMercado,
      faixa: mercadoFaixa,
    },
    { rotulo: 'Co-âncora terreno', valor: computation.coAncoraTerreno },
    { rotulo: 'Fechamento', valor: null, faixa: metaFechamento, destaque: true },
  ]

  // --- Top N (índice de aderência da 8.2, enriquecido pela fonte) --------
  const topLinhas: LaudoTopRow[] = computation.top5.map((t, i) => {
    const src = byEndereco.get(t.endereco)
    return {
      rank: i + 1,
      faixa: faixaTop(i + 1),
      endereco: t.endereco,
      construido: src?.areaConstruida ?? null,
      terreno: src?.areaTerreno ?? null,
      distancia: src?.distancia ?? null,
      precoM2Construido: src ? precoM2ConstrDe(src) : null,
      precoM2Terreno: src ? precoM2TerrenoDe(src) : null,
    }
  })

  // --- Rastreabilidade (Sec. 7.1) — Top 5 com SQL/status/fonte -----------
  const rastreabilidade: LaudoRastreabilidadeRow[] = computation.top5.map((t, i) => {
    const src = byEndereco.get(t.endereco)
    const anuncioUrl = src?.anuncioUrl ?? null
    return {
      rank: i + 1,
      endereco: t.endereco,
      sql: src?.sqlCadastral ?? '—',
      // Só dado confirmado: sem URL recuperável → "off-market / não recuperável" (nunca inventado).
      status: src?.statusAnuncio ?? (anuncioUrl ? 'anúncio confirmado' : 'off-market / não recuperável'),
      fonte: src?.fonteAnuncio ?? src?.fonte ?? '—',
      anuncioUrl,
    }
  })

  // --- Tabela completa de comparáveis (Sec. 5) ---------------------------
  const sec5Linhas: LaudoComparavelRow[] = comparaveis.map((c) => {
    const rank = computation.ranking.findIndex((r) => r.endereco === c.endereco)
    const isTop3 = rank >= 0 && rank < 3
    const isTop5 = rank >= 0 && rank < 5
    return {
      codigoRef: c.codigoRef ?? c.fonteRef ?? '—',
      topMark: isTop3 ? '★★★' : isTop5 ? '★' : '',
      bairroRua: c.bairro ? `${c.bairro} (${c.endereco})` : c.endereco,
      construido: c.areaConstruida || null,
      svd: svdLabel(c),
      valorTotal: c.preco,
      precoM2Construido: precoM2ConstrDe(c),
      precoM2Terreno: precoM2TerrenoDe(c),
    }
  })

  // --- Sensibilidade (Sec. 9) — 3 cenários da 8.2 ------------------------
  const cenarios: LaudoSensRow[] = computation.sensibilidade.map((s) => ({
    cenario:
      s.cenario === 'todos'
        ? `Todos os ${s.n} negociáveis`
        : s.cenario === 'top5'
          ? 'Top 5 (mais aderentes)'
          : 'Top 3 (mais aderentes)',
    n: s.n,
    medianaPrecoM2: s.medianaPrecoM2,
    valorMercado: s.valorMercado,
    valorFechamento: s.valorFechamento,
    precoM2Fechamento: s.precoM2Fechamento,
  }))

  // --- Métricas de terreno (Sec. 8a) — percentis sobre os comparáveis ----
  const areasTerreno = comparaveis
    .map((c) => c.areaTerreno)
    .filter((v): v is number => v != null && v > 0)
  const precosM2Terreno = comparaveis
    .map((c) => precoM2TerrenoDe(c))
    .filter((v): v is number => v != null && v > 0)
  const metricasTerreno: LaudoMetricaTerrenoRow[] = [
    {
      metrica: 'Área de terreno (m²)',
      min: percentil(areasTerreno, 0),
      p25: percentil(areasTerreno, 0.25),
      mediana: percentil(areasTerreno, 0.5),
      p75: percentil(areasTerreno, 0.75),
      max: percentil(areasTerreno, 1),
    },
    {
      metrica: 'R$/m² de terreno',
      min: percentil(precosM2Terreno, 0),
      p25: percentil(precosM2Terreno, 0.25),
      mediana: percentil(precosM2Terreno, 0.5),
      p75: percentil(precosM2Terreno, 0.75),
      max: percentil(precosM2Terreno, 1),
    },
  ]

  // --- Efeito-escala (Sec. 8a) — faixas da 8.2 + ticket mediano ----------
  const faixaLabel: Record<string, string> = {
    '<500': '< 500 m²',
    '500-800': '500 – 800 m²',
    '>800': '> 800 m² (perfil do alvo)',
  }
  const faixaTest: Record<string, (t: number) => boolean> = {
    '<500': (t) => t < 500,
    '500-800': (t) => t >= 500 && t <= 800,
    '>800': (t) => t > 800,
  }
  const escala: LaudoEscalaRow[] = computation.efeitoEscalaTerreno.map((band) => {
    const test = faixaTest[band.faixa]
    const tickets = comparaveis
      .filter((c) => c.areaTerreno != null && c.areaTerreno > 0 && test(c.areaTerreno))
      .map((c) => c.preco)
    return {
      faixa: faixaLabel[band.faixa] ?? band.faixa,
      n: band.n,
      precoM2TerrenoMediano: band.medianaPrecoM2Terreno || null,
      ticketMediano: medianaOrNull(tickets),
    }
  })

  // --- Residual do incorporador (Sec. 8b) — breakdown do ResidualLandParams
  const rp = input.residualParams ?? null
  const residual: LaudoResidualRow[] = []
  if (rp) {
    const vgv = rp.vgvPerM2 * rp.areaNova
    residual.push(
      { rotulo: `VGV — casa nova ${intMetros(rp.areaNova)} × ${formatBRL(rp.vgvPerM2)}/m² (saída AAA)`, valor: vgv },
      { rotulo: `(-) Custo de obra (${intMetros(rp.areaNova)} × ${formatBRL(rp.custoObraPerM2)}/m²)`, valor: rp.custoObraPerM2 * rp.areaNova, deducao: true },
      { rotulo: '(-) Demolição da edificação existente', valor: rp.demolicao, deducao: true },
      { rotulo: `(-) Comercialização + impostos (${Math.round(rp.comercializacaoPct * 100)}% do VGV)`, valor: round2(rp.comercializacaoPct * vgv), deducao: true },
      { rotulo: `(-) Custo financeiro / projeto / aprovações (${Math.round(rp.custoFinanceiroPct * 100)}%)`, valor: round2(rp.custoFinanceiroPct * vgv), deducao: true },
      { rotulo: `(-) Margem do incorporador (${Math.round(rp.margemPct * 100)}% do VGV)`, valor: round2(rp.margemPct * vgv), deducao: true },
      { rotulo: '= Valor residual do terreno (teto do comprador-terreno)', valor: computation.coAncoraTerreno ?? 0, total: true },
    )
  }

  // --- Conclusão (Sec. 10) — 6 valores (= resumo) ------------------------
  const tabelaConclusao: LaudoConclusaoRow[] = [
    { rotulo: 'Preço pretendido (proprietária)', valor: input.precoPretendido ?? null },
    { rotulo: 'Preço pedido REAL (anúncio confirmado)', valor: input.precoPedidoReal ?? null },
    {
      rotulo: 'Valor de mercado (ACM, via construção)',
      valor: mercadoFaixa ? null : h.referencia.valorMercado,
      faixa: mercadoFaixa,
    },
    { rotulo: `Co-âncora de terreno (lote ${intMetros(input.areaTerreno)})`, valor: computation.coAncoraTerreno },
    { rotulo: 'Meta de fechamento recomendada', valor: null, faixa: metaFechamento, destaque: true },
    { rotulo: 'Preço de anúncio recomendado', valor: input.precoAnuncioRecomendado ?? null, destaque: true },
  ]

  // --- Textos default (templados sobre os números — Art. IV) -------------
  const coAncora = computation.coAncoraTerreno
  const bairroClause = input.bairro ? `, ${input.bairro}` : ''

  // --- Homogeneização 1.3 (Story 9.11): bairro real + atualização temporal
  const temBairroVerificado = computation.composicaoBairros.some(
    (b) => b.bairro !== 'não verificado',
  )
  const composicaoBairroDefault = temBairroVerificado
    ? `Composição da amostra por bairro real verificado via CEP: ${computation.composicaoBairros
        .map(
          (b) =>
            `${b.bairro} — ${b.n} comparáve${b.n === 1 ? 'l' : 'is'} (mediana ${formatBRL(
              b.medianaPrecoM2,
            )}/m²)`,
        )
        .join('; ')}.`
    : 'O raio de análise a partir do imóvel-alvo abrange uma microrregião de valorização homogênea.'

  const criteriosBase = input.criteriosSelecao ?? CRITERIOS_DEFAULT
  const homog = computation.homogeneizacao
  // Story 9.17 AC7: se o gate R5 rodou, documenta a regra em uma linha na Sec. 4.
  const criteriosComR5 =
    computation.r5?.aplicado
      ? [
          ...criteriosBase,
          {
            criterio: 'R5 Tipologia (gate)',
            parametro: `Alvo = ${computation.r5.propertyType} · ${computation.r5.nAceitos} aceitos / ${computation.r5.nExcluidos} excluídos`,
            justificativa: computation.r5.regraUmaLinha,
          },
        ]
      : criteriosBase
  const criterios = homog.aplicada
    ? [
        ...criteriosComR5,
        {
          criterio: 'Atualização temporal',
          parametro: `Deflação a valor presente — índice ${homog.indice}, ref. ${homog.dataReferencia}`,
          justificativa: `Vendas de competências distintas comparadas na mesma moeda (${homog.ajustes.length} de ${computation.totalComparaveis} comparáveis ajustados)`,
        },
      ]
    : criteriosComR5

  const sumarioParagrafo =
    input.sinteseParagrafo ??
    `O imóvel — ${intMetros(input.areaConstruida)} construídos sobre lote de ${intMetros(
      input.areaTerreno,
    )}${bairroClause}${
      computation.scoreAlvo ? `, Score ${computation.scoreAlvo}` : ''
    } — ${input.precoPedidoReal != null ? `tem preço pedido real de ${formatBRL(input.precoPedidoReal)}` : 'foi avaliado'}${
      input.precoPretendido != null ? ` e expectativa da proprietária de ${formatBRL(input.precoPretendido)}` : ''
    }. A análise de ${nTotal} vendas reais (ITBI/PMSP) num raio de análise indica valor de mercado de ${mercadoTexto} (via construção${
      referenciaNota ? `; ${referenciaNota}` : ''
    }) e fechamento estratégico de ${faixaTexto(metaFechamento)}.${
      coAncora != null
        ? ` O lote generoso sustenta uma co-âncora de terreno de ~${formatBRL(
            coAncora,
          )} que encontra o valor de construção e o preço real pedido — convergência em ${faixaTexto(metaFechamento)}.`
        : ''
    }`

  const conclusoesDefault: string[] = []
  if (input.precoPedidoReal != null) {
    conclusoesDefault.push(
      `Características confirmadas em anúncio publicado (preço pedido real ${formatBRL(
        input.precoPedidoReal,
      )}) — o mercado já posicionou o imóvel na zona de fechamento desta ACM.`,
    )
  }
  if (coAncora != null) {
    conclusoesDefault.push(
      `O lote de ${intMetros(input.areaTerreno)} é o diferencial de valor: a baliza de terreno é uma co-âncora de ~${formatBRL(
        coAncora,
      )}, em convergência com a construção e o anúncio real.`,
    )
  }
  if (computation.desagioMedidoPercent != null) {
    conclusoesDefault.push(
      `Anúncio ≠ fechamento: os fechamentos reais ficam em ~${computation.medianaPrecoM2.toLocaleString(
        'pt-BR',
      )}/m² (mediana ITBI); o deságio medido foi de ${computation.desagioMedidoPercent.toLocaleString('pt-BR')}% sobre o pedido — a evidência ITBI é a âncora.`,
    )
  }
  if (input.precoAnuncioRecomendado != null) {
    conclusoesDefault.push(
      `Recomendação: anunciar a ${formatBRL(
        input.precoAnuncioRecomendado,
      )}, com fechamento ${faixaTexto(metaFechamento)} e duplo funil (retrofit + terreno).`,
    )
  }
  conclusoesDefault.push(
    'Due diligence prévia: confirmar na matrícula/IPTU o uso (residencial × comercial) e a metragem oficial do terreno.',
  )

  const parecerTecnicoDefault =
    input.parecerTecnico ??
    `O imóvel apresenta ${intMetros(input.areaConstruida)} de área construída sobre ${intMetros(
      input.areaTerreno,
    )} de terreno e classificação ${
      computation.scoreAlvo ? `Score ${computation.scoreAlvo}` : 'técnica'
    } na régua da RE/MAX Galeria. A partir da base de ITBI oficial (PMSP) e de ofertas ativas reais, foram selecionados ${nTotal} comparáveis vendidos no raio de análise. O valor de mercado de ${mercadoTexto}${
      referenciaNota ? ` (${referenciaNota})` : ''
    } parte da mediana real de fechamento (~${computation.medianaPrecoM2.toLocaleString(
      'pt-BR',
    )}/m²) com ajuste de Capex (Score ${computation.scoreAlvo ?? 'B'}).${
      coAncora != null
        ? ` O lote amplo adiciona uma co-âncora de terreno (~${formatBRL(
            coAncora,
          )}, seção 8) que firma o piso e sustenta o fechamento estratégico de ${faixaTexto(metaFechamento)}.`
        : ''
    }`

  const desagioFechamentoNotaDefault =
    input.desagioFechamentoNota ??
    (input.precoPretendido != null && computation.valorFechamento
      ? `Deságio de ${(
          ((computation.valorFechamento - input.precoPretendido) / input.precoPretendido) *
          100
        ).toFixed(1)}% sobre o preço pretendido — meta de conversão em oferta firme.`
      : 'Meta de conversão em oferta firme.')

  const fatores = input.fatoresLiquidezDetalhe ?? FATORES_LIQUIDEZ_DEFAULT
  const composicaoNota =
    `Valor de mercado ${formatBRL(computation.valorMercado)} (recorte amplo) → aplicação composta dos ajustes (${fatores
      .map((f) => `-${Math.round(f.ajuste * 100)}%`)
      .join(' ')}) → valor de fechamento estratégico ${formatBRL(computation.valorFechamento)}.`

  const ponderacaoDefault =
    input.ponderacaoValor ??
    `Duas frentes de demanda que se encontram no mesmo patamar: o comprador-usuário (compra para morar, paga pelo construído ajustado) referencia ~${formatBRL(
      computation.valorFechamento,
    )}; o comprador-terreno (demole/reconstrói no lote, paga pela terra + localização) referencia ~${milhoes(
      coAncora,
    )}. Graças ao lote amplo, essas duas balizas convergem e são validadas pelo preço real pedido${
      input.precoPedidoReal != null ? ` de ${formatBRL(input.precoPedidoReal)}` : ''
    }. O valor de fechamento defensável é, portanto, ${faixaTexto(metaFechamento)}.`

  const sec10IntroDefault =
    `Com base em ${nTotal} transações reais de fechamento (ITBI/PMSP) num raio de análise, na leitura da concorrência ativa, na análise de sensibilidade da amostra e na dupla ótica de comprador, conclui-se que o valor de mercado situa-se em ${mercadoTexto}${
      referenciaNota ? ` (${referenciaNota})` : ''
    } e o valor de fechamento estratégico, incorporados os fatores de liquidez e condição, na faixa de ${faixaTexto(
      metaFechamento,
    )}.`

  const parecerFinalDefault =
    input.parecerFinal ??
    `Recomenda-se posicionamento de anúncio${
      input.precoAnuncioRecomendado != null ? ` em ${formatBRL(input.precoAnuncioRecomendado)}` : ''
    } com meta de fechamento de ${faixaTexto(
      metaFechamento,
    )} — faixa onde convergem a co-âncora de terreno${
      coAncora != null ? ` (~${formatBRL(coAncora)})` : ''
    }, o valor de construção e o preço real pedido${
      input.precoPedidoReal != null ? ` (${formatBRL(input.precoPedidoReal)})` : ''
    }. O lote amplo firma o piso e cria duas frentes de demanda (retrofit e reconstrução), tornando a captação robusta. Oportunidade condicionada à due diligence documental.`

  const estrategiaDefault =
    input.estrategiaComercial ??
    [
      input.precoAnuncioRecomendado != null
        ? `Anunciar a ${formatBRL(input.precoAnuncioRecomendado)} — abaixo da expectativa inicial, gerando tráfego qualificado — com meta de fechamento de ${faixaTexto(metaFechamento)}.`
        : `Posicionar o anúncio para meta de fechamento de ${faixaTexto(metaFechamento)}.`,
      'Marketing de duplo funil: comunicar o ativo às duas audiências (retrofit/morar e terreno/reconstrução).',
      'Posicionamento competitivo frente às alternativas ativas para acelerar a conversão em oferta firme.',
      coAncora != null
        ? `Firmeza do piso: o lote fixa a co-âncora de terreno em ~${formatBRL(coAncora)} — não descer abaixo desse patamar.`
        : 'Firmeza do piso sustentada pelo valor do próprio terreno.',
      'Reavaliação de preço em ciclos curtos (45–60 dias) conforme a resposta de mercado.',
      'Ênfase no custo de carrego e na liquidez como argumento central na conversa com a proprietária.',
    ]

  const fundamentacaoDefault =
    input.fundamentacao ??
    [
      input.precoPedidoReal != null
        ? `Características confirmadas (anúncio): ${intMetros(input.areaConstruida)} constr. / ${intMetros(input.areaTerreno)} de terreno, com preço pedido real de ${formatBRL(input.precoPedidoReal)} — o mercado já posicionou o imóvel na zona de fechamento.`
        : `Características confirmadas: ${intMetros(input.areaConstruida)} constr. / ${intMetros(input.areaTerreno)} de terreno.`,
      `Evidência de fechamento (âncora): mediana real de ${computation.medianaPrecoM2.toLocaleString('pt-BR')}/m² em ${nTotal} vendas de ITBI.`,
      computation.desagioMedidoPercent != null
        ? `Deságio real medido (anúncio > fechamento): comparáveis com anúncio recuperado fecharam em torno de ${computation.desagioMedidoPercent.toLocaleString('pt-BR')}% abaixo do pedido (seção 7.1).`
        : 'Deságio real medido confirma que o mercado fecha abaixo do anúncio (seção 7.1).',
      coAncora != null
        ? `Co-âncora de terreno: comparação direta ajustada à escala e viabilidade do incorporador convergem com o comparável de lote grande — o lote amplo eleva e firma o valor (seção 8).`
        : 'Co-âncora de terreno sustenta o piso (seção 8).',
      'Sensibilidade + concorrência: os recortes de amostra e as alternativas ativas confirmam a faixa; o lote grande reduz o risco de liquidez.',
    ]

  const desagioMedidoDefault =
    input.desagioMedido ??
    (computation.desagioMedidoPercent != null
      ? [
          `Dos comparáveis com anúncio recuperado, os que permitem medir o gap entre preço pedido e fechado indicam deságio em torno de ${computation.desagioMedidoPercent.toLocaleString('pt-BR')}%.`,
        ]
      : [])

  const desagioConclusaoDefault =
    input.desagioConclusao ??
    (computation.desagioMedidoPercent != null
      ? `Esses deságios medidos em vendas reais da própria microrregião confirmam a tese central (o mercado fecha abaixo do anúncio) e calibram a expectativa de negociação do imóvel-alvo.`
      : 'A evidência ITBI ancora a expectativa de negociação abaixo do anúncio.')

  // --- Montagem ----------------------------------------------------------
  const imovelLoc = input.enderecoAlvo

  return {
    header: {
      titulo: `Análise Comparativa de Mercado (ACM)`,
      subtitulo: 'Estudo de Viabilidade Imobiliária — laudo técnico completo.',
      dataEmissao: input.dataEmissao,
      proprietario: input.proprietario ?? null,
      localizacao: imovelLoc,
      bairro: input.bairro ?? null,
      programa: {
        construido: input.areaConstruida,
        terreno: input.areaTerreno,
        dormSuites:
          input.programa?.dormitorios != null || input.programa?.suites != null
            ? [
                input.programa?.dormitorios != null ? `${input.programa.dormitorios} dorm` : null,
                input.programa?.suites != null ? `${input.programa.suites} suítes` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null,
        garagem: input.programa?.vagas != null ? `${input.programa.vagas} vagas` : null,
      },
      score: computation.scoreAlvo,
      classeTexto: input.classeTexto ?? input.classeNota ?? null,
    },
    robustez: (() => {
      const confiabilidade = agregarConfianca(computation.passaportes)
      return {
        avisos: computation.avisos,
        confiabilidade,
        totalIncluidos: confiabilidade.A + confiabilidade.B + confiabilidade.C,
      }
    })(),
    desagio: buildDesagio(computation.desagioTratado, {
      tecnico: mercadoFaixa ? null : h.referencia.valorMercado,
      tecnicoFaixa: mercadoFaixa,
      captacao: metaFechamento,
      anuncio: input.precoAnuncioRecomendado ?? input.precoPedidoReal ?? null,
    }),
    // Story 9.18 — reclassifica com preços do input (anúncio tem prioridade).
    teseComercial: (() => {
      const t = classificarTeseComercial(
        h.referencia.valorMercado,
        input.precoPedidoReal,
        input.precoPretendido ?? computation.target.precoPretendido,
      )
      return { tese: t.tese, label: t.label, frase: t.frase, deltaPct: t.deltaPct }
    })(),
    faixa,
    sumario: {
      objetivos: input.objetivos ?? OBJETIVOS_DEFAULT,
      paragrafo: sumarioParagrafo,
      conclusoes: input.conclusoesPrincipais ?? conclusoesDefault,
    },
    sec1: {
      pretendido: {
        valor: input.precoPretendido ?? null,
        nota: input.precoM2Pretendido != null ? `${formatBRL(input.precoM2Pretendido)}/m²` : '',
      },
      pedidoReal: {
        valor: input.precoPedidoReal ?? null,
        nota: [
          input.precoM2ConstrPedido != null ? `${formatBRL(input.precoM2ConstrPedido)}/m² constr.` : null,
          input.precoM2TerrenoPedido != null ? `${formatBRL(input.precoM2TerrenoPedido)}/m² terreno` : null,
          input.refAnuncioReal ? `(${input.refAnuncioReal})` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      },
      valorMercado: {
        valor: mercadoFaixa ? null : h.referencia.valorMercado,
        faixa: mercadoFaixa,
        nota: mercadoFaixa
          ? `${referenciaNota} · teto: ${cenarioCurto(h.teto)} = ${formatBRL(h.teto.valorMercado)}`
          : `${(h.referencia.valorMercado / input.areaConstruida).toLocaleString('pt-BR', {
              maximumFractionDigits: 0,
            })}/m²`,
      },
      diferenca: {
        percent: input.diferencaPercent ?? null,
        nota: input.diferencaNota ?? 'Dentro da margem negociável saudável',
      },
      parecerTecnico: parecerTecnicoDefault,
      fechamentoEstrategico: {
        valor: computation.valorFechamento,
        nota: `${(computation.valorFechamento / input.areaConstruida).toLocaleString('pt-BR', {
          maximumFractionDigits: 0,
        })}/m²`,
        desagioNota: desagioFechamentoNotaDefault,
      },
    },
    sec2: {
      intro:
        'Sobre o valor de mercado apura-se uma calibração técnica que reflete a liquidez efetiva e a condição do ativo para conversão em oferta firme. Os ajustes abaixo são incrementais e compõem o valor de fechamento estratégico.',
      fatores,
      composicaoNota,
      eixos: input.eixosArgumentacao ?? EIXOS_ARGUMENTACAO_DEFAULT,
    },
    sec3: {
      mapaUrl: input.mapaUrl ?? null,
      legenda:
        'Vermelho: imóvel-alvo · Dourado 1–3: Top 3 (máxima aderência) · Laranja 4–5: reforço · Azul: demais comparáveis vendidos · Círculo: raio de análise',
      indice: topLinhas,
      composicaoBairro: input.composicaoBairro ?? composicaoBairroDefault,
      ofertas: input.ofertasAtivas ?? [],
      notaOfertas:
        input.notaOfertas ??
        'São os imóveis com oferta ativa e endereço confirmado dentro do raio — a concorrência local direta. A maioria dos anúncios de luxo omite o número e não é geolocalizável; por isso a seção 6 amplia a leitura de concorrência.',
    },
    sec4: {
      intro:
        'A amostra foi filtrada por critérios objetivos que asseguram a homogeneidade técnica e a aderência ao imóvel-alvo. Cada comparável atende, cumulativamente, aos parâmetros abaixo.',
      criterios,
      regua: input.reguaScore ?? REGUA_SCORE_DEFAULT,
      notaRegua:
        input.notaRegua ??
        `A régua calibra-se pela mediana de fechamento do bairro e pelo panorama amplo da região. O imóvel-alvo enquadra-se em Score ${
          computation.scoreAlvo ?? 'B'
        } por apresentar R$/m² implícito abaixo do patamar de luxo e demandar retrofit/modernização.`,
    },
    sec5: {
      intro: '★★★ = Top 3 mais aderentes · ★ = Top 5 (ver seção 7).',
      linhas: sec5Linhas,
    },
    sec6: {
      intro:
        'Esta é a segunda linha de análise. Além da evidência de fechamentos (seção 5), a precificação responde à concorrência ativa: o comprador qualificado avalia, em paralelo, as ofertas atualmente disponíveis.',
      diretos: input.concorrentesDiretos ?? [],
      superiores: input.referenciasSuperiores ?? [],
      justificativa:
        input.concorrenciaJustificativa ??
        `O comprador qualificado que busca uma casa ampla para reposicionar compara o imóvel-alvo às alternativas diretas ativas. Para converter em oferta firme, o imóvel precisa competir nessa faixa — o que valida o valor de fechamento estratégico de ${formatBRL(
          computation.valorFechamento,
        )}. O posicionamento competitivo é, portanto, condição para a liquidez — não apenas uma escolha de preço.`,
    },
    sec7: {
      intro:
        'Dentre os comparáveis vendidos, ordenamos por um índice de aderência ao imóvel-alvo, composto por: similaridade de área construída (50%), similaridade de área de terreno (20%) e proximidade geográfica (30%). Quanto maior o índice, mais o comparável representa o mesmo produto e a mesma praça.',
      linhas: topLinhas,
      motivos:
        input.motivosSelecao ??
        [
          '★★★ Top 3 — núcleo de máxima aderência ao lote: terreno e proximidade quase idênticos ao alvo, na mesma classe (Score B).',
          '★ Top 4–5 — reforço: metragem construída grande e o comparável de lote grande que ancora a abordagem de terreno (seção 8).',
          'Os lotes grandes lideram a aderência por refletirem o terreno do alvo. Os comparáveis de lote médio permanecem na amostra ampla (seção 5), com peso menor na conclusão.',
        ],
      notaEscala:
        input.notaEfeitoEscala ??
        `R$/m² de terreno cai com o tamanho do lote (efeito escala): lotes maiores fecham a R$/m² menor que os menores. Aplicado ao terreno do alvo (R$/m² ajustado à escala), indica um valor de terreno de referência${
          coAncora != null ? ` ~${milhoes(coAncora)}` : ''
        } — uma co-âncora da avaliação, em convergência com o valor de construção. Detalhe na seção 8.`,
      rastreabilidade: {
        intro:
          'Cada comparável é uma venda real registrada no ITBI/PMSP (fonte autoritativa, identificada pelo SQL — número cadastral consultável no GeoSampa). Quando recuperável, indica-se também o anúncio web (corroboração de características e do preço pedido).',
        linhas: rastreabilidade,
        notaSql:
          'SQL = Setor/Quadra/Lote (cadastro municipal). Consulta pública: GeoSampa. Links verificados na emissão; anúncios ativos podem sair do ar.',
        desagioIntro:
          'Evidência empírica direta — anúncio > fechamento (deságio real medido): dos comparáveis com anúncio recuperado, mede-se o gap entre o preço pedido e o fechado.',
        desagios: desagioMedidoDefault,
        desagioConclusao: desagioConclusaoDefault,
      },
    },
    sec8: {
      intro:
        'Parte do público qualificado não compra a casa para morar como está — compra a terra e a localização para demolir/reconstruir ou adaptar profundamente. Para esse comprador, a métrica deixa de ser o R$/m² construído e passa a ser a área e o R$/m² de terreno. Esta seção avalia o ativo por essa segunda lente, complementar à dos comparáveis construídos.',
      metricas: metricasTerreno,
      escala,
      notaEscala:
        'Por que não aplicar a mediana global ao lote do alvo: o R$/m² de terreno cai com o tamanho do lote. Por isso usamos o R$/m² ajustado à escala — caso contrário, superavaliaríamos o terreno. Mesmo assim, o lote amplo é um diferencial real de valor.',
      coefAproveitamento:
        input.coefAproveitamento ??
        'Coeficiente de aproveitamento bem proporcionado — o valor está sobretudo no terreno amplo e bem localizado (confirmar parâmetros do loteamento).',
      abordagemA:
        input.abordagemADescricao ??
        `Abordagem A — comparação direta de terreno: ${intMetros(
          input.areaTerreno,
        )} × R$/m² de terreno de lotes grandes (ajustado à escala) → faixa de valor de terreno cujo ponto médio é${
          coAncora != null ? ` ~${milhoes(coAncora)}` : ' a co-âncora indicada'
        }.`,
      residual,
      convergencia:
        input.convergenciaTerreno ??
        `Convergência das lentes de terreno: a comparação direta ajustada à escala, a viabilidade do incorporador${
          coAncora != null ? ` (~${formatBRL(coAncora)})` : ''
        }, o comparável mais próximo e o preço real pedido convergem. O lote amplo sustenta a baliza de terreno no mesmo patamar do valor de construção. A terra é, portanto, uma co-âncora da avaliação — não apenas um piso.`,
      perfis: input.perfisComprador ?? PERFIS_COMPRADOR_DEFAULT,
    },
    sec9: {
      intro:
        'Para testar a robustez do valor, a mesma estratégia de cálculo (mediana R$/m² × área × ajuste Capex × fatores de liquidez) foi aplicada a três recortes da amostra, ordenados por aderência ao imóvel-alvo.',
      cenarios,
      leitura:
        input.sensibilidadeLeitura ??
        `À medida que a amostra é refinada para os comparáveis de maior aderência, o R$/m² mediano recua (efeito de escala). Combinada com a co-âncora de terreno${
          coAncora != null ? ` (~${milhoes(coAncora)})` : ''
        } e com o preço real pedido, a triangulação converge para a faixa de fechamento de ${faixaTexto(
          metaFechamento,
        )}. Recomenda-se ancorar a negociação nessa faixa, sem descer abaixo do piso sustentado pelo valor do próprio terreno.${
          mercadoFaixa
            ? ` O headline deste laudo reporta a faixa entre os cenários: o recorte aderente (${cenarioCurto(
                h.referencia,
              )}) é a referência principal e o recorte amplo (${cenarioCurto(h.teto)}) é o teto.`
            : ''
        }`,
    },
    sec10: {
      intro: sec10IntroDefault,
      ponderacao: ponderacaoDefault,
      tabela: tabelaConclusao,
      fundamentacao: fundamentacaoDefault,
      estrategia: estrategiaDefault,
      condicionantes: input.condicionantes ?? CONDICIONANTES_DEFAULT,
      parecerFinal: parecerFinalDefault,
      assinatura: 'Luciana Borba — Consultora Imobiliária · RE/MAX Galeria · CRECI 045063-J',
    },
  }
}
