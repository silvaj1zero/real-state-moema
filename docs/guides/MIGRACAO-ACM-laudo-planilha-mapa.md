# Migração da geração de ACM (laudo PDF + planilha + mapa) — Jardins → Moema

> **Objetivo:** replicar em Moema e região o **processo e a qualidade** de ACM
> produzidos no projeto de referência `C:\Users\Zero\imoveis-jardins`
> (laudo PDF profissional, planilha canônica validada e mapa de localização),
> aproveitando o que o Moema **já tem** (Epic 8 ACM: modelo de dados + RPC
> PostGIS `fn_comparaveis_no_raio` + camada de cálculo `methodology.ts`).
>
> **Fonte:** projeto `imoveis-jardins` (ACM Rua Honduras 629), sessão 2026-06.
> **Destino:** `Real State - Moema` (Epic 7/8 FISBO + ACM).
> **Escopo desta migração:** os **geradores de entrega** (PDF/XLSX/PNG) e a
> configuração geográfica — NÃO o backend de dados (Moema já tem o seu via Supabase).

---

## 1. Visão geral do workflow do ACM (projeto de referência)

O ACM dos Jardins é um pipeline de **6 fases**. Cada fase tem entrada/saída em CSV
(arquivos intermediários em `data/output/`), o que torna o processo auditável e
reexecutável.

| Fase | O que faz | Entrada | Saída | Código |
|------|-----------|---------|-------|--------|
| **1. Ingestão ITBI** | Baixa o ITBI oficial PMSP (xlsx mensal), normaliza 28 colunas, filtra por **CEP** (geográfico) e perfil de produto | `data/raw/itbi_AAAA.xlsx` | DataFrame cidade → recorte bairro | `src/sources/pmsp_itbi.py` |
| **2. Geocodificação** | Endereço ITBI → lat/lng via Nominatim (OSM), com cache em disco e *viewbox* da região | recorte CSV | `*_geo.csv` (id_fonte, lat, lng) | `src/geocode.py` |
| **3. Recorte por raio** | Haversine a partir do alvo; mantém só o que está dentro de 1.000 m | geo + centro | `B_*_1000m.csv` / `C_*_1000m.csv` | `pesquisa_c_honduras.py` |
| **4. Score / aderência** | Índice de aderência ao alvo (área constr. 50% + terreno 20% + proximidade 30%); classes AAA/AA/A/B; trilha de terrenos (Score C) | recorte | rank ordenado | `pesquisa_c_honduras.py`, `rank_negociados_c.py` |
| **5. Validação web** | Confirma metragem/dorm/suíte/vagas e preço pedido em anúncios ativos (concorrência + comparáveis); marca CONFIRMADO/PARCIAL/off-market | rank + web | `fase_b_resultados.csv` | agentes + overlay manual |
| **6. Geração de entregas** | **Laudo PDF**, **planilha canônica** e **mapa PNG** a partir dos dados validados | CSVs validados | `LAUDO_*.pdf`, `*CANONICO*.xlsx`, `acm_mapa.png` | `gera_acm_pdf.py`, `gera_planilha_canonica.py`, `gera_mapa_acm.py` |

**Princípios de qualidade que tornam o resultado defensável** (replicar sempre):

1. **Âncora em transação fechada** (ITBI), não em preço pedido — o pedido entra só
   como *teto/concorrência*.
2. **Filtro geográfico por CEP** (o campo "Bairro" do ITBI é sujo/ambíguo).
3. **Dedup de guias** — mesmo SQL com várias guias → venda cheia mais recente.
4. **Detecção de fração ideal** (`proporção < 99%`) — separa compra de incorporador
   de venda cheia (não contaminar o comparável unitário).
5. **Separa terreno de construção** via `Descrição do uso (IPTU)` ("TERRENO" =
   lote; "RESIDÊNCIA" = casa).
6. **Honestidade do off-market** — imóvel vendido sai do ar; "não achado" é
   resultado legítimo, não falha.
7. **Triangulação vendido × ofertado** (ex.: terreno 1.000 m²: fechado R$ 11.125/m²
   vs. pedido R$ 13–15 mil/m²).
8. **Estratificação por escala** — R$/m² de terreno cai com o tamanho do lote;
   nunca aplicar a mediana global a um lote grande.

---

## 2. Bibliotecas usadas (com versões de referência)

Do `requirements.txt` do projeto Jardins (Python 3.12):

```
# --- núcleo de dados ---
pandas>=2.2            # toda a manipulação tabular
openpyxl>=3.1          # ler ITBI xlsx + GERAR a planilha canônica
pyyaml>=6.0            # config.yaml (bairros, CEP, filtros)

# --- ingestão / web ---
requests>=2.32         # download ITBI + Nominatim + scrapers
beautifulsoup4>=4.12   # parse da página oficial de índice do ITBI
lxml>=5.0              # parser HTML do bs4
rapidfuzz>=3.0         # matching fuzzy ITBI ↔ anúncio (dedup/cruzamento)

# --- relatório / planilha ---
reportlab>=4.0         # GERA o laudo PDF (Platypus: tabelas, parágrafos, cards)
matplotlib>=3.8        # gráficos auxiliares (opcional)

# --- mapa ---
staticmap              # mapa raster (tiles OSM) → PNG no laudo
Pillow (PIL)           # sobrepõe rótulos numéricos nos marcadores do Top 5

# --- dashboard (opcional, não obrigatório p/ entregas) ---
streamlit>=1.41        # painel interativo
plotly>=5.24           # gráficos do painel
pydeck>=0.9            # MAPA interativo no dashboard (alternativa ao PNG)
```

> **Mínimo indispensável para as 3 entregas:** `pandas`, `openpyxl`, `reportlab`,
> `staticmap`, `Pillow`, `pyyaml`. O resto é do pipeline de coleta/validação.

**Nota de stack Moema:** o Moema é Next.js/Supabase (TS). Os geradores acima são
**Python** e rodam como **toolkit batch offline** (CLI), lendo os comparáveis da
RPC `fn_comparaveis_no_raio` (via REST/SQL) em vez do CSV. Ver §5, Opção B.

---

## 3. Inventário de código (o que migrar)

### 3.1 Núcleo reutilizável (`src/`) — migrar quase verbatim

| Arquivo | Função | Adaptação p/ Moema |
|---------|--------|--------------------|
| `src/config.py` | Carrega `config.yaml` | nenhuma |
| `src/sources/pmsp_itbi.py` | Ingestão ITBI PMSP (download, 28 colunas, filtro CEP/produto, dedup) | **só `config.yaml`** (CEP de Moema). Código é genérico p/ qualquer bairro de SP |
| `src/geocode.py` | Geocodificação Nominatim + cache + *viewbox* | trocar `VIEWBOX_JARDINS` pela caixa de Moema; abreviações de logradouro são genéricas de SP |
| `src/schema.py` | Schema canônico unificado | nenhuma |
| `src/consolidate.py`, `src/match.py` | Consolidação + matching fuzzy ITBI↔anúncio | nenhuma (genéricos) |
| `src/excel_export.py` | Exportador xlsx base (fórmulas/score) | nenhuma |
| `src/cli.py` | Orquestrador (subcomandos `itbi`, `geocode`, `build`, `export-final`…) | adicionar `--bairro moema` |

### 3.2 Geradores de entrega — migrar e parametrizar

| Arquivo | Gera | Depende de | Pontos a parametrizar p/ Moema |
|---------|------|-----------|--------------------------------|
| `gera_acm_pdf.py` | **Laudo PDF** (18+ páginas) | reportlab | **constantes do topo** (alvo, valores, comparáveis, concorrência, terrenos) + `acm_mapa.png` |
| `gera_planilha_canonica.py` | **Planilha** (abas Top 3/5/10/Todos/Ofertas/Terrenos) | openpyxl | `CENTRO`, `ALVO_C/ALVO_T`, listas de ofertas/terrenos |
| `gera_mapa_acm.py` | **Mapa PNG** (raio + Top 5 numerado + alvo) | staticmap, PIL | `CENTRO_ALVO`, `TOP5`, `ZOOM` |
| `gera_planilha_validacao.py` | Planilha de validação do corretor | openpyxl | idem canônica |
| `pesquisa_c_honduras.py` | Recorte 1.000 m + Score C + terrenos | pmsp_itbi, geocode | `CENTRO`, `RAIO_M`, critérios C1/C2/C3 |

> **Importante:** os `gera_*.py` hoje têm os números do imóvel-alvo **hardcoded no
> topo** (foi um estudo de caso único). Na migração, extrair essas constantes para
> um arquivo de entrada por imóvel (ex.: `alvo_moema.yaml` ou linha da RPC) — ver §5.

### 3.3 Não migrar (específico de coleta dos Jardins)
`src/sources/imoveldata.py`, `src/sources/portais.py`, `classifica_c_honduras.py`,
`explora_usos.py` — scrapers/exploração pontuais. Em Moema, a coleta de anúncios já
é coberta pelo crawler do Epic 7 (`apps/crawlers`, FISBO/Apify).

---

## 4. As três entregas em detalhe

### 4.1 Laudo PDF (`gera_acm_pdf.py`, reportlab)
- **Arquitetura:** ReportLab **Platypus** (fluxo de `Paragraph`, `Table`, `Spacer`,
  `PageBreak`, `Image`). Estilos centralizados (`H_SEC`, `TXT`, cores RE/MAX
  navy/red). Helper `card(...)` para caixas destacadas.
- **Seções:** capa → sumário executivo → metodologia → evidência de fechamentos
  (ITBI) → **concorrência ativa** (com *teto de negociação*) → seleção Top 5/Top 3
  → **ótica do comprador-terreno** (2 abordagens: comparação direta + viabilidade do
  incorporador, com waterfall) → conclusão de valor.
- **Imagem:** insere `data/output/acm_mapa.png` na seção de localização.
- **Saída:** `data/output/ACM_RUA_HONDURAS_REMAX.pdf` (copiado para nomes
  `LAUDO_*` e p/ o dashboard).

### 4.2 Planilha canônica (`gera_planilha_canonica.py`, openpyxl)
- **Abas:** Leia-me · Top 3 · Top 5 · Top 10 · Todos · **Ofertas ativas** ·
  **Terrenos** (vendidos + frações + ofertados, com link e R$/m²).
- **Técnicas:** `PatternFill` por faixa (ouro/laranja/gelo), `Font` com cor,
  `hyperlink` em células (link de anúncio + Google Maps), `freeze_panes`,
  `auto_filter`, `merge_cells` para sínteses.
- **Aderência:** `0.5·(área constr.) + 0.2·(terreno) + 0.3·(proximidade)`.
- **Cuidado de dado:** helper `numok()` evita "nan"; overlay de validação web por
  `id_fonte` (sep `|`).

### 4.3 Mapa (`gera_mapa_acm.py`, staticmap + PIL) — **núcleo do "uso de mapa"**
Duas formas de mapa no projeto:

**(a) Mapa estático PNG (para o laudo):**
- `staticmap.StaticMap` com tiles OSM → raster.
- **Raio de 1.000 m** desenhado como `Line` (polígono de 60 vértices via
  deslocamento lat/lng).
- Marcadores `CircleMarker` em camadas: comuns (azul) → Top 5 (ouro/laranja, com
  halo branco) → alvo (vermelho).
- **Rótulos numéricos 1–5** sobrepostos com **PIL** (`ImageDraw.text` com
  `stroke`), reprojetando lat/lng → pixel via Web Mercator (mesmo referencial do
  staticmap) para casar o número ao marcador. Inclui *anti-colisão* de rótulos.
- **Centro determinístico** (coordenada fixa do alvo) para reprodutibilidade.

**(b) Mapa interativo (dashboard, `pydeck`):** alternativa web no Streamlit
(`dashboard/app.py`). Em Moema, o equivalente já é o mapa do app Next.js — mas o
**PNG do laudo** não tem equivalente no Moema e **deve ser migrado**.

---

## 5. Plano de migração para Moema

Há duas opções. Recomendo a **B** (aproveita o backend que o Moema já tem), com a
**A** como atalho inicial.

### Opção A — Toolkit Python standalone (rápido, isola o ACM)
1. Criar pasta `infrastructure/acm-generator/` no Moema.
2. Copiar `src/` (config, sources/pmsp_itbi, geocode, schema, consolidate, match,
   excel_export, cli) + os `gera_*.py` + `requirements.txt`.
3. Criar `config.yaml` com o bairro **Moema** (§6) e rodar o pipeline igual ao
   Jardins, trocando só o alvo e a coordenada.
4. Saídas em `infrastructure/acm-generator/data/output/`.
- **Prós:** funciona hoje, mesma qualidade. **Contras:** duplica a fonte de dados
  (ITBI) que o Moema já carrega no Supabase.

### Opção B — Geradores consumindo a RPC PostGIS do Moema (recomendada)
O Moema **já tem** `fn_comparaveis_no_raio` (PostGIS, 20 colunas com a metodologia
ACM) e a camada `methodology.ts`. Em vez de reprocessar ITBI:
1. Os `gera_*.py` recebem os comparáveis **da RPC** (via PostgREST/SQL) em vez do
   CSV — escrever um pequeno adaptador `fetch_comparaveis(alvo_id, raio) -> DataFrame`
   com as mesmas colunas que os geradores esperam
   (`logradouro, numero, area_construida_m2, area_terreno_m2, valor, lat, lng,
   data_ref, id_fonte/sql_cadastral, dist_m, score`).
2. Manter `gera_mapa_acm.py`, `gera_planilha_canonica.py`, `gera_acm_pdf.py` quase
   intactos — só trocam a **origem do DataFrame**.
3. Parametrizar o **alvo** por linha da RPC (não hardcode): `alvo = {lat, lng,
   area_construida, area_terreno, valor_pedido}`.
4. Expor como **botão "Exportar laudo PDF / planilha"** no app (job batch que chama
   o toolkit Python e devolve o arquivo) — complementa o `AcmExportMenu.tsx` (que
   hoje só faz CSV).
- **Prós:** fonte única de verdade (Supabase), reaproveita Epic 8. **Contras:**
  exige o adaptador RPC→DataFrame e um runner Python no pipeline do Moema.

> **Ponte com a pendência já registrada no Epic 8** (handoff 2026-06-15, item AC3):
> o sink `engine/src/sinks/supabase_acm.py` precisa mapear `area_construida_m2` e
> `area_terreno_m2` **separados**, `id_fonte→sql_cadastral`, `padrao`, `ano`,
> `testada_m`, `valor_venal`. **Esses são exatamente os campos que os geradores de
> laudo/planilha consomem** — fechar o AC3 destrava a Opção B sem retrabalho.

---

## 6. Deltas de configuração para Moema (a validar antes de rodar)

### 6.1 `config.yaml` — bloco do bairro Moema
Moema fica nos CEPs **04xxx** (distrito Moema/Indianópolis/Planalto Paulista). Os
prefixos abaixo são um **ponto de partida — confirmar contra os dados reais de ITBI**
(rode `explora_usos.py` adaptado para listar bairros/CEPs da região antes de fixar):

```yaml
bairros:
  moema:
    nome: "Moema"
    # CEP de Moema (a CONFIRMAR com a base ITBI real — Moema ~ 04038–04094).
    cep_prefixos: ["0405", "0406", "0407", "0408"]
    bairro_regex: "\\bMOEMA\\b"
    bairro_exclude_regex: ""          # ajustar se houver homônimos
    modo: "cep_e_bairro"              # Moema partilha CEP com Indianópolis/V. Nova Conceição
```

> ⚠️ **Não inventar CEP.** O valor acima é heurístico. O método correto: carregar o
> ITBI da cidade (`carregar_cidade`), filtrar por nome "MOEMA" no campo bairro, e
> ver quais prefixos de CEP realmente aparecem → fixar esses no `cep_prefixos`.
> Foi exatamente assim que os CEPs dos Jardins foram descobertos.

### 6.2 `geocode.py` — viewbox de Moema
Trocar a caixa delimitadora (descarta ruas homônimas de outras cidades):

```python
# Moema (aprox.) — lonMin,latMax,lonMax,latMin — CONFIRMAR limites
VIEWBOX_MOEMA = "-46.685,-23.580,-46.640,-23.625"
```

### 6.3 Centro do alvo (mapa + raio)
Coordenada do imóvel-alvo em Moema (substitui `CENTRO_ALVO`/`CENTRO`). Geocodificar
o endereço real do alvo; como referência geográfica, o centro de Moema fica em torno
de `(-23.600, -46.663)` (**a substituir pela coordenada exata do imóvel**).

### 6.4 Filtros de produto
Reavaliar `valor_minimo` e `usos_casa_regex` conforme o produto-alvo em Moema. Moema
é **predominantemente vertical** (apartamentos) — diferente dos Jardins (casas).
Se o ACM for de **apartamento**, ajustar:
- `usos_casa_regex` → incluir `APARTAMENTO EM CONDOMINIO`;
- aderência → trocar "terreno" por **fração ideal / vaga / andar**; a régua de
  R$/m² passa a ser de **área privativa**, não de terreno;
- a "ótica do comprador-terreno" (§4.1) **não se aplica** a apartamento — substituir
  por comparação de R$/m² privativo + ajuste por andar/vista/vagas.

> Este é o **maior ponto de adaptação metodológica**: Jardins = casas/terreno;
> Moema = majoritariamente apartamentos. O *pipeline* (ITBI→geo→raio→score→entregas)
> é o mesmo; **a régua de score e a seção de terreno mudam**.

---

## 7. Checklist de validação de qualidade (replicar os gates)

- [ ] CEP de Moema confirmado contra ITBI real (não chutar prefixo).
- [ ] Dedup de guias por SQL (venda cheia mais recente).
- [ ] Frações ideais (`proporção < 99%`) separadas dos comparáveis unitários.
- [ ] Geocodificação com *viewbox* de Moema + cache (1 req/s no Nominatim).
- [ ] Recorte por **raio** (haversine), não por bairro nominal.
- [ ] Score adequado ao **produto** (casa→terreno; apto→privativa/andar).
- [ ] Validação web: CONFIRMADO/PARCIAL/off-market com link e nível de confiança.
- [ ] Triangulação **vendido × ofertado** na conclusão de valor.
- [ ] Mapa com raio + alvo + Top N numerado, centro determinístico.
- [ ] Honestidade: o que não foi achado/validado fica marcado, não escondido.
- [ ] LGPD: ITBI tem endereço + valor — manter repositório **privado**.

---

## 8. Ordem sugerida de execução da migração

1. **Descobrir CEP/viewbox reais de Moema** (adaptar `explora_usos.py`). ← bloqueia tudo
2. **Opção A** ponta-a-ponta com 1 imóvel-alvo de teste (prova de qualidade rápida).
3. **Decidir produto** (casa vs apartamento) e ajustar a régua de score (§6.4).
4. **Fechar AC3 do Epic 8** (sink `supabase_acm.py` com campos separados) → habilita Opção B.
5. **Adaptador RPC→DataFrame** + parametrização do alvo (remover hardcode dos `gera_*`).
6. **Botão de exportação** (laudo/planilha) no app, complementando `AcmExportMenu.tsx`.
7. **Mapa:** migrar `gera_mapa_acm.py` (PNG do laudo); manter o mapa interativo do app.

---

### Apêndice — mapa de arquivos (origem → destino sugerido)

| Origem (`imoveis-jardins`) | Destino (`Real State - Moema`) |
|---|---|
| `src/config.py`, `src/schema.py`, `src/consolidate.py`, `src/match.py`, `src/excel_export.py` | `infrastructure/acm-generator/src/` |
| `src/sources/pmsp_itbi.py` | `infrastructure/acm-generator/src/sources/` |
| `src/geocode.py` | idem (com `VIEWBOX_MOEMA`) |
| `gera_acm_pdf.py` | `infrastructure/acm-generator/gera_acm_pdf.py` |
| `gera_planilha_canonica.py` | idem |
| `gera_mapa_acm.py` | idem (com `CENTRO_ALVO` de Moema) |
| `pesquisa_c_honduras.py` | `pesquisa_raio.py` (genérico por `--bairro`) |
| `config.yaml` | `config.yaml` (+ bloco `moema`) |
| `requirements.txt` | `infrastructure/acm-generator/requirements.txt` |

> Documento gerado a partir da auditoria do projeto `imoveis-jardins` (ACM Rua
> Honduras 629). Os valores geográficos de Moema marcados "a confirmar" devem ser
> validados contra os dados reais de ITBI antes do primeiro laudo.
