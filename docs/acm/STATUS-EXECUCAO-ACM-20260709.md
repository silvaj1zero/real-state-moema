# Status de execução — Motor de Evidência ACM (Wave 1)

**Data:** 2026-07-09 · **Modelo:** Opus 4.8 · **Branch:** `fix/epic7-v-crawl-health`
**Plano-mãe:** `PLANO-EXECUCAO-ACM-20260709.md` · **Veredito:** `VEREDITO-ROI-UNICO-20260709.md` (v4)

> **Atualizado fim de sessão 2026-07-09:** Waves 1–3 + P-1 offline no remote. Branch `fix/epic7-v-crawl-health` @ `ef26b0c` **sincronizada** com origin. Handoff: `docs/sessions/2026-07/2026-07-09-acm-wave123-p1-handoff.md`.

---

## Wave 1 — Motor de evidência (o que foi feito)

| Story | Escopo | Validação (saída real) | Git |
|-------|--------|------------------------|-----|
| **9.15** — avisos[] + passaporte A/B/C | tipos `AvisoAcm`/`ComparavelPassport`; `derivarPassaporte`/`derivarPassaportes`/`agregarConfianca`/`coletarAvisos` (10 códigos canônicos); proveniência opt-in em `AcmComparable`; capa PDF (avisos + contagem A/B/C) | tsc 0 · eslint 0 · **192 tests** | ✅ commit `29ef25f` |
| **9.14** — ficha + deságio explícito + três preços | ficha do alvo (`estadoConservacao` A–D/ano/reformas); `tratarDesagio` (cenários 0/−7,5/−15%); `desagioTratado` no computation; capa "Três preços & arbítrio de estado"; `estadoAlvoConfirmado` silencia aviso 9.15 | tsc 0 · eslint 0 · **199 tests** | ✅ commit `0f34c26` |
| **9.20** — mediana ponderada A/B/C | `weightedMedian`; `derivarEvidencia` (`medianaPrincipal` só A/B, `medianaPonderada`, `nA/nB/nC`, `laterais[]`); aviso AC5 pool A/B<5 | tsc 0 · eslint 0 · **205 tests** | ✅ commit `71c44a2` |

**Regressão preservada em todas:** os números-âncora do caso Honduras permanecem intactos (mediana 18.264 · mercado R$ 12,4M · fechamento R$ 10,2M · co-âncora R$ 9,624M). As três stories são **camadas aditivas** ao `AcmLaudoComputation` — não repontam `valorMercado`. A fixture Honduras tem 0 comparáveis grau C, então `medianaPrincipal == medianaPrecoM2` (9.20) sem flag.

**Suíte ACM:** 15 arquivos, **205 testes verdes** (27 testes novos nesta sessão: 14 em 9.15, 7 em 9.14, 6 em 9.20).

---

## Portão humano registrado (não resolvível por IA)

- **9.14 — régua A–D e defaults de deságio:** o *mecanismo* está pronto; os *defaults* (A→agressivo, B→provável, C/D→conservador) estão marcados **provisórios até a H-3 com a Luciana** (Art. IV — não inventar a régua). `origemDefault: 'ficha-provisoria-pre-H3'` carrega a pendência; a capa imprime o aviso de provisoriedade. **One-pager de elicitação:** `ONEPAGER-H3-LUCIANA-ACM-20260709.md`.

---

## O que falta do plano (não iniciado)

### Fase 0 (pré-condições — humano/@devops)
- **0a — push/backup** — ✅ feito (@devops): `301df10..ef26b0c` em `origin/fix/epic7-v-crawl-health`.
- **0b — H-3 com a Luciana** (valida faixa + calibra defaults A–D da 9.14 + copy) — **ainda pendente**.

### Wave 1 — pendência de fechamento
- **Commit da 9.20** — ✅ `71c44a2` (2026-07-09, retomada).
- **Follow-up (hardening):** ~~congelar AP113/AP132~~ ✅ `andradePertence.regression.test.ts` (11 testes; n=56, mediana/top3/tese/subprecificação).

### Wave 2 — Anti-desastre em escala
| Story | Título | Modelo recomendado | Status |
|-------|--------|--------------------|--------|
| **9.17** | R5 industrializado — tipologia por guia como **gate de pipeline** (não script de caso) | Opus | ✅ InReview |
| **9.4** | Sink ITBI ampliado (Complemento, Uso IPTU, terreno, fração ideal, ACC) | Sonnet | 📋 contrato+coverage script neste repo; **sink `.py` ainda no engine** |

### Wave 3 — Uso em campo
| Story | Título | Modelo | Status |
|-------|--------|--------|--------|
| **9.19** | ACM Lite + modo dono + objeções v1 | Sonnet | ✅ InReview |
| **9.18** | Tese automática acima/alinhado/abaixo na capa | Sonnet | ✅ InReview |
| **9.16** | Pesos de aderência condicionais à tese (constr./terreno/apto) | Opus | ✅ InReview (default hibrido; 132→construcao) |
| **9.21** | Radar de subprecificação (caso 132) | Sonnet | ✅ InReview (limiares 5/8/15%) |

### Wave 4 — Fábrica
- **P-1** CLI `acm-validate` **offline v1** ✅ — `scripts/acm/acm-validate.tsx` + `validatePipeline.ts` (dataset → gates R5/avisos + computation + Lite/laudo). Caminho “só endereço” via RPC ainda depende de 9.4 PROD.
- **P-2** merge-back da planilha XLSX do corretor — não iniciado.

### Fora da janela (não iniciar)
9.22 (simulador 3 estratégias), 9.23 (tribunal/robustez), 9.5 (Fase 2 web + screenshots), skill/squad ACM, Ross-Heidecke, E2E no CI.

---

## Próximo passo recomendado

1. ~~Commit 9.20~~ ✅ · ~~Push 0a~~ ✅ `ef26b0c`.
2. **0b H-3 com a Luciana** — destrava defaults 9.14 + copy Lite.
3. **9.4 sink** no `acm-imobiliario` + `9.4-sink-coverage.mjs` neste repo.
4. **@qa** fechar stories InReview · **P-2** merge-back XLSX · fixtures AP no vitest.

> Uma frase: **Código ACM (waves 1–3 + P-1 offline) no GitHub · falta H-3, sink 9.4 no engine, P-2 e close QA.**
