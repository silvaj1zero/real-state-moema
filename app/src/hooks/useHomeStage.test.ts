import { describe, it, expect } from 'vitest'
import { DEFAULT_RULES, TIPOLOGIA_TIPS, buildWhatsAppUrl } from './useHomeStage'

describe('Home Staging', () => {
  it('should have 3 default rules', () => {
    expect(DEFAULT_RULES).toHaveLength(3)
    expect(DEFAULT_RULES[0].id).toBe('despersonalize')
    expect(DEFAULT_RULES[1].id).toBe('ilumine')
    expect(DEFAULT_RULES[2].id).toBe('organize')
  })

  it('should have 4 tipologia tips', () => {
    expect(Object.keys(TIPOLOGIA_TIPS)).toHaveLength(4)
    expect(TIPOLOGIA_TIPS.apartamento).toContain('varanda')
    expect(TIPOLOGIA_TIPS.casa).toContain('gramado')
    expect(TIPOLOGIA_TIPS.comercial).toContain('neutro')
    expect(TIPOLOGIA_TIPS.cobertura).toContain('Terraço')
  })

  it('should build WhatsApp URL correctly', () => {
    const url = buildWhatsAppUrl('11999999999', 'João', 'Rua X, 100')
    expect(url).toContain('https://wa.me/5511999999999')
    expect(url).toContain('Jo%C3%A3o')
  })

  it('should return null if no phone', () => {
    expect(buildWhatsAppUrl(null, 'João', 'Rua X')).toBeNull()
  })

  it('should handle phone already with country code', () => {
    const url = buildWhatsAppUrl('5511999999999', 'Maria', 'Rua Y')
    expect(url).toContain('https://wa.me/5511999999999')
  })
})
