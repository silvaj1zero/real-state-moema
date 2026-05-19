/**
 * Epic 7 Story 7.7 — Captcha budget guard + circuit breaker.
 *
 * AC8 (Story 7.7):
 *  - Tabela `captcha_spend(date, cost_brl)` — proposal em
 *    `010_epic7_creci_cache.sql.proposed`
 *  - Reject se sum(month) + estimated_cost > budget
 *  - Circuit-breaker: 5 falhas consecutivas em 1min -> suspend 10min
 *
 * Para Wave A budgetamos R$ 200/mes (~70k Turnstile solves ou 25k
 * reCAPTCHA Enterprise solves).
 */

export interface CaptchaSpendStore {
  /** Soma de cost_brl no mes corrente. Promise<number>. */
  monthlyTotalBrl(): Promise<number>
  /** Persiste cost de uma solve. */
  record(costBrl: number): Promise<void>
}

export interface BudgetGuardOptions {
  store: CaptchaSpendStore
  /** Budget mensal BRL (default 200) */
  monthlyBudgetBrl?: number
  /** Cotacao USD->BRL (default 5.50) — config externa em prod */
  usdToBrlRate?: number
  /** Janela do circuit-breaker em ms (default 60_000) */
  breakerWindowMs?: number
  /** Falhas consecutivas para abrir (default 5) */
  breakerThreshold?: number
  /** Tempo de suspend em ms (default 600_000 = 10min) */
  breakerSuspendMs?: number
  now?: () => number
}

export class BudgetExceededError extends Error {
  readonly code = 'captcha_budget_exceeded'
  constructor(message: string) {
    super(message)
    this.name = 'BudgetExceededError'
  }
}

export class CircuitOpenError extends Error {
  readonly code = 'captcha_circuit_open'
  constructor(message: string) {
    super(message)
    this.name = 'CircuitOpenError'
  }
}

export class CaptchaBudgetGuard {
  private readonly store: CaptchaSpendStore
  private readonly monthlyBudgetBrl: number
  private readonly usdToBrlRate: number
  private readonly breakerWindowMs: number
  private readonly breakerThreshold: number
  private readonly breakerSuspendMs: number
  private readonly nowFn: () => number

  private failures: number[] = []
  private suspendedUntil = 0

  constructor(opts: BudgetGuardOptions) {
    this.store = opts.store
    this.monthlyBudgetBrl =
      opts.monthlyBudgetBrl ??
      Number(process.env.TWOCAPTCHA_BUDGET_MONTHLY_BRL ?? '200')
    this.usdToBrlRate = opts.usdToBrlRate ?? 5.5
    this.breakerWindowMs = opts.breakerWindowMs ?? 60_000
    this.breakerThreshold = opts.breakerThreshold ?? 5
    this.breakerSuspendMs = opts.breakerSuspendMs ?? 600_000
    this.nowFn = opts.now ?? Date.now
  }

  /**
   * Verifica budget e circuit-breaker antes de tentar solve. Lanca
   * BudgetExceededError ou CircuitOpenError.
   */
  async assertAvailable(estimatedCostUsd: number): Promise<void> {
    const now = this.nowFn()
    if (this.suspendedUntil > now) {
      throw new CircuitOpenError(
        `Captcha circuit aberto. Tente em ${Math.ceil(
          (this.suspendedUntil - now) / 1000,
        )}s`,
      )
    }

    const total = await this.store.monthlyTotalBrl().catch(() => 0)
    const estimatedBrl = estimatedCostUsd * this.usdToBrlRate
    if (total + estimatedBrl > this.monthlyBudgetBrl) {
      throw new BudgetExceededError(
        `Budget mensal R$ ${this.monthlyBudgetBrl} excedido (atual R$ ${total.toFixed(
          2,
        )} + estimado R$ ${estimatedBrl.toFixed(2)})`,
      )
    }
  }

  async recordSuccess(costUsd: number): Promise<void> {
    this.failures = [] // reset failure window
    const costBrl = costUsd * this.usdToBrlRate
    if (costBrl > 0) {
      await this.store.record(costBrl).catch(() => {
        /* swallow — cache de spend nao deve quebrar lookup */
      })
    }
  }

  recordFailure(): void {
    const now = this.nowFn()
    this.failures = [
      ...this.failures.filter((t) => now - t < this.breakerWindowMs),
      now,
    ]
    if (this.failures.length >= this.breakerThreshold) {
      this.suspendedUntil = now + this.breakerSuspendMs
      this.failures = []
    }
  }

  /** Test helper: limpa estado interno. */
  _reset(): void {
    this.failures = []
    this.suspendedUntil = 0
  }
}
