/**
 * LGPD crypto facade tests — Story 7.10.
 *
 * `lgpd-crypto.ts` e um re-export do `vault.ts` (decisao documentada no
 * Dev Agent Record). Estes testes garantem que a fachada exporta as
 * mesmas funcoes (mesma referencia/identidade) — qualquer divergencia
 * acidental durante refactor falha aqui.
 */

import { describe, it, expect } from 'vitest'

import * as crypto from '@/lib/lgpd-crypto'
import * as vault from '@/lib/vault'

describe('lgpd-crypto facade', () => {
  it('re-exports encryptLeadField as storeLeadPII from vault', () => {
    expect(crypto.encryptLeadField).toBe(vault.storeLeadPII)
  })

  it('re-exports decryptLeadField as getLeadPII from vault', () => {
    expect(crypto.decryptLeadField).toBe(vault.getLeadPII)
  })

  it('re-exports encryptLeadFieldsBatch as storeLeadPIIBatch from vault', () => {
    expect(crypto.encryptLeadFieldsBatch).toBe(vault.storeLeadPIIBatch)
  })

  it('exposes all three facade entrypoints used by downstream stories (7.4)', () => {
    expect(typeof crypto.encryptLeadField).toBe('function')
    expect(typeof crypto.decryptLeadField).toBe('function')
    expect(typeof crypto.encryptLeadFieldsBatch).toBe('function')
  })
})
