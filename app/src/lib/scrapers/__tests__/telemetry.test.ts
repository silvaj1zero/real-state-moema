/**
 * Telemetry tests — AC3 + AC7.
 *
 * Cobre:
 *  - startRun cria row em crawl_runs e retorna UUID
 *  - recordRequest persiste em crawl_requests (fire-and-forget)
 *  - recordFailure persiste em crawl_failures
 *  - snapshot retorna contadores in-memory corretos
 *  - finishRun atualiza crawl_runs com status + counters
 *  - erros em insert sao logados, nao propagados (fire-and-forget)
 *  - chamadas antes de startRun sao ignoradas com log
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  Telemetry,
  isBlockStatus,
  type TelemetryClient,
  type CrawlRunInsert,
  type CrawlRequestInsert,
  type CrawlFailureInsert,
  type CrawlRunSnapshot,
} from '@/lib/scrapers/telemetry'

class InMemoryTelemetryClient implements TelemetryClient {
  runs: Array<CrawlRunInsert & { id: string }> = []
  requests: CrawlRequestInsert[] = []
  failures: CrawlFailureInsert[] = []
  updates: Array<{ id: string; patch: Partial<CrawlRunInsert> }> = []
  failNext: 'request' | 'failure' | null = null

  async insertRun(row: CrawlRunInsert): Promise<{ id: string }> {
    const id = `run-${this.runs.length + 1}`
    this.runs.push({ ...row, id })
    return { id }
  }

  async updateRun(id: string, patch: Partial<CrawlRunInsert>): Promise<void> {
    this.updates.push({ id, patch })
    const idx = this.runs.findIndex((r) => r.id === id)
    if (idx >= 0) this.runs[idx] = { ...this.runs[idx], ...patch }
  }

  async insertRequest(row: CrawlRequestInsert): Promise<void> {
    if (this.failNext === 'request') {
      this.failNext = null
      throw new Error('simulated insert failure')
    }
    this.requests.push(row)
  }

  async insertFailure(row: CrawlFailureInsert): Promise<void> {
    if (this.failNext === 'failure') {
      this.failNext = null
      throw new Error('simulated failure-insert failure')
    }
    this.failures.push(row)
  }

  async fetchRun(id: string): Promise<CrawlRunSnapshot | null> {
    const r = this.runs.find((x) => x.id === id)
    if (!r) return null
    return {
      run_id: r.id,
      portal: r.portal,
      status: r.status,
      requests_finished: r.requests_finished ?? 0,
      requests_failed: r.requests_failed ?? 0,
      started_at: r.started_at ?? '',
      finished_at: r.finished_at ?? null,
    }
  }
}

// Helper: deixa o microtask de fire-and-forget drenar antes do assert.
async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

let client: InMemoryTelemetryClient
let logs: Array<{ msg: string; err?: unknown }>
let tel: Telemetry

beforeEach(() => {
  client = new InMemoryTelemetryClient()
  logs = []
  tel = new Telemetry({
    client,
    logger: (msg, err) => logs.push({ msg, err }),
  })
})

describe('Telemetry constructor', () => {
  it('throws when neither client nor URL+key supplied', () => {
    expect(() => new Telemetry()).toThrow(/client/i)
  })

  it('accepts custom client', () => {
    expect(tel).toBeInstanceOf(Telemetry)
  })
})

describe('startRun', () => {
  it('inserts a running crawl_run and returns id', async () => {
    const id = await tel.startRun('mercadolivre')
    expect(id).toBe('run-1')
    expect(client.runs).toHaveLength(1)
    expect(client.runs[0]).toMatchObject({
      portal: 'mercadolivre',
      status: 'running',
      requests_finished: 0,
      requests_failed: 0,
    })
    expect(client.runs[0].started_at).toBeTruthy()
  })

  it('resets counters when called twice', async () => {
    await tel.startRun('zap')
    tel.recordRequest('https://a.test', 200, 50)
    tel.recordRequest('https://b.test', 200, 50)
    await flushMicrotasks()
    expect(tel.snapshot().requests_finished).toBe(2)

    await tel.startRun('olx')
    expect(tel.snapshot().requests_finished).toBe(0)
  })
})

describe('recordRequest', () => {
  it('increments counter and persists row', async () => {
    await tel.startRun('zap')
    tel.recordRequest('https://example.com/listing/1', 200, 123, 0)
    await flushMicrotasks()

    expect(tel.snapshot().requests_finished).toBe(1)
    expect(client.requests).toHaveLength(1)
    expect(client.requests[0]).toMatchObject({
      portal: 'zap',
      url: 'https://example.com/listing/1',
      status_code: 200,
      duration_ms: 123,
      retries: 0,
    })
  })

  it('is fire-and-forget on insert error — does not throw', async () => {
    await tel.startRun('zap')
    client.failNext = 'request'
    expect(() => tel.recordRequest('https://a.test', 200, 10)).not.toThrow()
    await flushMicrotasks()
    expect(logs.some((l) => /recordRequest insert failed/.test(l.msg))).toBe(true)
  })

  it('ignored when called before startRun', () => {
    tel.recordRequest('https://a.test', 200, 10)
    expect(client.requests).toHaveLength(0)
    expect(logs.some((l) => /before startRun/.test(l.msg))).toBe(true)
  })

  it('snapshot avg_duration_ms reflects all durations', async () => {
    await tel.startRun('zap')
    tel.recordRequest('https://a.test', 200, 100)
    tel.recordRequest('https://b.test', 200, 200)
    tel.recordRequest('https://c.test', 200, 300)
    expect(tel.snapshot().avg_duration_ms).toBe(200)
  })

  it('avg_duration_ms is null with no durations', async () => {
    await tel.startRun('zap')
    expect(tel.snapshot().avg_duration_ms).toBeNull()
  })
})

describe('recordFailure', () => {
  it('increments counter and persists row', async () => {
    await tel.startRun('vivareal')
    tel.recordFailure('https://x.test', 'boom', 'Error: boom\n  at foo')
    await flushMicrotasks()

    expect(tel.snapshot().requests_failed).toBe(1)
    expect(client.failures[0]).toMatchObject({
      portal: 'vivareal',
      url: 'https://x.test',
      error_message: 'boom',
      error_stack: 'Error: boom\n  at foo',
    })
  })

  it('is fire-and-forget on insert error', async () => {
    await tel.startRun('vivareal')
    client.failNext = 'failure'
    expect(() => tel.recordFailure('https://x.test', 'boom')).not.toThrow()
    await flushMicrotasks()
    expect(logs.some((l) => /recordFailure insert failed/.test(l.msg))).toBe(true)
  })
})

describe('finishRun', () => {
  it('updates crawl_run with status, finished_at, counters', async () => {
    await tel.startRun('olx')
    tel.recordRequest('https://a.test', 200, 100)
    tel.recordRequest('https://b.test', 200, 200)
    tel.recordFailure('https://c.test', 'oops')
    await flushMicrotasks()
    await tel.finishRun('completed')

    expect(client.updates).toHaveLength(1)
    const u = client.updates[0]
    expect(u.id).toBe('run-1')
    expect(u.patch).toMatchObject({
      status: 'completed',
      requests_finished: 2,
      requests_failed: 1,
      avg_duration_ms: 150,
    })
    expect(u.patch.finished_at).toBeTruthy()
    expect(u.patch.error_message).toBeNull()
  })

  it('records error_message when status=failed', async () => {
    await tel.startRun('zap')
    await tel.finishRun('failed', 'budget exceeded')
    expect(client.updates[0].patch.status).toBe('failed')
    expect(client.updates[0].patch.error_message).toBe('budget exceeded')
  })

  it('is idempotent — does nothing if no active run', async () => {
    await tel.finishRun('completed')
    expect(client.updates).toHaveLength(0)
  })
})

describe('fetchRunSnapshot', () => {
  it('returns null when no active run', async () => {
    const snap = await tel.fetchRunSnapshot()
    expect(snap).toBeNull()
  })

  it('returns DB row for active run', async () => {
    await tel.startRun('mercadolivre')
    const snap = await tel.fetchRunSnapshot()
    expect(snap?.portal).toBe('mercadolivre')
    expect(snap?.status).toBe('running')
  })
})

// ---------------------------------------------------------------------------
// Story 7.12 AC4 — block-rate (403/503 + anti-bot)
// ---------------------------------------------------------------------------

describe('isBlockStatus — Story 7.12 AC4', () => {
  it.each([
    [403, true],
    [503, true],
    [200, false],
    [404, false],
    [429, false],
    [null, false],
    [undefined, false],
  ])('status %s -> %s', (code, expected) => {
    expect(isBlockStatus(code as number | null | undefined)).toBe(expected)
  })
})

describe('block-rate telemetry — Story 7.12 AC4', () => {
  it('recordRequest com 403/503 conta como bloqueio', async () => {
    await tel.startRun('zap')
    tel.recordRequest('https://a.test', 200, 50)
    tel.recordRequest('https://b.test', 403, 50)
    tel.recordRequest('https://c.test', 503, 50)
    await flushMicrotasks()

    const snap = tel.snapshot()
    expect(snap.requests_finished).toBe(3)
    expect(snap.requests_blocked).toBe(2)
    expect(snap.block_rate).toBeCloseTo(2 / 3, 5)
  })

  it('recordFailure com {blocked:true} (anti-bot 503) conta como bloqueio', async () => {
    await tel.startRun('vivareal')
    tel.recordRequest('https://ok.test', 200, 30)
    tel.recordFailure('https://blocked.test', 'Anti-bot detected (cloudflare-503)', null, {
      blocked: true,
    })
    await flushMicrotasks()

    const snap = tel.snapshot()
    expect(snap.requests_failed).toBe(1)
    expect(snap.requests_blocked).toBe(1)
    // 1 bloqueio / 2 tentativas (1 finished + 1 failed)
    expect(snap.block_rate).toBeCloseTo(0.5, 5)
  })

  it('recordFailure sem blocked NAO conta como bloqueio (regressao)', async () => {
    await tel.startRun('zap')
    tel.recordFailure('https://x.test', 'parse failed')
    await flushMicrotasks()
    const snap = tel.snapshot()
    expect(snap.requests_failed).toBe(1)
    expect(snap.requests_blocked).toBe(0)
    expect(snap.block_rate).toBe(0)
  })

  it('block_rate null quando nao ha tentativas', async () => {
    await tel.startRun('zap')
    expect(tel.snapshot().block_rate).toBeNull()
  })

  it('startRun reseta o contador de bloqueio', async () => {
    await tel.startRun('zap')
    tel.recordRequest('https://a.test', 403, 50)
    await flushMicrotasks()
    expect(tel.snapshot().requests_blocked).toBe(1)

    await tel.startRun('vivareal')
    expect(tel.snapshot().requests_blocked).toBe(0)
  })
})

describe('logger override', () => {
  it('uses console.error by default', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const t = new Telemetry({ client: new InMemoryTelemetryClient() })
    t.recordRequest('https://a.test', 200, 10) // before startRun → logs
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
