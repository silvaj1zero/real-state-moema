/**
 * View-model puro do Deck Comercial RE/MAX (Story 8.4 AC1).
 *
 * Deriva do mesmo `AcmLaudoComputation` (8.2) do laudo (8.3b) — consistência total
 * de números (AC3, zero recálculo). Reproduz a pauta do
 * `ACM_Apresentacao_Completa_Honduras_RE-MAX_v2.pdf` (24 slides): institucional
 * RE/MAX → sobre o imóvel → precificação (ACM) → tese do deságio → co-âncora →
 * duas frentes → sensibilidade → recomendação → plano de marketing → próximos passos.
 *
 * Art. IV: o conteúdo institucional RE/MAX e os números-âncora traçam ao PDF v2
 * (extraído via `pdftotext -layout`). Os textos institucionais são defaults
 * templados (sobrescrevíveis por `DeckInput`); os números ACM vêm da 8.2.
 *
 * Reusa os primitivos da 8.3: `theme.ts` (branding) e `staticMap.ts` (mapa). O
 * documento (`DeckDocument`) renderiza em paisagem (slides).
 */
import type { AcmLaudoComputation } from '@/lib/acm/methodology'
import type { LaudoInput, LaudoSourceComparable, LaudoTopRow } from './laudoModel'

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

export interface DeckStat {
  valor: string
  rotulo: string
}

/** Campos do alvo/consultor + overrides institucionais. Defaults templados Honduras. */
export interface DeckInput extends LaudoInput {
  /** Saudação ao proprietário no slide de capa (ex.: "Saudações, Clarisia e família."). */
  saudacao?: string | null
  /** Cidade/região no slide de capa. */
  cidadeRegiao?: string | null
  // Overrides institucionais (default = números RE/MAX do deck v2)
  remaxMundo?: DeckStat[] | null
  remaxBrasil?: DeckStat[] | null
  metodologiaFontes?: DeckStat[] | null
  planoMarketing?: string[] | null
  proximosPassos?: string[] | null
}

// ---------------------------------------------------------------------------
// Saída (view-model)
// ---------------------------------------------------------------------------

export interface DeckCoAncoraAbordagem {
  valor: number | null
  rotulo: string
}

export interface DeckSensRow {
  cenario: string
  n: number
  valorMercado: number
  valorFechamento: number
}

export interface DeckModel {
  capa: {
    titulo: string
    saudacao: string
    cidadeRegiao: string
    dataEmissao: string
  }
  pauta: string[]
  remaxMundo: DeckStat[]
  remaxBrasil: DeckStat[]
  diferenciais: { titulo: string; texto: string }[]
  imovel: {
    construido: number
    terreno: number
    dormSuites: string | null
    garagem: string | null
    score: string | null
    bullets: string[]
  }
  precificacao: {
    pretendido: { valor: number | null; nota: string }
    pedidoReal: { valor: number | null; nota: string }
    leitura: string
  }
  fatorOferta: { intro: string; efeitos: string[] }
  metodologiaFontes: DeckStat[]
  mapa: { url: string | null; legenda: string; nota: string }
  topComparaveis: LaudoTopRow[]
  desagio: { medicoes: string[]; conclusao: string }
  coAncora: { abordagens: DeckCoAncoraAbordagem[]; nota: string }
  duasFrentes: {
    usuario: { valor: number | null; texto: string }
    terreno: { valor: number | null; texto: string }
    sintese: string
  }
  sensibilidade: { cenarios: DeckSensRow[]; nota: string }
  recomendacao: {
    anuncio: number | null
    meta: { min: number; max: number }
    texto: string
  }
  planoMarketing: string[]
  garantia: string[]
  proximosPassos: string[]
  encerramento: { titulo: string; texto: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = (v: number) => Math.round(v * 100) / 100
const intMetros = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.round(v).toLocaleString('pt-BR')} m²`
const milhoes = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi`
const faixaMilhoes = (f: { min: number; max: number }) =>
  `R$ ${(f.min / 1e6).toFixed(1).replace('.', ',')}–${(f.max / 1e6).toFixed(1).replace('.', ',')} mi`

function precoM2TerrenoDe(c: LaudoSourceComparable): number | null {
  if (c.precoM2Terreno != null) return c.precoM2Terreno
  if (c.areaTerreno != null && c.areaTerreno > 0) return round2(c.preco / c.areaTerreno)
  return null
}
function precoM2ConstrDe(c: LaudoSourceComparable): number | null {
  if (c.precoM2Construido != null) return c.precoM2Construido
  if (c.areaConstruida > 0) return round2(c.preco / c.areaConstruida)
  return null
}

// ---------------------------------------------------------------------------
// Defaults institucionais (deck v2 — Art. IV: traçam ao PDF de referência)
// ---------------------------------------------------------------------------

const PAUTA_DEFAULT = [
  'A RE/MAX: quem somos? No mundo e no Brasil',
  'Como trabalhamos: os diferenciais RE/MAX',
  'Sobre o seu imóvel',
  'Precificação — a Análise Comparativa de Mercado',
  'Plano de marketing exclusivo',
  'Representação exclusiva e garantia contratual',
  'Próximos passos — estratégia de venda',
]

const REMAX_MUNDO_DEFAULT: DeckStat[] = [
  { valor: '115+ países', rotulo: 'Há mais de 50 anos com um método único de venda' },
  { valor: '144 mil+', rotulo: 'Corretores conectados pelo mesmo sistema' },
  { valor: 'US$ 200 bi+', rotulo: 'Estimativa histórica de VGV — a que mais vende imóveis no mundo' },
]

const REMAX_BRASIL_DEFAULT: DeckStat[] = [
  { valor: '600+ lojas', rotulo: 'Em ~1.100 cidades, em todos os estados e no DF' },
  { valor: '11 mil+', rotulo: 'Corretores ligados pelo sistema tecnológico único' },
  { valor: 'R$ 14,3 bi', rotulo: 'VGV alcançado em 2025' },
  { valor: '+9%', rotulo: 'Início de 2026 acima do mesmo período do ano anterior' },
]

const DIFERENCIAIS_DEFAULT = [
  {
    titulo: 'Representação exclusiva',
    texto:
      'Venda organizada e profissional: estratégia dedicada, comunicação única e consistente. Exclusividade não limita a divulgação — o imóvel é compartilhado com uma ampla rede de parceiros, com um só interlocutor.',
  },
  {
    titulo: 'Força de rede',
    texto:
      '7 de 10 imóveis vendidos pela RE/MAX no Brasil têm o comprador originado por outra imobiliária ou corretor autônomo. A rede amplifica o alcance; a exclusividade garante a consistência.',
  },
  {
    titulo: 'Método que fecha venda',
    texto:
      '140 dias é o prazo médio de vendas da RE/MAX no Brasil, contra 490 dias do mercado tradicional — vendemos em menos da metade do tempo.',
  },
  {
    titulo: 'Gestão centralizada',
    texto:
      '10–20 imóveis por corretora RE/MAX, contra 100+ na média do mercado: uma consultora inteiramente à disposição e engajada, não um anúncio perdido entre centenas.',
  },
]

const METODOLOGIA_FONTES_DEFAULT: DeckStat[] = [
  { valor: '24', rotulo: 'Vendas reais (ITBI/PMSP) num raio de 1.000 m — a âncora da avaliação' },
  { valor: '12', rotulo: 'Ofertas ativas (concorrentes anunciados + à venda no raio) — a concorrência' },
  { valor: '2', rotulo: 'Réguas independentes (R$/m² construído e de terreno), calibradas por BNSir' },
]

const PLANO_MARKETING_DEFAULT = [
  'Fotos, vídeo e tour produzidos por fotógrafo profissional, em data agendada com a família.',
  'Material distribuído sem logotipo RE/MAX — foco total no imóvel.',
  'Informações padronizadas em todo o mercado, eliminando divergências de anúncio.',
]

const PROXIMOS_PASSOS_DEFAULT = [
  'Assinatura do contrato de representação exclusiva.',
  'Análise jurídica da documentação do imóvel e dos proprietários (due diligence).',
  'Montagem do plano de marketing e geração do material (fotos, filme e tour virtual).',
  'Implementação e início dos trabalhos — anúncio no valor recomendado, ciclos de 45–60 dias.',
  'VENDA — fechamento na faixa-meta.',
]

const GARANTIA_DEFAULT = [
  'A consultora tem a obrigação contratual de participar de todo o processo de venda, reportando ações e resultados em relatórios periódicos.',
  'Garantia para as duas partes: o corretor exclusivo trabalha com o máximo serviço; a remuneração ocorre apenas em caso de sucesso.',
]

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildDeckModel(
  computation: AcmLaudoComputation,
  comparaveis: LaudoSourceComparable[],
  input: DeckInput,
): DeckModel {
  const byEndereco = new Map(comparaveis.map((c) => [c.endereco, c]))
  const metaFechamento = input.metaFechamento ?? computation.faixaFechamento
  const coAncora = computation.coAncoraTerreno

  // H-4: mercado no formato H-3 "R$ X–Y (referência Z)" via headline — nunca o
  // ponto do cenário amplo (methodology.headlineFaixa, decisão 06-Jul).
  const h = computation.headline
  const mercadoTexto =
    h.mercado.min !== h.mercado.max
      ? `${faixaMilhoes(h.mercado)} (referência ${milhoes(h.referencia.valorMercado)})`
      : milhoes(h.referencia.valorMercado)

  const topComparaveis: LaudoTopRow[] = computation.top5.map((t, i) => {
    const src = byEndereco.get(t.endereco)
    return {
      rank: i + 1,
      faixa: i < 3 ? 'Top 3' : 'Top 5',
      endereco: t.endereco,
      construido: src?.areaConstruida ?? null,
      terreno: src?.areaTerreno ?? null,
      distancia: src?.distancia ?? null,
      precoM2Construido: src ? precoM2ConstrDe(src) : null,
      precoM2Terreno: src ? precoM2TerrenoDe(src) : null,
    }
  })

  const sensibilidade: DeckSensRow[] = computation.sensibilidade.map((sc) => ({
    cenario:
      sc.cenario === 'todos'
        ? `Todos os ${sc.n} negociáveis`
        : sc.cenario === 'top5'
          ? 'Top 5 (mais aderentes)'
          : 'Top 3 (mais aderentes)',
    n: sc.n,
    valorMercado: sc.valorMercado,
    valorFechamento: sc.valorFechamento,
  }))

  const desagioMedicoes =
    input.desagioMedido ??
    (computation.desagioMedidoPercent != null
      ? [
          `Em comparáveis cujo anúncio foi recuperado, medimos a diferença real entre o preço pedido e o fechado: deságio em torno de ${computation.desagioMedidoPercent.toLocaleString(
            'pt-BR',
          )}%.`,
        ]
      : [])

  const desagioConclusao =
    computation.desagioMedidoPercent != null
      ? `Esse deságio medido na própria microrregião é a régua que calibra a expectativa de negociação.`
      : 'A evidência ITBI é a âncora: o mercado fecha abaixo do anúncio.'

  return {
    capa: {
      titulo: 'Análise Comparativa de Mercado',
      saudacao:
        input.saudacao ??
        (input.proprietario ? `Saudações, ${input.proprietario} e família.` : 'Saudações.'),
      cidadeRegiao:
        input.cidadeRegiao ??
        `${input.enderecoAlvo}${input.bairro ? ` — ${input.bairro}` : ''}`,
      dataEmissao: input.dataEmissao,
    },
    pauta: PAUTA_DEFAULT,
    remaxMundo: input.remaxMundo ?? REMAX_MUNDO_DEFAULT,
    remaxBrasil: input.remaxBrasil ?? REMAX_BRASIL_DEFAULT,
    diferenciais: DIFERENCIAIS_DEFAULT,
    imovel: {
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
      score: computation.scoreAlvo,
      bullets: [
        `Lote generoso: ${intMetros(input.areaTerreno)} — diferencial de valor frente à mediana dos comparáveis.`,
        computation.scoreAlvo
          ? `Classe técnica Score ${computation.scoreAlvo}: produto a reposicionar, com adequação de padrão.`
          : 'Produto a reposicionar, com adequação de padrão.',
        'Localização premium na microrregião dos Jardins.',
        'Due diligence recomendada: matrícula/IPTU (metragem do terreno, uso, programa).',
      ],
    },
    precificacao: {
      pretendido: {
        valor: input.precoPretendido ?? null,
        nota: 'Expectativa inicial da proprietária',
      },
      pedidoReal: {
        valor: input.precoPedidoReal ?? null,
        nota: 'Preço pedido real (anúncio publicado)',
      },
      leitura:
        input.precoPedidoReal != null && input.precoPretendido != null
          ? 'O mercado já posicionou o imóvel abaixo da expectativa inicial. A pergunta desta ACM: qual o valor que efetivamente se fecha?'
          : 'A pergunta desta ACM: qual o valor que efetivamente se fecha?',
    },
    fatorOferta: {
      intro:
        'O Fator Oferta é a margem de negociação embutida no anúncio. Quando excessiva, anunciar acima do preço afasta o comprador:',
      efeitos: [
        'Menor visibilidade nos portais',
        'Menor demanda de visitas',
        'Maior prazo até a venda',
        'Maior perda financeira ao final',
      ],
    },
    metodologiaFontes: input.metodologiaFontes ?? METODOLOGIA_FONTES_DEFAULT,
    mapa: {
      url: input.mapaUrl ?? null,
      legenda:
        'Vermelho: imóvel-alvo · Dourado (1–3): máxima aderência · Laranja (4–5): reforço · Azul: demais vendas reais · Raio de análise',
      nota: 'Microrregião de valorização homogênea no entorno imediato do imóvel.',
    },
    topComparaveis,
    desagio: { medicoes: desagioMedicoes, conclusao: desagioConclusao },
    coAncora: {
      abordagens: [
        { valor: coAncora, rotulo: 'Comparação direta de terreno (R$/m² ajustado a lotes grandes)' },
        { valor: coAncora, rotulo: 'Viabilidade do incorporador (valor residual da terra)' },
        { valor: null, rotulo: 'Comparável mais próximo de lote grande' },
      ],
      nota: 'O R$/m² de terreno cai com o tamanho do lote — usamos o R$/m² ajustado à escala para não superavaliar a terra.',
    },
    duasFrentes: {
      usuario: {
        valor: computation.valorFechamento,
        texto: 'Comprador-usuário: compra para morar com modernização (retrofit). Paga pelo construído ajustado.',
      },
      terreno: {
        valor: coAncora,
        texto: 'Comprador-terreno: compra a terra + localização e reconstrói no lote. Paga o valor residual da terra.',
      },
      sintese: `As duas frentes se encontram no mesmo patamar — o lote amplo cria duas demandas reais que se reforçam. O anúncio deve falar às duas audiências.`,
    },
    sensibilidade: {
      cenarios: sensibilidade,
      nota: `O número se sustenta por vários ângulos. Mercado ${mercadoTexto}. Convergência de fechamento em ${faixaMilhoes(
        metaFechamento,
      )} (com co-âncora de terreno e preço real pedido). O lote firma o piso e reduz o risco de liquidez.`,
    },
    recomendacao: {
      anuncio: input.precoAnuncioRecomendado ?? null,
      meta: metaFechamento,
      texto:
        `Faixa onde convergem a co-âncora de terreno${
          coAncora != null ? ` (~${milhoes(coAncora)})` : ''
        }, o valor de construção (~${milhoes(computation.valorFechamento)}) e o preço real pedido${
          input.precoPedidoReal != null ? ` (${milhoes(input.precoPedidoReal)})` : ''
        }. Ajustamos o preço conforme a resposta de mercado; o lote firma o piso.`,
    },
    planoMarketing: input.planoMarketing ?? PLANO_MARKETING_DEFAULT,
    garantia: GARANTIA_DEFAULT,
    proximosPassos: input.proximosPassos ?? PROXIMOS_PASSOS_DEFAULT,
    encerramento: {
      titulo: input.proprietario ? `Obrigado, ${input.proprietario}.` : 'Obrigado.',
      texto: 'Vamos vender o seu imóvel com método, transparência e o máximo serviço ao cliente.',
    },
  }
}
