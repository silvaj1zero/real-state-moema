/**
 * Epic 7 Story 7.7 — robots.txt parser + check tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isAllowedByRobotsTxt,
  parseRobotsTxt,
  clearRobotsCache,
} from '@/lib/scrapers/creci/robots-check'

describe('parseRobotsTxt', () => {
  it('coleta Disallow paths para user-agent *', () => {
    const txt = `
      User-agent: *
      Disallow: /admin
      Disallow: /private
      Allow: /public
    `
    const disallowed = parseRobotsTxt(txt, '*')
    expect(disallowed).toContain('/admin')
    expect(disallowed).toContain('/private')
  })

  it('ignora linhas comentadas', () => {
    const txt = `
      # comentario
      User-agent: *
      # Disallow: /should-be-ignored
      Disallow: /real
    `
    const result = parseRobotsTxt(txt, '*')
    expect(result).toEqual(['/real'])
  })

  it('matching de user-agent especifico ainda funciona para *', () => {
    const txt = `
      User-agent: Mozilla
      Disallow: /m
    `
    const result = parseRobotsTxt(txt, 'mozilla')
    expect(result).toContain('/m')
  })
})

describe('isAllowedByRobotsTxt', () => {
  beforeEach(() => {
    clearRobotsCache()
  })

  it('graceful fallback: 404 -> allowed', async () => {
    const fakeFetch = vi.fn(async () =>
      ({ ok: false, status: 404 }) as unknown as Response,
    )
    const allowed = await isAllowedByRobotsTxt(
      'https://example.com/foo',
      { fetchImpl: fakeFetch as unknown as typeof fetch },
    )
    expect(allowed).toBe(true)
  })

  it('graceful fallback: fetch throws -> allowed', async () => {
    const fakeFetch = vi.fn(async () => {
      throw new Error('network error')
    })
    const allowed = await isAllowedByRobotsTxt(
      'https://example.com/foo',
      { fetchImpl: fakeFetch as unknown as typeof fetch },
    )
    expect(allowed).toBe(true)
  })

  it('Disallow /admin bloqueia /admin/foo', async () => {
    const fakeFetch = vi.fn(async () =>
      ({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /admin\n',
      }) as unknown as Response,
    )
    const allowed = await isAllowedByRobotsTxt(
      'https://example.com/admin/foo',
      { fetchImpl: fakeFetch as unknown as typeof fetch },
    )
    expect(allowed).toBe(false)
  })

  it('Permite path nao listado', async () => {
    const fakeFetch = vi.fn(async () =>
      ({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /admin\n',
      }) as unknown as Response,
    )
    const allowed = await isAllowedByRobotsTxt(
      'https://example.com/public',
      { fetchImpl: fakeFetch as unknown as typeof fetch },
    )
    expect(allowed).toBe(true)
  })

  it('cache deduplica multiplas chamadas', async () => {
    const fakeFetch = vi.fn(async () =>
      ({
        ok: true,
        text: async () => 'User-agent: *\nDisallow: /a\n',
      }) as unknown as Response,
    )
    await isAllowedByRobotsTxt('https://example.com/p1', {
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    await isAllowedByRobotsTxt('https://example.com/p2', {
      fetchImpl: fakeFetch as unknown as typeof fetch,
    })
    expect(fakeFetch).toHaveBeenCalledTimes(1)
  })
})
