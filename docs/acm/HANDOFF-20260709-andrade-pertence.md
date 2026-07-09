# HANDOFF — Sessão 09-Jul-2026 · ACMs Andrade Pertence 113 e 132 + Regra R5

**Contexto:** sessão em `fix/epic7-v-crawl-health` (16+ commits locais SEM push — pendência @devops).
Trabalho todo em arquivos novos (scripts de caso + artefatos em `docs/acm/`) — nenhum código de
`app/src/` foi alterado. Próxima sessão: operador vai trocar o modelo (Opus) e dar `/clear`.

---

## 1. O que foi entregue (estado final: v2, validado)

### Caso 2 — Rua Dr. Andrade Pertence, 113 (sobrado 80 m²c / 150 m²t, 1974, reforma geral; proprietária referencia R$ 1,1M)
- `docs/acm/andrade-pertence-113/`: `LAUDO-ACM-AndradePertence113-v2-2026-07-09.pdf` + `.computation.json`,
  `dataset.json` (56 casas), `tipologia-guias.json`, `ACM-AndradePertence113-validacao-corretor.xlsx`
- **Números v2:** mediana homogeneizada 10.640/m² · faixa construção **R$ 723.536–1.094.096**
  (referência Top 5 = **R$ 1.060.626**) · leitura direta de terreno: 42 lotes <500 m² da guia,
  mediana 8.873/m² × 150 m² ≈ **R$ 1,33M** · **conclusão: o R$ 1,1M da proprietária é DEFENSÁVEL**
  (as duas lentes convergem). A v1 (contaminada por apartamentos) dizia o oposto — está superada.

### Caso 3 — Rua Dr. Andrade Pertence, 132 ("Rodolpho"; ~220 m²c, conservado, 6 vagas; anunciado estagnado a R$ 1.495.000 em 70+ anúncios)
- **ESTADO FINAL = v3** (a v2 abaixo foi superada — ver "Evolução v2→v3").
- `docs/acm/andrade-pertence-132/`: `LAUDO-ACM-AndradePertence132-v3-2026-07-09-rev2.pdf` (canônico; rev2
  casado com o computation às 07:05) + `LAUDO-...-v3-....computation.json`, `dataset.json` (56 casas,
  backup do v2 em `dataset.v2-backup.json`), `tipologia-guias.json`,
  `ACM-AndradePertence132-validacao-corretor-rev3.xlsx` (sufixo -rev3 porque rev/rev2 estavam abertas
  no Excel do operador — usar a rev3, alinhada ao dataset v3 / 56 casas).
- **Números v3:** mediana só-casas 11.072/m² · faixa **R$ 1.991.167–2.337.426** (piso Top5 → teto Top3;
  a v2 colapsava num ponto 1.991.167–1.992.445) · anúncio atual **33,2% ABAIXO** da referência ·
  **tese mantida: SUBPRECIFICAÇÃO + oferta pulverizada — não cortar preço**.
  Fonte do alvo: `C:\Users\Zero\Downloads\Apresentação Vila Olimpia Rodolfo New.pdf` (a análise comercial
  da apresentação — 3 amostras de preço pedido + fator oferta → R$ 1,29M — foi DESCONSIDERADA a pedido).

#### Evolução v2 → v3 (o que a v3 corrigiu)
1. **Tipologia (Street View):** dois endereços que a heurística de lote dava como casa — **Av. Cotovia 726**
   e **Av. Pavão 700** — foram reclassificados como EDIFÍCIO por verificação visual (Google Street View,
   dez/2024) e EXCLUÍDOS. Funil `aposTipologiaGuia` 58 → **56 casas**. Isso resolve o alerta que a própria
   Sec 5 já apontava (Cotovia 726 era casa na guia de 2023, mas hoje há prédio no local).
2. **Faixa virou intervalo real:** teto passou de "todos (n=58) → 1.992.445" para "Top3 (n=3) → **2.337.426**".
3. **Capex reenquadrado como arbítrio NBR (C-1):** o valor de mercado usa o PISO conservador −15% (Score B).
   Cenário provável para imóvel conservado = −7,5% (**R$ 2.166.858**); teto 0% (**R$ 2.342.549**) —
   confirmar estado do alvo (ficha/vistoria) para fixar o fator final.
4. **Self-check da XLSX atualizado** (`07-build-xlsx.tsx`): Top 3 de aderência agora
   `Ubaíra 60 · Juruena 87 · Pariquera-Açu 41` (Cotovia 726 saiu) — CONFERE com o laudo v3 ✓.

## 2. Incidente tipologia — RESOLVIDO e documentado (regra R5)

- **Causa-raiz:** ingestão de `acm_comparaveis` descartou o **"Complemento"** da guia ("AP 82") →
  apartamentos viram "endereços de rua" com venda única → proxy R3 deixou passar ~50% de APs.
  Detectado pelo operador via Google Maps; confirmado pela guia oficial.
- **Correção (R5):** crosscheck **SQL → guia oficial** ("Guias de ITBI pagas", SF/PMSP —
  capital.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501; arquivos 2023/2024/consolidado 28-01-2026).
  Uso (IPTU) = RESIDÊNCIA/horizontal entra; APARTAMENTO EM CONDOMÍNIO sai. Vendas 2026 (sem arquivo
  público ainda): **heurística de lote declarada** (lote do SQL ≥ ~0100 = unidade condominial) +
  marcação de prioridade na planilha Fase 1.
- **Bônus:** guia traz área de TERRENO real, fração ideal, testada, ACC → lente de terreno (Sec. 8) medida.
- **Documentação:** método em `docs/acm/ROADMAP-ACM.md` §3.1 (não-negociável); código em
  `app/scripts/acm-andrade-pertence*/04-build-dataset.mjs` (headers R1–R5),
  `10-backfill-tipologia.mjs` (implementação de referência), laudos/XLSX (Sec. 4 e Leia-me);
  memória do projeto atualizada (`project-acm-evolucao-status`).
- Arquivos oficiais baixados em `%TEMP%\itbi-{2023,2024,atual}.xlsx` (não versionados; re-baixar se preciso).

## 3. Pipeline por caso (ordem de execução, de `app/`)

```
node   scripts/acm-andrade-pertence-132/10-backfill-tipologia.mjs %TEMP%\itbi-2023.xlsx %TEMP%\itbi-2024.xlsx %TEMP%\itbi-atual.xlsx
node   scripts/acm-andrade-pertence/04-build-dataset.mjs        # ou -132
npx -y tsx scripts/acm-andrade-pertence/05-build-laudo.tsx      # ou -132
npx -y tsx scripts/acm-andrade-pertence/07-build-xlsx.tsx       # ou -132 (self-check Top 3 hardcoded — atualizar se dataset mudar)
```

## 4. Pendências (em ordem de valor)

1. **H-3 com a Luciana** (pauta pronta): fatores de liquidez dos 3 casos (hoje fechamento=mercado);
   Capex −15% do Score B é conservador p/ imóvel conservado (caso 132); formato da faixa.
2. **Matrículas/IPTU dos dois alvos:** 113 (confirmar 80/150 m² + averbação lavanderia);
   132 (área construída 196×220 m² divergente nos anúncios + metragem de TERRENO não informada em lugar nenhum).
3. **Fase 1 humana:** conferir as linhas "casa (provável)" (vendas 2026 sem guia pública — 13 no caso 113, 12 no 132).
4. **Guias 2026:** quando a SF publicar o arquivo do exercício, rodar 10-backfill + regerar (elimina a heurística).
5. **Stories candidatas (@sm/@po):** (a) Story 9.4 com escopo ampliado — ingerir Complemento/Uso IPTU/Padrão/
   áreas/fração/testada/ACC (resolve casa×apto por construção; PRIORIDADE subiu); (b) gap `normalizeStreet()`
   do guard-rail 9.8 (não reconhece "mesma rua" no formato do banco, sem vírgula); (c) R5 no P-1 (CLI genérico).
6. **Push dos commits locais** — exclusivo @devops (Art. II). Artefatos desta sessão estão untracked.

## 5. Validação (saída real desta sessão)

- `npx vitest run src/lib/acm` → 173 testes / 15 arquivos PASS (nenhum código de src/ alterado).
- `npx eslint scripts/acm-andrade-pertence scripts/acm-andrade-pertence-132` → limpo.
- `npm run typecheck` (tsc --noEmit) → limpo.
- Self-checks de ranking dos XLSX conferem com os laudos (113 → v2: Cardoso de Melo 379 · Trovao Usui 64 · 65;
  132 → v3: Ubaíra 60 · Juruena 87 · Pariquera-Açu 41 — a Cotovia 726 saiu do Top 3 porque foi reclassificada
  como edifício e excluída na v3; era o "hoje há prédio no local" apontado antes).
- Revalidação da v3 (132), saída real desta retomada: `07-build-xlsx.tsx` self-check → CONFERE ✓ (56 casas);
  `eslint scripts/acm-andrade-pertence-132/07-build-xlsx.tsx` → exit 0; `npm run typecheck` → limpo.

## 6. Aprendizados operacionais (para o método)

- Google Maps do operador é ótimo TRIGGER, mas a fonte autoritativa de tipologia é a guia (Uso IPTU + Complemento).
- ViaCEP por nome de rua exige whitelist de bairros do raio (homônimos city-wide); Vila Uberabinha=V. Olímpia,
  Indianópolis=Moema nas denominações ViaCEP.
- Coordenadas da base são por logradouro/CEP (±200 m; ruas de CEP único colapsam num ponto) — distância é
  aproximada e mesma-rua vira ~10 m nominal.
- Fatores de liquidez são INPUTS por imóvel da consultora (Honduras: −7/−5/−3/−4%) — nunca reusar sem elicitação;
  composto Honduras ≈ −17,7%, coerente com deságio ITBI medido (−12,7%) e IPR regional (12–17%).

---

## 7. ATUALIZAÇÃO FINAL — sessão de retomada 09-Jul (Opus)

Sessão longa pós-`/clear`. Estado consolidado (supera as seções acima onde divergir):

### 7.1 Caso 132 — laudo **v4** (canônico agora)
- **Área construída = 196 m²** (oficial confirmado pela consultora; o dataset trazia 220 estimado — os anúncios divergiam 196–220). Override `T.areaConstruida = 196` no `05-build-laudo.tsx` e no `07-build-xlsx.tsx`.
- **DUAS lentes independentes convergem numa faixa:**
  - Construção (196 m² × mediana 10.647/m²c, Top 5) = **R$ 1.773.948** (faixa 1.773.948–2.082.434).
  - Terreno (**~220 m² PROVISÓRIO** × R$ 9.000/m² terreno de 44 casas <500 m²) = **~R$ 1.980.000**.
  - Anúncio R$ 1.495.000 = **18,7% abaixo** da lente de construção → tese de **subprecificação mantida**.
- **DECISÃO METODOLÓGICA (documentada no código):** o terreno entra como **lente independente** (Sec. 8), **NÃO** como peso no ranking de aderência. Ativar a similaridade de terreno (20%) puxava casas terreno-similares porém baratas em construção (ex.: José Cândido de Souza 74/77 a ~5.000/m²c — ITBI subdeclarado/valor de terra), colapsando a mediana de construção para R$ 1,27M (artefato). Para imóvel conservado a lente de construção rankeia por construção+proximidade.
- **CAVEAT registrado:** 6 vagas num lote de ~220 m² é apertado (CA ≈ 196/220 ≈ 0,9) — o terreno real pode ser MAIOR; a lente de terreno sobe proporcionalmente quando a matrícula confirmar. Terreno = condicionante nº 1.
- Artefatos: `LAUDO-...-v4-2026-07-09-rev2.pdf` (canônico) + `.computation.json`; `ACM-AndradePertence132-validacao-corretor-rev3.xlsx` (self-check Top 3 = **Juruena 87 · Pariquera-Açu 41 · TV Sebastião Emílio Forli 58** ✓). v3/v2/v1 preservados.

### 7.2 Fatores de Ajuste de Liquidez e Condição (Sec. 2) — mecanismo opção-por-ACM
- Infra compartilhada já existia (`liquidityAdjustment`, `LaudoFatorLiquidez`, `fatoresLiquidezDetalhe`).
- **132:** const `FATORES_LIQUIDEZ` ilustrativa (−7% exposição / −5% regularização / −4% liquidez do produto; SEM Capex — imóvel conservado) → fechamento estratégico compõe sobre o valor de mercado. A validar com a consultora (H-3).
- **113:** mecanismo portado **vazio** (`[]`) — critérios próprios não observados; perfil de reforma geral → Capex tende a aplicar quando elicitado.

### 7.3 ROADMAP §10 — revisões externas consolidadas
`docs/acm/ROADMAP-ACM.md` §10.1–§10.12: frentes **C-1..C-6**, custo-benefício, split de **3 camadas**, tiers ACM Lite/Pro/Técnica, apêndice técnico (Graus NBR 14653-2, Ross-Heidecke completo, specs de implementação), referências normativas, e o mecanismo de fatores de liquidez. Métrica-chave p/ reunião: modelo atual ≈ **85–90% do Grau III**; os 10–15% são defensabilidade, não número.

### 7.4 Git / PR / gates (via @devops)
- Branch `fix/epic7-v-crawl-health` **pushada**; **PR #1** aberto → `master` (100 commits; título/corpo atualizados p/ o escopo completo Epic 7–10 + ACM + owners).
- **Quality Gates ✅** (após fix de `no-explicit-any` em `11-grade-sensibilidade.tsx`) · **CodeRabbit ✅**.
- **Segurança:** CodeRabbit achou 🔴 Critical — credencial de conta de teste em texto plano em 2 handoffs Epic 7 (+1 fora do diff). **Redigido** (`89da9d4`). **Issues abertos:** #2 (rotacionar conta `admin-teste@moema.local` + histórico), #3 (LGPD startTransition), #4 (RLS UPDATE policy), #5 (seed portal enum).

### 7.5 Pendências (ordem de valor)
1. **v4 do 132 está UNCOMMITTED** — commitar + push via @devops (atualiza o PR #1).
2. **Rotacionar** a conta de teste (issue #2) — ação do operador.
3. **H-3 com a Luciana:** validar terreno real do 132 (vs. 220 provisório), fatores de liquidez reais, faixa.
4. Matrículas/IPTU dos alvos; Fase 1 humana (casas 2026 sem guia); portar C-1 para o 113 (hoje só o 132 tem deságio declarado).
5. Merge do PR #1 (revisão humana; herda waiver MVP-LOCAL do Epic 7).

### 7.6 Validação real desta sessão
`npm run typecheck` limpo · `npm run lint` 0 erros · eslint dos scripts ACM exit 0 · XLSX self-check CONFERE (v4) · Quality Gates CI verde · nenhum código de `app/src/` alterado pela linha ACM (só `scripts/` e `docs/`).
