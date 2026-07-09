# Status de execução — Motor de Evidência ACM (Wave 1)

**Data:** 2026-07-09 · **Modelo:** Opus 4.8 · **Branch:** `fix/epic7-v-crawl-health`
**Plano-mãe:** `PLANO-EXECUCAO-ACM-20260709.md` · **Veredito:** `VEREDITO-ROI-UNICO-20260709.md` (v4)

> Wave 1 **código** fechado em local (3 commits). Nenhum push (0a/@devops permanece pendente — risco: tudo só neste disco).

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
- **0a — push/backup** dos commits locais (agora inclui 9.15 + 9.14, e 9.20 quando commitada). **Risco irreversível** — trabalho só neste disco. Exclusivo `@devops`.
- **0b — H-3 com a Luciana** (valida faixa + calibra defaults A–D da 9.14 + copy).

### Wave 1 — pendência de fechamento
- **Commit da 9.20** — ✅ `71c44a2` (2026-07-09, retomada).
- **Follow-up (hardening):** congelar AP113/AP132 como fixtures de regressão (regra do veredito v4 "Honduras deixa de ser gabarito único"). Requer os datasets canônicos desses casos — encaixa na P-1.

### Wave 2 — Anti-desastre em escala
| Story | Título | Modelo recomendado | Status |
|-------|--------|--------------------|--------|
| **9.17** | R5 industrializado — tipologia por guia como **gate de pipeline** (não script de caso) | Opus | ✅ implementada InReview (working tree; 220 tests) |
| **9.4** | Sink ITBI ampliado (Complemento, Uso IPTU, terreno, fração ideal, ACC) | Sonnet | Ready — contrato de campos alinhado; implementação cross-repo pendente |

### Wave 3 — Uso em campo
| Story | Título | Modelo | Status |
|-------|--------|--------|--------|
| **9.19** | ACM Lite + modo dono + objeções v1 | Sonnet | ✅ InReview (liteModel + package + script; 238 tests) |
| **9.18** | Tese automática acima/alinhado/abaixo na capa | Sonnet | ✅ InReview (teseComercial + badge capa) |
| **9.16** | Pesos de aderência condicionais à tese (constr./terreno/apto) | Opus | Draft |
| **9.21** | Radar de subprecificação (caso 132) | Sonnet | Draft |

### Wave 4 — Fábrica (bloqueada até Waves 1+2 Done)
- **P-1** CLI `acm-validate <endereço>` (dataset canônico + gates R5/9.8/avisos + PDF Lite/Pro + XLSX + computation) — substitui os 3 scripts por caso.
- **P-2** merge-back da planilha XLSX do corretor.

### Fora da janela (não iniciar)
9.22 (simulador 3 estratégias), 9.23 (tribunal/robustez), 9.5 (Fase 2 web + screenshots), skill/squad ACM, Ross-Heidecke, E2E no CI.

---

## Próximo passo recomendado

1. ~~Decidir o commit da 9.20~~ ✅ `71c44a2`.
2. **0a push via @devops** — tirar o trabalho do disco único (risco #1). Branch `fix/epic7-v-crawl-health` está **ahead 3+** de origin (9.15 + 9.14 + 9.20; + docs se commitados).
3. **0b H-3 com a Luciana** — destrava os defaults da 9.14 e o uso comercial (one-pager pronto).
4. Só então **Wave 2** (9.17 + 9.4) e **Wave 3** (paralela), com os modelos recomendados acima.

> Uma frase: **Wave 1 no remote · 9.17+9.18+9.19 no local (ahead) · suite 238. Falta push recente, H-3, 9.4 cross-repo, 9.16/9.21, P-1.**
