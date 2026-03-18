# Project Handoff — Real State Moema

**Data:** 2026-03-18
**De:** Sessão AIOX completa (PRD → Arquitetura → UX → Dev → QA → Deploy)
**Para:** Próxima sessão de desenvolvimento

---

## Status Atual

### Deployed

**URL:** https://real-state-moema.vercel.app
**Repo:** https://github.com/silvaj1zero/real-state-moema

### Épicos Implementados

| Epic | Status | Commit | Deploy |
|------|--------|--------|--------|
| **Epic 1** — Foundation, Mapa & Registro | ✅ Implementado | Incluído | ✅ Vercel |
| **Epic 2** — Leads, Funil & Metodologia RE/MAX | ✅ Implementado | `eebdd1d` + fixes | ✅ Vercel |
| **Epic 3** — Inteligência, ACM & Automação | ⏺ Stories prontas, NÃO implementado | — | — |
| **Epic 4** — Parcerias Ganha/Ganha & Escala | ⏺ Stories prontas, NÃO implementado | — | — |

### Git Log

```
30b2013 fix: remove dnd-kit dependency, clean npm install for Vercel deploy
b5aa95c fix: resolve build errors for Vercel deploy
eebdd1d feat: implement Epic 2 — Leads, Funil de Vendas & Metodologia RE/MAX
a9843c8 docs: add 27 stories for Epics 2-4, fix migration 003 schema gaps
b355ac0 chore: initial project setup — PRD v2.0, docs, AIOX config
```

---

## Artefatos Completos

### Documentação (docs/)

| Arquivo | Conteúdo | Linhas |
|---------|----------|--------|
| `docs/prd.md` | PRD v2.0 — 34 FRs, 7 NFRs, 4 épicos | 483 |
| `docs/architecture/system-architecture.md` | ERD, PostGIS, offline, scraping pipeline | 1.894 |
| `docs/architecture/schema.sql` | Schema completo (24 tabelas) | 1.943 |
| `docs/architecture/migrations/001_epic1_foundation.sql` | Tables: consultores, epicentros, edificios, edificios_qualificacoes | 232 |
| `docs/architecture/migrations/002_epic2_methodology.sql` | Tables: leads, funnel_transitions, informantes, agendamentos, scripts, etc. | 258 |
| `docs/architecture/migrations/003_epic3_intelligence.sql` | Tables: acm_comparaveis, scraped_listings, intelligence_feed, dossies + fixes PO | ~300 |
| `docs/architecture/migrations/004_epic4_partnerships.sql` | Tables: referrals, comissoes, safari_events, marketing_plans | ~220 |
| `docs/ux/frontend-spec.md` | 11 telas, 7 componentes, 4 fluxos | 2.029 |
| `docs/research/api-integration-research.md` | 9 fontes, custos, verificações | 591 |
| `docs/research/api-verification-results.md` | OSM Overpass: 16.595 edifícios verificados | ~130 |
| `docs/research/google-places-verification.md` | ~100-400 edifícios, type=apartment_building | ~200 |
| `docs/research/geosampa-iptu-verification.md` | Fonte premium: unidades, área, padrão, ano | ~200 |
| `docs/reviews/cross-validation-report.md` | PRD×Arch×UX — zero contradições | 215 |
| `docs/qa/epic1-test-plan.md` | Test plan Epic 1 | ~180 |
| `docs/qa/epic1-field-test-protocol.md` | Protocolo teste campo 5 dias | ~200 |
| `docs/presentation/project-overview.md` | 15 slides para stakeholders RE/MAX | ~400 |
| `docs/guides/user-guide-v1.md` | Guia usuário Epic 1 | ~300 |

### Stories (docs/stories/)

| Epic | Stories | Status |
|------|---------|--------|
| Epic 1 | 1.1-1.7 (7 stories) | ✅ Implementadas |
| Epic 2 | 2.1-2.10 + 2.6b (11 stories) | ✅ Implementadas |
| Epic 3 | 3.1-3.8 (8 stories) | ✅ Draftadas, PO validated GO |
| Epic 4 | 4.1-4.8 (8 stories) | ✅ Draftadas, PO validated GO |

### Código (app/src/)

```
app/src/
├── app/                    # Next.js routes
│   ├── (auth)/login/       # Login page
│   ├── dashboard/          # Dashboard KPIs
│   ├── funil/              # Funnel view
│   ├── acm/                # ACM (placeholder)
│   └── home-staging/       # Home staging (placeholder)
├── components/
│   ├── building/           # BuildingCard, QuickRegisterForm, FisboBadge, FisboToggle
│   ├── checklist/          # ChecklistV2, HomeStageShare (VETO PV #2)
│   ├── dashboard/          # DashboardPage, KPICard, 6 sections, EmptyState
│   ├── diagnostico/        # FunnelDiagnostico, DiagnosticoCard
│   ├── expansion/          # RadiusProgressBar, ExpansionNotification, NextBlockSuggestion
│   ├── frog/               # FrogDashboard, FrogContactForm, FrogContactList, FrogMapFilter
│   ├── funnel/             # FunnelPage, FunnelTabs, FunnelKanban, TransitionModal, LeadTimeline
│   ├── informante/         # 7 components (Form, Card, Detail, List, Dashboard, Gentileza, Comissao)
│   ├── lead/               # LeadForm, LeadCard, LeadList, ChipSelect, PhotoUploader
│   ├── layout/             # BottomTabBar, HeaderBar
│   ├── map/                # MapView, MapContainer, RadiusCircles, GPSPin, etc.
│   ├── scheduling/         # ScheduleModal, AgendaList, FollowUpAlert, V2Prompt, UpcomingWidget
│   ├── scripts/            # ScriptLibrary, ScriptCard, ScriptQuickAccess
│   └── ui/                 # shadcn/ui (Button, Input, Label, Card)
├── hooks/                  # 15+ TanStack Query hooks
├── store/                  # 6 Zustand stores
├── lib/
│   ├── supabase/           # client, server, middleware, types
│   ├── notifications/      # push.ts (Web Push API)
│   ├── offline/            # db.ts, sync.ts (IndexedDB + Workbox)
│   └── seed/               # seed-buildings.ts, overpass.ts
└── test/                   # setup.ts
```

---

## Próximo Epic: Epic 3 — Inteligência, ACM & Agentes de Automação

### Sequência de implementação (do PRD)

```
3.1 (ACM manual-first) → 3.4 (Agente FISBO) → 3.2 (Dossiê PDF) → 3.7 (Feed) → 3.3 (Home Staging) → 3.6 (Cross-ref) → 3.8 (Enriquecimento) → 3.5 (Pré-mapeamento avançado)
```

### Migration necessária

Executar `docs/architecture/migrations/003_epic3_intelligence.sql` no Supabase antes de implementar. Inclui:
- `acm_comparaveis` — dados para ACM
- `scraped_listings` — resultados do scraping
- `intelligence_feed` — feed de alertas
- `dossies` — dossiês PDF gerados
- Fixes PO: campos GeoSampa IPTU, listing_cross_refs, leads.enrichment_data

### Princípio chave (VETO PV #3)

**ACM funciona em modo manual-only.** Scraping é acelerador, não dependência. O sistema NUNCA depende de scraping pra ter valor.

### Stories prontas (8, PO validated)

| Story | Título | Complexidade | Must/Should |
|-------|--------|-------------|-------------|
| 3.1 | ACM Semi-Automatizada (VETO PV #3) | XL | Must |
| 3.2 | Dossiê/Showcase V2 (PDF) | L | Must |
| 3.3 | Home Staging Automatizado | M | Should |
| 3.4 | Agente de Varredura FISBO | XL | Must |
| 3.5 | Pré-Mapeamento Geográfico Avançado | XL | Should |
| 3.6 | Cross-Referencing entre Portais | L | Should |
| 3.7 | Feed de Inteligência e Alertas | L | Must |
| 3.8 | Enriquecimento de Leads | M | Should |

### Dependências externas

| Serviço | Status | Custo |
|---------|--------|-------|
| Apify (scraping ZAP/OLX) | Precisa conta Starter ($49/mês) | $49/mês |
| Google Places API | Verificado, free tier $200/mês | $0 |
| GeoSampa IPTU | Parcialmente verificado | $0 |
| React-PDF | Já no package.json | $0 |

### Wave plan sugerido (paralelização)

```
Wave 1: 3.1 (ACM) — fundação, funciona com dados manuais
Wave 2: 3.4 (Agente FISBO) + 3.7 (Feed) — em paralelo
Wave 3: 3.2 (Dossiê PDF) — consome ACM
Wave 4: 3.3 (Home Staging) + 3.6 (Cross-ref) + 3.8 (Enriquecimento) — em paralelo
Wave 5: 3.5 (Pré-mapeamento) — último, complementa seed data
```

---

## Depois do Epic 3: Epic 4 — Parcerias Ganha/Ganha & Escala

### Sequência

```
4.1 (Referrals) → 4.2 (Comissões) → 4.3 (Clubes) → 4.8 (Plano Marketing) → 4.7 (Safari) → 4.4 (Captei CSV) → 4.6 (Multi-tenant) → 4.5 (My RE/MAX)
```

### Migration: `004_epic4_partnerships.sql`

### Stories prontas (8, PO validated)

---

## Fluxo AIOX para retomar

```
1. @dev *develop 3.1    — Implementar stories Epic 3
   (ou @aiox-master para orquestrar waves paralelas)
2. @qa *qa-gate epic-3  — Quality gate
3. @devops *push        — Commit + push
4. @devops deploy       — Vercel production
5. Repetir para Epic 4
```

---

## Itens pendentes (não bloqueantes)

| Item | Prioridade | Quando |
|------|-----------|--------|
| pgcrypto encryption (16 TODOs no código) | MEDIUM | Quando DB encryption keys configuradas |
| Push notifications em device real | LOW | Antes de mostrar pra Luciana |
| Teste de campo com Luciana (Epic 1+2) | HIGH | Antes de investir em Epic 3 |
| Verificações manuais do @analyst (7/10 pendentes) | MEDIUM | Antes do Epic 3 |
| Apify account setup | HIGH (para Epic 3) | Antes de Story 3.4 |

---

## Princípios Pedro Valério (vigentes em todo o projeto)

1. **Funciona sozinho antes de depender de externo** — Seed data, ACM manual-first, referrals unilateral, CSV fallbacks
2. **Impossibilitar o caminho errado** — Mapa populado dia 1, checklist V1→V2, retrocesso com guardrails, comissão com confirmação manual
3. **Automação sugere, humano decide** — Especialmente com dinheiro (comissões) e dados (ACM)

---

## Credenciais e Acessos

| Serviço | Configuração |
|---------|-------------|
| Supabase | `.env` local (DB password configurado) |
| Mapbox | `.env.local` no app/ |
| Vercel | CLI autenticado, env vars configuradas |
| GitHub | `silvaj1zero/real-state-moema` (privado) |

**NUNCA commitar `.env` ou `.env.local` — protegidos por `.gitignore`.**

---

*Handoff Document — Gage (DevOps) — Synkra AIOX — 2026-03-18*
