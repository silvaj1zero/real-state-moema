# Epic 9 — ACM: Paridade de Entrega Premium + Suporte a Apartamento

**Versão:** 1.0
**Status:** Draft — Ready for Architect / PO Validation
**Data:** 2026-06-17
**Author:** Morgan (@pm) — derivado da análise de migração ACM (Jardins → Moema) e da comparação 1:1 entregáveis reais × geradores internos
**End-user validadora:** Luciana Borba (RE/MAX Galeria Moema)

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-17 | 1.0 | Esboço do Epic 9 a partir de (1) `docs/guides/MIGRACAO-ACM-laudo-planilha-mapa.md`, (2) comparação 1:1 do laudo real `LAUDO_ACM_Rua_Honduras.pdf` (19 págs) × `LaudoDocument` interno e da planilha `ACM-Honduras629-CANONICO-validado.xlsx` (7 abas) × CSV interno | Morgan (@pm) |

---

## 1. Goals and Background Context

### Goals

- **Fechar a distância de qualidade** entre o entregável ACM interno (Epic 8, React-PDF) e o padrão artesanal comprovado de referência (laudo Honduras + planilha canônica), nas **três frentes medidas na comparação**: planilha, riqueza de dado e mapa/acabamento.
- **Suportar produto = ambos (apartamento + casa):** introduzir um discriminador de tipo que ativa a régua de Score e as seções corretas do laudo (terreno só p/ casa; andar/vista/privativa p/ apto). Moema é majoritariamente vertical e o método atual foi herdado de um caso de **casa/terreno** (Honduras 629).
- **Preservar a arquitetura Opção C** (ADR-EPIC8-001): renderização **nativa TS (`@react-pdf/renderer`)** in-app; **não** introduzir toolkit Python. O engine permanece só como fonte de dado ITBI.
- **Elevar a paridade de evidência, não só de layout:** levar para os entregáveis os dados que hoje ficam NULL (S/V/D, SQL cadastral, status web) — fechar AC3 do sink e estabelecer a "Fase B" de validação.

### Background Context

A comparação 1:1 desta sessão estabeleceu que a **espinha analítica do Moema já iguala** o caso de referência:

- `methodology.ts` (Story 8.2) tem **regressão travada** nos números do laudo Honduras: mediana 18.264, valor de mercado ~R$ 12,42M, fechamento ~R$ 10,22M, residual R$ 9,624M, Top 3 = {Chiaffarelli 86, Bittencourt 101, Torres Homem 399}, deságio −10/−15%.
- O `LaudoDocument` (Story 8.3b, Done) reproduz as **10 seções 1:1** com o PDF de referência.

A distância restante é concreta e mensurável:

1. **Planilha (maior lacuna).** Referência = **XLSX com 7 abas** (Leia-me · Top 3 · Top 5 · Top 10 · Todos · Ofertas ativas · Terrenos), 21 colunas, `PatternFill` por faixa, `Font` colorida, **hyperlinks** (anúncio + Maps), `freeze_panes`, `auto_filter`, sínteses com `merge`. Interno = **um CSV plano** (19 colunas, sem abas/cor/links). Faltam por completo as abas **Ofertas ativas** (19 ofertas com validação web) e **Terrenos** (vendidos + frações ideais <99% + ofertados, com triangulação vendido×ofertado).
2. **Riqueza de dado (paridade de evidência).** O laudo/planilha real exibe **S/V/D** por comparável, **SQL cadastral** por comparável, **status web** (CONFIRMADO/PARCIAL/off-market/NÃO ACHADO) e **links de anúncio**. No Moema esses campos ficam **NULL** nas 3.618 linhas ITBI porque o sink do engine ainda os colapsa (pendência AC3, cross-repo) e não há um processo de validação web equivalente à "Fase B".
3. **Mapa e acabamento.** Referência = mapa com **raio + Top 5 numerados (❶–❺) + alvo**. Interno = Mapbox Static plota **só o alvo + raio** (pins de comparáveis omitidos). Tipografia interna cai em **Helvetica** (Montserrat/Inter são opt-in, sem TTF embutido); logo em lockup tipográfico.
4. **Produto.** Referência é 100% **casa**; as seções 8/8a/8b (ótica de terreno, efeito-escala de lote, valor residual) e a aba Terrenos **não se aplicam a apartamento** e hoje seriam renderizadas mesmo assim. Falta o discriminador de tipo + régua de apartamento.

### Decisão de arquitetura — herdada (ADR-EPIC8-001)

Renderização **nativa TS** no app; engine = só produtor de dados ITBI. Este épico **não** reabre a decisão — a Opção A/B (toolkit Python) do documento de migração foi avaliada e **rejeitada** para este projeto, pois o Moema já tem geradores React-PDF (Laudo/Resumo/Deck/Didático) testados. O valor está em **cherry-pick** das 3 lacunas, não em migrar código Python.

### Referências (fontes — Art. IV: No Invention)

- `docs/guides/MIGRACAO-ACM-laudo-planilha-mapa.md` — documento de migração (origem do replanejamento).
- `LAUDO_ACM_Rua_Honduras.pdf` (19 págs, capa + 10 seções) — estrutura/formato-alvo do laudo.
- `ACM-Honduras629-CANONICO-validado.xlsx` (7 abas, 21 colunas) — estrutura/formato-alvo da planilha.
- `docs/reference/acm-honduras/` — materiais versionados (Epic 8).
- `app/src/lib/acm/methodology.ts` (8.2), `app/src/lib/acm/pdf/*` (8.3a/8.3b/8.4), `app/src/components/acm/*`.
- RPC `fn_comparaveis_no_raio` (migrations `20260615000002`, `20260615000004`, `20260616000001`).
- Pendência AC3: Story 8.1 + sink `engine/src/sinks/supabase_acm.py` (repo externo `acm-imobiliario`).

---

## 2. Relação com outros épicos

- **Epic 8 (Geração de Entregáveis ACM)** — base direta; este épico estende os geradores e o modelo de dado já entregues.
- **Epic 7 (Prospecção / ITBI / FISBO)** — fornece os 3.618 comparáveis ITBI e o **crawler** (FISBO/Apify) reaproveitável na "Fase B" de validação web (Story 9.5).
- **Cross-repo `acm-imobiliario`** — dono do sink ITBI (Story 9.4 / AC3); coordenação via @devops.

---

## 3. Stories (Story Map)

| Story | Título | Camada | Prioridade | Depende de | Executor |
|-------|--------|--------|------------|------------|----------|
| 9.0 | Spike — auditoria de dados ACM (lat/lng na RPC, campos NULL pós-AC3, amostra ITBI Moema real) | Dados/Arquitetura | Must | — | @architect + @data-engineer |
| 9.1 | Discriminador de produto (apto/casa): régua de Score por tipo + seções condicionais do laudo | Cálculo/Render | Must | 9.0 | @dev |
| 9.2 | Planilha XLSX canônica multi-aba (7 abas, fills, hyperlinks, freeze, auto-filter) | Render | Must | 9.0 | @dev |
| 9.3 | Mapa do laudo: raio + Top 5 numerado + pins de comparáveis (lat/lng da RPC) | Render | Should | 9.0 | @dev |
| 9.4 | Riqueza de dado: fechar AC3 do sink engine (constr×terreno, SQL, S/V/D, padrão, ano, valor venal) | Dados (cross-repo) | Must | 9.0 | @data-engineer + @devops |
| 9.5 | "Fase B" — validação web de comparáveis (status CONFIRMADO/PARCIAL/off-market + links) | Dados/Integração | Should | 9.4, Epic 7 crawler | @dev |
| 9.6 | Acabamento tipográfico/branding do PDF (vendoring Montserrat/Inter, logo vetorial RE/MAX) | Render/Design | Should | — | @dev + @ux-design-expert |
| 9.7 | Config geográfica Moema validada (CEP/viewbox contra ITBI real) | Dados | Could | 9.0 | @data-engineer |
| 9.14 | Deságio/estado do alvo explícito (C-1) + ficha do imóvel | Cálculo/Render | Must | H-3 Luciana | @dev |
| 9.15 | `avisos[]` de robustez da amostra na capa | Cálculo/Render | Must | — | @dev |
| 9.16 | Pesos de aderência por tese (construção/terreno/apto) | Cálculo | Must | — | @dev |
| 9.17 | R5 industrializado (tipologia casa×apto + gate) | Dados/Cálculo | Must | 9.4 ampliada | @dev + @data-engineer |
| 9.18 | Tese comercial automática (acima/alinhado/abaixo) | Render | Should | 9.10 | @dev |
| 9.19 | ACM Lite + resumo “modo dono” | Render/UX | Must (adoção) | 9.10; soft 9.15/9.18 | @dev + @ux |

> **Wave pós-avaliação crítica 09-Jul:** 9.14 ‖ 9.15 ‖ 9.16 → 9.17 (com 9.4) → 9.18 → 9.19.  
> **QA batch 2026-07-09:** 9.14–9.21 + P-1/P-2 → **Done** (gate `docs/qa/gates/epic9-acm-wave-batch-20260709.yml`). **9.4** permanece Ready (cross-repo).  
> **Sequência original:** 9.0 → (9.1 ‖ 9.2 ‖ 9.4) → (9.3 ‖ 9.5) → 9.6. 9.7 oportunístico.
> **Caminho crítico mínimo p/ 1ª entrega premium:** 9.0 → 9.1 + 9.2 (laudo de apto + planilha canônica). 9.4 em paralelo (cross-repo). 9.3/9.5/9.6 enriquecem.
> Stories detalhadas serão criadas por @sm em `docs/stories/9.0.story.md` … `9.7.story.md` após validação @po.
> **Recorte do 1º draft (decisão founder, 2026-06-17):** @sm detalha o **caminho crítico 9.0 · 9.1 · 9.2 · 9.4**; 9.3/9.5/9.6/9.7 permanecem como esboço neste PRD até refino pós-spike (9.0). **9.4 mantida como Must** (cross-repo `acm-imobiliario`, coordenada via @devops).

---

## 4. Out of Scope (Epic 9)

- Evolução estatística (regressão hedônica, shrinkage bayesiano, grau NBR 14653) — épico futuro (Fase 2 do Roadmap).
- Reescrita do motor de cálculo da 8.2 — apenas estende-se com o discriminador de tipo (9.1).
- Toolkit Python / reprocessamento de ITBI no app — rejeitado pela ADR-EPIC8-001.
- Multi-consultor regional para `acm_comparaveis` — segue por-consultor (caveat herdado).

---

## 5. Risks & Assumptions

- **Risco (régua de apto):** não há benchmark de qualidade de apartamento como houve para casa (Honduras). **Mitigar:** definir a régua de Score privativo + ajustes (andar/vista/vagas) com a Luciana (elicit na 9.1) e travar com 1 caso-teste de apto.
- **Risco (cross-repo, 9.4):** o sink vive no repo `acm-imobiliario`; sem ele, S/V/D/SQL/terrenos seguem NULL e a paridade de evidência não fecha. **Mitigar:** 9.4 é Must e roda em paralelo; 9.2/9.3/9.5 devem degradar graciosamente com campos NULL.
- **Risco (LGPD):** ITBI = endereço + valor; manter repositório privado/local-only (waiver de founder vigente).
- **Assumption (a confirmar na 9.0):** a RPC mais recente (`20260616000001`, Story 8.7) já retorna `latitude/longitude` por comparável — se confirmado, a 9.3 é majoritariamente camada de render.
- **Assumption:** os geradores React-PDF/CSV atuais degradam graciosamente com `n<5` e campos NULL (validado no Epic 8).

---

## 6. Success Metrics

- **Planilha:** XLSX gerada do app reproduz as 7 abas e o estilo da canônica de referência (revisão visual da Luciana).
- **Laudo apto:** 1 laudo de apartamento real de Moema, sem seções de terreno indevidas, validado pela Luciana.
- **Evidência:** ≥1 comparável por linha do Top 5 com SQL cadastral + status web + link (quando recuperável) — não NULL.
- **Mapa:** PDF com raio + Top 5 numerados batendo os marcadores às coordenadas.
- **Regressão:** zero quebra dos números-âncora Honduras (8.2) e dos 114 testes ACM existentes.
