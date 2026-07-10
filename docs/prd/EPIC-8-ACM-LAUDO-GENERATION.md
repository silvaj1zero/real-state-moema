# Epic 8 — Geração de Entregáveis ACM (Laudo / Resumo / Deck / Didático)

**Versão:** 1.0
**Status:** Draft — Ready for Architect / PO Validation
**Data:** 2026-06-15
**Author:** Zero (founder/orquestrador) — esboço derivado da análise dos materiais ACM Honduras
**End-user validadora:** Luciana Borba (RE/MAX Galeria Moema)

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-15 | 1.0 | Esboço inicial do Epic 8 a partir da análise dos 5 materiais ACM Honduras (laudo v4, resumo, didático, deck v2, roadmap metodológico) e do gap vs. módulo ACM atual do app | Zero |

---

## 1. Goals and Background Context

### Goals

- **Trazer para o app a geração dos entregáveis ACM** que hoje só existem como saída do engine externo `acm-imobiliario` (capability da `luciana-borba` no AIOX-Enterprise): laudo técnico, resumo executivo, material didático e deck comercial RE/MAX.
- **Aproveitar a base de comparáveis reais ITBI** integrada no Epic 7 (3.618 vendas Moema+região, `is_venda_real=true`, `fonte='itbi'`) como âncora dos cálculos — a mesma fonte que sustenta o laudo da Rua Honduras.
- **Materializar a Fase 3 do Roadmap Metodológico ACM** (Passo 3.1: "um comando que gera laudo + resumo + deck + material"), sem regredir a qualidade artesanal já comprovada no caso Honduras.
- **Preservar a metodologia RE/MAX da Luciana** (Score, índice de aderência 50/20/30, dupla ótica de comprador, deságio medido, rastreabilidade SQL/ITBI) — não reinventar o método, e sim operacionalizá-lo.

### Background Context

O módulo ACM atual do app (Epic 3, `app/src/components/acm/`, `useAcm.ts`, RPC `fn_comparaveis_no_raio`) entrega hoje:
- Exploração de comparáveis por raio + mini-mapa + filtro `is_venda_real`.
- Cálculos: **média** e **mediana** de R$/m², contagens. `tendência` é stub (`TODO`, retorna `null`).
- Exportação: **CSV** (endereço, área, preço, R$/m², tipo, fonte, distância), *Copiar Resumo* (texto simples) e *Incluir no Dossiê*. **Nenhuma geração de PDF.**

Os 5 materiais analisados (Rua Honduras, Jardim América — emitidos 09/06/2026 pela consultora) foram produzidos pelo **engine Python externo**, não pelo app. Eles representam o **norte metodológico** do produto. A análise de gap identificou 3 camadas ausentes no app para gerar esses entregáveis:

1. **Modelo de dados** — `acm_comparaveis` tem um único `area_m2` (não separa **construído × terreno**) e não modela dorms/suítes/vagas, **Score**, SQL cadastral (Setor/Quadra/Lote), preço pedido-vs-fechado, nem ano. A metodologia do laudo depende dessas distinções (efeito-escala do terreno, índice de aderência, deságio medido).
2. **Camada de cálculo** — ausentes: Score (régua R$/m²), índice de aderência 50/20/30, R$/m² de terreno por faixa de lote (efeito-escala), valor residual do incorporador, cenários de sensibilidade (todos/Top 5/Top 3), fatores de liquidez/condição, grau NBR 14653.
3. **Camada de renderização** — não há nenhum gerador de PDF/deck (nem `jsPDF`/template de laudo). Só `Blob` CSV + clipboard.

### Decisão de arquitetura — RESOLVIDA (ADR-EPIC8-001, 2026-06-15)

**Decisão:** renderização **nativa em TS (`@react-pdf/renderer`)** no app Next.js; o engine `acm-imobiliario` é retido **só como produtor dos dados ITBI** (push para `acm_comparaveis`), nunca invocado para renderizar.

Reenquadramento: a metodologia mora nos **cálculos** (Story 8.2, já nativa, com regressão Honduras), não na renderização; o pipeline de dados do engine **já está integrado** (Epic 7). Logo a fronteira é **dado (engine) × compute+render (app nativo)**. A recomendação inicial do esboço ((A) p/ laudo) foi **refutada** — não há cálculo exclusivo do engine que justifique o acoplamento + infra Python no Vercel serverless.

Detalhes, alternativas e consequências: `docs/architecture/adrs/ADR-EPIC8-001-acm-rendering-engine-vs-native.md`.

### Referências (fontes da metodologia — versionadas em `docs/reference/acm-honduras/`)

- `docs/reference/acm-honduras/LAUDO_ACM_Rua_Honduras_RE-MAX_v4_NOVO.pdf` — laudo técnico completo (18 págs) — estrutura-alvo das seções.
- `docs/reference/acm-honduras/ACM_RESUMO_Honduras_RE-MAX.pdf` — resumo executivo (formato-alvo).
- `docs/reference/acm-honduras/MATERIAL_DIDATICO_ACM_Honduras.pdf` — critérios e fórmulas (Score, aderência 50/20/30, efeito-escala, validação Top 10).
- `docs/reference/acm-honduras/ACM_Apresentacao_Completa_Honduras_RE-MAX_v2.pdf` — deck comercial (24 slides).
- `docs/reference/acm-honduras/ROADMAP_METODOLOGICO_ACM.pdf` — evolução do método (Níveis 1→4); este épico operacionaliza a Fase 3.
- `docs/reference/acm-honduras/README.md` — índice dos materiais + números-chave do caso de referência.
- Engine: `AIOX-Enterprise MASTER/workspace/businesses/luciana-borba/squads-custom/acm-imobiliario/` (skill `/acm` → `@acm-analyst` → `*push-moema`).
- `docs/HANDOFF-SESSION-20260615.md` — integração ITBI → `acm_comparaveis` (fonte de dados deste épico).

---

## 2. Relação com outros épicos

- **Epic 3 (Intelligence)** — dono do módulo ACM atual; este épico o estende.
- **Epic 7 (Prospecção / ITBI)** — fornece os comparáveis reais ITBI que alimentam os cálculos. **Bloqueador de dados:** depende do `--apply` da integração ITBI (3.618 vendas) e da migration `20260615000001_add_itbi_fonte_comparavel.sql`.

---

## 3. Stories

| Story | Título | Camada | Prioridade | Status |
|-------|--------|--------|------------|--------|
| 8.0 | Spike — ADR de renderização (engine vs nativo) | Arquitetura | Must | **Done** (ADR-EPIC8-001 Accepted) |
| 8.1 | Modelo de dados da metodologia ACM (construído×terreno, Score, SQL, ask-vs-close) | Dados | Must | Ready (após AC0) |
| 8.2 | Camada de cálculo ACM (Score, aderência 50/20/30, efeito-escala, valor residual, sensibilidade) | Cálculo | Must | Ready |
| 8.3 | Geração de Resumo Executivo e Laudo técnico (PDF) | Renderização | Must | Draft → split 8.3a/8.3b |
| 8.4 | Geração de Deck comercial RE/MAX + Material didático | Renderização | Should | Draft (desbloqueada) |
| ~~8.5~~ | ~~Orquestração app ↔ engine~~ | Integração | — | **Descoped** (ADR-EPIC8-001 → funde no Epic 7) |

> Stories detalhadas em `docs/stories/8.0.story.md` … `8.5.story.md`.
> **Validação PO (2026-06-15, Pax):** 8.0/8.2 Ready · 8.1 Ready após AC0 · 8.3 split · 8.4 desbloqueada · 8.5 contingente.
> **ADR-EPIC8-001 (2026-06-15, Aria) — Accepted:** render **nativo TS (`@react-pdf/renderer`)**; engine = só fonte de dados ITBI. **8.5 descopada.**
> **Sequência recomendada:** ~~8.0~~ ✓ + **8.1·AC0** → 8.1 → 8.2 → 8.3a/8.3b → 8.4. Camada de dados (8.1) é de `@data-engineer`.

---

## 4. Out of Scope (Epic 8)

- Evolução estatística da Fase 2 do Roadmap (regressão hedônica, shrinkage bayesiano, grau NBR) — épico futuro; aqui só preservamos os hooks de dados.
- Geocodificação / ingestão ITBI (já coberta pela integração Epic 7 / engine).
- Multi-consultor regional para `acm_comparaveis` (hoje por-consultor; ver caveat no handoff).

---

## 5. Risks & Assumptions

- **Risco:** divergência entre cálculo nativo (app) e o método do engine — mitigar com testes que travem os números-chave do caso Honduras (medianas, Top N) como regressão (Roadmap Passo 3.3).
- **Assumption:** o engine `acm-imobiliario` permanece disponível e invocável para o caminho (A).
- **Assumption:** a base ITBI contém os campos que a metodologia exige (área de terreno, SQL, ano) — **validar na Story 8.1**, pois `acm_comparaveis` hoje não os expõe.
