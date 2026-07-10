# ADR-EPIC7-002: Apify Cloud Wave A; Gatilho Self-Host >= 50k pgs/mes

**Date:** 2026-05-14
**Status:** Accepted
**Epic:** 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte

## Context

Wave 2 (research) sugeriu Crawlee self-hosted desde dia 1 baseado em H-005 (modelagem inicial Hetzner CPX31 EUR 21/mes + IPRoyal $52/mes = ~R$ 430/mes vs Apify R$ 1.160-2.320 para 50k pgs/mes). Phase 3 bench refinou esta hipotese ao incluir manutencao + amortizacao de setup + monitoramento. O TCO real fica:

| Volume | Self-hosted TCO | Apify TCO | Winner |
|---|---|---|---|
| 10k pgs/mes | R$ 1.435 | **R$ 481** | Apify (-R$ 954) |
| 50k pgs/mes | R$ 1.944 | **R$ 1.383** (Creator) | Apify (-R$ 561) |
| 100k pgs/mes | **R$ 2.542** | R$ 3.502 (Scale) | Self-hosted (-R$ 960) |

O crossover real esta em ~50-80k pgs/mes, nao 10k. Para Real State Moema Wave A (estimativa conservadora 10-30k pgs/mes Zona Sul), Apify Cloud e melhor escolha. O codigo, no entanto, deve ser escrito como Crawlee TS Actors plain (sem Apify-only APIs) para que a migracao seja mecanica quando o gatilho disparar.

## Decision

**Wave A do Epic 7: usar Apify Cloud (plano Creator) para todos os novos crawlers (MercadoLivre, eventualmente QuintoAndar/Loft via actors prontos).** Reutilizar deployment patterns do Epic 6.

**Gatilho de migracao para Crawlee self-hosted (Hetzner CPX31 + IPRoyal residencial):**
- **Sustained >= 50.000 paginas/mes por 60 dias consecutivos**, OU
- **Apify bill mensal > R$ 1.500 por 2 meses consecutivos**

Quando gatilho disparar:
1. @devops provisiona Hetzner CPX31 (€21/mes) + IPRoyal residencial committed ($52-$100/mes dependendo de GB)
2. Migracao mecanica dos Actors Crawlee (apenas trocar Apify storage adapter por Supabase storage custom ou Memory storage + persistencia direta em Supabase)
3. Run-time bake-off 2 semanas paralelo (Apify + self-hosted) antes de desligar Apify

**Wave A NAO escreve codigo Apify-only:**
- Sem `Actor.init()` no entrypoint (usar `Crawler.run()` direto).
- Sem `KeyValueStore` Apify-managed (usar Supabase tabelas).
- Sem `Dataset` Apify-managed (persistir direto em `scraped_listings`).
- Exceto: ProxyConfiguration `useApifyProxy: true` (substituivel por config IPRoyal trivial).

## Alternatives Considered

| Alternativa | Avaliada como | Por que rejeitada |
|---|---|---|
| **Crawlee self-hosted desde Wave A** | Wave 2 H-005 inicial | Bench REFINE: TCO real perde para Apify ate 50k pgs/mes; risco operacional alto sem ROI |
| **Apify perpetuo (sem gatilho self-host)** | Possivel | Lock-in profundo + TCO sobe rapido acima 100k pgs/mes; cap inferior atingido em <12 meses se Luciana escalar |
| **Hibrido Apify + self-host desde Wave A** | Possivel | Complexidade operacional dobrada sem ganho economico ate volume justificar |
| **Bright Data MOON / Web Unlocker** | Possivel | Premium ($$$), black box anti-bot; melhor pos-Wave B se DataDome (ImovelWeb) for impediment grave |

## Consequences

**Positive:**
- TCO Wave A otimo: R$ 481 @10k / R$ 1.383 @50k = previsivel e sublinear
- Apify scheduler/observability/run history grátis (já incluso no plan)
- Reutiliza setup operacional Epic 6 (zero curva de aprendizado)
- Migration path claro: gatilho >=50k pgs/mes 60d disparado, infra Hetzner pre-avaliada em 1-2 dias
- Code Wave A vendor-portable (sem Apify-only APIs) garante reversibilidade

**Negative:**
- Lock-in Apify durante Wave A (aceito; reversivel)
- Custo proxy Apify (residencial) menos transparente que IPRoyal direto
- Apify Creator plan tem CU rate $0.20/CU; ImovelWeb com DataDome pode consumir muito browser-mode = CU/page sobe. **Mitigacao:** adiar ImovelWeb para Wave B regardless.
- Ops ledger real precisa ser construido apos primeiros 60 dias para validar premissa de manutencao baixa
- Risco de Apify mudar plan/precos durante Wave A. **Mitigacao:** budget guard alarm em R$ 1.200 (80% NFR-009)

## Evidence

- **`docs/bench/crawlee-selfhosted-vs-apify-cloud/executive-report.md`** — Verdict REFINE; TCO breakdown completo; scorecard 80.70 vs 68.20.
- **`docs/research/2026-05-14-leads-zonasul-sp/wave-2-summary.md`** H-005 CONFIRMED com nuance "se < 10k pgs/mes, Apify mais barato".
- **`docs/research/2026-05-14-leads-zonasul-sp/03-recommendations.md`** REC-3.1 (Apify mantido) + REC-3.2 (Crawlee self-hosted para Wave B).

---

## Anotação — Story 7.12 (Proxy residencial por alvo + nota de custo)

**Date:** 2026-06-15 · **Status:** Accepted (amendment)

A pesquisa FISBO (`docs/research/2026-06-15-fisbo-captacao-ingestao/report.md`, F5 média 2-1 / F6 alta 3-0) confirmou: ZAP/VivaReal estão atrás de Cloudflare e bloqueiam **datacenter por reputação de ASN** (403/503); **residencial BR** atinge 85-99% de sucesso. A Story 7.12 implementa **tiering por alvo** (`proxy-config.ts`): residencial só para ZAP/VivaReal; datacenter para MercadoLivre/OLX (custo menor). Isso usa a **exceção** já prevista nesta ADR (`ProxyConfiguration` com `useApifyProxy`, linha 36) — sem `Actor.init`.

**Nota de custo (AC6):** o proxy **residencial** Apify tem custo/GB **substancialmente maior** que datacenter (datacenter é quase grátis no plano Creator; residencial é cobrado por GB de tráfego). Por isso o tiering é **por alvo**, não global — aplica residencial apenas onde há bloqueio comprovado. Estimativa Wave A (Zona Sul, 10-30k págs/mês) mantém o volume residencial baixo (só 2 dos 4 portais, e só nas páginas que passam pelo crawler protegido).

**Gatilho de migração para IPRoyal self-host (Wave B):** inalterado — **≥ 50.000 págs/mês por 60 dias** OU **bill Apify > R$ 1.500 por 2 meses** (ver Decision acima). O custo residencial Apify é o principal vetor que pode disparar o gatilho de bill; a **telemetria de block-rate por portal** (Story 7.12 AC4, meta < 15%) serve de input para decidir a migração e detectar regressão de bloqueio (Cloudflare é alvo móvel).

*Anotação 7.12 — Dex (@dev) — 2026-06-15*

---

*ADR-EPIC7-002 — Aria (@architect) + Morgan (@pm) — 2026-05-14*
