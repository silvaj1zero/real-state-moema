# Migrations por Épico

Migrations derivadas de `schema.sql` (fonte única de verdade), divididas por épico para execução incremental.

| Migration | Épico | Stories | Tabelas |
|-----------|-------|---------|---------|
| `001_epic1_foundation.sql` | Epic 1 | 1.1-1.7 | extensions, consultores, epicentros, edificios, edificios_qualificacoes, consultant_settings + enums + indexes + functions |
| `002_epic2_methodology.sql` | Epic 2 | 2.1-2.10, 2.6b | leads, funnel_transitions, agendamentos, informantes, informantes_edificios, acoes_gentileza, scripts, frog_contacts, checklists_preparacao + triggers + seed scripts |
| `003_epic3_intelligence.sql` | Epic 3 | 3.1-3.8 | scraped_listings, acm_comparaveis, dossies, intelligence_feed + triggers (FISBO, price change) + functions (matching, ACM) |
| `004_epic4_partnerships.sql` | Epic 4 | 4.1-4.8 | referrals, comissoes, safari_events, safari_event_rsvps, marketing_plans, clubes_remax_thresholds + RLS ativação + seed clubes |

## Como executar

```bash
# Epic 1 (início do projeto)
psql -f 001_epic1_foundation.sql

# Epic 2 (após Epic 1 deployed)
psql -f 002_epic2_methodology.sql

# ...etc
```

Cada migration é executável independentemente **na ordem correta** (001 antes de 002, etc.) pois há dependências de FK entre épicos.

**Fonte de verdade:** `schema.sql` contém o schema completo. As migrations são subconjuntos para execução incremental.
