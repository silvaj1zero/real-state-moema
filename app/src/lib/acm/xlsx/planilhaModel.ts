/**
 * Story 9.2 — View-model puro da planilha XLSX canônica (paridade com
 * `ACM-Honduras629-CANONICO-validado.xlsx`). Separa o MODELO (testável, sem I/O)
 * do WRITER (`buildPlanilhaWorkbook`, exceljs). Números vêm de
 * `AcmLaudoComputation` (8.2) + `ComparavelNoRaio` (RPC) — zero recálculo.
 *
 * Degradação graciosa (Art. IV / spike 9.0): os campos da metodologia estão hoje
 * 100% NULL nas linhas ITBI (dependem do sink, Story 9.4) — células vazias, nunca
 * "nan"; abas sem dado trazem nota "Nenhum registro no raio".
 */
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import type { AcmLaudoComputation, AdherenceBreakdown } from '@/lib/acm/methodology'

export type PlanilhaPropertyType = 'apartamento' | 'casa'
export type Cell = string | number

export interface PlanilhaOferta {
  endereco: string
  area?: number | null
  pedido?: number | null
  precoM2?: number | null
  uso?: string | null
  link?: string | null
}

export interface PlanilhaTerreno {
  tipo: string
  endereco: string
  areaTerreno?: number | null
  valor?: number | null
  precoM2?: number | null
  distancia?: number | null
  mesAno?: string | null
  proporcao?: string | null
  obs?: string | null
}

export interface PlanilhaInput {
  enderecoAlvo: string
  propertyType?: PlanilhaPropertyType
  /** Concorrência/ofertas ativas (consultor) — aba "Ofertas ativas". */
  ofertas?: PlanilhaOferta[]
  /** Terrenos vendidos/ofertados (consultor) — aba "Terrenos" (só p/ casa). */
  terrenos?: PlanilhaTerreno[]
  /** Data de geração já formatada (injetada — mantém o modelo puro/testável). */
  geradoEm?: string
}

export interface PlanilhaSheet {
  nome: string
  headers: string[]
  rows: Cell[][]
  /** Coluna (0-based) que contém um hyperlink, se houver. */
  linkCol?: number
  /** Aplica realce por faixa de rank (Top3 ouro / Top5 laranja) — writer. */
  tierHighlight?: boolean
  /** Texto exibido quando não há linhas. */
  emptyNote?: string | null
}

export interface PlanilhaModel {
  sheets: PlanilhaSheet[]
  geradoEm: string
}

const RANK_HEADERS = [
  'Rank', 'SQL (ITBI)', 'Endereço', 'Vendido?', 'Ano ref.', 'Dorm', 'Suíte', 'Vagas',
  'Área constr. (m²)', 'Área terreno (m²)', 'Valor venda ITBI', 'Valor anúncio/pedido',
  'R$/m² constr.', 'R$/m² terreno', 'Distância (m)', 'Status anúncio', 'Link anúncio', 'Aderência',
]
const RANK_LINK_COL = 16

const blank = (v: number | string | null | undefined): Cell => (v == null || v === '' ? '' : v)

function rankRow(c: ComparavelNoRaio, rank: number, indice: number | null): Cell[] {
  return [
    rank,
    blank(c.sql_cadastral),
    c.endereco,
    c.is_venda_real ? 'Sim (ITBI)' : 'Anúncio',
    blank(c.ano_referencia),
    blank(c.dormitorios),
    blank(c.suites),
    blank(c.vagas),
    blank(c.area_construida_m2),
    blank(c.area_terreno_m2),
    c.is_venda_real ? c.preco : '',
    blank(c.preco_pedido),
    blank(c.preco_m2),
    blank(c.preco_m2_terreno),
    Math.round(c.distancia_m),
    blank(c.status_anuncio),
    blank(c.anuncio_url),
    indice != null ? Math.round(indice * 1000) / 1000 : '',
  ]
}

/** Constrói as linhas de uma aba de ranking juntando os breakdowns (aderência) ao
 * comparável correspondente (por endereço — mesmo padrão de `sensitivityScenarios`
 * / `buildAcmMapMarkers`). Entradas sem comparável casado são ignoradas. */
function rankRows(
  breakdowns: AdherenceBreakdown[],
  byEndereco: Map<string, ComparavelNoRaio>,
): Cell[][] {
  const rows: Cell[][] = []
  breakdowns.forEach((b, i) => {
    const c = byEndereco.get(b.endereco)
    if (c) rows.push(rankRow(c, i + 1, b.indice))
  })
  return rows
}

function rankSheet(nome: string, breakdowns: AdherenceBreakdown[], byEndereco: Map<string, ComparavelNoRaio>): PlanilhaSheet {
  return {
    nome,
    headers: RANK_HEADERS,
    rows: rankRows(breakdowns, byEndereco),
    linkCol: RANK_LINK_COL,
    tierHighlight: true,
    emptyNote: 'Nenhum comparável no raio.',
  }
}

export function buildPlanilhaModel(
  computation: AcmLaudoComputation,
  comparaveis: ComparavelNoRaio[],
  input: PlanilhaInput,
): PlanilhaModel {
  const geradoEm = input.geradoEm ?? ''
  const byEndereco = new Map<string, ComparavelNoRaio>()
  for (const c of comparaveis) if (!byEndereco.has(c.endereco)) byEndereco.set(c.endereco, c)

  const leiaMe: PlanilhaSheet = {
    nome: 'Leia-me',
    headers: ['Campo', 'Descrição'],
    rows: [
      ['Documento', `ACM ${input.enderecoAlvo} — planilha canônica (gerada pelo app)`],
      ['Gerado em', geradoEm],
      ['Produto', input.propertyType === 'apartamento' ? 'Apartamento (vertical)' : 'Casa/terreno (horizontal)'],
      ['Ordenação', 'Índice de aderência ao alvo: área construída 50% + terreno 20% + proximidade 30%'],
      ['Convenção dorm/suíte', 'Dormitórios = total de quartos; suítes = subconjunto (NÃO somar)'],
      ['Status anúncio', 'confirmado · parcial · off-market · não recuperável'],
      ['Fonte', 'ITBI oficial PMSP (venda real, âncora) + anúncios (concorrência/teto)'],
      ['Aviso de dado', 'Campos de metodologia (área constr×terreno, S/V/D, SQL, score) dependem do sink ITBI (Story 9.4); enquanto não mapeados, aparecem vazios.'],
    ],
  }

  const ofertas: PlanilhaSheet = {
    nome: 'Ofertas ativas',
    headers: ['Endereço', 'Área (m²)', 'Pedido', 'R$/m²', 'Uso', 'Link'],
    rows: (input.ofertas ?? []).map((o) => [
      o.endereco, blank(o.area), blank(o.pedido), blank(o.precoM2), blank(o.uso), blank(o.link),
    ]),
    linkCol: 5,
    emptyNote: 'Nenhum registro no raio.',
  }

  const sheets: PlanilhaSheet[] = [
    leiaMe,
    rankSheet('Top 3', computation.top3, byEndereco),
    rankSheet('Top 5', computation.top5, byEndereco),
    rankSheet('Top 10', computation.ranking.slice(0, 10), byEndereco),
    rankSheet('Todos', computation.ranking, byEndereco),
    ofertas,
  ]

  // Aba Terrenos só faz sentido para casa/terreno (não para apartamento).
  if (input.propertyType !== 'apartamento') {
    sheets.push({
      nome: 'Terrenos',
      headers: ['Tipo', 'Endereço', 'Área terreno (m²)', 'Valor', 'R$/m² terreno', 'Distância (m)', 'Mês/Ano', 'Proporção', 'Observação'],
      rows: (input.terrenos ?? []).map((t) => [
        t.tipo, t.endereco, blank(t.areaTerreno), blank(t.valor), blank(t.precoM2),
        blank(t.distancia), blank(t.mesAno), blank(t.proporcao), blank(t.obs),
      ]),
      emptyNote: 'Nenhum registro no raio.',
    })
  }

  return { sheets, geradoEm }
}
