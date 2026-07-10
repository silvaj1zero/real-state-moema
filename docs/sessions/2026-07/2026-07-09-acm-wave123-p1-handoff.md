# Handoff — ACM Waves 1–3 + P-1 offline

| Field | Value |
|-------|--------|
| **handoff_id** | `2026-07-09-acm-wave123-p1-handoff` |
| **date** | 2026-07-09 |
| **priority** | **P1** (próximo passo claro; multi-story done) |
| **type** | `session` |
| **scope** | `self_continuation` / `intra_processo` |
| **from** | Agent:session-acm-impl |
| **to** | Agent:next-session |
| **consumed** | 2026-07-09 by Agent:next-session (fixtures AP + follow-up) |
| **branch** | `fix/epic7-v-crawl-health` |
| **HEAD** | `ef26b0c` (= origin, **sincronizado**) |
| **repo** | `C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\repos\real-state-moema` |
| **remote** | `origin` → `https://github.com/silvaj1zero/real-state-moema.git` |

---

## CRITICAL CONTEXT

**Problema:** o ACM premium existia mas era cego a tipologia (R5), deságio oculto, mediana fraca, sem Lite de campo e sem CLI genérico.  
**Solução (feita nesta janela de sessões):** motor de evidência (9.14–9.15–9.20) + R5 canônico (9.17) + tese/Lite/pesos/radar (9.18–9.19–9.16–9.21) + CLI offline P-1; **push @devops concluído** (`301df10..ef26b0c`).  
**Ainda falta:** H-3 Luciana (humano), sink 9.4 no repo `acm-imobiliario` (cross-repo), P-2 merge-back XLSX, fixtures AP no vitest.

---

## Key Facts (temporais)

| Marker | Fact |
|--------|------|
| **ACTIVE** | HEAD `ef26b0c` em `fix/epic7-v-crawl-health` = origin (push ok) |
| **ACTIVE** | Suíte ACM: **253 tests** · tsc 0 · eslint `src/lib/acm` 0 (última validação pré-push) |
| **ACTIVE** | Honduras âncoras intactas (mediana ~18.264 · mercado ~12,4M · fechamento ~10,2M) — camadas **aditivas** |
| **ACTIVE** | Default tese ranking = `hibrido` (50/20/30); caso 132 script usa `construcao` |
| **ACTIVE** | Defaults deságio 9.14 = `origemDefault: 'ficha-provisoria-pre-H3'` até H-3 |
| **ACTIVE** | CLI: `cd app && npx tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132` |
| **SUPERSEDED** | STATUS dizia “0a push pendente / ahead” — **push já feito** |
| **DEPRECATED** | Scripts 113/132 com 4ª cópia da regra R5 — agora importam `tipologia.ts` |
| **OUT_OF_SCOPE** | 9.22, 9.23, 9.5 web, skill/squad ACM, Ross-Heidecke, E2E CI |

---

## O que foi feito (esta cadeia de sessões)

### Wave 1 (já no remote antes + consolidado)
| Story | Commit | Entrega |
|-------|--------|----------|
| 9.15 | `29ef25f` | avisos[] + passaporte A/B/C |
| 9.14 | `0f34c26` | ficha + 3 preços + deságio explícito |
| 9.20 | `71c44a2` | mediana principal A/B + ponderada + laterais C |

### Wave 2–4 código (push `301df10..ef26b0c`)
| Story/item | Commit | Entrega |
|------------|--------|----------|
| 9.17 R5 | `41589f4` | `tipologia.ts` + gate `propertyType` + scripts 113/132 |
| 9.18 + 9.19 | `2f9b13f` | tese comercial + ACM Lite + package kind |
| 9.16 + 9.21 | `7ff1c7a` | pesos por tese + radar subprecificação |
| 9.4 handoff + P-1 | `ef26b0c` | contrato/coverage + `acm-validate` offline |

### Smoke real P-1 (132)
```
n=56 · R5 OK · tese comercial=abaixo · subprecificação=forte (−20,1%) · EXIT 0
```

---

## Estado atual vs desejado

```
[AGORA]
  motor ACM verde (253 tests)
  branch sincronizada no GitHub
  CLI offline funciona em dataset.json
  9.4 sink .py AINDA no outro repo
  defaults 9.14 provisórios (H-3)

[DESEJADO próximo]
  H-3 calibra régua A–D + copy Lite
  9.4 backfill PROD (acm-imobiliario) → coverage script exit 0
  P-1 “só endereço” via RPC (após 9.4)
  P-2 merge-back XLSX corretor
  fixtures AP113/AP132 no vitest
  QA close stories InReview → Done
```

---

## Ler ANTES de executar (ordem)

1. `docs/sessions/2026-07/2026-07-09-acm-wave123-p1-handoff.md` (este)
2. `docs/acm/STATUS-EXECUCAO-ACM-20260709.md` (atualizar se stale)
3. `docs/acm/PLANO-EXECUCAO-ACM-20260709.md`
4. `docs/acm/9.4-sink-ac3-verification.md` — se for 9.4
5. `docs/acm/ONEPAGER-H3-LUCIANA-ACM-20260709.md` — se for H-3
6. Story alvo em `docs/stories/9.x.story.md`
7. Motor: `app/src/lib/acm/methodology.ts` + `tipologia.ts` + `validatePipeline.ts`

---

## Próximos passos (prioridade)

| # | Ação | Quem | Comando / artefato |
|---|------|------|---------------------|
| 1 | **H-3 Luciana** | Founder + Luciana | One-pager H-3; aplicar defaults em `tratarDesagio` / copy Lite |
| 2 | **9.4 sink + backfill** | @data-eng + @devops no `acm-imobiliario` | Contrato em `9.4-sink-ac3-verification.md`; validar com `app/scripts/acm-audit/9.4-sink-coverage.mjs` |
| 3 | **QA close** stories InReview | @qa | 9.14–9.21 (exceto 9.4 Done) |
| 4 | **P-2** merge-back XLSX | @dev | Nova story / plano Wave 4 |
| 5 | **Fixtures AP** no vitest | @dev | Congelar computation 113/132 |
| 6 | **Não iniciar** | — | 9.22, 9.23, skill, Ross-Heidecke |

---

## Comandos copy-paste (bootstrap)

```powershell
cd "C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\repos\real-state-moema"
git fetch origin
git checkout fix/epic7-v-crawl-health
git status -sb
# esperado: ## fix/epic7-v-crawl-health...origin/fix/epic7-v-crawl-health (sem ahead)

cd app
npm run typecheck
npx vitest run src/lib/acm --no-file-parallelism
npx tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132 --json-only
```

---

## Mapa de arquivos-chave

| Path | Papel |
|------|--------|
| `app/src/lib/acm/methodology.ts` | Orquestrador laudo (avisos, evidência, R5, tese, radar, pesos) |
| `app/src/lib/acm/tipologia.ts` | R5 canônico |
| `app/src/lib/acm/teseComercial.ts` | 9.18 |
| `app/src/lib/acm/subprecificacao.ts` | 9.21 |
| `app/src/lib/acm/dataset.ts` + `validatePipeline.ts` | P-1 |
| `app/src/lib/acm/pdf/liteModel.ts` + `LiteDocument.tsx` | 9.19 |
| `app/scripts/acm/acm-validate.tsx` | CLI offline |
| `app/scripts/acm-audit/9.4-sink-coverage.mjs` | Coverage PROD pós-9.4 |
| `docs/acm/andrade-pertence-132/dataset.json` | Dataset R5-limpo (56 casas) |

---

## Vetos / regras (NÃO violar)

1. **Não repontar** `medianaPrecoM2` / `valorMercado` legados sem flag explícita — camadas aditivas.
2. **Não inventar** régua A–D de deságio (Art. IV) — só H-3.
3. **Não editar** sink `.py` neste repo — é `acm-imobiliario`.
4. **Não push** sem `@devops` / `AIOX_ACTIVE_AGENT=devops`.
5. **Não commitar** locks `~$*.xlsx` nem `.bak`.
6. **Default ranking** = `hibrido` (Honduras); 132 = `construcao`.
7. **Fora da janela:** 9.22, 9.23, skill/squad, Ross-Heidecke, E2E CI.

---

## Glossary (mínimo)

| Termo | Significado |
|-------|-------------|
| ACM | Análise Comparativa de Mercado (laudo + planilha + decks) |
| R5 | Gate tipologia casa×apto por guia / Complemento |
| Passaporte A/B/C | Grau de evidência do comparável (9.15) |
| Mediana principal | Só A/B; C lateral (9.20) |
| Tese comercial | acima/alinhado/abaixo do mercado (9.18) |
| Tese avaliação | construcao/terreno/hibrido/apto — pesos ranking (9.16) |
| Subprecificação | Radar quando anúncio << ref (9.21) |
| ACM Lite | PDF 1–2 pág. modo dono (9.19) |
| Honduras | Caso âncora / gabarito de regressão |
| AP113 / AP132 | Casos Andrade Pertence |
| H-3 | Sessão elicitação com Luciana |
| P-1 | CLI `acm-validate` |
| P-2 | Merge-back planilha corretor |
| Art. IV | No Invention (Constitution AIOX) |

---

## Bootstrap self-check (próxima sessão)

| # | Pergunta | Resposta esperada |
|---|----------|-------------------|
| 1 | Qual branch e HEAD? | `fix/epic7-v-crawl-health` @ `ef26b0c` sync origin |
| 2 | Suíte ACM verde? | 253 tests (ou mais se cresceu) |
| 3 | Push pendente? | **Não** (já feito) |
| 4 | 9.4 código sink aqui? | **Não** — só contrato/coverage; engine fora |
| 5 | Default tese ranking? | `hibrido` |
| 6 | Como validar 132 offline? | `npx tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132 --json-only` |
| 7 | O que NÃO começar? | 9.22/9.23/skill/Ross sem pedido explícito |

---

## Success criteria (próxima sessão “sucesso”)

- [ ] Handoff consumido (marcar `consumed` + journey log)
- [ ] Um dos: H-3 documentado **ou** 9.4 engine PR **ou** P-2 iniciado **ou** QA Done em stories InReview
- [ ] `git status` limpo de código / testes verdes se mexeu em ACM
- [ ] Sem inventar defaults de deságio sem H-3

---

## Exemplo concreto (primeira ação se for P-2)

```powershell
# 1) Bootstrap
cd "...\real-state-moema"
git status -sb   # sync
# 2) Ler story inexistente → criar/abrir P-2 a partir do plano
# 3) Localizar XLSX corretor em docs/acm/andrade-pertence-132/
# 4) Desenhar merge-back: XLSX → dataset.json campos editáveis → re-validate
```

---

## Working tree ao fechar

- Código: **clean** (só lixo local `~$xlsx` / `.bak` — **não commitar**)
- Stories: 9.14–9.21 (menos 9.4 Done) em **InReview**; 9.4 **Ready** + handoff docs

---

*Score handoff: 9/10 · Artifact: approved · TTL: 30 days*
