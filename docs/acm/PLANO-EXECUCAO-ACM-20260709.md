# Plano de execução ACM — pós-veredito v4 (para modelos operacionais)

**Data:** 2026-07-09 · **Origem:** `VEREDITO-ROI-UNICO-20260709.md` (v4)
**Público-alvo:** sessões de implementação em **Sonnet 4.6 / Opus 4.8** (não Fable). Este documento é o handoff estratégico → operacional: cada wave abaixo é executável pelo SDC existente (`@dev` implementa, `@qa` gate, `@devops` push) sem decisão estratégica nova.

---

## Como usar este plano (leia antes de tudo)

1. **1 story = 1 sessão.** Abrir sessão nova por story, com `/model` no tier indicado na tabela. Ao concluir, `/handoff` e fechar.
2. **Fluxo por story:** ler a story em `docs/stories/` → implementar → validar (comandos abaixo) → marcar checkboxes + File List → `@qa` gate → commit convencional `[Story 9.x]`.
3. **Validação obrigatória (DoD de toda story) — saída real, nunca alegação:**
   ```bash
   cd app
   npm run typecheck        # exit 0
   npm run lint             # exit 0
   npx vitest run src/lib/acm --no-file-parallelism   # suíte ACM verde (195+ testes)
   ```
4. **Rede de proteção:** `app/src/lib/acm/methodology.test.ts` contém a regressão do caso Honduras. **Nenhuma story pode alterar os números dos laudos já entregues** (Honduras v5, AP113 v2, AP132 v4) — se um teste de regressão quebrar, o erro está na implementação, não no teste.
5. **Fronteiras:** não tocar em `docs/acm/*/LAUDO-*.pdf` já entregues; não fazer `git push` (exclusivo `@devops`); não criar squad/skill nova nesta janela.

---

## Fase 0 — pré-condições (antes de qualquer wave)

| # | Ação | Quem | Status |
|---|------|------|--------|
| 0a | Push/backup dos commits locais do branch `fix/epic7-v-crawl-health` | `@devops` (humano autoriza) | **BLOQUEANTE — risco irreversível** |
| 0b | H-3: sessão com Luciana valida formato faixa + calibra ficha do alvo e copy | Founder + Luciana | Calibra a 9.14 e a 9.19; a 9.15 **não** depende disso |

---

## Ordem reconciliada (veredito 1 + veredito 2)

Os dois vereditos concordam no conjunto; divergiam em 3 pontos, resolvidos assim:

1. **9.15 antes de 9.14** — não por importância (a ficha tem o maior swing comercial), mas por dependência: a ficha calibra com H-3 (Luciana), e os `avisos[]`/passaporte são puramente técnicos. Se H-3 já ocorreu quando você ler isto, inverta livremente — as duas são a mesma wave.
2. **R5 industrializado (9.17 + 9.4) é gate duro pré-CLI** — promovido conforme veredito 2: "CLI sem R5 automatiza erro". O CLI (P-1) fica **bloqueado** até 9.17+9.4 e 9.15+9.14 estarem Done.
3. **ACM Lite (9.19) sobe de prioridade** — é uma das 3 apostas de ROI máximo do veredito 2 (adoção em campo antes de V1/V2). Roda em **paralelo** com a Wave 2 (arquivos disjuntos: rendering vs pipeline de dados).

Regra transversal nova (veredito 2): **Honduras deixa de ser gabarito único.** A primeira story de cada wave que tocar `methodology.ts` deve congelar também AP113 e AP132 como fixtures de regressão (computation JSONs em `docs/acm/andrade-pertence-*/`).

---

## Wave 1 — Motor de evidência (caminho crítico, ~1 semana)

| Ordem | Story | Título | Modelo | Por quê este tier |
|-------|-------|--------|--------|-------------------|
| 1 | **9.15** | `avisos[]` canônicos + passaporte de confiabilidade A/B/C por comparável | **Opus** | Altera schema do computation e `methodology.ts` (lógica sensível de avaliação) |
| 2 | **9.14** | Ficha obrigatória do alvo + deságio não-fixo (fim do −15% cego) + três preços na capa | **Opus** | Maior swing de valor; erro aqui = erro comercial grave |
| 3 | **9.20** | Mediana ponderada / ranking A·B·C (classe C fora da mediana principal) | **Opus** | Muda o número final; protegida pelas fixtures das 3 regressões |

**Notas de implementação por story:**

- **9.15** — códigos canônicos já definidos no veredito v4 §1 (`sample_size_low_top3`, `typology_heuristic_present`, `target_condition_unconfirmed`, etc.). Passaporte por comparável: fonte do preço, tipologia (guia/heurística/visual/desconhecida), área (oficial/anúncio/estimada), geocoding (exato/rua/CEP), data (confirmada/inferida), status (incluído/excluído/lateral), confiança A/B/C. Emitir no `.computation.json` **e** renderizar avisos na capa do PDF (`app/src/lib/acm/pdf/LaudoDocument.tsx`). Nesta story, congelar fixtures AP113/AP132.
- **9.14** — ficha do alvo como dado estruturado (conservação em 5 níveis, idade efetiva, áreas oficiais, vagas, testada, regularização). Deságio vira função da ficha (0% / −7,5% / −15% / faixa), nunca constante. Sem ficha → aviso `target_condition_unconfirmed` + faixa conservadora explícita. Capa passa a mostrar **sempre** três preços: técnico provável · comercial de captação · estratégico de anúncio — nunca colapsar em um número.
- **9.20** — aderência (50% raio + 20% tipologia + 30% área, em `app/src/lib/acm/similar.ts`) vira peso, não só ordem. Classe C = referência lateral, fora da mediana principal. Leave-one-out simples como teste interno (prepara a 9.23 sem implementá-la).

## Wave 2 — Anti-desastre em escala (pode iniciar em paralelo após 9.15)

| Story | Título | Modelo |
|-------|--------|--------|
| **9.17** | R5 industrializado: tipologia por guia oficial como **gate do pipeline** (não script de caso); venda sem guia = "provável" + exige validação humana; bloquear laudo confiante com tipologia incerta | **Opus** |
| **9.4** | Sink ITBI ampliado: Complemento, Uso IPTU, padrão, área terreno, fração ideal, testada, ACC (fecha AC3; abre V. Olímpia/Brooklin) | **Sonnet** |

## Wave 3 — Uso em campo (paralelo à Wave 2; arquivos disjuntos)

| Story | Título | Modelo |
|-------|--------|--------|
| **9.19** | ACM Lite 2 páginas + resumo "modo dono" + modo objeções v1 (5 respostas citando evidência do próprio ACM) | **Sonnet** |
| **9.18** | Tese automática acima/alinhado/abaixo na capa | **Sonnet** |
| **9.16** | Pesos de aderência condicionais à tese (construção/terreno/apto) | **Opus** (toca ranking) |
| **9.21** | Radar de subprecificação (caso 132: "não reduzir preço; reposicionar") | **Sonnet** |

## Wave 4 — Fábrica (bloqueada até Waves 1 e 2 Done)

| Item | Título | Modelo |
|------|--------|--------|
| **P-1** | CLI `acm-validate <endereço>`: dataset canônico + gates R5/9.8/avisos + PDF Lite/Pro + XLSX + computation + pasta `docs/acm/<slug>/` — substitui os 3 scripts por caso | **Opus** (consolidação) |
| **P-2** | Merge-back da planilha XLSX do corretor | **Sonnet** |

## Depois (fora desta janela — não iniciar)

9.22 (simulador 3 estratégias) e 9.23 (tribunal/robustez) — **a criar** via `@sm`, só após três preços estáveis · Fase 2 web graduada + screenshots (9.5) · skill/squad ACM · Ross-Heidecke/regressão (só com idade/estado capturados pela 9.14+9.4) · E2E no CI.

---

## Anti-lista (unificada dos dois vereditos — vale para toda sessão)

1. Regressão/Ross **antes** de avisos + ficha + passaporte.
2. CLI que só empacota os scripts sujos atuais.
3. Criativos em PDF (tribunal/objeções/simulador) **sem** a prova correspondente no JSON — vira teatro.
4. Anúncio dentro da mediana de transações.
5. Chamar de laudo NBR formal — posicionamento fixo: *"ACM operacional para decisão de captação; evoluível a laudo técnico"*.
6. Polir o PDF de 18 páginas antes do Lite existir.
7. Honduras como gabarito único (congelar AP113/AP132 na 9.15).
8. Sessão longa com trabalho só local sem push.

## DoD da janela (quando parar e comemorar)

- [ ] Push/backup feito (0a)
- [ ] H-3 registrada (0b)
- [ ] Computation emite `avisos[]` canônicos + passaporte A/B/C (9.15)
- [ ] Capa com três preços; sem ficha → faixa conservadora explícita (9.14)
- [ ] Mediana ponderada com classe C fora do headline (9.20)
- [ ] R5 é gate de pipeline, não script de caso (9.17 + 9.4)
- [ ] Lite gera pacote "modo dono" para 1 endereço novo (9.19)
- [ ] CLI produz pacote completo sem copiar pasta (P-1) — **só após tudo acima**
