/**
 * classify-anuncio boundary contract tests — Story 7.6 AC6.
 *
 * Validates the Wave A response shape: every field MUST be present, urgency
 * and motivation MUST be null, source MUST be 'deterministic_v1'. Wave B will
 * replace the response body but consumers branch on `source`, so this test is
 * the contract guard.
 *
 * Mirrors `supabase/functions/classify-anuncio/index.ts`. Drift between the
 * Edge Function file and this contract module is a constitution violation
 * (Article IV — No Invention: the OpenAPI spec is the law).
 */

import { describe, it, expect } from 'vitest'

import {
  validateInput,
  classifyAnuncioWaveA,
  type ClassifyAnuncioInput,
} from '@/lib/edge-contracts/classify-anuncio'

describe('classify-anuncio — Wave A boundary contract', () => {
  describe('validateInput', () => {
    it('accepts a valid payload', () => {
      const r = validateInput({
        listing_id: '11111111-2222-3333-4444-555555555555',
        text: 'Apartamento em Moema, urgente vender',
      })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.listing_id).toBe('11111111-2222-3333-4444-555555555555')
        expect(r.value.text).toContain('Moema')
      }
    })

    it('rejects non-object body', () => {
      const r = validateInput(null)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('body_must_be_object')
    })

    it('rejects non-UUID listing_id', () => {
      const r = validateInput({ listing_id: 'not-a-uuid', text: 'oi' })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('listing_id_must_be_uuid')
    })

    it('rejects missing text', () => {
      const r = validateInput({
        listing_id: '11111111-2222-3333-4444-555555555555',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toBe('text_must_be_string')
    })

    it('accepts empty string text (Wave B may want signal=null)', () => {
      const r = validateInput({
        listing_id: '11111111-2222-3333-4444-555555555555',
        text: '',
      })
      expect(r.ok).toBe(true)
    })
  })

  describe('classifyAnuncioWaveA', () => {
    const input: ClassifyAnuncioInput = {
      listing_id: '11111111-2222-3333-4444-555555555555',
      text: 'Apartamento urgentissimo vendedor mudando pra Europa',
    }

    it('returns deterministic_v1 source', () => {
      const out = classifyAnuncioWaveA(input)
      expect(out.source).toBe('deterministic_v1')
    })

    it('returns null urgency_signal (Wave A boundary)', () => {
      const out = classifyAnuncioWaveA(input)
      expect(out.urgency_signal).toBeNull()
    })

    it('returns null motivation_hint (Wave A boundary)', () => {
      const out = classifyAnuncioWaveA(input)
      expect(out.motivation_hint).toBeNull()
    })

    it('keeps shape stable across multiple calls (idempotent)', () => {
      const out1 = classifyAnuncioWaveA(input)
      const out2 = classifyAnuncioWaveA(input)
      expect(out2).toEqual(out1)
    })

    it('shape matches the OpenAPI required field set exactly', () => {
      const out = classifyAnuncioWaveA(input)
      const keys = Object.keys(out).sort()
      expect(keys).toEqual(['motivation_hint', 'source', 'urgency_signal'])
    })

    it('source enum is one of the two contract values', () => {
      const out = classifyAnuncioWaveA(input)
      expect(['deterministic_v1', 'langgraph_subgraph_v1']).toContain(out.source)
    })

    it('does not leak input text into output (no echo)', () => {
      const out = classifyAnuncioWaveA(input)
      const serialised = JSON.stringify(out)
      expect(serialised).not.toContain('Europa')
    })
  })
})
