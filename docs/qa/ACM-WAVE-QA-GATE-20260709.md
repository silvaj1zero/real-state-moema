# QA Gate batch — ACM Waves 1–3 + P-1/P-2

**Data:** 2026-07-09  
**Branch:** `fix/epic7-v-crawl-health` @ `83cd34c`  
**Executor (prep):** @dev (evidencia de implementacao)  
**Executor (veredito formal):** @qa  

**Suite ACM (saida real, ultima corrida P-2):** `vitest run src/lib/acm` → **23 files / 269 tests passed** · `tsc --noEmit` 0 · `eslint src/lib/acm` 0  

**Smoke CLI:**
```
acm-validate 132 --json-only → n=56 R5 OK tese=abaixo subprec=forte EXIT 0
merge-back-xlsx 132 --dry-run → 58 marks (vazio) 56→56 EXIT 0
```

---

## Matriz de stories

| Story | Status atual | Evidencia | Risco residual | Veredito sugerido |
|-------|--------------|-----------|----------------|-------------------|
| **9.15** avisos + passaporte | InReview | methodology + capa PDF; testes 9.15 | — | **PASS** → Done |
| **9.14** ficha + 3 precos | InReview (mecanismo) | tratarDesagio + capa | Defaults A-D **provisorios H-3** | **PASS condicional** (Done mecanismo; H-3 tracking) |
| **9.20** mediana A/B | InReview | derivarEvidencia; Honduras + AP | — | **PASS** → Done |
| **9.17** R5 | InReview | tipologia.ts + gate + scripts | R5 PROD em escala = 9.4 | **PASS** (offline/canonico) |
| **9.18** tese comercial | InReview | teseComercial.ts + badge capa | — | **PASS** → Done |
| **9.19** ACM Lite | InReview | liteModel + LiteDocument + package | Copy H-3 | **PASS** → Done |
| **9.16** pesos tese | InReview | ADHERENCE_WEIGHTS_BY_TESE; regressao 132-like | apto pesos provisorios | **PASS** → Done |
| **9.21** radar subprec | InReview | subprecificacao.ts; 132 -20.1% forte | — | **PASS** → Done |
| **P-1** acm-validate | InReview (impl) | validatePipeline + CLI | RPC-only apos 9.4 | **PASS offline** |
| **P-2** merge-back | InReview (impl) | mergeBack.ts + CLI | Planilhas ainda sem ✓/✗ preenchidos | **PASS** (mecanismo) |
| **9.4** sink | Ready | contrato + coverage script neste repo | **Codigo no acm-imobiliario** | **Manter Ready** ate engine |

---

## Checklist @qa (por story InReview)

- [ ] File List da story bate com git
- [ ] ACs cobertos por teste ou smoke documentado
- [ ] Sem regressao Honduras (mediana ~18264)
- [ ] Sem segredo / path absoluto de maquina em codigo
- [ ] Status → Done ou CONCERNS com motivo

### Excecoes documentadas (nao bloquear Done do mecanismo)

1. **9.14 defaults A-D** — `origemDefault: 'ficha-provisoria-pre-H3'` ate H-3  
2. **9.4** — fora deste repo  
3. **P-1 RPC** — depende 9.4 PROD  

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

*Prep only — veredito formal e de @qa.*
