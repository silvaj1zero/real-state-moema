# HANDOFF — Sessão 2026-06-16 (2ª): EPIC 8 FECHADO + preview dos entregáveis

> **TL;DR:** Implementei e fechei o **Epic 8 — Geração de Entregáveis ACM**. Três stories nesta sessão (full SDC cada, todas pushed): **8.3b** (Laudo Técnico), **8.4** (Deck Comercial + Material Didático) e **8.6** (pacote completo em 1 clique). A **8.5** ficou **Descoped** (decisão @pm + ADR). O app agora gera **5 saídas ACM nativas** (resumo, laudo, deck, didático + pacote dos 4). Remoto em `e9a76ad`. Gerei 4 PDFs de preview em `C:\Users\Zero\Downloads\acm-preview\` para revisão visual.

---

## 1. O que foi entregue (3 stories, todas Done + pushed)

| Story | Entregável | Commit | Gate |
|---|---|---|---|
| **8.3b** | Laudo Técnico (retrato, ~18 págs / 10 seções) | `348c41e` | CONCERNS |
| **8.4** | Deck Comercial (paisagem, 20 slides) + Material Didático (retrato, 5 partes) | `143b772` | CONCERNS |
| **8.6** | Pacote completo em 1 clique (4 PDFs de um `computeLaudo`) | `e9a76ad` | **PASS** |
| 8.5 | Orquestração app↔engine | — | **Descoped** (ADR-EPIC8-001) |

**Arquivos novos** (`app/src/lib/acm/pdf/` + `components/acm/`):
- `laudoModel.ts` + `LaudoDocument.tsx` (+ testes) — Laudo.
- `deckModel.ts` + `DeckDocument.tsx`, `didaticoModel.ts` + `DidaticoDocument.tsx` (+ teste) — Deck/Didático.
- `acmPackage.tsx` (`buildAcmPackage`) + `PacoteExportSheet.tsx` (+ teste) — pacote 1-clique.
- `LaudoExportSheet.tsx`, `EntregavelExportSheet.tsx` — sheets de geração.
- Gates: `docs/qa/gates/8.3b-…`, `8.4-…`, `8.6-…`.

**Alterado:** `AcmExportMenu.tsx` — 5 itens de exportação (pacote destacado + resumo/laudo/deck/didático).

## 2. Estado do git
- **Branch:** `fix/epic7-v-crawl-health`. **Remoto = local** em `e9a76ad` (`git log origin..HEAD` vazio).
- Commits desta sessão: `348c41e` (8.3b), `143b772` (8.4), `e9a76ad` (8.6).
- **Uncommitted pré-existente (não relacionado, NÃO commitar):** `app/package-lock.json` (M desde o início) + `.claude/settings.local.json.bak` (untracked).

## 3. Arquitetura entregue (consolidação do Epic 8)
```
[ENGINE Python externo]            [APP Next.js / Vercel — nativo TS]
 acm-imobiliario  ──push ITBI──▶  acm_comparaveis (Supabase)
                                    ↓ RPC fn_comparaveis_no_raio
                                  methodology.ts (8.2)  → AcmLaudoComputation
                                    ↓ (zero recálculo)
                                  pdf/ (8.3a/8.3b/8.4/8.6) → 5 PDFs
```
- **Fonte única de números:** `computeLaudo` (8.2). Todos os view-models consomem o MESMO `AcmLaudoComputation` — consistência garantida entre os 5 entregáveis.
- **Fidelidade Art. IV:** texto-fonte de cada PDF extraído via `pdftotext -layout` dos PDFs de referência em `docs/reference/acm-honduras/`. Defaults templados, sobrescrevíveis por `*Input`.

## 4. Preview para sua revisão visual
4 PDFs gerados com a fixture Honduras (dados completos) em **`C:\Users\Zero\Downloads\acm-preview\`**:
- `acm-resumo.pdf` (13 KB) · `acm-laudo.pdf` (46 KB) · `acm-deck.pdf` (47 KB, paisagem) · `acm-didatico.pdf` (20 KB)
- Gerados por um teste descartável (`__preview.gen.test.tsx`) que foi **removido** após o uso. Para regerar: recriar um gerador chamando `buildAcmPackage` + `renderToBuffer` + `writeFileSync`.

## 5. Fatos técnicos (agir sem re-investigar)
- **Testes de PDF:** rodar com **`npx vitest run … --no-file-parallelism`**. Sob paralelismo de arquivos, os `renderToBuffer` pesados (laudo 18p + deck 20 slides + didático + pacote 4×) podem dar **timeout por contenção** (3 "errors" numa run paralela; **117/117** determinístico no modo sequencial). Não é defeito de código.
- **Validação total:** 0 erros tsc (`^src/`) · 0 lint · 117/117 testes ACM.
- **`tsc --noEmit`:** filtrar por `^src/` (vendored `devtools-protocol` acusa 1 erro pré-existente, fora do escopo).
- **React-PDF v4:** paisagem via `<Page orientation="landscape">`; fontes nativas Helvetica (offline-safe); `renderToBuffer` funciona em node/vitest.
- **Mapa:** Mapbox Static pré-buscado (`resolveStaticMapImage`) → data URL embutida; token fora do PDF. `ComparavelNoRaio` ainda **sem lat/lng** → sem pins de comparáveis.

## 6. Backlog (fast-follows — não bloqueiam; abrir em sessão nova)
1. **ZIP do pacote + anexar ao dossiê** (eram AC da 8.5; sem dep de ZIP hoje → downloads sequenciais).
2. **Revisar texto qualitativo nas sheets / aviso "revisar antes de emitir"** — os defaults (sec. 4/6/10 do laudo; institucional do deck) são *seeds* Honduras (gates 8.3b/8.4, medium).
3. **lat/lng na RPC `fn_comparaveis_no_raio`** (@data-engineer) → pins do Top N no mapa (fecha 8.3a/8.3b/8.4).
4. **Logo RE/MAX PNG oficial** (AC5 das stories de PDF; hoje é lockup tipográfico).
5. **Promover percentis/ticket/breakdown do residual** para `methodology.ts` (single-source; gate 8.3b low).
6. **Merge da branch** `fix/epic7-v-crawl-health` → `master` (avaliar com @devops; a branch acumula Epic 7 + Epic 8).

---
*Handoff 2026-06-16 (2ª). Epic 8 fechado: 8.0–8.4 + 8.6 Done, 8.5 Descoped. Próximo: revisar os PDFs de preview e priorizar os fast-follows em sessão nova.*
