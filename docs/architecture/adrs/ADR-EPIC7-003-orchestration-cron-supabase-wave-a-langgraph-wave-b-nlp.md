# ADR-EPIC7-003: Orquestracao cron-Supabase Wave A; LangGraph somente Wave B no NLP

**Date:** 2026-05-14
**Status:** Accepted
**Epic:** 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte

## Context

Wave 1 (research) sugeriu LangGraph como orchestrator para o pipeline multi-source do Epic 7. Wave 2 (research) escalonou para stack hibrida cron-Supabase + LangGraph (apenas no no NLP) baseada em AppFolio Realm-X precedent. Phase 3 bench (`cron-supabase-vs-langgraph-day1`) quantificou:

| Dimensao (peso) | cron-Supabase | LangGraph day-1 |
|---|---|---|
| Complexity overhead (15%) | 92 | 55 |
| Native Supabase observability (10%) | 95 | 50 |
| Cost (12%) | 100 | 35 |
| Determinism (13%) | 100 | 70 |
| Fit for volume Zona Sul (10%) | 95 | 80 |
| Team familiarity (10%) | 92 | 55 |
| **Total** | **91.00** | **65.55** |

LangGraph day-1 adicionaria ~R$ 760/mes (Plus tier + LangSmith $39/user) para resolver um problema determinista (7-step ETL) que LangGraph deliberadamente NAO enforce.

## Decision

**Wave A: pg_cron + Supabase Edge Functions + status-tables (deterministic ETL only). Zero token cost.**

**Wave B: LangGraph subgraph isolado nos NOs com decisao LLM real (classificador NLP de urgencia/motivacao). O graph determinista Wave A permanece intacto.**

Arquitetura:
```
Wave A (deterministic):
  pg_cron schedule
    -> Edge Function (synchronous, <=5s) trigger
       -> Apify run start
          -> webhook on complete
             -> Edge Function (enrichment)
                -> status table update
  Status tables:
    - crawl_runs (id, portal, status, started_at, finished_at, stats)
    - crawl_requests (id, run_id, url, status_code, duration_ms, retries)
    - crawl_failures (id, run_id, url, error, retry_count)

Self-healing:
  Secondary cron (every 5min) -> fn_mark_stale_runs() -> retry stale

Wave B (LLM steps):
  Edge Function "classify-anuncio" boundary:
    Input: { listing_id: uuid, text: string }
    Output: { urgency_signal: 'high'|'medium'|'low', motivation_hint: text }
    Implementation Wave A: returns null (deterministic only)
    Implementation Wave B: invokes LangGraph subgraph at langsmith-hosted endpoint
```

**Edge Function constraint:** todas funcoes invocadas via pg_cron Webhook UI tem timeout 5s (gotcha conhecida). Tarefas longas enfileiram em `pgmq` (Postgres Message Queue) e workers async consomem.

## Alternatives Considered

| Alternativa | Avaliada como | Por que rejeitada |
|---|---|---|
| **LangGraph day-1 para tudo** | Avaliada Wave 1 | $760/mes plataforma; tokens; abstracao desnecessaria para ETL determinista; bench score 65.55 |
| **Prefect (Python)** | Avaliada Wave 1 | Adicionaria runtime Python alem do CNPJ ETL; overkill para volume Zona Sul; sem precedente real estate de mesma escala |
| **Temporal** | Avaliada Wave 1 | Overkill para volume <100k/mes; complexidade operacional alta; reavaliar pos-Wave C |
| **Airflow** | Avaliada Wave 1 | Mesmo problema Prefect — runtime extra, sem ROI volume atual |
| **CrewAI / AutoGen** | Avaliada Wave 1 | Padrao emergente, sem precedente real estate vertical; CrewAI menor maturidade; AutoGen em modo manutencao (Microsoft pivotou) |
| **n8n self-hosted** | Possivel | Bom mas adiciona infra; cron-Supabase nativo basta para Wave A |

## Consequences

**Positive:**
- Token cost zero Wave A — orcamento operacional restrito a Apify + 2Captcha + proxy
- Native Supabase observability: SELECT em status tables = dashboard instantaneo
- Determinismo total: 7-step ETL eh predictable; failures saem em logs estruturados
- Team familiarity 92/100 — Supabase ja e stack
- Migration path bem definido para Wave B: boundary contract `classify-anuncio` permite plugar LangGraph subgraph sem tocar graph determinista
- AppFolio Realm-X precedent forte (real estate vertical, mesma arquitetura, 10h+ economia/property manager/semana)

**Negative:**
- pg_cron + Edge Functions timeout sincrono 5s na UI exige pgmq pattern para tasks longas. **Mitigacao:** desenhar status-table + execution-ID self-healing pattern desde Sprint 1.
- Sem checkpointer entre nodes — se Edge Function crash mid-execution, retry start from beginning. **Mitigacao:** decompor steps em chunks idempotentes; status-table como source of truth.
- Wave B vai exigir LangGraph subgraph + LangSmith Plus quando NLP entrar — custo adicional ~R$ 760/mes mas justificado pelo valor adicional do classificador.
- Squad pequeno aprende 2 frameworks (Edge Functions agora, LangGraph depois). Mitigacao: aprendizado faseado, training Wave B claramente delimitado a 1 sprint pre-implementacao NLP.

## Evidence

- **`docs/bench/cron-supabase-vs-langgraph-day1/executive-report.md`** — Verdict CONFIRM, score 91.00 vs 65.55, +25.45 pts; LLM-cost back-of-envelope detalhado.
- **`docs/research/2026-05-14-leads-zonasul-sp/wave-2-summary.md`** H-003 CONFIRMED + CQ-009 AppFolio Realm-X precedent.
- **`docs/research/2026-05-14-leads-zonasul-sp/03-recommendations.md`** REC-5.1 stack hibrida ETL + Agentic.
- **`docs/code-anatomy/apify-crawlee-focused/extraction-notes.md`** Sec. 2 (Telemetry layer obrigatorio com Supabase tables).

---

*ADR-EPIC7-003 — Aria (@architect) + Morgan (@pm) — 2026-05-14*
