# Research — Captação Leads Imobiliários Zona Sul SP (FISBO + Multi-fonte)

**Data início:** 2026-05-14
**Pipeline:** tech-research v3.2 (ultrathink) + spy-bench-analyst + code-anatomist
**Roteiro:** 10 etapas (dor → problema → research → estratégia → research deep → revisão → validação → bench → code anatomy → PRD)

## Índice de artefatos

| # | Arquivo | Fase | Status |
|---|---|---|---|
| 00 | `00-problem.md` | Fase 0 — Problem framing | ✅ Concluído |
| 01 | `01-deep-research-prompt.md` | Fase 0 — Research prompt | ✅ Concluído |
| 02 | `02-research-report.md` | Fase 1 — Wave 1 Discovery | ✅ Concluído |
| 03 | `03-recommendations.md` | Fase 1 — Wave 1 Recomendações | ✅ Concluído |
| — | `wave-1-summary.md` | Fase 1 — Compressão wave 1 | ✅ Concluído |
| 04 | `04-validation-multi-llm.md` | Fase 2 — Wave 2 Validation (--deep) | ✅ Concluído |
| — | `wave-2-summary.md` | Fase 2 — Compressão wave 2 | ✅ Concluído |
| — | `curiosity_queue.yaml` | Cross-phase | ✅ Atualizado (Wave 2 v2) |
| — | `evolving_report.md` | Cross-phase | ✅ Atualizado (Wave 2) |
| — | `execution-log.jsonl` | Cross-phase | ✅ Atualizado (Wave 2) |

## Artefatos downstream (fora desta pasta)

| Pasta | Conteúdo | Fase |
|---|---|---|
| `docs/bench/{a}-vs-{b}/` | Comparativos estruturados | 3 |
| `docs/code-anatomy/{repo}/` | Engenharia reversa | 4 |
| `docs/prd/EPIC-7-LEAD-PROSPECTING.md` | PRD final | 5 |
| `docs/stories/7.*.story.md` | Stories executáveis | 5 |

## TL;DR (atualizado após cada fase)

**Wave 2 (Validation --deep) — concluída 2026-05-14, coverage 90%, decisão STOP-AND-PROCEED-PHASE-3-BENCH**

### Decisões P0 destravadas pela Wave 2

- **ITBI SP NÃO publica CPF/CNPJ adquirente/transmitente** (sigilo fiscal). Feature L3 reduzida para Δ-preço-por-bairro/rua — SEM grafo-por-pessoa/holding. Mantém valor analítico forte; remove ambição irrealista.
- **Crawlee TypeScript vence Crawlee Python** no contexto Next.js+Supabase. Python isolado em container só para subsistema CNPJ (rictom/cnpj-sqlite). Dois runtimes, comunicação só via DB views.
- **Stack híbrida cron-Supabase (Wave A) + LangGraph parcial (Wave B só NLP) tem precedente FORTE** — AppFolio Realm-X roda exatamente esse padrão em produção (10h+ economia/property manager/semana). H-003 e H-005 CONFIRMED.
- **Risco LGPD para imobiliária é MÉDIO-BAIXO operacional, ESCALANDO regulatoriamente.** Nenhuma sanção pública contra imobiliária em 2024-2026; ANPD foco em Meta/WhatsApp e IA generativa. MP 1.317/2025 transformou ANPD em agência regulatória oficial. Counsel padrão RE/MAX serve Wave A; especialista reservado se passar 10k leads/mês.
- **3 decisões binárias prontas para Phase 3 bench:** (1) Crawlee TS vs PY, (2) Apify cloud vs Crawlee self-hosted, (3) cron-Supabase puro vs LangGraph desde dia 1.
- **OSS BR-focado existe:** `19950512/buscacreci` (15⭐, ativo) é feed direto para detecção FISBO via ausência CRECI. `marco-jardim/niteroi-itbi-heatmap` é referência arquitetural transferível.
- **QuintoAndar reverse-engineering commoditizado:** actor `brasil-scrapers/quinto-andar-api` já existe na Apify Store — não vale fazer in-house.

### Wave 1 (Discovery) — concluída 2026-05-14, coverage 78%

- **Open source first é viável.** Crawlee + rictom/cnpj-sqlite + GeoSampa IPTU + dataset ITBI PMSP + Brasil.IO sócios cobrem 80% do ingest sem custo de licença.
- **Tipologia 5-categorias (A=FISBO, B=Imob, C=Constr, D=Adm, E=Holding)** + heurística determinística é o caminho responsável para Wave A; ML entra só após Luciana validar 200+ leads anotados.
- **LGPD não bloqueia, mas exige** LIA + cifragem + opt-out + audit log antes do 1º scrape PF.
- **Achado crítico:** `cuducos/minha-receita` (1.5k⭐) ARCHIVED 2026-01-04 — runtime morto, substituto: rictom/cnpj-sqlite.

Ver `wave-2-summary.md` e `wave-1-summary.md` para detalhes executivos.

## Quick context

- **End-user**: Luciana Borba (RE/MAX Galeria Moema)
- **Geografia**: Moema, Vila Olímpia, Itaim Bibi (epicentro Rua Alvorada)
- **Stack receptor**: Next.js 15 + Supabase + Mapbox + Apify
- **Termo do projeto**: FISBO (não FSBO)
- **Constraint**: Open source first, LGPD documentada (não bloqueante), fontes pagas em 2ª onda
- **Output final esperado**: PRD Epic 7 + stories executáveis para @dev

Ver `00-problem.md` para framing completo.
