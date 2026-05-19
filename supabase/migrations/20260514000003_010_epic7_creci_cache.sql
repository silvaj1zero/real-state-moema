-- Epic 7 Story 7.7 — CRECI lookup cache (TTL 30d)
-- Consumed by app/src/lib/scrapers/creci/cache.ts (CreciCache class)
-- Reduces 2Captcha cost + portal hit rate by caching successful AND
-- negative lookups (situacao=NULL com error_code).

CREATE TABLE IF NOT EXISTS public.creci_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero          TEXT NOT NULL,
  uf              TEXT NOT NULL,
  inscricao       TEXT,
  nome_completo   TEXT,
  situacao        TEXT CHECK (situacao IN ('Ativo','Inativo') OR situacao IS NULL),
  telefone        TEXT,
  fonte           TEXT CHECK (fonte IN ('conselho','crecisp') OR fonte IS NULL),
  raw_response    TEXT,
  error_code      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creci_cache_numero_uf_unique UNIQUE (numero, uf)
);

CREATE INDEX IF NOT EXISTS creci_cache_expires_at_idx
  ON public.creci_cache (expires_at);

CREATE INDEX IF NOT EXISTS creci_cache_lookup_idx
  ON public.creci_cache (numero, uf, expires_at);

-- RLS: service_role full; authenticated SELECT (UI da Story 7.8 le)
ALTER TABLE public.creci_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_creci_cache"
  ON public.creci_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read_creci_cache"
  ON public.creci_cache
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.creci_cache IS
  'Story 7.7 — Cache de lookups CRECI (Conselho Nacional + SP). TTL 30d via expires_at. Inclui negative caching (situacao=NULL).';
