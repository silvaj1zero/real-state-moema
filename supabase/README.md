# Supabase — Real State Moema

## Pre-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli) v2.x+
- Docker Desktop (para ambiente local)
- Credenciais em `.env` (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)

## Setup Local

```bash
# Iniciar Supabase local (requer Docker)
supabase start

# Aplicar todas as migrations
supabase db reset

# Verificar status
supabase status
```

## Setup Remoto

```bash
# Linkar projeto (requer project-ref do dashboard)
supabase link --project-ref <your-project-ref>

# Aplicar migrations pendentes
supabase db push
```

## Criar Nova Migration

```bash
supabase migration new <nome_descritivo>
# Editar o arquivo gerado em supabase/migrations/
```

## Cadeia de Migrations

| Ordem | Arquivo | Conteúdo |
|-------|---------|----------|
| 1 | `20260318000001_000_extensions_and_types.sql` | PostGIS, uuid-ossp, pg_trgm + todos os ENUMs |
| 2 | `20260318000002_001_base_foundation.sql` | Epic 1: edificios, epicentros, consultant_settings, qualificacoes + RPCs geoespaciais |
| 3 | `20260318000003_002_epic2_methodology.sql` | Epic 2: leads, informantes, agendamentos, scripts, frog_contacts, checklists, dossies |
| 4 | `20260318000004_003_epic3_intelligence.sql` | Epic 3: scraped_listings, acm_comparaveis, listing_cross_refs, intelligence_feed + RPCs |
| 5 | `20260318233613_epic3_rpc_functions.sql` | Epic 3: RPCs adicionais (geocoding, insert with coords) |
| 6 | `20260318233614_004_epic4_partnerships.sql` | Epic 4: referrals, safari_events, comissoes, marketing_plans, clubes_remax |

## Tabelas por Epic

**Epic 1 (Foundation):** edificios, edificios_qualificacoes, epicentros, consultant_settings
**Epic 2 (Methodology):** leads, informantes, informantes_edificios, acoes_gentileza, funnel_transitions, agendamentos, scripts, frog_contacts, checklist_preparacao, dossies
**Epic 3 (Intelligence):** scraped_listings, acm_comparaveis, listing_cross_refs, intelligence_feed
**Epic 4 (Partnerships):** referrals, safari_events, safari_event_rsvps, comissoes, marketing_plans, clubes_remax_thresholds

## RPC Functions

| Function | Migration | Uso |
|----------|-----------|-----|
| `fn_edificios_no_raio` | 001 | Edifícios dentro de raio (PostGIS) |
| `fn_cobertura_raio` | 001 | Estatísticas de cobertura por raio |
| `fn_comparaveis_no_raio` | 003 | Comparáveis ACM dentro de raio |
| `fn_match_listing_edificio` | 003 | Match listing→edifício por proximidade |
| `fn_set_listing_coordinates` | 003b | Atualizar coordenadas de listing |
| `fn_insert_scraped_listing_with_coords` | 003b | Inserir listing com coordenadas |

## Notas

- **PostGIS:** Todas as coordenadas usam `GEOGRAPHY(Point, 4326)` (WGS84).
- **RLS:** Policies devem ser configuradas por tabela (Story 5.2).
- **Schema reconstruído** a partir de `types.ts` — Story 5.1 (Audit PV).
