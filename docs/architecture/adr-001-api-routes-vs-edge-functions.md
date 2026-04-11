# ADR-001: Next.js API Routes vs Supabase Edge Functions

**Date:** 2026-04-11
**Status:** Accepted

## Context

O projeto precisa de logica server-side para: cron jobs (scraping, geocoding, matching, cross-referencing), seed de dados (Google Places, OSM, GeoSampa), e operacoes que requerem service role key do Supabase.

Duas opcoes foram consideradas: Supabase Edge Functions (runtime Deno, deploy via Supabase CLI) e Next.js API Routes (runtime Node.js, deploy via Vercel).

## Decision

**Next.js API Routes** foram escolhidas para toda logica server-side.

Justificativa:
- Deploy unificado via Vercel (frontend + API no mesmo deploy)
- Vercel Cron integrado (vercel.json) para scheduling
- Runtime Node.js compartilhado com o restante do projeto
- Sem necessidade de manter dois pipelines de deploy
- Acesso direto ao Supabase client com service role key via env vars do Vercel

## Consequences

**Positivas:**
- Um unico pipeline de deploy (Vercel)
- DX simplificada — mesmo ambiente, mesma linguagem, mesmo tooling
- Logs unificados no Vercel dashboard

**Negativas:**
- Vendor lock-in com Vercel para cron scheduling
- Sem isolamento de runtime (API routes compartilham cold start com o app)
- Migracao para outro hosting requer adaptar os cron endpoints
- Nao aproveita o runtime Deno e a proximidade ao DB que Edge Functions oferecem
