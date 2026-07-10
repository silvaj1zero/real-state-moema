import { describe, it, expect } from 'vitest'
import { extractLeadPII, buildLeadInsert } from './useCaptarFromSearch'
import type { ScrapedListingParametric } from '@/lib/supabase/types'

// Fixture mínima — só os campos consumidos pelos helpers puros. Cast porque o
// tipo completo tem ~30 campos irrelevantes para estes testes.
function makeListing(overrides: Partial<ScrapedListingParametric> = {}): ScrapedListingParametric {
  return {
    id: 'listing-1',
    portal: 'zap',
    tipo_anunciante: 'proprietario',
    endereco: 'Rua Tuim, 100, Moema',
    nome_anunciante: 'Maria Souza',
    telefone_anunciante: '11987654321',
    email_anunciante: 'maria@example.com',
    whatsapp_anunciante: '11987654321',
    is_fisbo: true,
    preco: 1200000,
    area_m2: 80,
    url: 'https://zap.com/anuncio/1',
    matched_edificio_id: null,
    ...overrides,
  } as ScrapedListingParametric
}

describe('extractLeadPII', () => {
  it('extrai telefone, email e whatsapp quando presentes', () => {
    expect(extractLeadPII(makeListing())).toEqual({
      telefone: '11987654321',
      email: 'maria@example.com',
      whatsapp: '11987654321',
    })
  })

  it('omite campos ausentes (não inclui chaves com null/vazio)', () => {
    const pii = extractLeadPII(
      makeListing({ telefone_anunciante: '11999998888', email_anunciante: null, whatsapp_anunciante: null }),
    )
    expect(pii).toEqual({ telefone: '11999998888' })
    expect('email' in pii).toBe(false)
    expect('whatsapp' in pii).toBe(false)
  })

  it('retorna objeto vazio quando não há nenhuma PII', () => {
    expect(
      extractLeadPII(makeListing({ telefone_anunciante: null, email_anunciante: null, whatsapp_anunciante: null })),
    ).toEqual({})
  })
})

describe('buildLeadInsert', () => {
  const at = '2026-06-22T12:00:00.000Z'

  it('NÃO inclui colunas PII em claro (telefone/email) — quebram em PROD', () => {
    const insert = buildLeadInsert(makeListing(), 'consultant-1', null, 'search-1', at, 'nota')
    expect('telefone' in insert).toBe(false)
    expect('email' in insert).toBe(false)
  })

  it('vincula o anúncio de origem via scraped_listing_id (dedup determinístico)', () => {
    const insert = buildLeadInsert(makeListing({ id: 'abc' }), 'consultant-1', null, null, at, 'nota')
    expect(insert.scraped_listing_id).toBe('abc')
  })

  it('preenche campos válidos em PROD (nome, origem, etapa, notas, enrichment_data)', () => {
    const insert = buildLeadInsert(makeListing(), 'consultant-1', 'edificio-9', 'search-1', at, 'minha nota')
    expect(insert.consultant_id).toBe('consultant-1')
    expect(insert.nome).toBe('Maria Souza')
    expect(insert.edificio_id).toBe('edificio-9')
    expect(insert.origem).toBe('fisbo_scraping')
    expect(insert.etapa_funil).toBe('contato')
    expect(insert.is_fisbo).toBe(true)
    expect(insert.notas).toBe('minha nota')
    expect(insert.enrichment_data).toMatchObject({
      source_search_id: 'search-1',
      source_listing_id: 'listing-1',
      portal: 'zap',
      captured_at: at,
    })
  })

  it('gera nome de fallback a partir do endereço quando nome_anunciante é nulo', () => {
    const insert = buildLeadInsert(makeListing({ nome_anunciante: null }), 'c1', null, null, at, 'n')
    expect(insert.nome).toBe('Proprietario - Rua Tuim')
  })

  it('marca is_fisbo quando tipo_anunciante é proprietario mesmo com is_fisbo=false', () => {
    const insert = buildLeadInsert(
      makeListing({ is_fisbo: false, tipo_anunciante: 'proprietario' }),
      'c1',
      null,
      null,
      at,
      'n',
    )
    expect(insert.is_fisbo).toBe(true)
  })
})
