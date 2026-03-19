# Handoff — Epic 3 Session (2026-03-18)

## Resumo da Sessao

**Agente:** Dex (dev) + Quinn (qa) + Gage (devops) via AIOX
**Duracao:** ~3h sessao completa (2 sessoes)
**Modelo:** Claude Opus 4.6 (1M context)
**Commits:** 4 pushes para `origin/master` + 1 sessao infra (uncommitted)

## Commits Nesta Sessao (Session 1)

| Commit | Descricao | Linhas |
|--------|-----------|--------|
| `b3b28d5` | feat: Story 3.1 ACM Semi-Automatizada | +1,324 |
| `bed93a6` | feat: Epic 3 batch — Stories 3.2, 3.3, 3.7, 3.8 | +2,671 |
| `ca5d9cc` | refactor: integration pass — shared utils, feed badge, wiring | +104/-122 |
| `6ef7ea0` | feat: Story 3.4 partial — CSV import + agent dashboard | +548 |

## Session 2 — Infra Implementation (uncommitted)

| Story | Descricao | Arquivos Novos | Linhas |
|-------|-----------|---------------|--------|
| 3.4 complete | API routes (scrape, geocode, match), Apify client, hooks | 11 | ~800 |
| 3.5 | API routes (Google Places, OSM, GeoSampa), hooks, dashboard | 6 | ~500 |
| 3.6 | API route (cross-reference), hooks, review panel | 3 | ~400 |
| Shared | admin client, types, vercel.json, migration | 4 | ~200 |
| Tests | apify.test (11), geocoding.test (4) | 2 | ~150 |

**Total Session 2: ~2,050 linhas, 15 testes novos (74 total), 26 arquivos criados/modificados**

## Epic 3 — Status

| Story | Titulo | Status | Notas |
|-------|--------|--------|-------|
| **3.1** | ACM Semi-Automatizada | **SHIPPED** | 9 ACs, QA PASS, 20 testes |
| **3.2** | Dossie/Showcase PDF | **SHIPPED** | React-PDF 5 paginas, editavel, share |
| **3.3** | Home Staging Automatizado | **SHIPPED** | 3 regras ouro, tipologia, WhatsApp |
| **3.4** | Scraping Pipeline | **IMPLEMENTADO** | API routes + Apify + geocoding + match + dashboard. Necessita config Apify Actors e env vars |
| **3.5** | Pre-Mapping Advanced | **IMPLEMENTADO** | Google Places + OSM + GeoSampa routes. Necessita GOOGLE_API_KEY |
| **3.6** | Cross-Referencing | **IMPLEMENTADO** | Dedup + transition detection + review UI. Funcional quando 3.4 tem dados |
| **3.7** | Feed de Inteligencia | **SHIPPED** | Infinite scroll, filtros, mark-read. Push/cron pendente |
| **3.8** | Lead Enrichment | **SHIPPED** | FISBO score, estimativa m2, on-demand |

## Rotas Disponiveis

```
/                         → Mapa (Epic 1)
/login                    → Auth (Epic 1)
/funil                    → Funil Kanban (Epic 2)
/dashboard                → Dashboard KPIs (Epic 2)
/acm/[leadId]             → ACM Generator (Story 3.1)
/dossie/[leadId]          → Dossie PDF (Story 3.2)
/home-staging/[leadId]    → Home Staging (Story 3.3)
/feed                     → Inteligencia Feed (Story 3.7)
/enrich/[leadId]          → Lead Enrichment (Story 3.8)
/agents                   → Agent Dashboard + Cross-Refs (Story 3.4/3.6)
/marketing/[leadId]       → Marketing (Epic 4 — outro terminal)
/parceiros                → Parceiros (Epic 4 — outro terminal)
/safari/[id]              → Safari (Epic 4 — outro terminal)

# API Routes (Cron)
/api/cron/scrape-portals    → Story 3.4 AC1/AC2/AC5/AC6/AC7
/api/cron/geocode-listings  → Story 3.4 AC4
/api/cron/match-listings    → Story 3.4 AC3
/api/cron/seed-google-places → Story 3.5 AC2
/api/cron/seed-osm-advanced  → Story 3.5 AC3
/api/cron/seed-geosampa-iptu → Story 3.5 AC4
/api/cron/cross-reference    → Story 3.6 AC1/AC2/AC6
```

## Arquitetura de Componentes (Session 2 additions)

```
app/src/
├── lib/
│   ├── supabase/admin.ts               # Service role client for API routes
│   ├── apify.ts + test                  # Apify: normalize, run, parse (11 tests)
│   ├── geocoding.ts + test             # Mapbox: geocode, batch (4 tests)
│   ├── format.ts                        # formatBRL shared utility
│   └── coordinates.ts                   # parseCoordinates shared utility
├── hooks/
│   ├── useAgentOps.ts                   # Cron logs, geocoding/match counts, manual triggers
│   ├── useAdvancedSeed.ts               # Seed progress, breakdown, manual trigger
│   ├── useCrossRefs.ts                  # Cross-refs: pending, stats, transitions, confirm/reject
│   └── ... (existing hooks)
├── components/
│   ├── agents/
│   │   ├── AgentDashboard.tsx           # Enhanced: tabs, cron status, Run Now, match progress
│   │   ├── CrossRefPanel.tsx            # Cross-ref review: stats, transitions, merge cards
│   │   └── CsvImportModal.tsx           # CSV import (unchanged)
│   └── seed/
│       └── AdvancedSeedDashboard.tsx    # Seed progress: by source, by field, update button
├── app/
│   └── api/cron/
│       ├── scrape-portals/route.ts      # Apify → scraped_listings (upsert + removal)
│       ├── geocode-listings/route.ts    # Mapbox → coordinates + endereco_normalizado
│       ├── match-listings/route.ts      # fn_match_listing_edificio → match + distance
│       ├── seed-google-places/route.ts  # Google Places → edificios enrichment
│       ├── seed-osm-advanced/route.ts   # Overpass → building:levels
│       ├── seed-geosampa-iptu/route.ts  # IPTU records → edificios (COALESCE)
│       └── cross-reference/route.ts     # Dedup + transition detection
└── vercel.json                          # Cron schedule
```

## Env Vars Necessarias (Session 2) — ATUALIZADO 2026-03-19

| Var | Usado Por | Status |
|-----|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Configurado |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Configurado |
| `SUPABASE_SERVICE_ROLE_KEY` | API routes (admin client) | Configurado |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map + Geocoding | Configurado |
| `MAPBOX_TOKEN` | API routes (server-side geocoding) | Configurado |
| `APIFY_TOKEN` | scrape-portals | Configurado |
| `APIFY_ACTOR_OLX` | scrape-portals (OLX) | Configurado (`viralanalyzer~brazil-real-estate-scraper`) |
| `APIFY_ACTOR_ZAP` | scrape-portals (ZAP) | Pendente — alugar `avorio/zap-imoveis-scraper` |
| `APIFY_ACTOR_VIVAREAL` | scrape-portals (VivaReal) | Pendente — alugar `makemakers/Viva-Real-Scraper` |
| `GOOGLE_API_KEY` | seed-google-places | Necessita configurar |
| `CRON_SECRET` | All API routes (auth) | Configurado |

**Arquitetura multi-actor:** Cada portal usa um Actor Apify separado. OLX funciona agora. ZAP/VivaReal precisam ser alugados no console Apify. O codigo filtra por bairro Moema + adjacentes apos o scrape (o Actor OLX nao suporta filtro por bairro).

**Actors recomendados:**
- OLX: `viralanalyzer~brazil-real-estate-scraper` (confirmado, $0.002/listing)
- ZAP: `avorio~zap-imoveis-scraper` (30k+ runs, 165 users)
- VivaReal: `makemakers~Viva-Real-Scraper` (711 runs, 97 users)

## Migration 003b — EXECUTADA 2026-03-19

- `fn_set_listing_coordinates` — used by geocode-listings
- `fn_insert_scraped_listing_with_coords` — used by scrape-portals

## Tech Debt Acumulado

| ID | Severidade | Descricao |
|----|-----------|-----------|
| PERF-001 | medium | scraped_listings fetch sem filtro PostGIS (ACM + Enrichment) |
| MNT-001 | low | formatBRL ainda duplicada em DossieDocument.tsx (React-PDF contexto) |
| REQ-INFRA-1 | medium | Edge Functions pendentes: push notifications, morning summary, stale leads cron |
| REQ-INFRA-2 | **resolved** | ~~Apify Actors nao configurados~~ → API routes implementadas, falta config env vars |
| REQ-INFRA-3 | **resolved** | ~~APIs externas nao configuradas~~ → Google Places + OSM + GeoSampa routes implementadas |
| REQ-002 | low | Autocomplete de edificios no AddComparableSheet |
| REQ-003 | low | Map alert pins nao integrados ao MapView |
| REQ-004 | low | Feed badge precisa de Realtime subscription (poll atual) |
| XREF-001 | medium | Cross-ref dedup nao usa PostGIS ST_DWithin (compara area/preco client-side) — ideal seria RPC no DB |

## O Que a Proxima Sessao Deve Fazer

### Prioridade 1: Config & Deploy
1. **Executar migration 003b** no Supabase SQL Editor
2. **Configurar env vars** (SUPABASE_SERVICE_ROLE_KEY, APIFY_TOKEN, GOOGLE_API_KEY, CRON_SECRET) no Vercel
3. **Configurar Apify Actors** — criar ou selecionar actors para ZAP/OLX/VivaReal
4. **Commit + Push** via @devops

### Prioridade 2: Integration
5. Verificar merge com Epic 2 (outro terminal) e Epic 4 (outro terminal)
6. Resolver conflitos se houver

### Prioridade 3: E2E Testing
7. Testar fluxo completo: CSV import → geocode → match → cross-ref → feed
8. Testar Run Now buttons no dashboard
9. Validar seed progress dashboard com dados reais

### Prioridade 4: Polish
10. Mover dedup cross-ref para RPC PostGIS (XREF-001)
11. Realtime subscription para feed badge
12. Map alert pins

## Credenciais (do handoff anterior)

- Supabase URL: https://hculsnvpyccnekfyficu.supabase.co
- Mapbox Token: pk.eyJ1Ijoic2lsdmFqMXplcm8iLCJhIjoiY21tdnN6ZmtmMDVtZTJyb3NtMHJ5YmFoOCJ9.rGTUD0aP...
- DB: 18+ tables (Epic 1 + 2 + 3 + 4), 662 edificios seed
- Vercel: https://app-caos-off.vercel.app (auto-deploy from master)
- Repo: https://github.com/silvaj1zero/real-state-moema

## Validacao Final

- Build: PASS (todas as rotas compilando, incluindo 7 API routes novas)
- Testes: 74/74 PASS (15 novos: 11 apify + 4 geocoding)
- Lint: 0 errors nos arquivos novos (1 warning pre-existente)
- TypeScript: 0 erros
