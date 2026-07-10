/**
 * Pipeline de validação ACM (P-1 offline) — dataset → computeLaudo + relatório de gates.
 * Puro: sem FS/PDF; o CLI renderiza a partir deste resultado.
 */
import { computeLaudo, type AcmLaudoComputation, type ComputeLaudoOptions } from './methodology'
import { loadAcmDatasetFromObject, type AcmDataset, type AcmDatasetLoadOptions } from './dataset'
import { R5_REGRA_UMA_LINHA } from './tipologia'

export interface ValidateGate {
  id: string
  ok: boolean
  severidade: 'info' | 'atencao' | 'critico'
  detalhe: string
}

export interface ValidatePipelineResult {
  computation: AcmLaudoComputation
  meta: {
    enderecoAlvo: string
    bairro: string | null
    areaConstruida: number
    areaTerreno: number | null
    propertyType: string
    tese: string
  }
  gates: ValidateGate[]
  resumo: {
    totalComparaveis: number
    medianaPrecoM2: number
    valorMercado: number
    valorFechamento: number
    teseComercial: string
    subprecificacao: string | null
    nAvisosCriticos: number
    r5Excluidos: number
  }
}

export function runAcmValidatePipeline(
  ds: AcmDataset,
  opts?: AcmDatasetLoadOptions & {
    precoPedidoReal?: number | null
    homogeneizacao?: ComputeLaudoOptions['homogeneizacao']
    fatoresLiquidez?: number[]
    residual?: ComputeLaudoOptions['residual']
    subprecificacaoMeta?: ComputeLaudoOptions['subprecificacaoMeta']
  },
): ValidatePipelineResult {
  const loaded = loadAcmDatasetFromObject(ds, opts)
  const precoPedidoReal = opts?.precoPedidoReal ?? loaded.precoPedidoReal

  const computation = computeLaudo({
    target: loaded.target,
    comparaveis: loaded.comparaveis,
    propertyType: loaded.propertyType,
    tese: loaded.tese,
    precoPedidoReal,
    fatoresLiquidez: opts?.fatoresLiquidez,
    homogeneizacao: opts?.homogeneizacao,
    residual: opts?.residual,
    subprecificacaoMeta: opts?.subprecificacaoMeta,
  })

  const gates: ValidateGate[] = []

  // R5
  if (computation.r5.aplicado) {
    gates.push({
      id: 'R5',
      ok: computation.r5.nAceitos >= 3,
      severidade: computation.r5.nAceitos < 3 ? 'critico' : 'info',
      detalhe: `aplicado · aceitos=${computation.r5.nAceitos} · excluídos=${computation.r5.nExcluidos} · ${R5_REGRA_UMA_LINHA}`,
    })
  } else {
    gates.push({
      id: 'R5',
      ok: false,
      severidade: 'atencao',
      detalhe: 'gate inerte (sem propertyType) — laudo sem saneamento de tipologia',
    })
  }

  // Amostra
  gates.push({
    id: 'sample_size',
    ok: computation.totalComparaveis >= 5 && computation.top3.length >= 3,
    severidade: computation.totalComparaveis < 5 ? 'critico' : 'info',
    detalhe: `n=${computation.totalComparaveis} · top3=${computation.top3.length}`,
  })

  // Avisos críticos
  const criticos = computation.avisos.filter((a) => a.severidade === 'critico')
  gates.push({
    id: 'avisos_criticos',
    ok: criticos.length === 0,
    severidade: criticos.length > 0 ? 'critico' : 'info',
    detalhe:
      criticos.length === 0
        ? 'nenhum'
        : criticos.map((a) => a.codigo).join(', '),
  })

  // Auto-ref
  gates.push({
    id: 'auto_ref_9.8',
    ok: true,
    severidade: 'info',
    detalhe: `excluídos=${computation.autoReferenciasExcluidas.length}`,
  })

  // Tese comercial
  gates.push({
    id: 'tese_comercial',
    ok: computation.teseComercial.tese !== 'indefinida',
    severidade: computation.teseComercial.tese === 'indefinida' ? 'atencao' : 'info',
    detalhe: `${computation.teseComercial.tese} · ${computation.teseComercial.label}`,
  })

  // Subprecificação
  gates.push({
    id: 'subprecificacao',
    ok: true,
    severidade: computation.subprecificacao.nivel === 'forte' ? 'atencao' : 'info',
    detalhe:
      computation.subprecificacao.nivel == null
        ? 'sem gap relevante / sem preço'
        : `${computation.subprecificacao.nivel} (${computation.subprecificacao.deltaPct}%)`,
  })

  return {
    computation,
    meta: {
      ...loaded.meta,
      propertyType: loaded.propertyType,
      tese: loaded.tese,
    },
    gates,
    resumo: {
      totalComparaveis: computation.totalComparaveis,
      medianaPrecoM2: computation.medianaPrecoM2,
      valorMercado: computation.valorMercado,
      valorFechamento: computation.valorFechamento,
      teseComercial: computation.teseComercial.tese,
      subprecificacao: computation.subprecificacao.nivel,
      nAvisosCriticos: criticos.length,
      r5Excluidos: computation.r5.nExcluidos,
    },
  }
}
