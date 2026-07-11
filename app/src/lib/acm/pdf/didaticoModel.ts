/**
 * View-model puro do Material Didático ACM (Story 8.4 AC2).
 *
 * Explica, de forma transparente e replicável, os critérios e cálculos do laudo —
 * reproduz as 5 partes do `MATERIAL_DIDATICO_ACM_Honduras.pdf`. Deriva do mesmo
 * `AcmLaudoComputation` (8.2) do laudo (AC3, zero recálculo) e dos pesos reais da
 * metodologia (`ADHERENCE_WEIGHTS`) — a fórmula explicada É a fórmula executada.
 *
 * Art. IV: o texto explicativo e as fórmulas traçam ao PDF didático (extraído via
 * `pdftotext -layout`); números/tabelas vêm da 8.2. Defaults sobrescrevíveis.
 */
import { ADHERENCE_WEIGHTS } from '@/lib/acm/methodology'
import type { AcmLaudoComputation } from '@/lib/acm/methodology'
import { testarRobustez } from '@/lib/acm/robustezTese'
import type { LaudoInput, LaudoSourceComparable } from './laudoModel'

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

export interface DidaticoInput extends LaudoInput {
  /** Objetivo do documento (default templado). */
  objetivo?: string | null
  /** Referências externas da régua (ex.: BNSir). */
  reguaReferencias?: string[] | null
  /** Anexos do projeto (CSV/PDF). */
  anexos?: string[] | null
  /** Quantos comparáveis listar na validação (Parte 4). Default 10. */
  topNValidacao?: number | null
}

// ---------------------------------------------------------------------------
// Saída (view-model)
// ---------------------------------------------------------------------------

export interface DidaticoCriterioRow {
  criterio: string
  parametro: string
  porque: string
}
export interface DidaticoScoreRow {
  score: string
  regua: string
  significado: string
}
export interface DidaticoEscalaRow {
  faixa: string
  precoM2TerrenoMediano: number | null
}
export interface DidaticoSensRow {
  cenario: string
  n: number
  valorMercado: number
  valorFechamento: number
}
export interface DidaticoHierarquiaRow {
  nivel: string
  fonte: string
  papel: string
}
export interface DidaticoConfiancaRow {
  nivel: string
  criterio: string
}
export interface DidaticoTopRow {
  rank: number
  endereco: string
  sql: string
  itbi: string
  status: string
  fonte: string
  /** Link real do anúncio (revisão humana) ou null = não recuperável. */
  anuncioUrl: string | null
}

export interface DidaticoModel {
  header: { titulo: string; estudo: string; objetivo: string; dataEmissao: string }
  parte1: {
    intro: string
    filtros: { intro: string; criterios: DidaticoCriterioRow[]; resultado: string }
    score: { intro: string; regua: DidaticoScoreRow[]; referencias: string[]; notaAlvo: string }
    aderencia: { intro: string; formula: string; componentes: string[]; pesos: string[]; resumo: string }
  }
  parte2: {
    construido: string
    terreno: { intro: string; faixas: DidaticoEscalaRow[]; nota: string }
    residual: string
    liquidez: string
    sensibilidade: {
      intro: string
      cenarios: DidaticoSensRow[]
      nota: string
      /**
       * Story 9.25 AC3 — parágrafo de transparência do leave-one-out (didático).
       * Camada técnica no laudo V2; aqui só a explicação pedagógica.
       */
      robustezNota: string
    }
    desagio: string
  }
  parte3: {
    intro: string
    hierarquia: DidaticoHierarquiaRow[]
    metodoBusca: string[]
    limitacoes: string[]
    niveisConfianca: DidaticoConfiancaRow[]
  }
  parte4: { intro: string; top: DidaticoTopRow[]; sintese: string }
  parte5: { intro: string; passos: string[]; anexos: string[]; fonte: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const milhoesCompact = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${(v / 1e6).toFixed(1).replace('.', ',')}M`
const intMetros = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.round(v).toLocaleString('pt-BR')} m²`
const numBR = (v: number | null | undefined) =>
  v == null ? '—' : Math.round(v).toLocaleString('pt-BR')

// ---------------------------------------------------------------------------
// Defaults templados (didático — Art. IV)
// ---------------------------------------------------------------------------

const FILTROS_DEFAULT: DidaticoCriterioRow[] = [
  { criterio: 'Geográfico', parametro: 'Raio físico de 1.000 m do imóvel-alvo (não o rótulo de bairro)', porque: 'Proximidade > divisa administrativa. 1.000 m ≈ 12 min de caminhada = microrregião homogênea.' },
  { criterio: 'Tipologia', parametro: 'Casa unifamiliar horizontal', porque: 'Exclui apartamento, terreno e comercial — mesma natureza de produto.' },
  { criterio: 'Uso (IPTU)', parametro: 'Residência', porque: 'Garante comparação residencial.' },
  { criterio: 'Segmento', parametro: 'Valor ≥ R$ 5.000.000', porque: 'Recorte de alto padrão.' },
  { criterio: 'Classe', parametro: 'Score B', porque: 'Mesma classe construtiva/condição do alvo (produto a reposicionar).' },
  { criterio: 'Período', parametro: 'Transações 2024–2026', porque: 'Atualidade do mercado.' },
  { criterio: 'Evidência', parametro: 'Venda registrada (ITBI/PMSP)', porque: 'A âncora é a venda real, não o anúncio.' },
]

const SCORE_REGUA_DEFAULT: DidaticoScoreRow[] = [
  { score: 'AAA', regua: '≥ 40.000 + 4+ suítes/vagas (ou área ≥ 500 m²)', significado: 'Ícone / superluxo' },
  { score: 'AA', regua: '≥ 30.000 + 3+ suítes/vagas', significado: 'Alto padrão consolidado' },
  { score: 'A', regua: '22.000–25.000', significado: 'Bom produto' },
  { score: 'B', regua: '< 22.000', significado: 'Produto a reposicionar (caso do alvo)' },
]

const HIERARQUIA_DEFAULT: DidaticoHierarquiaRow[] = [
  { nivel: '1', fonte: 'ITBI/PMSP (âncora, autoritativa)', papel: 'Cada comparável é uma venda registrada identificada pelo SQL (consultável no GeoSampa). É a verdade do que foi pago.' },
  { nivel: '2', fonte: 'Anúncios (corroboração)', papel: 'Confirmam características físicas e leem o preço pedido — nunca como verdade de valor.' },
  { nivel: '3', fonte: 'BNSir (régua)', papel: 'Calibra o Score.' },
]

// Story 9.26 AC4 — critérios alinham a `validarAnuncioVenda` (C-5 canônico).
const CONFIANCA_DEFAULT: DidaticoConfiancaRow[] = [
  {
    nivel: 'CONFIRMADO',
    criterio:
      'C-5: número da porta bate E (área ±2% OU mesma rua) — ver validarAnuncioVenda().',
  },
  {
    nivel: 'PARCIAL',
    criterio: 'C-5: mesma rua sem casar o número exato — ver validarAnuncioVenda().',
  },
  {
    nivel: 'NÃO RECUPERÁVEL',
    criterio: 'C-5: sem anúncio/sem pista espacial; vale o ITBI — ver validarAnuncioVenda().',
  },
]

const METODO_BUSCA_DEFAULT = [
  'Portais: VivaReal, ZAP, QuintoAndar, Loft, Chaves na Mão, Lopes, NPi, Imovelweb, BNSir, OLX.',
  'Cache histórico: Wayback Machine (web.archive.org).',
  'Termos: rua + número + bairro + "casa venda" e variações de grafia.',
  'Cruzamento: confirma-se quando número + área batem com o registro ITBI.',
]

const LIMITACOES_DEFAULT = [
  'Portais grandes (ZAP/VivaReal) bloqueiam leitura automática (HTTP 403) das fichas individuais — muitas só expõem a listagem da rua.',
  'Imóveis de alto padrão frequentemente omitem o número ou são vendidos off-market — não há ficha recuperável; permanece o registro ITBI.',
]

const ANEXOS_DEFAULT = [
  'top5_referencias.csv — Top 5 com SQL + link + status.',
  'B_honduras_1000m.csv — as vendas (base do ranking).',
  'B_honduras_achados_web.csv — registro bruto das buscas web.',
  'LAUDO_ACM.pdf — laudo técnico completo (18 págs.).',
]

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildDidaticoModel(
  computation: AcmLaudoComputation,
  comparaveis: LaudoSourceComparable[],
  input: DidaticoInput,
): DidaticoModel {
  const byEndereco = new Map(comparaveis.map((c) => [c.endereco, c]))
  const metaFechamento = input.metaFechamento ?? computation.faixaFechamento
  const coAncora = computation.coAncoraTerreno
  const nTotal = comparaveis.length
  const topN = input.topNValidacao ?? 10

  // H-4: mercado no formato H-3 "R$ X–Y (referência Z)" via headline — nunca o
  // ponto do cenário amplo (methodology.headlineFaixa, decisão 06-Jul).
  const h = computation.headline
  const mercadoTexto =
    h.mercado.min !== h.mercado.max
      ? `${milhoesCompact(h.mercado.min)}–${milhoesCompact(h.mercado.max)} (referência ${milhoesCompact(
          h.referencia.valorMercado,
        )})`
      : milhoesCompact(h.referencia.valorMercado)

  // Pesos REAIS da metodologia (a fórmula explicada = a executada)
  const wC = Math.round(ADHERENCE_WEIGHTS.areaConstruida * 100)
  const wT = Math.round(ADHERENCE_WEIGHTS.areaTerreno * 100)
  const wP = Math.round(ADHERENCE_WEIGHTS.proximidade * 100)
  const areaC = input.areaConstruida
  const areaT = input.areaTerreno

  // Efeito-escala (faixas da 8.2)
  const faixaLabel: Record<string, string> = {
    '<500': '< 500 m²',
    '500-800': '500–800 m²',
    '>800': '> 800 m² (perfil do alvo)',
  }
  const escala: DidaticoEscalaRow[] = computation.efeitoEscalaTerreno.map((b) => ({
    faixa: faixaLabel[b.faixa] ?? b.faixa,
    precoM2TerrenoMediano: b.medianaPrecoM2Terreno || null,
  }))

  // Sensibilidade (3 cenários da 8.2)
  const cenarios: DidaticoSensRow[] = computation.sensibilidade.map((sc) => ({
    cenario:
      sc.cenario === 'todos'
        ? `Todos os ${sc.n}`
        : sc.cenario === 'top5'
          ? 'Top 5'
          : 'Top 3',
    n: sc.n,
    valorMercado: sc.valorMercado,
    valorFechamento: sc.valorFechamento,
  }))

  // Validação Top N (ranking da 8.2 + fonte/SQL/status)
  const top: DidaticoTopRow[] = computation.ranking.slice(0, topN).map((r, i) => {
    const src = byEndereco.get(r.endereco)
    const itbiPartes = [
      src ? `${intMetros(src.areaConstruida)} constr.` : null,
      src?.areaTerreno != null ? `${intMetros(src.areaTerreno)} terreno` : null,
      src ? `vendida ${milhoesCompact(src.preco)}` : null,
      src?.distancia != null ? `${Math.round(src.distancia)} m do alvo` : null,
    ].filter(Boolean)
    const anuncioUrl = src?.anuncioUrl ?? null
    return {
      rank: i + 1,
      endereco: r.endereco,
      sql: src?.sqlCadastral ?? '—',
      itbi: itbiPartes.length ? itbiPartes.join(' / ') : '—',
      // Só dado confirmado: sem link recuperável → "off-market / não recuperável".
      status: src?.statusAnuncio ?? (anuncioUrl ? 'anúncio confirmado' : 'off-market / não recuperável'),
      fonte: src?.fonteAnuncio ?? src?.fonte ?? '—',
      anuncioUrl,
    }
  })

  const desagioTxt =
    computation.desagioMedidoPercent != null
      ? `Onde achamos o anúncio e a venda, medimos o gap real entre pedido e fechado: deságio em torno de ${computation.desagioMedidoPercent.toLocaleString(
          'pt-BR',
        )}% (ver Parte 4). É a régua empírica da negociação.`
      : 'Onde recuperável, mede-se o gap entre o preço pedido e o fechado — a régua empírica da negociação (a evidência ITBI é a âncora).'

  return {
    header: {
      titulo: 'Material Didático — Como Funcionam os Critérios e os Cálculos da ACM',
      estudo: `Estudo: ${input.enderecoAlvo}${input.bairro ? ` (${input.bairro})` : ''}`,
      objetivo:
        input.objetivo ??
        'Explicar, de forma transparente e replicável, como cada critério de seleção e cada cálculo do laudo ACM foi construído — e listar os anúncios usados para validar os imóveis mais aderentes.',
      dataEmissao: input.dataEmissao,
    },
    parte1: {
      intro: 'A seleção acontece em três camadas, do mais amplo ao mais fino: filtros definem quem entra; o Score define o patamar; o índice de aderência define a ordem.',
      filtros: {
        intro: 'Um imóvel só vira "comparável" se passa, cumulativamente, por todos estes filtros:',
        criterios: input.criteriosSelecao
          ? input.criteriosSelecao.map((c) => ({ criterio: c.criterio, parametro: c.parametro, porque: c.justificativa }))
          : FILTROS_DEFAULT,
        resultado: `Resultado deste filtro no estudo: ${nTotal} casas vendidas, Score ${
          computation.scoreAlvo ?? 'B'
        }, dentro do raio de análise.`,
      },
      score: {
        intro: 'O Score separa o "patamar" do produto. É calculado pelo R$/m² implícito (reforçado por suítes/vagas quando há anúncio):',
        regua: SCORE_REGUA_DEFAULT,
        referencias: input.reguaReferencias ?? [
          "BNSir (Bossa Nova Sotheby's) — mediana de fechamento do bairro.",
          'Panorama amplo dos Jardins — régua de contexto.',
        ],
        notaAlvo: `O alvo entra em Score ${
          computation.scoreAlvo ?? 'B'
        } porque seu R$/m² implícito (mediana ${numBR(computation.medianaPrecoM2)}/m²) fica abaixo do patamar de luxo e ele demanda retrofit/modernização.`,
      },
      aderencia: {
        intro: `Entre os ${nTotal} que passaram nos filtros, ordenamos por um índice de aderência ao alvo — quanto mais parecido com a casa avaliada, maior a nota.`,
        formula: `Aderência = ${(ADHERENCE_WEIGHTS.areaConstruida).toLocaleString('pt-BR')} × (sim. ÁREA CONSTRUÍDA) + ${(ADHERENCE_WEIGHTS.areaTerreno).toLocaleString('pt-BR')} × (sim. ÁREA DE TERRENO) + ${(ADHERENCE_WEIGHTS.proximidade).toLocaleString('pt-BR')} × (PROXIMIDADE)`,
        componentes: [
          `Área construída → 1 − |área_comp − ${areaC}| / ${areaC} (alvo = ${intMetros(areaC)})`,
          `Área de terreno → 1 − |terreno_comp − ${areaT}| / ${areaT} (alvo = ${intMetros(areaT)})`,
          'Distância → 1 − distância / raio (quanto mais perto, melhor)',
        ],
        pesos: [
          `Área construída = ${wC}% — principal determinante do valor de uma casa pronta; metragens parecidas são os melhores espelhos de preço.`,
          `Proximidade = ${wP}% — micro-localização move muito o R$/m²; por isso pesa mais que o terreno.`,
          `Terreno = ${wT}% — peso menor porque o R$/m² de terreno varia com o tamanho do lote (efeito escala), mas conta: o lote amplo do alvo trouxe os lotes grandes para o topo.`,
        ],
        resumo: 'Em resumo: filtros definem quem entra; o Score define o patamar; o índice de aderência define a ordem.',
      },
    },
    parte2: {
      construido: `R$/m² construído = valor da venda ÷ área construída. A mediana das ${nTotal} vendas (${numBR(
        computation.medianaPrecoM2,
      )}/m²) × ${intMetros(areaC)} × ajuste de Capex (Score ${
        computation.scoreAlvo ?? 'B'
      }) dá o valor de mercado pela construção — reportado em faixa entre os cenários: ${mercadoTexto}.`,
      terreno: {
        intro: 'R$/m² terreno = valor ÷ área de terreno. Descoberta-chave: esse índice cai conforme o lote cresce (efeito escala):',
        faixas: escala,
        nota: `Por isso, para o lote de ${intMetros(
          areaT,
        )} do alvo, usamos o R$/m² ajustado à escala — não a mediana global —, caso contrário superavaliaríamos a terra.`,
      },
      residual:
        coAncora != null
          ? `Valor residual do terreno (conta do incorporador): parte do VGV de uma casa nova e subtrai obra, demolição, comercialização, custo financeiro e margem. Resultado: ~${milhoesCompact(
              coAncora,
            )} — convergente com a comparação direta de terreno.`
          : 'Valor residual do terreno (conta do incorporador): parte do VGV de uma casa nova e subtrai obra, demolição, comercialização, custo financeiro e margem.',
      liquidez: `Sobre o valor de mercado aplicam-se fatores incrementais (tempo de exposição, regularização cadastral, Capex, liquidez do produto) que levam ao valor de fechamento estratégico: ${milhoesCompact(
        computation.valorFechamento,
      )}.`,
      sensibilidade: {
        intro: `A mesma estratégia de cálculo é aplicada a 3 recortes (todos / Top 5 / Top 3). A convergência define a faixa final de fechamento.`,
        cenarios,
        nota: `Convergência: mercado em ${mercadoTexto}; faixa de fechamento de ${milhoesCompact(
          metaFechamento.min,
        )}–${milhoesCompact(metaFechamento.max)}.`,
        // Story 9.25 AC3 — transparência do leave-one-out no didático (não só no laudo V2)
        robustezNota: (() => {
          const r = testarRobustez(computation)
          return `Teste de robustez da tese (leave-one-out): retiramos cada comparável do recorte de referência (${r.cenarioReferencia}, n=${r.nConjunto}) e recalculamos a mediana. A amplitude máxima de movimento foi ${r.amplitudeLeaveOneOutPct}% (limiar declarado ${r.limiarPct}% — parâmetro de arbítrio, não verdade estatística). Veredito: ${r.veredicto === 'robusta' ? 'a referência não depende de um único ponto' : 'a referência é sensível a um comparável isolado'}${r.comparavelMaisInfluente ? ` (mais influente: ${r.comparavelMaisInfluente})` : ''}. Cada venda entra como testemunha com admissibilidade A/B/C no passaporte — o detalhe técnico completo fica no laudo V2.`
        })(),
      },
      desagio: desagioTxt,
    },
    parte3: {
      intro: 'A confiança do estudo vem de uma hierarquia clara de fontes e de um método de busca explícito, com limitações honestas.',
      hierarquia: HIERARQUIA_DEFAULT,
      metodoBusca: METODO_BUSCA_DEFAULT,
      limitacoes: LIMITACOES_DEFAULT,
      niveisConfianca: CONFIANCA_DEFAULT,
    },
    parte4: {
      intro: `Os ${topN} imóveis mais aderentes ao alvo (índice da Parte 1.3). Para cada um: dados do ITBI (venda real) + SQL cadastral + status e fonte do anúncio.`,
      top,
      sintese:
        'Síntese: parte dos comparáveis tem anúncio recuperado e confirmado — e justamente esses permitiram medir o deságio real. Os demais são vendas off-market: não há ficha pública, mas a fonte autoritativa (ITBI/SQL) garante o dado. Isso é normal no alto padrão e reforça a metodologia: a verdade está no registro, não no anúncio.',
    },
    parte5: {
      intro: 'Passo a passo para o cliente conferir/replicar o estudo:',
      passos: [
        'Conferir cada SQL no GeoSampa (geosampa.prefeitura.sp.gov.br) → confirma a venda e a metragem cadastral.',
        'Abrir os links confirmados → conferir área e preço pedido.',
        'Recalcular o índice de aderência com a fórmula da Parte 1.3 → reproduz a ordem do Top N.',
        'Recalcular o R$/m² (construído e de terreno) e comparar com a estratificação da Parte 2.2.',
      ],
      anexos: input.anexos ?? ANEXOS_DEFAULT,
      fonte: 'Fonte dos dados: ITBI oficial PMSP (2024–2026) · anúncios verificados na web · régua BNSir.',
    },
  }
}
