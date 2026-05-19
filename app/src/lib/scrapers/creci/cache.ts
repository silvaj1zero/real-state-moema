/**
 * Epic 7 Story 7.7 — CRECI lookup cache (Supabase-backed, TTL 30d).
 *
 * Migration: `supabase/migrations/20260514000003_010_epic7_creci_cache.sql`
 * (criada nesta story; apply remote via @devops).
 *
 * Schema (proposta):
 *   id              UUID PK
 *   numero          TEXT NOT NULL
 *   uf              TEXT NOT NULL
 *   inscricao       TEXT
 *   nome_completo   TEXT
 *   situacao        TEXT   -- 'Ativo' | 'Inativo' | NULL (miss negativo)
 *   telefone        TEXT
 *   fonte           TEXT   -- 'conselho' | 'crecisp' | NULL
 *   raw_response    TEXT
 *   error_code      TEXT
 *   expires_at      TIMESTAMPTZ NOT NULL
 *   created_at      TIMESTAMPTZ DEFAULT now()
 *   UNIQUE(numero, uf)
 *
 * PUREZA: depende apenas de uma interface SupabaseLike abstrata para
 * facilitar mock em testes.
 */

export interface CacheRow {
  numero: string
  uf: string
  inscricao: string | null
  nome_completo: string | null
  situacao: 'Ativo' | 'Inativo' | null
  telefone: string | null
  fonte: 'conselho' | 'crecisp' | null
  error_code: string | null
  raw_response: string | null
  expires_at: string
}

export interface SupabaseLike {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        eq(col2: string, val2: string): {
          gt(col3: string, val3: string): {
            maybeSingle(): Promise<{ data: CacheRow | null; error: unknown }>
          }
        }
      }
    }
    upsert(
      row: Partial<CacheRow>,
      opts?: { onConflict?: string },
    ): Promise<{ error: unknown }>
  }
}

const CACHE_TABLE = 'creci_cache'
export const DEFAULT_TTL_DAYS = 30

export interface CreciCacheOptions {
  supabase: SupabaseLike
  ttlDays?: number
  now?: () => Date
}

export class CreciCache {
  private readonly supabase: SupabaseLike
  private readonly ttlDays: number
  private readonly now: () => Date

  constructor(opts: CreciCacheOptions) {
    this.supabase = opts.supabase
    this.ttlDays = opts.ttlDays ?? DEFAULT_TTL_DAYS
    this.now = opts.now ?? (() => new Date())
  }

  async get(
    numero: string,
    uf: string,
  ): Promise<CacheRow | null> {
    const nowIso = this.now().toISOString()
    const { data, error } = await this.supabase
      .from(CACHE_TABLE)
      .select('*')
      .eq('numero', numero)
      .eq('uf', uf.toLowerCase())
      .gt('expires_at', nowIso)
      .maybeSingle()
    if (error) {
      // Cache falhou — nao propagar (cache eh otimizacao)
      return null
    }
    return data
  }

  async put(row: Omit<CacheRow, 'expires_at'>): Promise<void> {
    const expiresAt = new Date(
      this.now().getTime() + this.ttlDays * 24 * 60 * 60 * 1000,
    ).toISOString()

    await this.supabase
      .from(CACHE_TABLE)
      .upsert(
        { ...row, expires_at: expiresAt },
        { onConflict: 'numero,uf' },
      )
  }
}
