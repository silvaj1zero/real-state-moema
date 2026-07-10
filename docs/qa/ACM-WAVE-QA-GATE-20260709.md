# QA Gate batch — ACM Waves 1–3 + P-1/P-2

**Data:** 2026-07-09  
**Branch:** `fix/epic7-v-crawl-health`  
**Executor (prep):** @dev  
**Executor (veredito formal):** **@qa — PASS 2026-07-09**  
**Gate YAML:** `docs/qa/gates/epic9-acm-wave-batch-20260709.yml`

**Suite ACM (saida real, revalidacao close):** `vitest run src/lib/acm` → **23 files / 269 tests passed** · `tsc --noEmit` 0  

**Smoke CLI:**
```
acm-validate 132 --json-only → n=56 R5 OK tese=abaixo subprec=forte EXIT 0
merge-back-xlsx 132 --dry-run → 58 marks (vazio) 56→56 EXIT 0
```

---

## Matriz de stories

| Story | Status pos-QA | Veredito |
|-------|----------------|----------|
| **9.15** | **Done** | PASS |
| **9.14** | **Done (mecanismo)** | PASS — H-3 tracking defaults |
| **9.20** | **Done** | PASS |
| **9.17** | **Done** | PASS — R5 PROD escala = 9.4 |
| **9.18** | **Done** | PASS |
| **9.19** | **Done** | PASS — copy H-3 opcional |
| **9.16** | **Done** | PASS |
| **9.21** | **Done** | PASS |
| **P-1** | **Done** | PASS offline |
| **P-2** | **Done** | PASS |
| **9.4** | **Ready** | deferred (engine) |

---

## Checklist @qa — executado 2026-07-09

- [x] Evidencia suite 269 + tsc 0
- [x] Sem regressao Honduras (fixtures + suite)
- [x] Smokes P-1/P-2
- [x] Status stories → Done (exceto 9.4 Ready)
- [x] Gate YAML gravado

### Excecoes aceitas (tracking, nao FAIL)

1. **9.14 defaults A-D** — H-3  
2. **9.4** — `acm-imobiliario`  
3. **P-1 RPC** — pos 9.4  

---

## Comandos de reproducao

```powershell
cd app
npm run typecheck
npx eslint src/lib/acm --max-warnings 0
npx vitest run src/lib/acm --no-file-parallelism
npx tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132 --json-only
npx tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-113 --json-only
npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132 --dry-run
```

---

## Proximo apos QA

1. H-3 Luciana (`docs/acm/ONEPAGER-H3-LUCIANA-ACM-20260709.md`)  
2. 9.4 no engine + `scripts/acm-audit/9.4-sink-coverage.mjs`  
3. Opcional: PR `fix/epic7-v-crawl-health` → main  

**Batch verdict: PASS** — stories fechadas 2026-07-09.
