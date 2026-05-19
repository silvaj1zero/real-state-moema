/**
 * Epic 7 — classifyAdvertiser (Story 7.3).
 *
 * Funcao pura de classificacao de anunciantes para a heuristica FISBO
 * 4-signal definida em ADR-EPIC7-004.
 *
 * DESIGN:
 *  - `classifyAdvertiser(s)` e SINCRONA, PURA e DETERMINISTICA: sem I/O,
 *    sem Date.now(), sem Math.random(), sem console.log. Recebe sinais
 *    pre-coletados e retorna `ClassificationResult`.
 *  - `lookupCNAE(client, cnpj)` e ASSINCRONA e injetavel: o caller (Story
 *    7.4 crawler) resolve o CNAE ANTES de chamar classifyAdvertiser e
 *    repassa via `AdvertiserSignals.cnae` (string).
 *  - Cache CNAE em modulo-level com TTL 5min (Map<cnpj, {cnae, ts}>),
 *    suficiente para Wave A (Wave B: Redis se > 1k req/s).
 *  - Helper `nameAppearsPersonal(name)` exposto para o caller computar
 *    o signal antes da classificacao.
 *
 * AC1 (funcao pura), AC2 (tipo Signals), AC3 (ordem de regras), AC4
 * (lookupCNAE com cache), AC5 (heuristica nome PF), AC6 (truth-table),
 * AC7 (testes).
 *
 * Ref: ADR-EPIC7-004 | docs/code-anatomy/bunsly-homeharvest/extraction-notes.md Sec. 2
 *
 * PUREZA: TS puro (ADR-EPIC7-006). Sem imports `next/*`.
 */

import type { AdvertiserClassification } from '@/lib/schemas/epic7/advertisers'

// ---------------------------------------------------------------------------
// CNAE constants — verbatim per Story 7.3 Tech Notes.
// ---------------------------------------------------------------------------

/** CNAEs canonicos identificando CONSTRUTORA/INCORPORADORA. */
export const BUILDER_CNAES = new Set<string>([
  '4110700', // Incorporacao de empreendimentos imobiliarios
  '4120400', // Construcao de edificios
])

/** CNAEs canonicos identificando IMOBILIARIA/CORRETAGEM. */
export const BROKER_CNAES = new Set<string>([
  '6822500', // Gestao e administracao da propriedade imobiliaria
  '6831700', // Corretagem na compra e venda e avaliacao de imoveis
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PhoneType = 'mobile' | 'landline' | 'unknown'

/**
 * AC2 — sinais coletados ANTES de classificar. Caller (crawler) e
 * responsavel por preencher `cnae` (via lookupCNAE) e `nameAppearsPersonal`
 * (via helper) — mantemos `classifyAdvertiser` 100% sincrono e puro.
 */
export interface AdvertiserSignals {
  /** Resultado de CRECI lookup (Story 7.7). */
  hasCRECI: boolean
  /** CNPJ limpo (so digitos) OU undefined se nao extraido. */
  cnpj?: string
  /** CNAE primario resolvido externamente (via lookupCNAE async). */
  cnae?: string
  /** Tipo de telefone detectado por DDD/digito 9. */
  phoneType?: PhoneType
  /** DDD do telefone (ex.: '11'). Apenas para rastreabilidade. */
  phoneDDD?: string
  /** Quantos anuncios este telefone aparece (heuristica FISBO). */
  listingCountByPhone?: number
  /** Resultado de nameAppearsPersonal sobre o nome do anunciante. */
  nameAppearsPersonal: boolean
}

/** Sinais que justificam a decisao — vocabulario fechado (alinhado a schema 7.1). */
export type ClassificationSignal =
  | 'cnpj_match_construtora'
  | 'cnpj_match_imobiliaria'
  | 'has_creci'
  | 'no_creci_match'
  | 'ddd_mobile'
  | 'single_listing'
  | 'name_appears_personal'

export interface ClassificationResult {
  classification: AdvertiserClassification
  confidence: number
  signals: ClassificationSignal[]
}

// ---------------------------------------------------------------------------
// classifyAdvertiser — funcao pura
// ---------------------------------------------------------------------------

/**
 * AC3 — ordem de regras (per ADR-EPIC7-004):
 *  1. CNAE construtora -> 'builder' confidence 0.95
 *  2. CNAE imobiliaria -> 'broker' confidence 0.90
 *  3. FISBO 4-signal (todos sinais) -> 'for_sale_by_owner' confidence 0.85
 *  4. hasCRECI -> 'agent' confidence 0.80
 *  5. default -> 'unknown' confidence 0.0
 *
 * Edge: hasCRECI=true + CNPJ-match -> prioridade CNPJ (passos 1/2 vencem
 * porque PJ supera PF no contexto MLS).
 */
export function classifyAdvertiser(
  s: AdvertiserSignals,
): ClassificationResult {
  // Passo 1/2 — CNPJ + CNAE conhecidos
  if (s.cnpj && s.cnae) {
    if (BUILDER_CNAES.has(s.cnae)) {
      return {
        classification: 'builder',
        confidence: 0.95,
        signals: ['cnpj_match_construtora'],
      }
    }
    if (BROKER_CNAES.has(s.cnae)) {
      return {
        classification: 'broker',
        confidence: 0.9,
        signals: ['cnpj_match_imobiliaria'],
      }
    }
  }

  // Passo 3 — FISBO 4-signal (todos devem convergir)
  const fisboSignals: ClassificationSignal[] = []
  if (!s.hasCRECI) fisboSignals.push('no_creci_match')
  if (s.phoneType === 'mobile') fisboSignals.push('ddd_mobile')
  if (s.listingCountByPhone === 1) fisboSignals.push('single_listing')
  if (s.nameAppearsPersonal) fisboSignals.push('name_appears_personal')

  if (fisboSignals.length === 4) {
    return {
      classification: 'for_sale_by_owner',
      confidence: 0.85,
      signals: fisboSignals,
    }
  }

  // Passo 4 — agent via CRECI
  if (s.hasCRECI) {
    return {
      classification: 'agent',
      confidence: 0.8,
      signals: ['has_creci'],
    }
  }

  // Passo 5 — unknown
  return {
    classification: 'unknown',
    confidence: 0.0,
    signals: [],
  }
}

// ---------------------------------------------------------------------------
// nameAppearsPersonal — AC5
// ---------------------------------------------------------------------------

/** Sufixos de razao social PJ (case-insensitive). */
const RAZAO_SOCIAL_PATTERNS = [
  /\bLTDA\.?\b/i,
  /\bME\b/i,
  /\bEIRELI\b/i,
  /\bS\.?\s?A\.?\b/i,
  /\bEPP\b/i,
  /\bMEI\b/i,
]

/** Palavras-chave de razao social no meio do nome (construtora, imoveis...). */
const PJ_KEYWORDS = [
  /\bconstrutora\b/i,
  /\bincorporadora\b/i,
  /\bimoveis\b/i,
  /\bimobiliaria\b/i,
  /\bempreendimentos\b/i,
  /\bnegocios\b/i,
]

/**
 * AC5 — heuristica regex para detectar nome de pessoa fisica (PF).
 *
 * REJEITA:
 *  - Razao social (contem LTDA, ME, EIRELI, S.A., EPP, MEI)
 *  - Keywords PJ (Construtora, Incorporadora, Imoveis, Imobiliaria, ...)
 *  - Strings com >5 palavras (provavel nome empresarial composto)
 *  - Strings com <2 palavras (incompleto)
 *  - Strings com digitos
 *  - Strings vazias ou so whitespace
 *
 * ACEITA: nomes de 2-5 palavras alfabeticas (com acentuacao) e iniciais
 * maiusculas (`Joao Silva`, `Maria Helena Souza`).
 */
export function nameAppearsPersonal(name: string | null | undefined): boolean {
  if (!name) return false
  const trimmed = name.trim()
  if (!trimmed) return false

  // Rejeita digitos
  if (/\d/.test(trimmed)) return false

  // Rejeita razao social
  for (const pat of RAZAO_SOCIAL_PATTERNS) {
    if (pat.test(trimmed)) return false
  }
  // Rejeita keywords PJ
  for (const pat of PJ_KEYWORDS) {
    if (pat.test(trimmed)) return false
  }

  const words = trimmed.split(/\s+/)
  if (words.length < 2 || words.length > 5) return false

  // Cada palavra deve ser alfabetica (com acentos pt-BR aceitos) e
  // comecar com maiuscula. Particulas curtas ("da", "de", "do", "dos",
  // "das", "e") sao toleradas.
  const particles = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
  for (const w of words) {
    const lower = w.toLowerCase()
    if (particles.has(lower)) continue
    if (!/^[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][a-záâãàéêíóôõúç'-]+$/.test(w)) return false
  }

  return true
}

// ---------------------------------------------------------------------------
// lookupCNAE — AC4 (async, injetavel client + cache 5min)
// ---------------------------------------------------------------------------

/** Subset minimo do SupabaseClient que precisamos para lookup CNAE. */
export interface CNAELookupClient {
  fetchCNAE(cnpj: string): Promise<string | null>
}

interface CacheEntry {
  cnae: string
  expiresAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5min
const cache = new Map<string, CacheEntry>()

/** Limpa cache CNAE — somente para testes. NAO usar em producao. */
export function _clearCNAECache(): void {
  cache.clear()
}

/** Snapshot in-memory para testes (size). NAO usar em producao. */
export function _cacheSize(): number {
  return cache.size
}

/**
 * AC4 — consulta `cnpj_enrichment.cnae_primario`. Cache 5min in-memory.
 *
 * Retorna '' (string vazia) quando CNPJ nao esta no enrichment table
 * (caso comum em primeiros runs antes da Story 7.5 popular). Caller
 * NUNCA deve confundir '' com "encontrei o CNAE vazio".
 *
 * @param client cliente injetavel (subset SupabaseClient via fetchCNAE).
 *               Tests injetam fake; prod injeta SupabaseCNAELookupClient.
 * @param cnpj   CNPJ ja limpo (apenas digitos). Caller responsavel pela
 *               normalizacao (strip "/", ".", "-").
 * @param now    optional injection para teste de TTL (default Date.now()).
 */
export async function lookupCNAE(
  client: CNAELookupClient,
  cnpj: string,
  now: () => number = Date.now,
): Promise<string> {
  if (!cnpj) return ''

  const cached = cache.get(cnpj)
  const t = now()
  if (cached && cached.expiresAt > t) {
    return cached.cnae
  }

  const cnae = await client.fetchCNAE(cnpj)
  const value = cnae ?? ''
  cache.set(cnpj, { cnae: value, expiresAt: t + CACHE_TTL_MS })
  return value
}

// ---------------------------------------------------------------------------
// SupabaseCNAELookupClient — adapter para producao (opcional)
// ---------------------------------------------------------------------------

/** Subset minimo do SupabaseClient que o adapter usa. */
interface SupabaseLike {
  from(table: string): {
    select(cols: string): {
      eq(
        col: string,
        val: string,
      ): {
        maybeSingle(): Promise<{
          data: { cnae_primario: string | null } | null
          error: { message: string } | null
        }>
      }
    }
  }
}

/**
 * Adapter sobre SupabaseClient que materializa o `CNAELookupClient`.
 *
 * Mantemos a query restrita a `cnae_primario`; outros campos do
 * `cnpj_enrichment` (razao_social, situacao) sao responsabilidade da
 * Story 7.5 cron pipeline.
 */
export class SupabaseCNAELookupClient implements CNAELookupClient {
  private readonly db: SupabaseLike

  constructor(db: SupabaseLike) {
    this.db = db
  }

  async fetchCNAE(cnpj: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('cnpj_enrichment')
      .select('cnae_primario')
      .eq('cnpj', cnpj)
      .maybeSingle()
    if (error) {
      throw new Error(`cnpj_enrichment fetch failed: ${error.message}`)
    }
    return data?.cnae_primario ?? null
  }
}
