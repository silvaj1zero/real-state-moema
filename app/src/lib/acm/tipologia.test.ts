import { describe, it, expect } from 'vitest'
import {
  classificarTipologia,
  classificarDeGuias,
  filtrarComparaveisPorR5,
  aplicarVerificacaoVisual,
  parseRotuloTipologia,
  loteDoSql,
  digitsSql,
  LOTE_CONDOMINIAL_MIN,
  VERIFICACAO_VISUAL_ANDRADE_PERTENCE_132,
  R5_REGRA_UMA_LINHA,
} from './tipologia'
import { computeLaudo } from './methodology'
import type { AcmComparable } from './methodology'
import {
  HONDURAS_TARGET,
  HONDURAS_COMPARAVEIS,
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
} from './honduras.fixture'

describe('digitsSql / loteDoSql', () => {
  it('normaliza SQL e extrai lote', () => {
    expect(digitsSql('041-178-0048-5')).toBe('4117800485')
    // pad 11: 04117800485 → lote slice(6,10)
    expect(loteDoSql('4117800485')).toBeGreaterThanOrEqual(0)
  })

  it(`lote ≥ ${LOTE_CONDOMINIAL_MIN} indica condomínio na heurística`, () => {
    // 11 dígitos: XXXXXX LLLL D — lote 0100
    const sql = '12345601001'
    expect(loteDoSql(sql)).toBe(100)
  })
})

describe('classificarTipologia — guia oficial (AC2)', () => {
  it('Complemento AP → apartamento (causa-raiz incidente)', () => {
    const c = classificarTipologia({
      complemento: 'AP 82',
      usoIptu: null,
    })
    expect(c.tipo).toBe('apartamento')
    expect(c.fonte).toBe('guia')
    expect(c.confianca).toBe('alta')
    expect(c.motivos.some((m) => /Complemento/i.test(m))).toBe(true)
  })

  it('Uso RESIDÊNCIA / padrão HORIZONTAL → casa', () => {
    const c = classificarTipologia({
      guia: { usoIptu: 'RESIDÊNCIA', padraoIptu: 'HORIZONTAL' },
    })
    expect(c.tipo).toBe('casa')
    expect(c.fonte).toBe('guia')
    expect(c.rotulo).toBe('casa')
  })

  it('Uso APARTAMENTO / VERTICAL → apartamento', () => {
    const c = classificarTipologia({
      usoIptu: 'APARTAMENTO EM CONDOMÍNIO',
      padraoIptu: 'VERTICAL',
    })
    expect(c.tipo).toBe('apartamento')
    expect(c.confianca).toBe('alta')
  })

  it('sem guia + lote alto → apartamento (provável) baixa', () => {
    // SQL com lote 0200
    const c = classificarTipologia({ sqlCadastral: '12345602001' })
    expect(c.tipo).toBe('apartamento')
    expect(c.fonte).toBe('heuristica')
    expect(c.confianca).toBe('baixa')
    expect(c.rotulo).toBe('apartamento (provável)')
  })

  it('sem guia + lote baixo → casa (provável) baixa', () => {
    const c = classificarTipologia({ sqlCadastral: '12345600461' })
    expect(c.tipo).toBe('casa')
    expect(c.fonte).toBe('heuristica')
    expect(c.confianca).toBe('baixa')
  })

  it('classificarDeGuias usa a última guia da lista', () => {
    const c = classificarDeGuias(
      [
        { usoIptu: 'COMÉRCIO' },
        { usoIptu: 'RESIDÊNCIA', padraoIptu: 'HORIZONTAL' },
      ],
      '12345600461',
    )
    expect(c.tipo).toBe('casa')
    expect(c.fonte).toBe('guia')
  })
})

describe('parseRotuloTipologia', () => {
  it('aceita rótulos legados do backfill', () => {
    expect(parseRotuloTipologia('casa (provável)')).toBe('casa')
    expect(parseRotuloTipologia('apartamento')).toBe('apartamento')
    expect(parseRotuloTipologia('outro (COMÉRCIO)')).toBe('indefinido')
  })
})

describe('aplicarVerificacaoVisual (AC5)', () => {
  it('reclassifica Cotovia/Pavão do 132 para apartamento', () => {
    const base = classificarTipologia({ sqlCadastral: '4117800485' }) // heurística
    const ov = aplicarVerificacaoVisual(base, '4117800485', VERIFICACAO_VISUAL_ANDRADE_PERTENCE_132)
    expect(ov.tipo).toBe('apartamento')
    expect(ov.fonte).toBe('visual')
    expect(ov.motivos.some((m) => /Cotovia/i.test(m))).toBe(true)
  })
})

describe('filtrarComparaveisPorR5 (AC3)', () => {
  const amostra = [
    {
      endereco: 'Casa Guia',
      usoIptu: 'RESIDÊNCIA',
      padraoIptu: 'HORIZONTAL',
      sqlCadastral: '11111100011',
    },
    {
      endereco: 'AP Complemento',
      complemento: 'AP 31 E 2VG',
      sqlCadastral: '22222200022',
    },
    {
      endereco: 'Anuncio sem tipo',
      // sem guia/sql → indefinido
    },
  ]

  it('sem propertyType → gate inerte', () => {
    const g = filtrarComparaveisPorR5(amostra, null)
    expect(g.relatorio.aplicado).toBe(false)
    expect(g.aceitos).toHaveLength(3)
    expect(g.excluidos).toHaveLength(0)
  })

  it('alvo casa exclui AP e indefinido; aviso misto no compute', () => {
    const g = filtrarComparaveisPorR5(amostra, 'casa')
    expect(g.relatorio.aplicado).toBe(true)
    expect(g.aceitos.map((a) => a.endereco)).toEqual(['Casa Guia'])
    expect(g.excluidos).toHaveLength(2)
    expect(R5_REGRA_UMA_LINHA).toMatch(/R5 Tipologia/)
  })
})

describe('computeLaudo — gate R5 (Story 9.17)', () => {
  it('AC6 — amostra mista dispara TIPOLOGIA_MISTA e exclui AP', () => {
    const comparaveis: AcmComparable[] = [
      {
        endereco: 'CASA-1',
        areaConstruida: 100,
        preco: 1_000_000,
        isVendaReal: true,
        usoIptu: 'RESIDÊNCIA',
        padraoIptu: 'HORIZONTAL',
      },
      {
        endereco: 'CASA-2',
        areaConstruida: 100,
        preco: 1_100_000,
        isVendaReal: true,
        usoIptu: 'RESIDÊNCIA',
      },
      {
        endereco: 'CASA-3',
        areaConstruida: 100,
        preco: 1_050_000,
        isVendaReal: true,
        usoIptu: 'RESIDÊNCIA',
      },
      {
        endereco: 'AP-OUTLIER',
        areaConstruida: 100,
        preco: 5_000_000,
        isVendaReal: true,
        complemento: 'AP 82',
      },
      {
        endereco: 'CASA-4',
        areaConstruida: 100,
        preco: 1_020_000,
        isVendaReal: true,
        usoIptu: 'RESIDÊNCIA',
      },
      {
        endereco: 'CASA-5',
        areaConstruida: 100,
        preco: 990_000,
        isVendaReal: true,
        usoIptu: 'RESIDÊNCIA',
      },
    ]
    const r = computeLaudo({
      target: { areaConstruida: 100, areaTerreno: 200 },
      comparaveis,
      propertyType: 'casa',
    })
    expect(r.r5.aplicado).toBe(true)
    expect(r.excluidosTipologia.some((e) => e.endereco === 'AP-OUTLIER')).toBe(true)
    expect(r.totalComparaveis).toBe(5)
    expect(r.avisos.map((a) => a.codigo)).toContain('TIPOLOGIA_MISTA')
    // mediana não puxada pelo AP de 50k/m²
    expect(r.medianaPrecoM2).toBeLessThan(15_000)
  })

  it('sem propertyType: Honduras âncoras intactas e r5 inerte', () => {
    const r = computeLaudo({
      target: HONDURAS_TARGET,
      comparaveis: HONDURAS_COMPARAVEIS,
      fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
      residual: HONDURAS_RESIDUAL,
    })
    expect(r.r5.aplicado).toBe(false)
    expect(r.excluidosTipologia).toEqual([])
    expect(r.medianaPrecoM2).toBeCloseTo(18_264, 0)
    expect(r.avisos.map((a) => a.codigo)).not.toContain('TIPOLOGIA_MISTA')
  })

  it('override visual exclui edifício classificado como casa por heurística', () => {
    const comparaveis: AcmComparable[] = [
      {
        endereco: 'AV COTOVIA 726',
        areaConstruida: 100,
        preco: 2_000_000,
        isVendaReal: true,
        sqlCadastral: '4117800485',
      },
      {
        endereco: 'CASA OK',
        areaConstruida: 100,
        preco: 1_000_000,
        isVendaReal: true,
        usoIptu: 'RESIDÊNCIA',
      },
    ]
    const r = computeLaudo({
      target: { areaConstruida: 100, areaTerreno: 200 },
      comparaveis,
      propertyType: 'casa',
      verificacaoVisual: VERIFICACAO_VISUAL_ANDRADE_PERTENCE_132,
    })
    expect(r.excluidosTipologia.some((e) => e.endereco === 'AV COTOVIA 726')).toBe(true)
    expect(r.totalComparaveis).toBe(1)
  })
})
