/**
 * Epic 7 Story 7.7 — CRECI lookup service (entrypoint).
 *
 * Servico unificado que orquestra:
 *  - Cache hit/miss (`creci_cache` table)
 *  - Conselho Nacional adapter (21 UFs, Turnstile)
 *  - CRECI SP adapter (reCAPTCHA Enterprise v3 — disabled mar/2026)
 *  - Captcha budget guard + circuit-breaker
 *
 * Consumido por:
 *  - `classifyAdvertiser` (Story 7.3) — sinal `hasCRECI`
 *  - MercadoLivre crawler (Story 7.4) — enriquecimento
 *  - UI (Story 7.9) — display per anuncio
 *
 * Exemplo:
 * ```ts
 * import { createCreciService } from '@/lib/scrapers/creci'
 *
 * const service = createCreciService({ ... })
 * const result = await service.lookup('12345', 'PR')
 * if (result?.situacao === 'Ativo') { ... }
 * ```
 */

import {
  ConselhoNacionalAdapter,
  isConselhoNacionalUf,
  type ConselhoAdapterOptions,
} from './conselho-nacional'
import {
  CRECISPAdapter,
  type CRECISPAdapterOptions,
} from './crecisp'
import { CreciCache, type CreciCacheOptions } from './cache'
import {
  CaptchaBudgetGuard,
  type BudgetGuardOptions,
  BudgetExceededError,
  CircuitOpenError,
} from './captcha-budget'

export interface CreciLookupResult {
  inscricao: string
  nomeCompleto: string
  situacao: 'Ativo' | 'Inativo'
  telefone: string
  fonte: 'conselho' | 'crecisp'
  cached: boolean
}

export interface CreciLookupOptions {
  /** Skipa cache lookup (forca refresh). Default false. */
  bypassCache?: boolean
}

export interface CreciServiceOptions {
  conselhoAdapter: ConselhoNacionalAdapter
  crecispAdapter: CRECISPAdapter
  cache: CreciCache
  budgetGuard: CaptchaBudgetGuard
}

export class CreciService {
  private readonly conselho: ConselhoNacionalAdapter
  private readonly crecisp: CRECISPAdapter
  private readonly cache: CreciCache
  private readonly budget: CaptchaBudgetGuard

  constructor(opts: CreciServiceOptions) {
    this.conselho = opts.conselhoAdapter
    this.crecisp = opts.crecispAdapter
    this.cache = opts.cache
    this.budget = opts.budgetGuard
  }

  async lookup(
    numero: string,
    uf: string,
    opts: CreciLookupOptions = {},
  ): Promise<CreciLookupResult | null> {
    const ufLower = uf.toLowerCase()

    // 1. Cache hit
    if (!opts.bypassCache) {
      const cached = await this.cache.get(numero, ufLower)
      if (cached) {
        if (
          !cached.inscricao ||
          !cached.nome_completo ||
          !cached.situacao ||
          !cached.fonte
        ) {
          return null // cache de miss negativo
        }
        return {
          inscricao: cached.inscricao,
          nomeCompleto: cached.nome_completo,
          situacao: cached.situacao,
          telefone: cached.telefone ?? '',
          fonte: cached.fonte,
          cached: true,
        }
      }
    }

    // 2. Cache miss -> consulta site
    // Budget guard: assume custo medio ~$0.001 Turnstile, $0.003 reCAPTCHA
    const isSp = ufLower === 'sp'
    const estimatedCostUsd = isSp ? 0.003 : 0.001

    try {
      await this.budget.assertAvailable(estimatedCostUsd)
    } catch (e) {
      if (e instanceof BudgetExceededError || e instanceof CircuitOpenError) {
        // Persiste miss para evitar retry imediato (TTL curto seria ideal,
        // mas mantemos default 30d — operacao manual reset)
        return null
      }
      throw e
    }

    if (isSp) {
      const result = await this.crecisp.lookup(numero)
      if (result.data) {
        await this.budget.recordSuccess(result.captchaCostUsd)
        await this.cache.put({
          numero,
          uf: ufLower,
          inscricao: result.data.inscricao,
          nome_completo: result.data.nomeCompleto,
          situacao: result.data.situacao,
          telefone: result.data.telefone,
          fonte: 'crecisp',
          error_code: null,
          raw_response: null,
        })
        return { ...result.data, fonte: 'crecisp', cached: false }
      }

      // Persiste miss + error_code
      if (result.errorCode === 'crecisp_unavailable') {
        this.budget.recordFailure()
      }
      await this.cache.put({
        numero,
        uf: ufLower,
        inscricao: null,
        nome_completo: null,
        situacao: null,
        telefone: null,
        fonte: null,
        error_code: result.errorCode ?? 'crecisp_not_found',
        raw_response: null,
      })
      return null
    }

    if (!isConselhoNacionalUf(ufLower)) {
      // UF nao coberta nem por Conselho nem SP — Wave B
      return null
    }

    const result = await this.conselho.lookup(numero, ufLower)
    if (result.data) {
      await this.budget.recordSuccess(result.captchaCostUsd)
      await this.cache.put({
        numero,
        uf: ufLower,
        inscricao: result.data.inscricao,
        nome_completo: result.data.nomeCompleto,
        situacao: result.data.situacao,
        telefone: result.data.telefone,
        fonte: 'conselho',
        error_code: null,
        raw_response: null,
      })
      return { ...result.data, fonte: 'conselho', cached: false }
    }

    // Miss negativo (numero nao existe)
    await this.cache.put({
      numero,
      uf: ufLower,
      inscricao: null,
      nome_completo: null,
      situacao: null,
      telefone: null,
      fonte: null,
      error_code: 'conselho_not_found',
      raw_response: null,
    })
    return null
  }
}

/**
 * Factory helper — wire dependency injection com defaults.
 */
export function createCreciService(opts: {
  conselhoOptions: ConselhoAdapterOptions
  crecispOptions: CRECISPAdapterOptions
  cacheOptions: CreciCacheOptions
  budgetOptions: BudgetGuardOptions
}): CreciService {
  return new CreciService({
    conselhoAdapter: new ConselhoNacionalAdapter(opts.conselhoOptions),
    crecispAdapter: new CRECISPAdapter(opts.crecispOptions),
    cache: new CreciCache(opts.cacheOptions),
    budgetGuard: new CaptchaBudgetGuard(opts.budgetOptions),
  })
}

// Re-exports publicos
export {
  ConselhoNacionalAdapter,
  CONSELHO_NACIONAL_UFS,
  CONSELHO_TURNSTILE_SITEKEY,
  isConselhoNacionalUf,
  type ConselhoUf,
} from './conselho-nacional'

export {
  CRECISPAdapter,
  CRECISP_BASE_URL,
  CRECISP_RECAPTCHA_SITEKEY,
} from './crecisp'

export {
  CreciCache,
  type CacheRow,
  type SupabaseLike,
  DEFAULT_TTL_DAYS,
} from './cache'

export {
  CaptchaBudgetGuard,
  BudgetExceededError,
  CircuitOpenError,
  type CaptchaSpendStore,
} from './captcha-budget'

export {
  CaptchaClient,
  CaptchaSolveError,
  type SolveResult,
} from './captcha-client'

export {
  parseConselhoResponse,
  normalizeTelefoneE164,
  type CreciResultado,
} from './parsers/conselho-response'

export {
  parseCRECISPResponse,
  type CRECISPParseResult,
} from './parsers/crecisp-response'

export {
  isAllowedByRobotsTxt,
  parseRobotsTxt,
  clearRobotsCache,
} from './robots-check'
