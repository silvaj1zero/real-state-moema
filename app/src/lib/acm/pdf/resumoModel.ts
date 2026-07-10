/**
 * View-model puro do Resumo Executivo ACM (Story 8.3a).
 *
 * Separa a montagem do conteúdo (cálculo/seleção → layout) da renderização
 * React-PDF, permitindo snapshot das seções sem gerar PDF (AC8). Consome o
 * `AcmLaudoComputation` da Story 8.2 (zero recálculo — ADR-EPIC8-001 Impl. Note 5)
 * + os campos do consultor/alvo não computados (`ResumoInput`).
 *
 * Fidelidade (Art. IV): rótulos, colunas e a estrutura das 3 páginas traçam ao
 * `docs/reference/acm-honduras/ACM_RESUMO_Honduras_RE-MAX.pdf`. Os textos de
 * síntese/parecer são TEMPLATES factuais sobre os números — sem adjetivos
 * inventados — e podem ser sobrescritos por input.
 */
import { formatBRL } from '@/lib/format'
import type { AcmLaudoComputation } from '@/lib/acm/methodology'

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

/** Comparável-fonte para a tabela Top N (superset do AcmComparable + fonte). */
export interface ResumoSourceComparable {
  endereco: string
  areaConstruida: number
  areaTerreno?: number | null
  preco: number
  precoM2Terreno?: number | null
  fonte?: string | null
  /** Texto/identificador da referência da fonte (ex.: "ref. 6254", "consulta SQL"). */
  fonteRef?: string | null
  distancia?: number | null
}

export interface ResumoPrograma {
  dormitorios?: number | null
  suites?: number | null
  vagas?: number | null
}

/** Campos do alvo/consultor que NÃO vêm do cálculo (8.2). */
export interface ResumoInput {
  /** Logradouro do alvo (ex.: "Rua Honduras"). */
  enderecoAlvo: string
  /** Bairro (ex.: "Jardim América"). */
  bairro?: string | null
  areaConstruida: number
  areaTerreno: number
  programa?: ResumoPrograma | null
  /** Nota da classe ao lado do Score (ex.: "(retrofit)"). */
  classeNota?: string | null
  precoPretendido?: number | null
  precoPedidoReal?: number | null
  precoAnuncioRecomendado?: number | null
  /** Meta de fechamento recomendada (consultor). Default = faixaFechamento computada. */
  metaFechamento?: { min: number; max: number } | null
  /** Data de emissão já formatada (injetada — lib pura não chama Date). */
  dataEmissao: string
  /** Override do parágrafo de síntese; default templado abaixo. */
  sinteseParagrafo?: string | null
  /** Override dos bullets de síntese; default templado abaixo. */
  sinteseBullets?: string[] | null
  /** Override do parecer; default templado abaixo. */
  parecer?: string | null
  /** URL da imagem de mapa estático (construída por staticMap.ts no call site). */
  mapaUrl?: string | null
}

// ---------------------------------------------------------------------------
// Saída (view-model)
// ---------------------------------------------------------------------------

export interface ResumoFaixaItem {
  rotulo: string
  valor: number | null
  /** Para o card de fechamento (faixa) — quando presente, exibe "min–max". */
  faixa?: { min: number; max: number } | null
  destaque?: boolean
}

export interface ResumoTopRow {
  rank: number
  estrelas: string
  endereco: string
  construido: number | null
  terreno: number | null
  precoM2Terreno: number | null
  fonte: string
}

export interface ResumoSensRow {
  cenario: string
  n: number
  valorMercado: number
  valorFechamento: number
}

export interface ResumoConclusaoRow {
  rotulo: string
  valor: number | null
  faixa?: { min: number; max: number } | null
  destaque?: boolean
}

export interface ResumoModel {
  header: {
    titulo: string // "ACM · Rua Honduras"
    subtitulo: string
    dataEmissao: string
  }
  ficha: {
    imovel: string // "Rua Honduras · Jardim América"
    construido: number
    terreno: number
    programa: string | null // "4 dorm · 2 suítes · 10 vagas"
    score: string | null
    classeNota: string | null
  }
  faixa: ResumoFaixaItem[]
  sintese: { paragrafo: string; bullets: string[] }
  mapaUrl: string | null
  topComparaveis: ResumoTopRow[]
  sensibilidade: ResumoSensRow[]
  conclusao: ResumoConclusaoRow[]
  parecer: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function programaLabel(p?: ResumoPrograma | null): string | null {
  if (!p) return null
  const partes: string[] = []
  if (p.dormitorios != null) partes.push(`${p.dormitorios} dorm`)
  if (p.suites != null) partes.push(`${p.suites} suíte${p.suites === 1 ? '' : 's'}`)
  if (p.vagas != null) partes.push(`${p.vagas} vaga${p.vagas === 1 ? '' : 's'}`)
  return partes.length ? partes.join(' · ') : null
}

function sensLabel(cenario: 'todos' | 'top5' | 'top3', n: number): string {
  if (cenario === 'todos') return `Todos os ${n} negociáveis`
  if (cenario === 'top5') return 'Top 5 (mais aderentes)'
  return 'Top 3 (mais aderentes)'
}

function fonteLabel(c?: ResumoSourceComparable): string {
  if (!c) return '—'
  const base = c.fonte ?? '—'
  return c.fonteRef ? `${base} (${c.fonteRef})` : base
}

/** "1.058 m²" / "—" para área nula. */
function intMetros(v: number | null | undefined): string {
  return v == null ? '—' : `${Math.round(v).toLocaleString('pt-BR')} m²`
}

function faixaTexto(f: { min: number; max: number }): string {
  return `${formatBRL(f.min)}–${formatBRL(f.max)}`
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildResumoModel(
  computation: AcmLaudoComputation,
  comparaveis: ResumoSourceComparable[],
  input: ResumoInput,
): ResumoModel {
  const byEndereco = new Map(comparaveis.map((c) => [c.endereco, c]))
  const metaFechamento = input.metaFechamento ?? computation.faixaFechamento

  // --- Top N (computation.top5 já ordenado por aderência, enriquecido pela fonte)
  const topComparaveis: ResumoTopRow[] = computation.top5.map((t, i) => {
    const src = byEndereco.get(t.endereco)
    const precoM2Terreno =
      src?.precoM2Terreno ??
      (src && src.areaTerreno && src.areaTerreno > 0
        ? Math.round((src.preco / src.areaTerreno) * 100) / 100
        : null)
    return {
      rank: i + 1,
      estrelas: i < 3 ? '★★★' : '★',
      endereco: t.endereco,
      construido: src?.areaConstruida ?? null,
      terreno: src?.areaTerreno ?? null,
      precoM2Terreno,
      fonte: fonteLabel(src),
    }
  })

  // --- Sensibilidade
  const sensibilidade: ResumoSensRow[] = computation.sensibilidade.map((s) => ({
    cenario: sensLabel(s.cenario, s.n),
    n: s.n,
    valorMercado: s.valorMercado,
    valorFechamento: s.valorFechamento,
  }))

  // --- Faixa capa (H-3: Mercado X–Y ref Z; residual só laudo técnico Sec. 8) ---
  const h = computation.headline
  const mercadoFaixa = h.mercado.min !== h.mercado.max ? h.mercado : null
  const faixa: ResumoFaixaItem[] = [
    { rotulo: 'Pretendido', valor: input.precoPretendido ?? null },
    { rotulo: 'Anúncio real', valor: input.precoPedidoReal ?? null },
    {
      rotulo: mercadoFaixa
        ? `Mercado (ref. ${formatBRL(h.referencia.valorMercado)})`
        : 'Mercado (ACM)',
      valor: mercadoFaixa ? null : h.referencia.valorMercado,
      faixa: mercadoFaixa,
    },
    { rotulo: 'Fechamento', valor: null, faixa: metaFechamento, destaque: true },
  ]

  // --- Conclusão (6 linhas) — ACM_RESUMO pág. 3
  const conclusao: ResumoConclusaoRow[] = [
    { rotulo: 'Preço pretendido (proprietária)', valor: input.precoPretendido ?? null },
    { rotulo: 'Preço pedido REAL (anúncio confirmado)', valor: input.precoPedidoReal ?? null },
    { rotulo: 'Valor de mercado (ACM, via construção)', valor: computation.valorMercado },
    {
      rotulo: `Co-âncora de terreno (lote ${intMetros(input.areaTerreno)})`,
      valor: computation.coAncoraTerreno,
    },
    { rotulo: 'Meta de fechamento recomendada', valor: null, faixa: metaFechamento, destaque: true },
    {
      rotulo: 'Preço de anúncio recomendado',
      valor: input.precoAnuncioRecomendado ?? null,
      destaque: true,
    },
  ]

  // --- Síntese (parágrafo + bullets) — templates factuais, sobrescrevíveis
  const nReais = comparaveis.length // total considerado no raio
  const bairroClause = input.bairro ? `, no ${input.bairro}` : ''
  const scoreClause = computation.scoreAlvo ? `, Score ${computation.scoreAlvo}` : ''
  const precoClause = [
    input.precoPedidoReal != null ? `Preço pedido real de ${formatBRL(input.precoPedidoReal)}` : null,
    input.precoPretendido != null
      ? `expectativa da proprietária de ${formatBRL(input.precoPretendido)}`
      : null,
  ]
    .filter(Boolean)
    .join('; ')
  const coAncoraClause =
    computation.coAncoraTerreno != null
      ? ` O lote de ${intMetros(input.areaTerreno)} sustenta uma co-âncora de terreno de ~${formatBRL(
          computation.coAncoraTerreno,
        )}, que encontra o valor de construção e o preço pedido — convergência em ${faixaTexto(
          metaFechamento,
        )}.`
      : ''

  const paragrafoDefault =
    `Imóvel de ${intMetros(input.areaConstruida)} construídos sobre ${intMetros(
      input.areaTerreno,
    )} de terreno${scoreClause}${bairroClause}.` +
    (precoClause ? ` ${precoClause}.` : '') +
    ` A avaliação cruza ${nReais} comparáveis num raio de análise${
      coAncoraClause ? ',' : '.'
    }${coAncoraClause}`

  const bulletsDefault: string[] = []
  if (computation.desagioMedidoPercent != null) {
    bulletsDefault.push(
      `Anúncio ≠ fechamento (medido): comparáveis com anúncio recuperado fecharam em média ${computation.desagioMedidoPercent.toLocaleString(
        'pt-BR',
      )}% abaixo do pedido.`,
    )
  }
  if (computation.coAncoraTerreno != null) {
    bulletsDefault.push(
      `Duas frentes de demanda: comprador-usuário (retrofit) e comprador-terreno (reconstrução no lote de ${intMetros(
        input.areaTerreno,
      )}, ~${formatBRL(computation.coAncoraTerreno)}) — convergem e sustentam o valor.`,
    )
  }
  if (input.precoAnuncioRecomendado != null) {
    bulletsDefault.push(
      `Recomendação: anunciar a ${formatBRL(
        input.precoAnuncioRecomendado,
      )}, meta de fechamento ${faixaTexto(metaFechamento)}.`,
    )
  }

  // --- Parecer — template factual, sobrescrevível
  const parecerDefault =
    (input.precoAnuncioRecomendado != null
      ? `Recomenda-se anúncio em ${formatBRL(input.precoAnuncioRecomendado)} com meta de fechamento de ${faixaTexto(
          metaFechamento,
        )}`
      : `Meta de fechamento de ${faixaTexto(metaFechamento)}`) +
    ` — faixa onde convergem a co-âncora de terreno${
      computation.coAncoraTerreno != null ? ` (~${formatBRL(computation.coAncoraTerreno)})` : ''
    }, o valor de construção e o preço real pedido${
      input.precoPedidoReal != null ? ` (${formatBRL(input.precoPedidoReal)})` : ''
    }. Condicionado à due diligence (matrícula/IPTU: terreno, uso residencial × comercial, programa).`

  const imovel = input.bairro ? `${input.enderecoAlvo} · ${input.bairro}` : input.enderecoAlvo

  return {
    header: {
      titulo: `ACM · ${input.enderecoAlvo}`,
      subtitulo: 'Análise Comparativa de Mercado — versão sucinta do laudo técnico.',
      dataEmissao: input.dataEmissao,
    },
    ficha: {
      imovel,
      construido: input.areaConstruida,
      terreno: input.areaTerreno,
      programa: programaLabel(input.programa),
      score: computation.scoreAlvo,
      classeNota: input.classeNota ?? null,
    },
    faixa,
    sintese: {
      paragrafo: input.sinteseParagrafo ?? paragrafoDefault,
      bullets: input.sinteseBullets ?? bulletsDefault,
    },
    mapaUrl: input.mapaUrl ?? null,
    topComparaveis,
    sensibilidade,
    conclusao,
    parecer: input.parecer ?? parecerDefault,
  }
}
