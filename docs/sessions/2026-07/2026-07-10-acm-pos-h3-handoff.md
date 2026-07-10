# Handoff — ACM pós H-3 (estado de implementação)

| Field | Value |
|-------|--------|
| **handoff_id** | `2026-07-10-acm-pos-h3-handoff` |
| **date** | 2026-07-10 |
| **priority** | P1 |
| **type** | `session` |
| **scope** | `self_continuation` |
| **HEAD** | `bdf3467` (sync origin no momento da escrita; verificar `git log -1`) |
| **branch** | `fix/epic7-v-crawl-health` |
| **repo** | `real-state-moema` |

---

## CRITICAL CONTEXT

**Onde estamos:** motor ACM + Lite + CLI P-1/P-2 + fixtures AP + **H-3 calibrada** no código (`H3_POLICY`, régua A–F). Suite **269 tests**.  
**O que falta de produto neste monorepo:** quase nada de story aberta — **9.4 sink** é cross-repo (`acm-imobiliario`, ausente em `repos/`). Opcional: PR → main, SOP operacional, alinhar Resumo/Deck com política residual H-3.

---

## Decisões H-3 (já no código)

| Item | Valor |
|------|--------|
| Faixa capa | Mercado X–Y (referência Z) |
| Estado | A 0% · B −5% · C −7,5% · D −10% · E −15% · F fora |
| Subprec | “Subprecificado — não recomendo cortar” |
| Residual | Só laudo técnico Sec. 8 (não capa Lite) |
| V1/V2 | Lite V1 · laudo completo V2 |
| Erro | Preferir subavaliar |
| Frase | “O mercado não é um número — é uma faixa…” |

Doc: `docs/acm/DECISOES-H3-LUCIANA-20260710.md`  
Código: `app/src/lib/acm/methodology.ts` → `ESTADO_DESAGIO_H3`, `H3_POLICY`

---

## Stories Done (QA batch + H-3)

9.14–9.21, P-1, P-2 → **Done**  
9.4 → **Ready** (engine)

Gate: `docs/qa/gates/epic9-acm-wave-batch-20260709.yml`

---

## Bootstrap

```powershell
cd "...\real-state-moema"
git checkout fix/epic7-v-crawl-health
git pull
cd app
npx vitest run src/lib/acm --no-file-parallelism
```

Uso ficha:
```ts
computeLaudo({ target: { ..., estadoConservacao: 'B' }, ... }) // −5%
```

CLI:
```bash
npx tsx scripts/acm/acm-validate.tsx docs/acm/andrade-pertence-132 --json-only
npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132 --dry-run
```

---

## Próximos passos (ordem)

1. **Alinhar Resumo/Deck** com H-3 (co-âncora fora da capa do resumo se ainda tiver card)  
2. **SOP 1 página** “como rodar ACM na prática” (V1 Lite → V2 laudo + ficha A–E)  
3. **9.4** quando `acm-imobiliario` estiver disponível  
4. **PR** branch → main (founder/@devops)  
5. **Não iniciar:** 9.22, 9.23, skill, Ross, E2E sem pedido  

---

## Vetos

- Não reverter régua H-3 sem nova elicitação  
- Não inventar defaults de deságio  
- Não editar sink `.py` neste repo  
- Push com @devops  

*Score 9/10 · approved*
