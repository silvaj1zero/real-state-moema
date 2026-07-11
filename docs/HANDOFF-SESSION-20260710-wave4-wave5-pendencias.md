# HANDOFF — Sessão 2026-07-10 (Fable): H-4 · 113 v3 · Wave 4 SDC completo · pendências manuais · Wave 5 planejada

**Sessão:** avaliação do projeto → execução autônoma → orquestração multi-modelo → planejamento Wave 5
**Base ao final:** `master` = `a34442f` (PR #1 e PR #6 MERGEADOS) · working tree limpo (exceto `.claude/settings.local.json.bak` untracked)
**Memória atualizada:** `project-acm-evolucao-status` (fonte rápida de contexto para a próxima sessão)

---

## 1. O que esta sessão entregou (cronológico)

| # | Entrega | Commit(s) |
|---|---|---|
| 1 | **H-4** — headline em faixa H-3 propagado para resumo (conclusão), deck (nota sensibilidade) e didático (Parte 2) | `ef85c49` |
| 2 | **Laudo 113 v3** com C-1 declarado (perfil reforma geral: −15% é leitura CENTRAL) + **fix regressão pós-H3**: `fontStyle: 'italic'` sem variante Inter derrubava TODA geração offline de laudo (`LaudoDocument.tsx` `arbitrioNota`) | `d147169` |
| 3 | **Wave 4 SDC ponta a ponta multi-modelo**: 9.22 (normalizeStreet formato banco, dev Sonnet YOLO) + 9.23 (fiação v5 nos 5 export sheets, dev Opus) em paralelo → QA Opus independente PASS → **Done** | `fb8760d` `4797904` `b372e99` `663a059` `ae07c98` |
| 4 | **Pendências manuais**: push autorizado + **PR #1 MERGEADO no master** · migrations 023/024 aplicadas pelo operador e **validadas via PostgREST** (`owner_lookups` 200; `fn_owner_lookup_stats` OK) · conta `admin-teste@moema.local` DELETADA + **issue #2 fechado** | merge `610a970` |
| 5 | **Wave 5 planejada** (stories 9.24–9.29 + spec cross-repo 9.4 + backlog Luciana) → **PR #6 MERGEADO** | `a4566b7` → `a34442f` |

## 2. Estado do Epic 9 / roadmap ACM

- **Done:** 9.0–9.3, 9.6–9.23 · H-1..H-4 · P-1/P-2 · C-1 · C-6.
- **Ready (execução externa em andamento/na fila):** 9.24 (simulador, Opus) · 9.25 (tribunal, Opus) · 9.26 (C-5, Sonnet) · 9.27 (C-3, Sonnet) · 9.28 (N-5 variância gate, **Fable**) · 9.4 (cross-repo — brief: `docs/acm/SPEC-EXEC-STORY-9.4-CROSS-REPO.md`) · 9.1 (gated 9.4).
- **Draft GATED:** 9.29 (D-3 skill) — só após 9.28 Done.
- **Não draftar (Art. IV):** C-2 Ross (aguarda decisão N-3 Luciana+founder) · C-4 atratividade (aguarda dados Fase B).
- **Renumeração formalizada:** "9.22/9.23" do veredito v3 = **9.24/9.25** reais (ROADMAP §9c).

## 3. Sessões de dev EXTERNAS (em execução no momento do clear)

O founder despachou dev(s) executando as stories da Wave 5 em outras sessões.
**Protocolo para a próxima sessão Fable (esta thread renasce como orquestradora):**

1. `git pull origin master` e checar novos commits/PRs das sessões externas.
2. Story voltando como InReview → rodar QA gate (7 checks, revisor independente; padrão do batch `docs/qa/gates/epic9-wave4-batch-20260710.yml`).
3. Conflito potencial conhecido: 9.26 e 9.27 tocam `laudoModel.ts` — se rodarem em paralelo, sequenciar o merge.
4. NÃO deixar a 9.29 iniciar sem a 9.28 Done (anti-lista do veredito).

## 4. Backlog operacional (Luciana / operador) — ROADMAP §9d

1. **Matrícula/IPTU 132**: terreno real (~220 m² provisório; 6 vagas sugerem lote maior) + confirmar 196 m² construídos → ao chegar, regerar laudo.
2. **Estado do 132: manter E (−15%) até a vistoria** (decisão founder 10-Jul; laudo v4 já reflete — sem regeração).
3. **Fase 1 planilhas**: Luciana preenche "Confere?" (13 casas no 113, 12 no 132) → operador roda `merge-back-xlsx.tsx`.
4. **Fatores de liquidez 113**: elicitar com a consultora.
5. **XLSX rev2 do 132**: cópia OLD preservada e commitada (`-rev2-OLD-modificada-20260710.xlsx`); rev3 é a canônica; stash `xlsx-rev2-132-modificado-pre-merge` também existe. Dry-run de merge-back sobre a OLD foi INTERROMPIDO pelo founder — não rodar sem pedido.

## 5. Decisões dormentes (founder, sem pressa)

- **Vercel duplicado**: deletar projeto `real-state-moema` em `vercel.com/caos-off` (o ativo é `app`) — elimina o único check vermelho recorrente do CI.
- **Infosimples**: decidir contratação; `OWNER_LOOKUP_ENABLED` permanece OFF.
- **Waiver LGPD**: reavaliar antes de multi-usuário.

## 6. Gotchas para a próxima sessão

- Suite: `npx vitest run src/lib/acm src/components/acm --no-file-parallelism` (flag obrigatória) — baseline **27 files / 301 tests** · tsc 0 · eslint 0.
- Regressões congeladas: Honduras (mediana 18.264) + AP113/AP132 — gabaritos, nunca editar expectativas.
- Fontes de marca: NUNCA usar `fontStyle: 'italic'`/variantes não registradas nos Documents (só Regular/Medium/Bold vendadas) — regressão do H-3 corrigida em `d147169`.
- Push/PR/merge: `@devops` com autorização do founder (dada e usada nesta sessão para PR #1/#6 — nova sessão precisa de nova autorização explícita).
- Branch `fix/epic7-v-crawl-health` local ainda existe (mergeada) — pode ser apagada; `docs/wave5-planning` já foi apagada no remote.

## 7. Docs canônicos (ordem de leitura para contexto zero)

1. `docs/acm/ROADMAP-ACM.md` §9b–9d (waves, backlog, kickoff)
2. `docs/acm/DECISOES-H3-LUCIANA-20260710.md` + `SOP-OPERACAO-ACM-POS-H3.md` (política de produto)
3. `docs/acm/VEREDITO-ROI-UNICO-20260709.md` (prioridades + anti-lista)
4. `docs/stories/9.24..9.29.story.md` (fila de execução)
5. `docs/acm/SPEC-EXEC-STORY-9.4-CROSS-REPO.md` (brief para acm-imobiliario)
