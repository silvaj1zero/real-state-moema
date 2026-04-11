# AC Alignment Report — Audit PV (Finding F3)

**Data:** 2026-04-11  
**Auditor:** Dex (Story 5.3 — Realinhamento de ACs)  
**Escopo:** Todas as 40 stories com status Done ou InProgress  
**Objetivo:** Verificar que arquivos listados no File List de cada story existem no repositório  

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total de stories auditadas | 14 (Done ou InProgress) |
| Stories sem discrepâncias | 14 |
| Arquivos verificados | 98 |
| Arquivos existentes | 98 (100%) |
| Arquivos ausentes | 0 |
| Correções necessárias | 1 (Story 3.5 — termos de AC) |

**Conclusão: Todos os arquivos listados nos File Lists existem no repositório. A única discrepância encontrada foi terminológica (Edge Function vs API Route em Story 3.5), não de implementação.**

---

## Auditoria por Story

### Epic 1 — Fundação, Mapa & Registro de Campo

| Story | Status | Arquivos verificados | Resultado |
|-------|--------|---------------------|-----------|
| 1.1 | InProgress | 0 (File List vazio — aguarda implementação) | ✓ OK |

### Epic 2 — Leads, Funil de Vendas & Metodologia RE/MAX

| Story | Status | Arquivos verificados | Resultado |
|-------|--------|---------------------|-----------|
| 2.1 | InProgress | 8 | ✓ Todos existem |
| 2.7 | InProgress | 6 | ✓ Todos existem |

**Arquivos auditados (2.1):** `types.ts`, `store/leads.ts`, `useLeads.ts`, `ChipSelect.tsx`, `PhotoUploader.tsx`, `LeadForm.tsx`, `LeadList.tsx`, `LeadCard.tsx`

**Arquivos auditados (2.7):** `useRadiusExpansion.ts`, `RadiusProgressBar.tsx`, `ExpansionNotification.tsx`, `NextBlockSuggestion.tsx`, `RadiusDashboard.tsx`, `RadiusCircles.tsx`

### Epic 3 — Inteligência, ACM & Agentes de Automação

| Story | Status | Arquivos verificados | Resultado |
|-------|--------|---------------------|-----------|
| 3.4 | Done | 12 | ✓ Todos existem |
| 3.5 | Done | 9 | ✓ Todos existem (AC corrigido) |
| 3.6 | Done | 6 | ✓ Todos existem |

**Story 3.5 — Discrepância terminológica corrigida:**
- ACs 1-4 referenciavam "Supabase Edge Function" — tecnologia NÃO usada na implementação real
- Implementação real usa Next.js API Routes em `app/src/app/api/cron/`
- ACs corrigidos em 2026-04-11 (Story 5.3)

**Arquivos auditados (3.4):** `admin.ts`, `apify.ts`, `apify.test.ts`, `geocoding.ts`, `geocoding.test.ts`, `scrape-portals/route.ts`, `geocode-listings/route.ts`, `match-listings/route.ts`, `useAgentOps.ts`, `vercel.json`, `docs/architecture/migrations/003b_epic3_rpc_functions.sql`, `AgentDashboard.tsx`, `index.ts`

**Arquivos auditados (3.5):** `seed-google-places/route.ts`, `seed-osm-advanced/route.ts`, `seed-geosampa-iptu/route.ts`, `useAdvancedSeed.ts`, `AdvancedSeedDashboard.tsx`, `seed/index.ts`, `types.ts`, `vercel.json`, `retry.ts`

**Arquivos auditados (3.6):** `cross-reference/route.ts`, `useCrossRefs.ts`, `CrossRefPanel.tsx`, `ListingTimelineChart.tsx`, `AgentDashboard.tsx`, `agents/index.ts`

### Epic 4 — Parcerias Ganha/Ganha & Escala

| Story | Status | Arquivos verificados | Resultado |
|-------|--------|---------------------|-----------|
| 4.1 | InProgress | 14 | ✓ Todos existem |
| 4.2 | InProgress | 4 | ✓ Todos existem |
| 4.3 | InProgress | 3 | ✓ Todos existem |
| 4.4 | InProgress | 3 | ✓ Todos existem |
| 4.5 | InProgress | 1 | ✓ Todos existem |

**Arquivos auditados (4.1):** `useReferrals.ts`, `ReciprocityMetrics.tsx`, `PartnerCard.tsx`, `PartnerForm.tsx`, `ReferralForm.tsx`, `ReferralPipeline.tsx`, `ReferralCard.tsx`, `CreateLeadFromReferralModal.tsx`, `ReferralHistory.tsx`, `PartnerList.tsx`, `parceiros/page.tsx`, e outros

**Arquivos auditados (4.2):** `useComissoes.ts`, `ComissaoForm.tsx`, `comissoes/page.tsx`, `types.ts`

**Arquivos auditados (4.3):** `useClubes.ts`, `clubes/page.tsx`, `types.ts`

**Arquivos auditados (4.4):** `useCapteiImport.ts`, `captei/page.tsx`, `package.json`

**Arquivos auditados (4.5):** `integracoes/page.tsx`

### Epic 5 — Correção de Dívida Técnica

| Story | Status | Arquivos verificados | Resultado |
|-------|--------|---------------------|-----------|
| 5.1 | Done | 7 | ✓ Todos existem |
| 5.4 | Done | 21 | ✓ Todos existem |
| 5.6 | Done | 3 | ✓ Todos existem |

**Arquivos auditados (5.1):** `supabase/migrations/20260318000001_*.sql` (5 arquivos), `supabase/README.md`

**Arquivos auditados (5.4):** `ErrorBanner.tsx`, `useLeads.test.ts`, `useComissoes.test.ts`, `useBuildings.test.ts`, `useReferrals.test.ts`, `useFunnel.test.ts`, `useAcm.test.ts`, e 14 hooks/screens modificados

**Arquivos auditados (5.6):** `docs/architecture/adr-001-api-routes-vs-edge-functions.md`, `docs/architecture/adr-template.md`, `.gitignore`

---

## Discrepâncias Encontradas

### D001 — Story 3.5: Terminologia de Edge Function (CORRIGIDA)

| Campo | Antes | Depois |
|-------|-------|--------|
| AC1 | "Supabase Edge Function `seed-advanced-data`" | "Next.js API Routes (`app/src/app/api/cron/`)" |
| AC2 | "Edge Function `seed-google-places-advanced`" | "Next.js API Route `app/src/app/api/cron/seed-google-places/route.ts`" |
| AC3 | "Edge Function `seed-osm-advanced`" | "Next.js API Route `app/src/app/api/cron/seed-osm-advanced/route.ts`" |
| AC4 | "Edge Function `seed-geosampa-iptu`" | "Next.js API Route `app/src/app/api/cron/seed-geosampa-iptu/route.ts`" |
| Technical Notes | "Triggers: Database webhook... invoca Edge Function" | "Cron: Next.js API Routes agendadas via vercel.json" |

**Status:** Corrigida em 2026-04-11 por Story 5.3

---

## Checklist de Validação para Futuras Stories Done

Antes de marcar uma story como Done, verificar:

- [ ] (a) Todos os arquivos listados no File List existem no repositório
- [ ] (b) Os ACs descrevem a implementação REAL (tecnologia, nomes de arquivos, APIs)
- [ ] (c) Termos técnicos nos ACs correspondem ao código (ex: Next.js API Route ≠ Edge Function)
- [ ] (d) Arquivos de teste existem para funcionalidades novas
- [ ] (e) Change Log da story registra data e responsável pelas alterações

*Este checklist deve ser adicionado ao QA Gate checklist padrão.*

---

## Próximos Passos

1. **Epic 1 (stories 1.2–1.7):** Status Ready — audit após implementação
2. **Epic 2 (stories 2.2–2.6, 2.8–2.10):** Status Ready — audit após implementação  
3. **Epic 3 (stories 3.1–3.3, 3.7–3.8):** Status Ready — audit após implementação
4. **Re-audit periódico:** Executar este audit ao marcar cada story como Done

---

*Gerado por Story 5.3 — AC Alignment Audit PV | 2026-04-11*
