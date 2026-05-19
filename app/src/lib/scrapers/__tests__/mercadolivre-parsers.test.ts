/**
 * Story 7.4 — parseListing + parseDetail + toPropertyEpic7 (AC3/AC4/AC5/AC10).
 *
 * Determinstico: fixtures HTML estaticas. Sem rede, sem clock.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  parseListingPage,
  _isDetailUrl,
  parseDetailPage,
  extractPhone,
  MLB_ID_RE,
  CRECI_TEXT_RE,
  CNPJ_RE,
  BRL_RE,
  AREA_RE,
  toPropertyEpic7,
  buildAdvertiserSignals,
} from '@/lib/scrapers/mercadolivre'
import { detectPhoneType, extractDDD } from '@/lib/scrapers/mercadolivre/toPropertyEpic7'
import { classifyAdvertiser } from '@/lib/scrapers/classify-advertiser'

const FIXTURES = join(__dirname, 'fixtures', 'mercadolivre')

function load(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8')
}

describe('Story 7.4 — parseListingPage', () => {
  const baseUrl =
    'https://imoveis.mercadolivre.com.br/casas/venda/sao-paulo/moema/'

  it('extracts 5 detail URLs from a listing page (AC3)', () => {
    const html = load('listing-page-moema.html')
    const result = parseListingPage(html, baseUrl)
    expect(result.detailUrls).toHaveLength(5)
  })

  it('returns absolute URLs even when href is relative (AC3)', () => {
    const html = load('listing-page-moema.html')
    const result = parseListingPage(html, baseUrl)
    for (const url of result.detailUrls) {
      expect(url.startsWith('https://')).toBe(true)
    }
  })

  it('discovers nextPageUrl from pagination (AC2)', () => {
    const html = load('listing-page-moema.html')
    const result = parseListingPage(html, baseUrl)
    expect(result.nextPageUrl).toContain('_Desde_97')
  })

  it('returns null nextPageUrl when no next button exists', () => {
    const html =
      '<html><body><ol><li><a class="ui-search-link" href="/MLB-9999999999-x">x</a></li></ol></body></html>'
    const result = parseListingPage(html, baseUrl)
    expect(result.nextPageUrl).toBeNull()
  })

  it('deduplicates repeated detail URLs', () => {
    const html =
      '<html><body>' +
      '<a href="https://imoveis.mercadolivre.com.br/MLB-1-x-_JM">a</a>' +
      '<a href="https://imoveis.mercadolivre.com.br/MLB-1-x-_JM">b</a>' +
      '</body></html>'
    const result = parseListingPage(html, baseUrl)
    expect(result.detailUrls).toHaveLength(1)
  })

  it('_isDetailUrl recognizes MLB pattern variants', () => {
    expect(_isDetailUrl('/MLB-1234567')).toBe(true)
    expect(_isDetailUrl('/MLB1234567890')).toBe(true)
    expect(_isDetailUrl('/MLB-1234567-foo-_JM')).toBe(true)
    expect(_isDetailUrl('/ajuda')).toBe(false)
    expect(_isDetailUrl('')).toBe(false)
  })
})

describe('Story 7.4 — parseDetailPage (FISBO fixture)', () => {
  const url = 'https://imoveis.mercadolivre.com.br/MLB-1111111111-apto-moema'
  const html = load('detail-page-fisbo.html')

  it('extracts external_id from URL (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.external_id).toBe('MLB-1111111111')
  })

  it('extracts titulo from JSON-LD (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.titulo).toBe('Apartamento em Moema 120m2')
  })

  it('extracts preco as number from JSON-LD (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.preco).toBe(1250000)
  })

  it('extracts area, quartos, banheiros (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.area_m2).toBe(120)
    expect(r.quartos).toBe(3)
    expect(r.banheiros).toBe(2)
  })

  it('extracts endereco_texto + bairro + cidade (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.endereco_texto).toContain('Rua das Acacias')
    expect(r.bairro).toBe('Moema')
    expect(r.cidade).toBe('SP')
  })

  it('captures nome_anunciante as PF (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.nome_anunciante).toBe('Joao Silva')
  })

  it('captures masked telefone (AC3 + Tech Note Wave A)', () => {
    const r = parseDetailPage(html, url)
    expect(r.telefone_anunciante).toBe('(11) ****-1234')
  })

  it('returns null creci + null cnpj for FISBO (AC4)', () => {
    const r = parseDetailPage(html, url)
    expect(r.creci_anunciante).toBeNull()
    expect(r.cnpj_anunciante).toBeNull()
  })

  it('collects multiple foto URLs from JSON-LD + img tags (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.foto_urls.length).toBeGreaterThanOrEqual(1)
    expect(r.foto_urls.every((u) => u.startsWith('https://'))).toBe(true)
  })
})

describe('Story 7.4 — parseDetailPage (CRECI fixture)', () => {
  const url = 'https://imoveis.mercadolivre.com.br/MLB-2222222222-casa-vo'
  const html = load('detail-page-creci.html')

  it('extracts CRECI 12345-F via regex (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.creci_anunciante).toBe('12345-F')
  })

  it('extracts mobile phone (digit 9) (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.telefone_anunciante).toBe('(11) 91234-5678')
  })

  it('extracts whatsapp from wa.me link (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.whatsapp_anunciante).toBe('5511912345678')
  })

  it('nome_anunciante is 3-word PF (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.nome_anunciante).toBe('Maria Helena Souza')
  })
})

describe('Story 7.4 — parseDetailPage (CNPJ fixture)', () => {
  const url = 'https://imoveis.mercadolivre.com.br/MLB-3333333333-cobertura'
  const html = load('detail-page-cnpj.html')

  it('extracts CNPJ as 14 digits clean (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.cnpj_anunciante).toBe('12345678000199')
  })

  it('detects PJ name (Construtora Exemplo LTDA) (AC3)', () => {
    const r = parseDetailPage(html, url)
    expect(r.nome_anunciante).toBe('Construtora Exemplo LTDA')
  })

  it('infers is_new_construction from description', () => {
    const r = parseDetailPage(html, url)
    const env = toPropertyEpic7(r, url)
    expect(env.home_flags.is_new_construction).toBe(true)
  })
})

describe('Story 7.4 — regex primitives', () => {
  it('MLB_ID_RE matches typical URLs', () => {
    expect(MLB_ID_RE.exec('/MLB-1234567')?.[1]).toBe('1234567')
    expect(MLB_ID_RE.exec('MLB987654321')?.[1]).toBe('987654321')
  })

  it('CRECI_TEXT_RE handles variants', () => {
    expect(CRECI_TEXT_RE.exec('CRECI 12345')?.[1]).toBe('12345')
    expect(CRECI_TEXT_RE.exec('CRECI: 12345-F')?.[1]).toBe('12345-F')
    expect(CRECI_TEXT_RE.exec('creci 99999')?.[1]).toBe('99999')
  })

  it('CNPJ_RE matches masked + unmasked', () => {
    expect(CNPJ_RE.exec('12.345.678/0001-99')).toBeTruthy()
    expect(CNPJ_RE.exec('12345678000199')).toBeTruthy()
    expect(CNPJ_RE.exec('not a cnpj')).toBeNull()
  })

  it('BRL_RE parses BRL strings', () => {
    expect(BRL_RE.exec('R$ 1.250.000')?.[1]).toBe('1.250.000')
    expect(BRL_RE.exec('R$ 500')?.[1]).toBe('500')
  })

  it('AREA_RE handles m² and m2 variants', () => {
    expect(AREA_RE.exec('120 m²')?.[1]).toBe('120')
    expect(AREA_RE.exec('80m2')?.[1]).toBe('80')
  })

  it('extractPhone handles masked + clean', () => {
    expect(extractPhone('(11) ****-1234')).toBe('(11) ****-1234')
    expect(extractPhone('(11) 91234-5678')).toBe('(11) 91234-5678')
    expect(extractPhone('no phone')).toBeNull()
  })
})

describe('Story 7.4 — toPropertyEpic7 envelope (AC4)', () => {
  const url = 'https://imoveis.mercadolivre.com.br/MLB-1111111111-apto'

  it('produces PropertyEpic7 with portal=mercadolivre', () => {
    const parsed = parseDetailPage(load('detail-page-fisbo.html'), url)
    const env = toPropertyEpic7(parsed, url)
    expect(env.portal).toBe('mercadolivre')
    expect(env.external_id).toBe('MLB-1111111111')
    expect(env.url).toBe(url)
  })

  it('sets is_pf_disclosed when nome is PF + no CNPJ', () => {
    const parsed = parseDetailPage(load('detail-page-fisbo.html'), url)
    const env = toPropertyEpic7(parsed, url)
    expect(env.home_flags.is_pf_disclosed).toBe(true)
    expect(env.home_flags.is_pj_disclosed).toBe(false)
  })

  it('sets is_pj_disclosed when CNPJ present', () => {
    const url2 = 'https://imoveis.mercadolivre.com.br/MLB-3333333333-cobertura'
    const parsed = parseDetailPage(load('detail-page-cnpj.html'), url2)
    const env = toPropertyEpic7(parsed, url2)
    expect(env.home_flags.is_pj_disclosed).toBe(true)
    expect(env.advertisers?.broker?.cnpj).toBe('12345678000199')
  })

  it('populates agent slot when CRECI present', () => {
    const url2 = 'https://imoveis.mercadolivre.com.br/MLB-2222222222-casa-vo'
    const parsed = parseDetailPage(load('detail-page-creci.html'), url2)
    const env = toPropertyEpic7(parsed, url2)
    expect(env.advertisers?.agent).not.toBeNull()
    expect(env.advertisers?.agent?.creci).toBe('12345-F')
    expect(env.advertisers?.agent?.name).toBe('Maria Helena Souza')
  })

  it('classification + confidence start as unknown / 0 (caller fills)', () => {
    const parsed = parseDetailPage(load('detail-page-fisbo.html'), url)
    const env = toPropertyEpic7(parsed, url)
    expect(env.advertisers?.classification).toBe('unknown')
    expect(env.advertisers?.classification_confidence).toBe(0)
  })
})

describe('Story 7.4 — buildAdvertiserSignals + FISBO wiring (AC5)', () => {
  it('FISBO fixture produces 4-signal -> for_sale_by_owner via classifier', () => {
    const url = 'https://imoveis.mercadolivre.com.br/MLB-1111111111'
    const parsed = parseDetailPage(load('detail-page-fisbo.html'), url)
    // Telefone mascarado -> phoneType unknown. Forçamos mobile pra simular
    // o caller que ja resolveu via outra fonte (Wave A captura DDD; mobile
    // e signal default per fixture intent).
    const signals = buildAdvertiserSignals(parsed, {
      phoneType: 'mobile',
      listingCountByPhone: 1,
    })
    expect(signals.hasCRECI).toBe(false)
    expect(signals.nameAppearsPersonal).toBe(true)
    expect(signals.phoneType).toBe('mobile')
    expect(signals.listingCountByPhone).toBe(1)

    const cls = classifyAdvertiser(signals)
    expect(cls.classification).toBe('for_sale_by_owner')
    expect(cls.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('CRECI fixture produces classification=agent (no CNPJ branch)', () => {
    const url = 'https://imoveis.mercadolivre.com.br/MLB-2222222222'
    const parsed = parseDetailPage(load('detail-page-creci.html'), url)
    const signals = buildAdvertiserSignals(parsed)
    expect(signals.hasCRECI).toBe(true)
    const cls = classifyAdvertiser(signals)
    expect(cls.classification).toBe('agent')
  })

  it('CNPJ fixture without CNAE -> unknown (lookupCNAE is caller-side)', () => {
    const url = 'https://imoveis.mercadolivre.com.br/MLB-3333333333'
    const parsed = parseDetailPage(load('detail-page-cnpj.html'), url)
    const signals = buildAdvertiserSignals(parsed)
    expect(signals.cnpj).toBe('12345678000199')
    expect(signals.cnae).toBeUndefined()
    const cls = classifyAdvertiser(signals)
    // Sem CNAE resolvido, cai no fallback unknown (per ADR-EPIC7-004).
    expect(cls.classification).toBe('unknown')
  })

  it('detectPhoneType distinguishes mobile/landline/unknown', () => {
    expect(detectPhoneType('(11) 91234-5678')).toBe('mobile')
    expect(detectPhoneType('(11) 3000-4000')).toBe('landline')
    expect(detectPhoneType('(11) ****-1234')).toBe('unknown')
    expect(detectPhoneType(null)).toBe('unknown')
  })

  it('extractDDD captures 2-digit prefix', () => {
    expect(extractDDD('(11) 91234-5678')).toBe('11')
    expect(extractDDD('(21) 3000-4000')).toBe('21')
    expect(extractDDD(null)).toBeUndefined()
  })
})
