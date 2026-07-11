/**
 * View-model do ACM Lite — 1–2 páginas em linguagem de proprietário (Story 9.19).
 *
 * Zero recálculo: consome o mesmo `AcmLaudoComputation` do laudo premium.
 * Copy "modo dono" em PT-BR (revisável na H-3 com a Luciana).
 */
import { formatBRL } from '@/lib/format'
import type { AcmLaudoComputation, AvisoAcm } from '@/lib/acm/methodology'
import { classificarTeseComercial, type TeseComercial } from '@/lib/acm/teseComercial'
import { simularEstrategias, type EstrategiaPreco } from '@/lib/acm/simuladorEstrategias'
import type { ResumoSourceComparable } from './resumoModel'

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

export interface LiteInput {
  enderecoAlvo: string
  bairro?: string | null
  areaConstruida: number
  areaTerreno?: number | null
  programa?: {
    dormitorios?: number | null
    suites?: number | null
    vagas?: number | null
  } | null
  precoPretendido?: number | null
  precoPedidoReal?: number | null
  /** Data de emissão já formatada. */
  dataEmissao: string
  /** Override de seções "modo dono" (H-3). */
  modoDonoOverride?: Partial<LiteModoDono> | null
}

export interface LiteTopComparavel {
  rank: number
  endereco: string
  areaM2: number | null
  preco: number | null
  distanciaM: number | null
  precoM2: number | null
}

export interface LiteModoDono {
  oQueRegistrosMostram: string
  oQueSugere: string
  oQueConfirmar: string
  oQueRecomendamos: string
  oQueNaoDizemos: string
}

export interface LiteModel {
  header: {
    titulo: string
    subtitulo: string
    endereco: string
    bairro: string | null
    programa: string | null
    dataEmissao: string
  }
  faixaMercado: { min: number; max: number }
  referenciaMercado: number
  top3: LiteTopComparavel[]
  tese: TeseComercial
  avisosCriticos: AvisoAcm[]
  /** AC7 — alerta R5/tipologia em destaque. */
  alertaTipologia: AvisoAcm | null
  /** Story 9.21 — bloco curto se nivel ≠ null. */
  subprecificacao: {
    nivel: 'fraca' | 'moderada' | 'forte' | null
    deltaPct: number | null
    acaoRecomendada: string | null
    narrativa: string | null
  }
  /**
   * Story 9.24 — 3 estratégias em linguagem de dono (decisão H-3 E: Lite na V1).
   * Tribunal (9.25) NÃO entra no Lite.
   */
  estrategiasPreco: Array<
    Pick<EstrategiaPreco, 'chave' | 'precoAnuncio' | 'faixaFechamento' | 'racional'> & {
      /** Rótulo curto modo dono. */
      rotulo: string
    }
  >
  modoDono: LiteModoDono
  disclaimer: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function programaLabel(p?: LiteInput['programa']): string | null {
  if (!p) return null
  const partes: string[] = []
  if (p.dormitorios != null) partes.push(`${p.dormitorios} dorm`)
  if (p.suites != null) partes.push(`${p.suites} suíte${p.suites === 1 ? '' : 's'}`)
  if (p.vagas != null) partes.push(`${p.vagas} vaga${p.vagas === 1 ? '' : 's'}`)
  if (partes.length === 0) return null
  return partes.join(' · ')
}

const DISCLAIMER_DEFAULT =
  'Este ACM Lite é material de apoio à conversa comercial. Não é laudo judicial, perícia ou avaliação NBR completa. Números vêm de vendas ITBI/PMSP e regras declaradas no laudo técnico completo.'

// ---------------------------------------------------------------------------
// Builder (puro)
// ---------------------------------------------------------------------------

export function buildLiteModel(
  computation: AcmLaudoComputation,
  source: ResumoSourceComparable[],
  input: LiteInput,
): LiteModel {
  const byEnd = new Map(source.map((c) => [c.endereco, c]))
  const ref = computation.headline.referencia.valorMercado
  const tese = classificarTeseComercial(
    ref,
    input.precoPedidoReal,
    input.precoPretendido ?? computation.target.precoPretendido,
  )

  const top3: LiteTopComparavel[] = computation.top3.slice(0, 3).map((t, i) => {
    const src = byEnd.get(t.endereco)
    const area = src?.areaConstruida ?? null
    const preco = src?.preco ?? null
    return {
      rank: i + 1,
      endereco: t.endereco,
      areaM2: area,
      preco,
      distanciaM: src?.distancia ?? null,
      precoM2: area != null && area > 0 && preco != null ? Math.round((preco / area) * 100) / 100 : null,
    }
  })

  const avisosCriticos = computation.avisos.filter((a) => a.severidade === 'critico').slice(0, 3)
  const alertaTipologia =
    computation.avisos.find(
      (a) =>
        a.codigo === 'TIPOLOGIA_MISTA' ||
        a.codigo === 'typology_r5_incomplete' ||
        (a.severidade === 'critico' && /tipolog/i.test(a.mensagem)),
    ) ?? null

  const n = computation.totalComparaveis
  const faixa = computation.headline.mercado
  const pret = input.precoPedidoReal ?? input.precoPretendido

  // H-3 Luciana: frase canônica + formato "Mercado X–Y (referência Z)" + preferir subavaliar.
  const mercadoFaixaTxt = `Mercado ${formatBRL(faixa.min)} – ${formatBRL(faixa.max)} (referência ${formatBRL(ref)})`
  const modoDonoDefault: LiteModoDono = {
    oQueRegistrosMostram: `Encontramos ${n} venda${n === 1 ? '' : 's'} real${n === 1 ? '' : 'is'} (ITBI) comparáveis. ${mercadoFaixaTxt}.`,
    oQueSugere:
      tese.tese === 'abaixo'
        ? 'Subprecificado — não recomendo cortar. O risco principal não é “estar caro”, e sim deixar valor na mesa.'
        : tese.tese === 'acima'
          ? 'O preço pedido/pretendido está acima da referência de vendas — a captura tende a exigir realismo de mercado ou prazo maior.'
          : tese.tese === 'alinhado'
            ? 'O mercado não é um número — é uma faixa. Pelo estado do imóvel, eu posiciono aqui. O jogo vira execução e diferenciação, não corte cego.'
            : 'O mercado não é um número — é uma faixa. Pelo estado do imóvel, eu posiciono aqui — ainda falta informar o preço comercial pretendido.',
    oQueConfirmar:
      'Estado de conservação (ficha A–E da visita), reformas, área oficial (matrícula/IPTU) e tipologia casa×apto dos comparáveis.',
    oQueRecomendamos:
      pret != null
        ? `${mercadoFaixaTxt}. Preferimos âncora conservadora (subavaliar se errar) na exclusividade; o pedido de ${formatBRL(pret)} deve conversar com essa faixa.`
        : `${mercadoFaixaTxt}. Definir anúncio e meta de fechamento dentro da faixa, com âncora preferencialmente conservadora.`,
    oQueNaoDizemos:
      'Não é laudo judicial nem NBR completo. Residual de incorporador e co-âncora de terreno ficam no laudo técnico (V2), não neste Lite de V1. Não substituímos vistoria, matrícula ou perícia.',
  }

  const ov = input.modoDonoOverride ?? {}
  const modoDono: LiteModoDono = {
    oQueRegistrosMostram: ov.oQueRegistrosMostram ?? modoDonoDefault.oQueRegistrosMostram,
    oQueSugere: ov.oQueSugere ?? modoDonoDefault.oQueSugere,
    oQueConfirmar: ov.oQueConfirmar ?? modoDonoDefault.oQueConfirmar,
    oQueRecomendamos: ov.oQueRecomendamos ?? modoDonoDefault.oQueRecomendamos,
    oQueNaoDizemos: ov.oQueNaoDizemos ?? modoDonoDefault.oQueNaoDizemos,
  }

  const areaTxt =
    input.areaTerreno != null && input.areaTerreno > 0
      ? `${Math.round(input.areaConstruida)} m² constr. · ${Math.round(input.areaTerreno)} m² terreno`
      : `${Math.round(input.areaConstruida)} m² constr.`

  return {
    header: {
      titulo: `ACM Lite · ${input.enderecoAlvo}`,
      subtitulo: 'Leitura rápida de mercado para conversa com o proprietário',
      endereco: `${input.enderecoAlvo}${input.bairro ? ` · ${input.bairro}` : ''}`,
      bairro: input.bairro ?? null,
      programa: [areaTxt, programaLabel(input.programa)].filter(Boolean).join(' · ') || null,
      dataEmissao: input.dataEmissao,
    },
    faixaMercado: faixa,
    referenciaMercado: ref,
    top3,
    tese,
    avisosCriticos,
    alertaTipologia,
    subprecificacao: {
      nivel: computation.subprecificacao.nivel,
      deltaPct: computation.subprecificacao.deltaPct,
      acaoRecomendada: computation.subprecificacao.acaoRecomendada,
      narrativa: computation.subprecificacao.narrativa,
    },
    estrategiasPreco: simularEstrategias(computation).map((e) => ({
      chave: e.chave,
      precoAnuncio: e.precoAnuncio,
      faixaFechamento: e.faixaFechamento,
      // Lite: racional enxuto, sem jargão de tribunal
      racional: e.racional,
      rotulo:
        e.chave === 'rapida'
          ? 'Rápida (piso)'
          : e.chave === 'defensavel'
            ? 'Defensável (referência)'
            : 'Agressiva (teto)',
    })),
    modoDono,
    disclaimer: DISCLAIMER_DEFAULT,
  }
}
