# Handoff — ACM P-2 + fixtures AP (pos waves 1-3)

| Field | Value |
|-------|--------|
| **handoff_id** | `2026-07-09-acm-p2-fixtures-handoff` |
| **date** | 2026-07-09 |
| **priority** | **P1** |
| **type** | `session` |
| **scope** | `self_continuation` |
| **from** | Agent:session-acm-p2 |
| **to** | Agent:next-session |
| **consumed** | 2026-07-09 by Agent:continue-after-clear |
| **parent_handoff** | `2026-07-09-acm-wave123-p1-handoff` |
| **branch** | `fix/epic7-v-crawl-health` |
| **HEAD** | `fc285a4` (= origin, sync) |
| **repo** | `real-state-moema` @ `C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\repos\real-state-moema` |

---

## CRITICAL CONTEXT

**Problema:** fabrica ACM incompleta sem merge-back do corretor e sem gabarito multi-caso.  
**Solucao (esta sessao):** fixtures de regressao AP113/AP132 no vitest + P-2 merge-back XLSX→dataset; push @devops ate `fc285a4`.  
**Ainda falta:** H-3 Luciana (humano), 9.4 sink no `acm-imobiliario`, @qa fechar stories InReview.

---

## Key Facts

| Marker | Fact |
|--------|------|
| **ACTIVE** | HEAD `fc285a4` = origin/fix/epic7-v-crawl-health |
| **ACTIVE** | Suite ACM **269 tests** (ultima validacao P-2) |
| **ACTIVE** | P-1: `npx tsx scripts/acm/acm-validate.tsx docs/acm/<slug>` |
| **ACTIVE** | P-2: `npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/<slug> [--dry-run] [--validate]` |
| **ACTIVE** | Fixtures: `andradePertence.regression.test.ts` (113+132, n=56 cada) |
| **ACTIVE** | Default ranking `hibrido`; 132 usa `construcao` |
| **ACTIVE** | Desagio 9.14 ainda `ficha-provisoria-pre-H3` |
| **SUPERSEDED** | Handoff anterior dizia fila P-2 aberta — P-2 **Done** |
| **OUT_OF_SCOPE** | 9.22, 9.23, skill/squad, Ross-Heidecke, E2E CI |

---

## O que foi feito (cadeia completa ate agora)

### Ja no remote (waves 1-3 + P-1)
9.14, 9.15, 9.20, 9.17, 9.18, 9.19, 9.16, 9.21, contrato 9.4, CLI `acm-validate`

### Esta sessao (apos handoff wave123)
| Commit | Entrega |
|--------|----------|
| `2de6d9e` | test: regressao AP113/AP132 (11 testes) |
| `fc285a4` | feat: P-2 mergeBack + CLI merge-back-xlsx |

### Ancoras AP (nao mudar sem revalidar dataset)
- **113:** mediana 9967.74 · mercado 677806 · tese alinhado · Top3 Cardoso/Elizabeth×2  
- **132:** mediana 10294.37 · mercado 1925047 · tese abaixo · subprec forte -20.1% · Top3 Ubaira/Pariquera/Juruena  

---

## Ler ANTES de executar

1. Este handoff  
2. `docs/acm/STATUS-EXECUCAO-ACM-20260709.md`  
3. `docs/stories/p2-merge-back-xlsx.md`  
4. `docs/acm/9.4-sink-ac3-verification.md` (se 9.4)  
5. `docs/acm/ONEPAGER-H3-LUCIANA-ACM-20260709.md` (se H-3)  
6. Stories InReview em `docs/stories/9.*.story.md`

---

## Bootstrap copy-paste

```powershell
cd "C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\repos\real-state-moema"
git fetch origin
git checkout fix/epic7-v-crawl-health
git status -sb
# esperado: sync com origin, HEAD fc285a4 (ou mais novo)

cd app
npx vitest run src/lib/acm --no-file-parallelism
npx tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132 --json-only
npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132 --dry-run
```

---

## Proximos passos (prioridade)

| # | Acao | Quem |
|---|------|------|
| 1 | **H-3 Luciana** — calibrar desagio A-D + copy Lite | Founder + Luciana |
| 2 | **9.4 sink+backfill** no repo `acm-imobiliario` | @data-eng + @devops |
| 3 | **@qa** — fechar stories InReview (9.14-9.21, P-1/P-2) → Done | @qa |
| 4 | P-1 via RPC (so apos 9.4 PROD) | @dev |
| 5 | Nao iniciar: 9.22, 9.23, skill, Ross, E2E | — |

---

## Vetos

1. Nao repontar valorMercado/mediana legados sem flag  
2. Nao inventar regua A-D sem H-3  
3. Nao editar sink `.py` neste repo  
4. Push so com @devops  
5. Nao commitar `~$*.xlsx` / `.bak`  
6. Nao alterar ancoras AP/Honduras sem revalidar dataset  

---

## Mapa arquivos-chave

| Path | Papel |
|------|--------|
| `app/src/lib/acm/methodology.ts` | Motor |
| `app/src/lib/acm/tipologia.ts` | R5 |
| `app/src/lib/acm/validatePipeline.ts` | P-1 |
| `app/src/lib/acm/xlsx/mergeBack.ts` | P-2 |
| `app/src/lib/acm/andradePertence.regression.test.ts` | Gabarito 113/132 |
| `app/scripts/acm/acm-validate.tsx` | CLI P-1 |
| `app/scripts/acm/merge-back-xlsx.tsx` | CLI P-2 |

---

## Bootstrap self-check

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | HEAD sync? | `fc285a4` origin |
| 2 | Suite ACM? | 269+ tests |
| 3 | P-2 existe? | mergeBack.ts + CLI |
| 4 | 9.4 sink aqui? | Nao — so contrato |
| 5 | Proximo humano? | H-3 |

---

## Success criteria (proxima sessao)

- [ ] Handoff consumido  
- [ ] Um de: H-3 doc, 9.4 engine, ou QA Done em lote de stories  
- [ ] Testes verdes se tocou codigo  

*Score: 9/10 · approved · TTL 30d*
