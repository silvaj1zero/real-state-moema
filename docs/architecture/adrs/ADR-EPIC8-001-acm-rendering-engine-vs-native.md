# ADR-EPIC8-001: Renderização dos Entregáveis ACM — Nativo TS (engine como fonte de dados, não de render)

**Date:** 2026-06-15
**Status:** Accepted
**Epic:** 8 — Geração de Entregáveis ACM
**Resolve:** Story 8.0 (spike)
**Related:** ADR-EPIC7-006 (in-app monolith / Vercel deploy), `docs/HANDOFF-SESSION-20260615.md` (integração ITBI), Stories 8.1 (dados), 8.2 (cálculo), 8.3/8.4/8.5 (consumidores)

---

## Context

O Epic 8 precisa gerar 4 entregáveis ACM (laudo técnico 18 seções, resumo executivo, deck comercial 24 slides, material didático) — hoje produzidos pelo **engine Python externo** `acm-imobiliario` (caso Rua Honduras, em `docs/reference/acm-honduras/`).

A Story 8.0 colocou três caminhos:
- **(A)** o app orquestra o engine externo para renderizar;
- **(B)** renderização nativa em TypeScript no app Next.js;
- **(C)** híbrido.

### Reenquadramento do problema

A análise arquitetural mostra que o eixo não é "quem renderiza o PDF", e sim **onde mora a metodologia**:

1. **A metodologia ACM mora nos cálculos** (Score, aderência 50/20/30, efeito-escala, valor residual, sensibilidade) — e estes já estão sendo construídos **nativos em TS** na Story 8.2, com testes de regressão travando o caso Honduras (8.2 AC5).
2. **O valor difícil de replicar do engine é o pipeline de DADOS** (ingestão ITBI/PMSP → geocode → score → `acm_comparaveis`) — e este **já está integrado** ao app via push para `acm_comparaveis` (`is_venda_real=true`, `fonte='itbi'`), conforme handoff 2026-06-15.
3. **A renderização do PDF é "apenas" templating** sobre números já computados — não carrega metodologia.

Portanto, uma vez que 8.2 computa tudo nativamente, o engine **não tem cálculo que o app não terá**. A única coisa que (A) reaproveitaria seriam os templates de PDF — ao custo de acoplar o app a um pipeline Python.

### Prior-Art Search (per `.claude/rules/prior-art-search.md`)

| Claim | Search | Resultado | Verdict |
|---|---|---|---|
| "App não tem nenhuma dep de PDF" | Grep `jspdf\|@react-pdf\|pdfkit\|puppeteer\|playwright` em `app/package.json` | 0 | CONFIRMED_ABSENT |
| "App é Next.js/React no Vercel serverless" | Read `app/package.json` (next 16.1.7, react 19.2.3, node ≥20) + ADR-EPIC7-006 (Vercel deploy de `app/`) | confirmado | CONFIRMED_PRESENT |
| "Engine vive em repo separado, fora do deploy" | Handoff Sec. 2 (`AIOX-Enterprise MASTER/.../acm-imobiliario/`, gitignored) | confirmado | CONFIRMED_PRESENT |
| "Cálculo será nativo TS" | Story 8.2 (lib pura `app/src/lib/acm/methodology.ts`) | confirmado | CONFIRMED_PRESENT |
| "Dados ITBI já fluem para o app" | Migration `20260615000001` + sink `supabase_acm.py` → `acm_comparaveis` | confirmado | CONFIRMED_PRESENT |

### Restrição de runtime

O app roda em **Vercel serverless (Node)**. Invocar um engine Python local é impossível nesse runtime; (A) exigiria **hospedar o engine como serviço** e chamá-lo via API — a mesma classe de problema de infra ainda em aberto do `epic7_itbi_monthly` (handoff Sec. 4), com acoplamento a um repo de workspace pessoal não-portável.

---

## Decision

**Adotar renderização nativa em TypeScript no app Next.js, usando `@react-pdf/renderer`. O engine `acm-imobiliario` é retido EXCLUSIVAMENTE como produtor upstream dos dados ITBI (push para `acm_comparaveis`), NUNCA invocado para renderização.**

Arquitetura de 3 camadas, com fronteira limpa dado × compute+render:

```
[ENGINE externo Python]          [APP Next.js / Vercel — nativo TS]
 acm-imobiliario                  ┌─────────────────────────────────┐
 ITBI → geocode → score  ──push──▶│ acm_comparaveis (Supabase)      │
 (DADO)                           │   ↓ RPC fn_comparaveis_no_raio  │
                                  │ methodology.ts (Story 8.2)      │  ← metodologia (COMPUTE)
                                  │   ↓ AcmLaudoComputation         │
                                  │ @react-pdf/renderer (8.3/8.4)   │  ← templates (RENDER)
                                  │   → laudo / resumo / deck / didático.pdf
                                  └─────────────────────────────────┘
```

**Tecnologia de render:** `@react-pdf/renderer` (componentes React → PDF). Justificativa ("boring technology where possible"):
- Fit natural com React 19 / Next 16; renderiza server-side (route handler) e client-side; suporta download e stream.
- Layout programático adequado a documentos estruturados (laudo/resumo/didático em retrato; deck em paisagem).
- Sem binário externo — diferente de Puppeteer/Playwright HTML→PDF, que no Vercel serverless exige chromium empacotado (`@sparticuz/chromium`), sofre cold-start e limites de tamanho. **Rejeitado** por custo operacional.
- `jsPDF` (imperativo, baixo nível) **rejeitado** para documentos de 18 seções / 24 slides — manutenção ruim.

**Fidelidade ao método garantida por dados, não por confiança:** os testes de regressão Honduras (Story 8.2 AC5) travam medianas/Top N/valor — se o cálculo bate, o PDF nativo é só layout sobre os mesmos números dos PDFs de referência.

---

## Consequences

### Positivas
- **App self-contained e portável** — entregáveis geram no deploy Vercel, sem serviço Python, sem acoplar a repo de workspace pessoal.
- **Stack única** (TS/React) ponta a ponta: dado no Supabase, compute em `methodology.ts`, render em React-PDF.
- **Offline-capable** no contexto do app (não depende de pipeline externo online para gerar).
- **Manutenção** dos templates junto do código que os alimenta.

### Negativas / custos
- **Re-implementar os templates** (laudo/resumo/deck/didático) como componentes React-PDF — esforço real (mitiga 8.3 split em 8.3a/8.3b).
- **Nova dependência** `@react-pdf/renderer` no `app/`.
- **Mapa do laudo:** React-PDF embute imagem, não tiles interativos. Sub-decisão para 8.3: usar **imagem de mapa estático** (static maps API ou render server-side do tile provider do `AcmMiniMap`) em vez do mini-mapa interativo.
- **Assets de branding** RE/MAX (logos, cores) precisam estar no app — reusar `docs/branding/luciana-brand-guide.md`.

### Impacto nas stories (per Story 8.0 AC3)
- **8.3 / 8.4:** seguem como implementação nativa React-PDF. Confirmado o split **8.3a (resumo) / 8.3b (laudo)**.
- **8.5 (orquestração app↔engine para render):** **DESCOPADA na forma original.** Como o app não chama o engine para renderizar, o que resta de 8.5 é apenas o **gatilho de atualização dos dados ITBI** — que já é a decisão de hospedagem do `epic7_itbi_monthly` rastreada no Epic 7 / handoff Sec. 4. → **Fundir 8.5 nessa decisão do Epic 7; remover do escopo de render do Epic 8.**

---

## Alternatives Considered

| Opção | Por que NÃO |
|---|---|
| **(A) App orquestra o engine para render** | Exige hospedar Python como serviço (infra aberta do epic7_itbi_monthly); acopla o app a repo de workspace pessoal gitignored; não-portável; Vercel serverless não roda Python local. O reaproveitamento se limitaria aos templates — não compensa o acoplamento, já que o cálculo é nativo (8.2). |
| **(C) Híbrido por caminho de render** (resumo nativo + laudo via engine) | Mantém o pior dos dois: a dependência de infra do engine **e** uma segunda stack de render. A recomendação inicial do épico (A p/ laudo, B p/ resumo) fica **refutada** — não há cálculo exclusivo do engine que justifique o laudo sair de lá. |
| **Puppeteer/Playwright HTML→PDF** | Maior fidelidade ao CSS web, mas chromium em Vercel serverless = cold-start, limite de tamanho, fragilidade operacional. |
| **jsPDF** | Imperativo demais para documentos longos/estruturados; manutenção ruim. |

> Nota de fronteira: o **schema** de `acm_comparaveis` (Story 8.1) é território de `@data-engineer`; esta ADR decide a camada de aplicação/render e não o DDL.

---

## Implementation Notes (para 8.3+)

1. Adicionar `@react-pdf/renderer` ao `app/package.json`.
2. Estrutura sugerida: `app/src/lib/acm/pdf/` com um componente React-PDF por entregável (`LaudoDocument.tsx`, `ResumoDocument.tsx`, `DeckDocument.tsx`, `DidaticoDocument.tsx`) + um `theme.ts` de branding RE/MAX.
3. Geração via route handler (`app/src/app/api/acm/[tipo]/route.ts`) retornando o PDF como stream, acionada pelos itens do `AcmExportMenu`.
4. Mapa estático: prototipar com o tile provider já usado em `AcmMiniMap`; fallback para static maps API.
5. Reusar `AcmLaudoComputation` (8.2) como única fonte dos números — zero recálculo no template.
