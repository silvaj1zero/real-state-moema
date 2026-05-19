/**
 * Epic 7 Story 7.7 — CaptchaBudgetGuard tests.
 *
 * Cobre AC8:
 *  - Reject quando sum(month) + estimated > budget
 *  - Circuit-breaker: 5 falhas em 1min -> suspend 10min
 *  - Reset de falhas em sucesso
 */

import { describe, it, expect, vi } from 'vitest'
import {
  CaptchaBudgetGuard,
  BudgetExceededError,
  CircuitOpenError,
  type CaptchaSpendStore,
} from '@/lib/scrapers/creci/captcha-budget'

function makeStore(initial = 0): CaptchaSpendStore & { spent: number } {
  return {
    spent: initial,
    async monthlyTotalBrl() {
      return this.spent
    },
    async record(cost: number) {
      this.spent += cost
    },
  }
}

describe('CaptchaBudgetGuard', () => {
  it('permite solve quando dentro do budget', async () => {
    const store = makeStore(0)
    const guard = new CaptchaBudgetGuard({
      store,
      monthlyBudgetBrl: 200,
      usdToBrlRate: 5,
    })
    await expect(guard.assertAvailable(0.001)).resolves.toBeUndefined()
  })

  it('bloqueia quando sum + estimated > budget', async () => {
    const store = makeStore(199.99)
    const guard = new CaptchaBudgetGuard({
      store,
      monthlyBudgetBrl: 200,
      usdToBrlRate: 5,
    })
    // 0.01 USD * 5 = 0.05 BRL -> 199.99 + 0.05 > 200
    await expect(guard.assertAvailable(0.01)).rejects.toBeInstanceOf(
      BudgetExceededError,
    )
  })

  it('recordSuccess persiste cost e reseta falhas', async () => {
    const store = makeStore(0)
    const guard = new CaptchaBudgetGuard({
      store,
      monthlyBudgetBrl: 200,
      usdToBrlRate: 5,
    })
    guard.recordFailure()
    guard.recordFailure()
    await guard.recordSuccess(0.002) // 0.01 BRL
    expect(store.spent).toBeCloseTo(0.01)
  })

  it('circuit-breaker abre apos 5 falhas em 1 min', async () => {
    let nowMs = 1_000_000
    const store = makeStore(0)
    const guard = new CaptchaBudgetGuard({
      store,
      monthlyBudgetBrl: 200,
      breakerThreshold: 5,
      breakerWindowMs: 60_000,
      breakerSuspendMs: 600_000,
      now: () => nowMs,
    })

    for (let i = 0; i < 5; i++) {
      guard.recordFailure()
      nowMs += 1_000 // espaca 1s
    }
    await expect(guard.assertAvailable(0.001)).rejects.toBeInstanceOf(
      CircuitOpenError,
    )
  })

  it('circuit-breaker NAO abre se falhas espacadas alem da janela', async () => {
    let nowMs = 0
    const store = makeStore(0)
    const guard = new CaptchaBudgetGuard({
      store,
      monthlyBudgetBrl: 200,
      breakerThreshold: 5,
      breakerWindowMs: 60_000,
      breakerSuspendMs: 600_000,
      now: () => nowMs,
    })
    for (let i = 0; i < 10; i++) {
      guard.recordFailure()
      nowMs += 30_000 // 30s entre falhas -> sai da janela
    }
    await expect(guard.assertAvailable(0.001)).resolves.toBeUndefined()
  })

  it('apos suspendMs, circuit fecha novamente', async () => {
    let nowMs = 1_000_000
    const store = makeStore(0)
    const guard = new CaptchaBudgetGuard({
      store,
      monthlyBudgetBrl: 200,
      breakerThreshold: 3,
      breakerWindowMs: 60_000,
      breakerSuspendMs: 10_000,
      now: () => nowMs,
    })
    for (let i = 0; i < 3; i++) {
      guard.recordFailure()
      nowMs += 100
    }
    await expect(guard.assertAvailable(0.001)).rejects.toBeInstanceOf(
      CircuitOpenError,
    )
    nowMs += 10_001
    await expect(guard.assertAvailable(0.001)).resolves.toBeUndefined()
  })

  it('falha no store (monthlyTotal) graceful — assume 0', async () => {
    const failingStore: CaptchaSpendStore = {
      async monthlyTotalBrl() {
        throw new Error('db down')
      },
      async record() {
        /* noop */
      },
    }
    const guard = new CaptchaBudgetGuard({
      store: failingStore,
      monthlyBudgetBrl: 200,
    })
    await expect(guard.assertAvailable(0.001)).resolves.toBeUndefined()
  })
})
