# Handoff — Épicos 8/9: plano de execução Wave 6 (sessão 11-Jul, pós-9.29)

**De:** sessão Fable 11-Jul (9.29 Done + planejamento Wave 6) · **Para:** sessões pós-`/clear`
**Diretriz do founder:** plano e QA em **Fable**; leitura e execução em **Sonnet/Opus**. Founder revisando o **Épico 7 em paralelo** — ver §4.

---

## 1. Estado (verificado com saída real nesta sessão)

- **Épico 8: FECHADO.** 8/10 Done, 8.3 Split (entregue via 8.3a/b), 8.5 Descoped (ADR-EPIC8-001). Nada a executar.
- **Épico 9: 26/28 Done.** 9.29 fechada hoje (QA PASS 7/7, PRs #10/#11 merged). Restam **9.4** e **9.1** (Ready) + **Wave 6 draftada hoje** (9.7 · 9.5 · 9.30, todas validadas @po).
- **Baseline 9.4 medido** (`app/scripts/acm-audit/9.4-sink-coverage.mjs`, read-only PROD, 11-Jul): **100% NULL nos 3.618 ITBI em TODOS os campos de metodologia** e as colunas `complemento`/`uso_iptu`/`fracao_ideal` **não existem** na tabela (o script acusa "coluna ausente").
- **BLOCKER (input founder):** o repo do engine `acm-imobiliario` (`engine/src/sinks/supabase_acm.py`) **não foi localizado** — não está no disco (busca recursiva por `supabase_acm.py`) nem em `gh repo list silvaj1zero`. Sem ele, a 9.4 não fecha (AC1 mapping + backfill) e 9.1/9.5/9.30 ficam bloqueadas.

## 2. Plano de execução (1 objetivo = 1 sessão; plano/QA Fable, execução Sonnet/Opus)

| # | Sessão | Modelo | Story | Kickoff | Pré-condição |
|---|--------|--------|-------|---------|--------------|
| A | Config geográfica | **Sonnet** | **9.7** (sem bloqueio) | `@dev *develop-story 9.7` — inventário de constantes geográficas → validação vs ITBI PROD (read-only) → `geoConfig` canônica. Casos congelados intocados. | nenhuma |
| B | 9.4 lado-app | **Opus** (migração/schema = lógica sensível) | **9.4 parcial** | `@data-engineer`: (1) migration ADITIVA criando `complemento`, `uso_iptu`, `fracao_ideal` em `acm_comparaveis`; (2) estender `fn_comparaveis_no_raio` com os campos do contrato (`SPEC-EXEC-STORY-9.4-CROSS-REPO.md` §RPC — **trap 42P13**: `RETURNS TABLE` muda só com `DROP FUNCTION`+`CREATE`+re-GRANT, precedente migrations `20260615000004`/`20260616000001`); (3) re-rodar `9.4-sink-coverage.mjs`. NÃO fecha a story (sink/backfill é engine). | nenhuma |
| C | 9.4 engine | @data-engineer + @devops | **9.4 fechamento** | Copiar `SPEC-EXEC-STORY-9.4-CROSS-REPO.md` como brief no repo do engine; sink mapping + backfill; aceite = `9.4-sink-coverage.mjs` bate metas (≤5% NULL em `area_construida_m2`/`sql_cadastral`) + export in-app com `ajustados > 0`. | **founder localizar o repo `acm-imobiliario`** |
| D | Régua apto/casa | **Sonnet** | **9.1** | `@dev *develop-story 9.1` (régua provisória autorizada H-3) | 9.4 Done |
| E | Fase B web | **Opus** | **9.5** | `@dev *develop-story 9.5` — crawler Epic 7 no contrato C-5; cruzamento nunca-âncora; AC5 = gate LGPD verificável | 9.4 Done · ajustes do Épico 7 (§4) |
| F | Cobertura por bairro | **Sonnet** | **9.30** | `@dev *develop-story 9.30` — mapa de cobertura + aviso crítico `bairro_sem_cobertura` | 9.4 Done · soft 9.7 |

**QA:** cada sessão termina em InReview; gate `@qa` roda em **Fable** (ou subagente Opus independente, padrão dos gates `docs/qa/gates/`). Push/PR sempre `@devops` (PRs têm o fail dormente do projeto Vercel duplicado — mergeável, precedente #1/#10/#11).

**Sem draft (Art. IV — NÃO draftar):** C-2 Ross-Heidecke (aguarda decisão N-3 Luciana+founder) · C-4 atratividade (aguarda dados da 9.5) · N-2 fontes do residual (elicitar Luciana).

## 3. Inputs pendentes do founder (bloqueiam o plano)

1. **Localizar/dar acesso ao repo `acm-imobiliario`** — bloqueia C (e por cascata D/E/F).
2. Terreno real do 132 (matrícula/IPTU) — condicionante nº1 do caso, regenera laudo.
3. Decisão N-3 (fator idade × Ross) — destrava draft do C-2.

## 4. Coordenação com a revisão do Épico 7 (em curso pelo founder)

A 9.5 **herda do Épico 7** o crawler (7.2/7.12/7.13) e o gate LGPD da 7.10. Estado encontrado na auditoria de hoje (nota 8,0/10):

- **7.9 (workshop Luciana):** tooling Done, mas AC3 (relatório de precisão) e AC6 (materiais) DESMARCADOS — o workshop nunca rodou; H-001 (FISBO ≥75%) segue INCONCLUSIVE. É o gatilho de fechamento da Wave A.
- **7.10 (LGPD):** Done com **AC1 (LIA/counsel) em WAIVER** — o gate registra "@devops MUST NOT deploy stories crawler-PF até counsel + PoC real". O AC5 da 9.5 já respeita isso, mas o counsel destrava o deploy.
- Se a revisão do founder gerar ajustes no Épico 7, aplicá-los ANTES da sessão E (9.5).

## 5. Cuidados operacionais (para qualquer sessão)

- Suíte: `npx vitest run src/lib/acm --no-file-parallelism` (de `app/`; PDF smokes exigem a flag). Estado atual: 27 files / 299 tests PASS.
- Checklist do auditor vigente = **v1.1** (`docs/acm/CHECKLIST-ACM-AUDITOR-v1.md`) — não re-ancorar sem re-medir (playbook gate-determinism); score não é critério em computation legado.
- Skill `/acm-validate` ATIVA (agentes `acm-operator`/`acm-auditor` registrados) — usar para casos novos.
- Untracked ambientais: `settings.local.json.bak` + 2 JSONs de smoke no 132 — **não commitar**.
- Datasets `docs/acm/*/dataset.json` dos casos são CONGELADOS — config nova (9.7) nunca reprocessa o passado.

## 6. Artefatos desta sessão

Wave 6: `docs/stories/9.5.story.md` · `9.30.story.md` · `9.7.story.md` (Ready) · ROADMAP §9e · este handoff.
Sessão anterior (mesma data): 9.29 Done — skill + agentes + checklist v1.1 + caso `baluarte-400/` (PRs #10/#11).
