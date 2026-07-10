/**
 * Regressao multi-caso - Andrade Pertence 113 e 132.
 * Veredito v4: Honduras deixa de ser gabarito unico.
 * Fonte: docs/acm/andrade-pertence-{113,132}/dataset.json (R5-limpo).
 * Ancoras congeladas 2026-07-09 via P-1 offline.
 * NAO editar ancoras sem revalidar dataset + laudo.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAcmValidatePipeline } from './validatePipeline'
import type { AcmDataset } from './dataset'

const here = path.dirname(fileURLToPath(import.meta.url))
// app/src/lib/acm -> repo root
const repoRoot = path.resolve(here, '../../../..')

function loadDataset(slug: string): AcmDataset {
  const p = path.join(repoRoot, 'docs', 'acm', slug, 'dataset.json')
  if (!existsSync(p)) {
    throw new Error(`dataset canonico ausente: ${p}`)
  }
  return JSON.parse(readFileSync(p, 'utf8')) as AcmDataset
}

/** Ancoras congeladas - pipeline propertyType=casa, tese=construcao. */
const ANCHORS = {
  'andrade-pertence-113': {
    n: 56,
    medianaPrecoM2: 9967.74,
    valorMercado: 677_806,
    scoreAlvo: 'B' as const,
    teseComercial: 'alinhado' as const,
    subprecificacao: null as null,
    top3: [
      'AV DR CARDOSO DE MELO 379',
      'R ELIZABETH TROVAO USUI 64',
      'R ELIZABETH TROVAO USUI 65',
    ],
  },
  'andrade-pertence-132': {
    n: 56,
    medianaPrecoM2: 10_294.37,
    valorMercado: 1_925_047,
    scoreAlvo: 'B' as const,
    teseComercial: 'abaixo' as const,
    subprecificacao: 'forte' as const,
    top3: ['R UBAIRA 60', 'R PARIQUERA-ACU 41', 'R JURUENA 87'],
    deltaSubPct: -20.1,
  },
} as const

describe.each([
  ['andrade-pertence-113', ANCHORS['andrade-pertence-113']],
  ['andrade-pertence-132', ANCHORS['andrade-pertence-132']],
] as const)('regressao %s (dataset canonico)', (slug, anchor) => {
  const ds = loadDataset(slug)
  const r = runAcmValidatePipeline(ds, {
    propertyType: 'casa',
    tese: 'construcao',
  })

  it('dataset carrega e R5 aplica com n=56 casas', () => {
    expect(ds.comparaveis.length).toBe(56)
    expect(r.computation.r5.aplicado).toBe(true)
    expect(r.resumo.totalComparaveis).toBe(anchor.n)
    expect(r.computation.r5.nExcluidos).toBe(0)
  })

  it('ancoras de valor (mediana + mercado + score)', () => {
    expect(r.resumo.medianaPrecoM2).toBe(anchor.medianaPrecoM2)
    expect(r.resumo.valorMercado).toBe(anchor.valorMercado)
    expect(r.computation.scoreAlvo).toBe(anchor.scoreAlvo)
  })

  it('Top 3 estavel com tese construcao', () => {
    expect(r.computation.top3.map((t) => t.endereco)).toEqual([...anchor.top3])
  })

  it('tese comercial / subprecificacao', () => {
    expect(r.resumo.teseComercial).toBe(anchor.teseComercial)
    expect(r.resumo.subprecificacao).toBe(anchor.subprecificacao)
    if (slug === 'andrade-pertence-132' && 'deltaSubPct' in anchor) {
      expect(r.computation.subprecificacao.deltaPct).toBe(anchor.deltaSubPct)
      expect(r.computation.subprecificacao.acaoRecomendada).toMatch(
        /Subprecificado|não recomendo cortar|Nao reduzir|Não reduzir/i,
      )
    }
  })

  it('gates P-1: sample_size e R5 ok', () => {
    const r5 = r.gates.find((g) => g.id === 'R5')!
    const sample = r.gates.find((g) => g.id === 'sample_size')!
    expect(r5.ok).toBe(true)
    expect(sample.ok).toBe(true)
  })
})

describe('andrade-pertence-113 - evidencia A/B', () => {
  it('pool A/B = 56, 0 laterais C', () => {
    const r = runAcmValidatePipeline(loadDataset('andrade-pertence-113'), {
      propertyType: 'casa',
      tese: 'construcao',
    })
    expect(r.computation.evidencia.nA).toBe(43)
    expect(r.computation.evidencia.nB).toBe(13)
    expect(r.computation.evidencia.nC).toBe(0)
    expect(r.computation.evidencia.laterais).toEqual([])
    expect(r.computation.evidencia.medianaPrincipal).toBe(r.resumo.medianaPrecoM2)
  })
})
