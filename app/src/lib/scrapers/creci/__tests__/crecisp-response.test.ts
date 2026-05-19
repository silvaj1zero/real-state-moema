/**
 * Epic 7 Story 7.7 — CRECI SP HTML parser tests.
 *
 * Cobre BR-CRECISP-001 (AC10):
 *  - Response com falha reCAPTCHA -> errorCode='crecisp_unavailable'
 *  - Response sem link corretordetalhes -> errorCode='crecisp_not_found'
 *  - HTML vazio -> errorCode='crecisp_invalid_html'
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCRECISPResponse } from '@/lib/scrapers/creci/parsers/crecisp-response'

const FIXTURE_DIR = join(__dirname, '__fixtures__')
const fx = (name: string) =>
  readFileSync(join(FIXTURE_DIR, name), 'utf-8')

describe('parseCRECISPResponse', () => {
  it('detecta falha de reCAPTCHA -> crecisp_unavailable', () => {
    const html = fx('crecisp-recaptcha-fail.html')
    const result = parseCRECISPResponse(html)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe('crecisp_unavailable')
    }
  })

  it('HTML sem link de detalhes -> crecisp_not_found', () => {
    const html = fx('crecisp-not-found.html')
    const result = parseCRECISPResponse(html)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe('crecisp_not_found')
    }
  })

  it('HTML vazio -> crecisp_invalid_html', () => {
    const result = parseCRECISPResponse('')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe('crecisp_invalid_html')
    }
  })

  it('detecta "Validacao reCAPTCHA" (sem cedilha) tambem', () => {
    const html = '<html><body>Erro: Validacao reCAPTCHA falhou</body></html>'
    const result = parseCRECISPResponse(html)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errorCode).toBe('crecisp_unavailable')
    }
  })

  it('detecta multiplas variantes do marker reCAPTCHA', () => {
    const samples = [
      'Validação reCAPTCHA',
      'reCAPTCHA Enterprise validation failed',
      'erro na validação do capatcha',
    ]
    for (const marker of samples) {
      const html = `<html><body><p>${marker}</p></body></html>`
      const r = parseCRECISPResponse(html)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.errorCode).toBe('crecisp_unavailable')
    }
  })
})
