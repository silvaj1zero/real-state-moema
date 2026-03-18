# Cross-Validation Report: PRD x Arquitetura x UX

**Data:** 2026-03-18
**Autor:** Morgan (PM Agent, AIOX)
**Documentos validados:**
- `docs/prd.md` v2.0 (fonte de verdade)
- `docs/architecture/system-architecture.md` v1.0
- `docs/ux/frontend-spec.md` v1.0

**Veredicto geral:** APROVADO com observacoes menores. Boa consistencia entre os tres documentos. Gaps identificados sao de baixa severidade.

---

## 1. ERD vs PRD FRs — Cobertura das 34 FRs

### Status: APROVADO (32/34 cobertas diretamente)

**Todas as entidades criticas estao presentes no ERD:**

| Grupo de FRs | Tabelas ERD correspondentes | Status |
|---|---|---|
| FR-001 a FR-005 (Territorial) | `edificios`, `edificios_qualificacoes`, `epicentros` + queries PostGIS | OK |
| FR-006 a FR-007 (Cadastro/Qualificacao) | `edificios`, `edificios_qualificacoes` | OK |
| FR-008 a FR-010 (Leads/FISBO) | `leads` (com campos V1, pgcrypto, is_fisbo) | OK |
| FR-011 a FR-012 (Funil) | `leads.etapa_funil`, `funnel_transitions` | OK |
| FR-013 (Scripts) | `scripts` | OK |
| FR-014 (FROG) | `frog_contacts`, `leads.fonte_frog` | OK |
| FR-015 a FR-016 (ACM) | `acm_comparaveis` + queries PostGIS | OK |
| FR-017 a FR-018 (Referrals) | `referrals` | OK |
| FR-019 (Dashboard) | Dados derivados das tabelas existentes + `consultant_settings` | OK |
| FR-020 (Agendamento) | `agendamentos` (com Tecnica de Duas Opcoes: `opcao_2_data_hora`) | OK |
| FR-021 a FR-025 (Scraping/Automacao) | `scraped_listings` + pipeline Apify + Edge Functions | OK |
| FR-026 (My RE/MAX) | Sem tabela dedicada (export CSV/PDF) | OK - correto, nao requer tabela |
| FR-027 (Enriquecimento) | Via `scraped_listings` + Edge Functions | OK |
| FR-028 a FR-030 (Informantes) | `informantes`, `informantes_edificios`, `acoes_gentileza` | OK |
| FR-031 (Dossie) | `dossies` | OK |
| FR-032 (Checklist) | `checklists_preparacao` | OK |
| FR-033 (Diagnostico) | Derivado de `funnel_transitions` | OK |
| FR-034 (Clubes RE/MAX) | `consultant_settings.clube_remax_atual`, `vgv_acumulado` | OK |

### Gaps encontrados (baixa severidade):

**GAP-ERD-1: FR-022 (Seed Data) — tabela ausente para log de execucao de seed**
O seed data e mencionado em `edificios.origem = 'seed'` e `edificios.seed_source`, mas nao existe uma tabela de controle para rastrear execucoes de seed (quando rodou, quantos edificios carregou, status). Edge Function `seed-data` esta no diagrama, mas sem tabela de auditoria.
- **Severidade:** Baixa. Pode ser resolvido com log simples na tabela `intelligence_feed` tipo `'sistema'`.

**GAP-ERD-2: FR-029 (Calculo 5% informante) — campo parcialmente coberto**
O campo `split_informante` existe em `comissoes`, mas nao existe um campo ou view que calcule automaticamente o total acumulado por informante para exibicao no dashboard de informantes. E derivavel por query, mas nao esta documentado.
- **Severidade:** Baixa. Query de agregacao resolve.

**GAP-ERD-3: FR-004 (Expansao 80%) — sem tabela para historico de raio**
O `epicentros.raio_ativo_m` guarda o raio atual, mas nao existe historico de quando cada raio foi desbloqueado. Edge Function `expansion-calc` esta no diagrama.
- **Severidade:** Baixa. Pode usar `intelligence_feed` tipo `raio_desbloqueado` como historico.

---

## 2. UX vs PRD Screens — Cobertura das 8 Core Screens

### Status: APROVADO (8/8 cobertas)

| Core Screen (PRD s.3) | Tela UX | Status |
|---|---|---|
| 1. Mapa Principal | 2.2 Mapa Principal | OK |
| 2. Card do Edificio | 2.3 Card do Edificio (Bottom Sheet) | OK |
| 3. Funil de Vendas | 2.5 Funil de Vendas (Mobile Tabs) | OK |
| 4. Cadastro Rapido de Campo | 2.4 Cadastro Rapido de Campo | OK |
| 5. Dashboard de KPIs | 2.6 Dashboard de KPIs | OK |
| 6. ACM Generator | 2.8 ACM Generator | OK |
| 7. Central de Referrals | 2.9 Central de Referrals | OK |
| 8. Feed de Inteligencia | 2.7 Feed de Inteligencia | OK |

**Telas extras no UX (nao listadas como Core no PRD mas cobertas):**
- 2.1 Login — coberto pelo AC da Story 1.1
- 2.10 Checklist V1->V2 — coberto pela Story 2.6b (VETO PV #2)
- 2.11 Biblioteca de Scripts — coberto pela FR-013

**A UX tambem inclui Mapa de Cobertura PRD->UX (secao 7) com 27 FRs validados.**

### Gap encontrado:

**GAP-UX-1: FRs 022-024, 026-027 ausentes do mapa de cobertura UX**
A secao 7 do UX doc lista 27 FRs, mas omite FR-022 (Seed Data), FR-023 (Captei), FR-024 (Cross-referencing), FR-026 (My RE/MAX), FR-027 (Enriquecimento). Isso e aceitavel porque sao funcionalidades de backend/integracao sem tela dedicada, mas deveria estar documentado como "Backend-only, sem tela UX".
- **Severidade:** Informativa. Nao impacta implementacao.

**GAP-UX-2: FR-030 (Marketing de Gentileza registro) — sem tela detalhada**
O cadastro de acoes de gentileza esta referenciado no Card do Edificio > secao Informantes, mas nao possui wireframe dedicado do form de registro de gentileza (tipo, descricao, lembrete).
- **Severidade:** Baixa. O fluxo esta implicito na Story 2.3 Fase A.

---

## 3. Arquitetura vs UX — Consistencia de Componentes e API

### Status: APROVADO (alta consistencia)

**Nomes de componentes alinhados:**

| Conceito | Arquitetura | UX | Match? |
|---|---|---|---|
| Edificio base | `edificios` | Building / Edificio | OK |
| Qualificacao | `edificios_qualificacoes` | Via Card do Edificio | OK |
| Lead | `leads` | LeadCard (componente 3.3) | OK |
| Funil | `etapa_funil` enum | FunnelTabs (componente 3.4) | OK |
| Informante | `informantes` | Secao no Card Edificio | OK |
| Feed | `intelligence_feed` | FeedEvent (componente 3.6) | OK |
| Script | `scripts` | Biblioteca de Scripts (2.11) | OK |
| Referral | `referrals` | Central de Referrals (2.9) | OK |
| ACM | `acm_comparaveis` | ACM Generator (2.8) | OK |
| Agendamento | `agendamentos` | Fluxo V1/V2 (4.2, 4.3) | OK |
| Dossie | `dossies` | Fluxo V1->V2 (4.3) | OK |
| Checklist | `checklists_preparacao` | Tela 2.10 | OK |

**Patterns de API consistentes:**
- Offline: Arquitetura define IndexedDB + mutation queue + background sync; UX define indicadores visuais (badge offline, borda pontilhada, toast sync). Alinhados.
- Clustering: Arquitetura define Mapbox client-side clustering (ADR-003); UX define zoom behaviors de clustering. Alinhados.
- Raios: Arquitetura renderiza via turf/circle GeoJSON; UX especifica cores e toggle. Alinhados.
- PostGIS: Queries server-side para dados; rendering client-side para visualizacao. Separacao correta.

### Inconsistencia encontrada (micro):

**INC-1: Cor do raio de 2km**
- Arquitetura (secao 4.5): `2000m cor '#ef4444'` (vermelho Tailwind)
- UX (secao 5.1): `2km cor #DC1431` (vermelho RE/MAX)
- PRD: "2km (vermelho)" — nao especifica hex

Ambos sao "vermelho" mas hex diferentes. A UX e mais precisa (usa a cor do branding RE/MAX). A arquitetura usa o vermelho generico do Tailwind.
- **Resolucao:** Adotar #DC1431 (UX) como fonte de verdade para cores.
- **Severidade:** Trivial.

---

## 4. Principios Pedro Valerio — 3 VETOs

### Status: APROVADO (todos refletidos em ambos documentos)

| VETO PV | PRD | Arquitetura | UX |
|---|---|---|---|
| **#1 Seed Data** (mapa populado dia 1) | Story 1.7 | Edge Function `seed-data`, `edificios.origem='seed'`, `verificado=false` | Mapa 2.2: badge "auto" vs "verificado", botoes Confirmar/Descartar no Feed |
| **#2 Checklist V1->V2** | Story 2.6b | Tabela `checklists_preparacao` com tipo `'v1_para_v2'`, `notificacao_24h_enviada` | Tela 2.10 Checklist V1->V2 completa com itens, progresso, Home Staging WhatsApp |
| **#3 ACM manual-first** | FR-015 AC8, Story 3.1 | `acm_comparaveis.fonte` enum inclui `'manual'`, pipeline scraping desacoplado (P4), graceful degradation documentada | ACM Generator 2.8: botao "Adicionar comparavel manual", funciona sem scraping |

**Principios PV transversais tambem presentes:**

| Principio | Arquitetura | UX |
|---|---|---|
| Funciona sozinho antes de externo | P1, P4, Graceful Degradation (secao 6.7), CSV fallbacks | Offline-first UX (6.4), ACM manual, Referrals unilateral |
| Impossibilitar caminho errado | RLS, enums validados, UNIQUE constraints | Guardrails de retrocesso no funil (justificativa obrigatoria, alerta visual permanente) |
| Automacao sugere, humano decide | `comissoes.confirmado = false default`, Edge Functions como sugestores | Comissoes com confirmacao manual, seed data com Confirmar/Descartar |

---

## 5. Separacao edificios / edificios_qualificacoes

### Status: APROVADO

A separacao esta presente e consistente nos tres documentos:

| Documento | Como aparece |
|---|---|
| **PRD** | NFR-005 + ALERTA Arquitetural PV (secao 4) + Story 1.3 AC8 |
| **Arquitetura** | ERD com tabelas separadas, ADR-001 explicitando decisao, RLS policies distintas, queries com LEFT JOIN |
| **UX** | Transparente para o usuario — card do edificio combina ambas as tabelas. Seed data em `edificios` sem `qualificacoes` aparece como pin cinza "Nao Visitado" |

**Detalhes do ERD:**
- `edificios`: id, nome, endereco, coordinates, bairro, cep, cidade, estado, origem, seed_source, verificado, created_by
- `edificios_qualificacoes`: id, edificio_id (FK), consultant_id (FK), tipologia, padrao, status_varredura, abertura_corretores, oportunidades_count, notas, is_fisbo_detected + UNIQUE(edificio_id, consultant_id)

Correto. Multi-tenant ready.

---

## 6. Contradicoes ou Gaps

### Contradicoes encontradas: 1 trivial

**INC-1 (ja reportada acima):** Cor hex do raio 2km difere entre Arquitetura (#ef4444) e UX (#DC1431). Ambas significam "vermelho". Usar UX como fonte de verdade.

### Gaps encontrados: 5 (todos baixa severidade)

| ID | Gap | Severidade | Sugestao |
|---|---|---|---|
| GAP-ERD-1 | Sem log de execucao de seed data | Baixa | Usar `intelligence_feed` tipo `sistema` |
| GAP-ERD-2 | Acumulado 5% informante nao documentado | Baixa | Query de agregacao, doc na story |
| GAP-ERD-3 | Sem historico de desbloqueio de raio | Baixa | Usar `intelligence_feed` tipo `raio_desbloqueado` |
| GAP-UX-1 | 7 FRs backend ausentes do mapa UX s.7 | Informativa | Adicionar nota "backend-only" |
| GAP-UX-2 | Form de gentileza sem wireframe | Baixa | Detalhar na story 2.3 |

### Ausencia de contradicoes estruturais

Nao foram encontradas contradicoes onde "arquitetura diz X e UX diz Y" em funcionalidades. Os tres documentos estao alinhados na:
- Stack tecnologica (Next.js, Supabase, Mapbox, Workbox, React-PDF, Apify)
- Estrategia offline-first
- Funil de 5 etapas
- Separacao base/qualificacao
- Pipeline de scraping desacoplado
- Prioridade mobile-first com Kanban apenas em desktop

---

## Resumo Executivo

| Dimensao | Resultado | Gaps |
|---|---|---|
| ERD vs PRD | 32/34 FRs cobertos diretamente | 3 gaps menores (derivaveis) |
| UX vs PRD Screens | 8/8 Core Screens cobertos | 2 gaps informativos |
| Arq vs UX Consistencia | Alta | 1 inconsistencia trivial (cor hex) |
| VETOs Pedro Valerio | 3/3 refletidos em ambos docs | Nenhum gap |
| Separacao edificios | Presente e correta | Nenhum gap |
| Contradicoes estruturais | Nenhuma | — |

**Conclusao:** Os documentos estao prontos para execucao. Os gaps identificados sao todos resolviveis durante a implementacao nas stories individuais, sem necessidade de revisao dos documentos de arquitetura ou UX.

---

*Cross-Validation Report v1.0 — Morgan (PM Agent) — Synkra AIOX — 2026-03-18*
