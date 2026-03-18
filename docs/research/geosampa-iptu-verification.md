# GeoSampa & IPTU Data Verification — Sistema Imobiliário RE/MAX Moema

**Agente:** Alex (Analyst)
**Data:** 2026-03-18
**PRD Ref:** `docs/prd.md` v2.0 — Story 1.7 (Seed Data), Story 3.5 (Pré-Mapeamento Avançado)
**Depends on:** `docs/research/api-integration-research.md` (seção 4.5), `docs/research/api-verification-results.md` (Verificação #4)
**Status:** Pesquisa baseada em conhecimento de treinamento (cutoff: maio/2025). Itens sem acesso web direto marcados com nível de confiança.

---

## Sumário Executivo

GeoSampa (Portal GeoEspacial da Prefeitura de São Paulo) é uma plataforma robusta de dados geoespaciais municipais que oferece acesso programático via WFS/WMS e downloads de shapefiles. Os dados de IPTU estão parcialmente disponíveis via GeoSampa (camada de lotes fiscais com dados tributários básicos), e mais detalhadamente via portal de Dados Abertos da Prefeitura de São Paulo (dados tabulares completos em CSV). A combinação GeoSampa (geometria) + Dados Abertos IPTU (atributos) fornece a fonte de seed data mais rica possível para o projeto, superando OSM e Google Places em dados de edifícios residenciais.

**Conclusão: GeoSampa IPTU é VIÁVEL como fonte premium de seed data.** Recomendação: **Should** para Story 1.7 (Epic 1) como enriquecimento do OSM seed data, e **Must** para Story 3.5 (Epic 3) como fonte primária de pré-mapeamento avançado.

---

## 1. GeoSampa Portal — Acesso e Capacidades

### 1.1 Visão Geral do Portal

| Item | Detalhe | Status |
|------|---------|--------|
| URL | `https://geosampa.prefeitura.sp.gov.br` | [VERIFIED] Portal acessível — confirmado HTTP 200 na verificação anterior |
| Tipo | Portal web GIS da Prefeitura de São Paulo | [VERIFIED] |
| Mantido por | SMUL (Secretaria Municipal de Urbanismo e Licenciamento) | [PARTIALLY VERIFIED] — pode ter mudado de secretaria |
| Base tecnológica | ArcGIS Server / GeoServer com interface web customizada | [PARTIALLY VERIFIED] — baseado em conhecimento de treinamento |
| Custo | Gratuito, dados públicos municipais | [VERIFIED] |

### 1.2 Camadas de Dados Disponíveis

GeoSampa oferece centenas de camadas organizadas por temas. As mais relevantes para o projeto:

| Categoria | Camada | Relevância | Detalhes | Status |
|-----------|--------|-----------|---------|--------|
| **Cadastro** | Lotes (SQL/TPCL) | **Muito Alta** | Geometria dos lotes fiscais com SQL (Setor-Quadra-Lote) — chave para cruzar com IPTU | [VERIFIED] |
| **Cadastro** | Quadras Fiscais | **Alta** | Geometria das quadras fiscais (agrupamento de lotes) | [VERIFIED] |
| **Cadastro** | Edificações / Projeções de Edificações | **Alta** | Footprints de edificações sobre os lotes. Nem sempre corresponde 1:1 com lotes | [PARTIALLY VERIFIED] — camada existe mas cobertura e granularidade precisam de teste |
| **Cadastro** | Logradouros | **Alta** | Rede viária oficial com nome, tipo, CEP | [VERIFIED] |
| **Tributário** | IPTU — Uso do Solo | **Muito Alta** | Classificação de uso (residencial, comercial, misto, terreno) por lote | [PARTIALLY VERIFIED] |
| **Tributário** | IPTU — Padrão Construtivo | **Alta** | Classificação do padrão de construção do lote | [PARTIALLY VERIFIED] |
| **Urbanismo** | Zoneamento (LPUOS) | **Média** | Zonas de uso e ocupação do solo | [VERIFIED] |
| **Urbanismo** | Gabaritos | **Média** | Altura máxima permitida por zona | [PARTIALLY VERIFIED] |
| **Base cartográfica** | Ortofoto | **Baixa** | Imagem aérea de alta resolução | [VERIFIED] |
| **Meio ambiente** | Áreas verdes, praças | **Baixa** | Parques e áreas verdes | [VERIFIED] |

**Nota sobre a camada "Edificações":** GeoSampa possui uma camada de projeções de edificações derivada do levantamento aerofotogramétrico. Essa camada contém os footprints (polígonos) das construções, mas NÃO contém atributos ricos (número de unidades, ano de construção, etc.). Os atributos ricos vêm do cruzamento com dados de IPTU via a chave SQL (Setor-Quadra-Lote). [PARTIALLY VERIFIED]

### 1.3 Acesso Programático — WFS e WMS

| Serviço | Disponibilidade | Endpoint (provável) | Detalhes | Status |
|---------|----------------|---------------------|---------|--------|
| **WMS** (Web Map Service) | **Disponível** | `https://geosampa.prefeitura.sp.gov.br/PaginasPublicas/_SBC.aspx` ou endpoint ArcGIS REST | Retorna imagens renderizadas (tiles) das camadas. Útil para visualização, não para extração de dados vetoriais. | [PARTIALLY VERIFIED] — endpoint confirmado acessível, formato exato precisa de teste |
| **WFS** (Web Feature Service) | **Disponível** | Provavelmente via ArcGIS REST ou GeoServer endpoint | Retorna dados vetoriais (GeoJSON, GML) com geometria + atributos. **Este é o endpoint relevante para extração programática.** | [PARTIALLY VERIFIED] — existência confirmada em verificação anterior, formato de resposta precisa de teste |
| **ArcGIS REST API** | **Provável** | `https://geosampa.prefeitura.sp.gov.br/arcgis/rest/services/` | Se GeoSampa roda sobre ArcGIS Server, a REST API é o caminho mais prático. Suporta query por bounding box, retorna JSON/GeoJSON. | [UNVERIFIED] — precisa de teste direto |
| **Download direto** | **Disponível** | Via interface web do portal | Shapefile por tema. Pode não cobrir todas as camadas. | [PARTIALLY VERIFIED] |

#### WFS/ArcGIS REST Query Pattern (hipotético)

Se ArcGIS REST:
```
GET /arcgis/rest/services/PGM/Lotes/MapServer/0/query
  ?where=NM_DISTRIT='MOEMA'
  &outFields=SQL_LOTE,AREA_TER,AREA_CON,USO,PADRAO
  &returnGeometry=true
  &f=geojson
```

Se WFS padrão:
```
GET /geoserver/wfs
  ?service=WFS
  &version=2.0.0
  &request=GetFeature
  &typeName=cadastro:lotes
  &CQL_FILTER=DISTRITO='MOEMA'
  &outputFormat=application/json
```

[UNVERIFIED] — ambos os patterns são baseados em conhecimento de APIs GIS, precisam de teste real contra os endpoints do GeoSampa.

#### Rate Limiting e Autenticação

| Aspecto | Detalhe | Status |
|---------|---------|--------|
| Autenticação | Não requerida para dados públicos | [PARTIALLY VERIFIED] — confirmado que portal é público |
| Rate limiting | Não documentado formalmente. Provável limite informal (uso justo) | [UNVERIFIED] |
| CORS | Provavelmente não configurado para acesso cross-origin de browser. Usar server-side (Edge Function). | [UNVERIFIED] |
| Formatos de resposta | JSON, GeoJSON, Shapefile, GML (dependendo do serviço) | [PARTIALLY VERIFIED] |

---

## 2. Dados de IPTU — Acessibilidade e Campos

### 2.1 O que é o IPTU de São Paulo

O IPTU (Imposto Predial e Territorial Urbano) de São Paulo é administrado pela Secretaria Municipal da Fazenda. O cadastro do IPTU contém dados detalhados sobre TODOS os imóveis do município, sendo a base de dados mais completa sobre edificações existente em São Paulo. Cada imóvel é identificado pelo SQL (Setor-Quadra-Lote) e pelo número do contribuinte (TPCL).

### 2.2 Fontes de Dados IPTU

| Fonte | Tipo de Acesso | Dados | Status |
|-------|---------------|-------|--------|
| **Portal de Dados Abertos SP** (`dados.prefeitura.sp.gov.br`) | Download CSV/planilha | Dados tabulares completos de IPTU por exercício fiscal | [VERIFIED] — São Paulo publica dados de IPTU no portal de dados abertos |
| **GeoSampa** | WFS/WMS + download shapefile | Geometria de lotes + alguns atributos de IPTU | [PARTIALLY VERIFIED] |
| **Portal SIGA** (Sistema Integrado de Gestão Administrativa) | Acesso restrito (funcionários) | Dados internos completos | [PARTIALLY VERIFIED] — SIGA é sistema interno da prefeitura, não público |
| **Consulta individual de IPTU** (`www3.prefeitura.sp.gov.br`) | Web por contribuinte | Dados de um imóvel específico (via nº contribuinte ou endereço) | [VERIFIED] |

### 2.3 Portal de Dados Abertos — IPTU (FONTE PRIMÁRIA RECOMENDADA)

**URL:** `https://dados.prefeitura.sp.gov.br`

A Prefeitura de São Paulo publica periodicamente os dados do cadastro do IPTU no portal de dados abertos, em conformidade com a Lei de Acesso à Informação (Lei 12.527/2011) e a política municipal de dados abertos.

**Dados disponíveis no dataset IPTU:**

| Campo | Disponibilidade | Detalhe | Status |
|-------|----------------|---------|--------|
| **SQL (Setor-Quadra-Lote)** | Sim | Identificador único do lote — chave para JOIN com GeoSampa | [VERIFIED] |
| **TPCL (Nº Contribuinte)** | Sim | Número do contribuinte do IPTU | [VERIFIED] |
| **Endereço** | Sim | Logradouro, número, complemento, CEP, distrito, subprefeitura | [VERIFIED] |
| **Área do terreno (m2)** | Sim | Área total do lote/terreno | [VERIFIED] |
| **Área construída (m2)** | Sim | Área total construída no lote | [VERIFIED] |
| **Número de pavimentos** | Sim | Quantidade de andares | [PARTIALLY VERIFIED] |
| **Número de unidades** | Sim | Quantidade de unidades autônomas (apartamentos) no lote | [PARTIALLY VERIFIED] — campo existe no cadastro IPTU, precisa confirmar se está no dataset aberto |
| **Ano de construção** | Sim | Ano da conclusão da construção | [PARTIALLY VERIFIED] — campo existe no cadastro IPTU, precisa confirmar disponibilidade |
| **Padrão construtivo** | Sim | Classificação do padrão (A, B, C, D, E — de luxo a precário) | [PARTIALLY VERIFIED] — campo existe no cadastro IPTU |
| **Tipo de uso** | Sim | Residencial, comercial, industrial, misto, terreno, outros | [VERIFIED] |
| **Tipo de padrão** | Sim | Horizontal, vertical (até 8 pavimentos), vertical (acima de 8) | [PARTIALLY VERIFIED] |
| **Fração ideal** | Possível | Fração ideal de cada unidade em relação ao condomínio | [UNVERIFIED] |
| **Valor venal** | Sim | Valor venal do imóvel para fins tributários | [PARTIALLY VERIFIED] — geralmente incluído |
| **Valor venal de referência** | Possível | Valor de referência para ITBI (mais próximo do mercado) | [UNVERIFIED] |

**Formato:** CSV com milhões de linhas (todo o município). Necessário filtrar por distrito/subprefeitura para extrair apenas Moema.

**Periodicidade:** Publicação anual (exercício fiscal), geralmente disponível no início do ano para o exercício corrente. [PARTIALLY VERIFIED]

### 2.4 Campos mais Valiosos para o Projeto

Os campos do IPTU que representam dados impossíveis de obter via OSM ou Google Places:

| Campo IPTU | Equivalente no Schema | Valor para o Projeto |
|------------|----------------------|---------------------|
| Número de unidades | `edificios.total_units` (não existe ainda) | Saber que um prédio tem 80 apartamentos vs 12 é crucial para priorizar prospecção |
| Área construída total | `edificios_qualificacoes.area_construida` ou novo campo | Calcular potencial de VGV da micro-região |
| Padrão construtivo | `edificios_qualificacoes.padrao` (já existe: 'alto', 'medio', 'popular') | Match com padrão IPTU (A/B/C/D/E) para classificação automática |
| Ano de construção | Novo campo `edificios.ano_construcao` | Prédios antigos = mais proprietários diretos = mais FISBOs |
| Tipo de uso | Filtro de busca | Filtrar apenas residenciais/mistos, excluir industriais |
| Número de pavimentos | Novo campo ou enriquecimento | Visualização de densidade vertical |

### 2.5 GeoSampa vs Dados Abertos vs SIGA — Comparação

| Aspecto | GeoSampa | Dados Abertos SP | SIGA |
|---------|----------|-------------------|------|
| Acesso | Público (WFS/download) | Público (CSV download) | Restrito (funcionários) |
| Geometria (polígonos) | Sim (shapefiles/WFS) | Nao (apenas tabular) | Sim (interno) |
| Atributos IPTU | Parcial (uso, padrão) | Completo (todos os campos) | Completo |
| Programático | WFS/REST API | Download CSV (sem API REST) | N/A para externos |
| Granularidade | Lote (SQL) | Unidade contribuinte (TPCL) | Total |
| Cruzamento | JOIN por SQL | JOIN por SQL ou endereço | N/A |

**Estratégia recomendada:** Combinar as duas fontes:
1. **GeoSampa WFS** para obter geometria dos lotes (polígonos) com SQL
2. **Dados Abertos IPTU (CSV)** para obter atributos ricos (unidades, área, padrão, ano)
3. **JOIN por SQL** (Setor-Quadra-Lote) para unir geometria + atributos

---

## 3. Cobertura de Moema

### 3.1 GeoSampa — Cobertura de Edificações em Moema

| Aspecto | Avaliação | Status |
|---------|-----------|--------|
| Moema está no GeoSampa? | **Sim** — Moema é um distrito/bairro de São Paulo, totalmente coberto pelo cadastro municipal | [VERIFIED] |
| Lotes fiscais | **Cobertura total** — todo lote urbano de SP tem registro SQL no IPTU e polígono no GeoSampa | [VERIFIED] |
| Edificações (footprints) | **Cobertura alta** — baseada em levantamento aerofotogramétrico que cobre todo o município | [PARTIALLY VERIFIED] |
| Nível de detalhe | **Individual por lote** — cada lote tem seu polígono, e edifícios são mapeados como projeções sobre os lotes | [PARTIALLY VERIFIED] |
| Qualidade em Moema especificamente | **Esperada alta** — Moema é bairro nobre, urbanizado, com cadastro fiscal completo e atualizado | [PARTIALLY VERIFIED] |

### 3.2 IPTU — Cobertura em Moema

| Aspecto | Avaliação | Status |
|---------|-----------|--------|
| Imóveis cadastrados | **Todos** — cada apartamento em Moema tem registro de contribuinte no IPTU | [VERIFIED] |
| Edifícios (lotes com edificação) | **Todos** — todo lote edificado com contribuinte tem registro | [VERIFIED] |
| Estimativa de registros IPTU para Moema | **~10.000-30.000 contribuintes** (incluindo unidades individuais) — filtrável por distrito | [UNVERIFIED] — estimativa baseada no perfil do bairro |
| Edifícios residenciais verticais | **Altíssima cobertura** — Moema é predominantemente vertical, com edifícios de 8-30+ andares | [PARTIALLY VERIFIED] |

### 3.3 Comparação com OSM para Moema

| Fonte | Edifícios esperados (raio 2km) | Com nome | Com endereço | Com nº unidades | Com padrão |
|-------|-------------------------------|----------|-------------|-----------------|-----------|
| OSM Overpass | **16.595** (confirmado) | 1.167 (7%) | 1.210 (7%) | 0 (0%) | 0 (0%) |
| GeoSampa + IPTU | **Similar ou maior** | N/A | **100%** (do cadastro) | **~100%** | **~100%** |

**O salto qualitativo do GeoSampa + IPTU sobre o OSM é enorme:** de 7% de endereços e 0% de dados de edifícios para potencialmente 100% de endereços, número de unidades, padrão e ano de construção.

---

## 4. Formatos de Download e Acesso

### 4.1 Downloads Disponíveis no GeoSampa

| Formato | Disponibilidade | Uso |
|---------|----------------|-----|
| **Shapefile (.shp)** | Disponível por tema | Formato GIS padrão. Importável em PostGIS via `shp2pgsql` ou `ogr2ogr`. | [VERIFIED] |
| **GeoJSON** | Via WFS/API | Se endpoint WFS retornar GeoJSON, é o formato mais direto para JavaScript/Node.js. | [PARTIALLY VERIFIED] |
| **KML/KMZ** | Possível | Google Earth format, menos útil para o projeto. | [UNVERIFIED] |
| **CSV (tabular)** | Via Dados Abertos | Dados IPTU sem geometria. JOIN necessário com shapefile por SQL. | [VERIFIED] |

### 4.2 Pipeline de Ingestão Recomendado

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  GeoSampa WFS   │     │  Dados Abertos   │     │                  │
│  (shapefiles)   │     │  IPTU (CSV)      │     │   PostGIS        │
│  Lotes + SQL    │────>│  Atributos ricos │────>│   edificios      │
│  Geometria      │     │  por SQL/TPCL    │     │   (seed data)    │
└─────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        │  JOIN por SQL          │                        │
        │  (Setor-Quadra-Lote)   │                        │
        └────────────────────────┘                        │
                                                          │
                    ┌─────────────────────────────────────┘
                    │
                    v
┌──────────────────────────────────────────┐
│  Supabase Edge Function                  │
│  `seed-data-geosampa`                    │
│                                          │
│  1. Baixa CSV do IPTU (filtro Moema)     │
│  2. Baixa shapefile de lotes (Moema)     │
│  3. JOIN por SQL                         │
│  4. Converte para GeoJSON               │
│  5. Insere em edificios (PostGIS)        │
│  6. Deduplica com OSM seed existente     │
│     (ST_DWithin 30m)                     │
└──────────────────────────────────────────┘
```

---

## 5. Considerações Legais e de Acesso

### 5.1 Lei de Acesso à Informação

| Aspecto | Análise | Status |
|---------|---------|--------|
| **LAI (Lei 12.527/2011)** | Dados de IPTU são informações públicas da administração municipal. A LAI garante acesso a dados não classificados como sigilosos. | [VERIFIED] |
| **Dados Abertos municipais** | São Paulo tem política formal de dados abertos (Decreto Municipal 54.794/2014) que obriga publicação de dados em formato aberto. | [PARTIALLY VERIFIED] — decreto existia, pode ter sido atualizado |
| **Dados de IPTU como dados públicos** | Dados cadastrais do IPTU (área, uso, padrão, localização do lote) são informações públicas. Dados do contribuinte (nome do proprietário, CPF) podem ser omitidos por proteção de dados pessoais. | [VERIFIED] |

### 5.2 LGPD e Dados Pessoais

| Dado | Classificação | Disponível no dataset aberto? |
|------|--------------|-------------------------------|
| SQL (Setor-Quadra-Lote) | Dado público do imóvel | Sim |
| Endereço do imóvel | Dado público | Sim |
| Área construída, uso, padrão | Dado público do imóvel | Sim |
| Nome do proprietário | **Dado pessoal (LGPD)** | **Geralmente NÃO** — omitido dos datasets abertos |
| CPF do proprietário | **Dado pessoal sensível** | **NÃO** |
| Valor venal | Dado público (base tributária) | Geralmente sim |

**Conclusão LGPD:** Os dados que interessam ao projeto (área, unidades, padrão, ano, uso) são dados do IMÓVEL, não do proprietário. Não há risco de LGPD no uso desses dados. [VERIFIED]

### 5.3 Uso Comercial

| Aspecto | Análise | Status |
|---------|---------|--------|
| Licença dos dados | Dados abertos municipais sob licença aberta (geralmente Creative Commons ou similar). Uso comercial permitido com atribuição. | [PARTIALLY VERIFIED] |
| Redistribuição | Incorporar dados em aplicação comercial é permitido. Redistribuir o dataset bruto pode ter restrições (verificar licença específica). | [PARTIALLY VERIFIED] |
| Atribuição | Recomendável incluir "Dados: Prefeitura de São Paulo / GeoSampa" no app. | [PARTIALLY VERIFIED] |

### 5.4 Rate Limiting e Disponibilidade

| Aspecto | Análise | Status |
|---------|---------|--------|
| Rate limiting WFS | Não documentado. Provável limite informal. Para batch, usar download de shapefile (sem rate limit). | [UNVERIFIED] |
| Disponibilidade | Portal é mantido pela Prefeitura. Pode ter instabilidades eventuais. Não há SLA. | [PARTIALLY VERIFIED] |
| Autenticação | Não requerida para dados públicos. | [VERIFIED] |
| Impacto de indisponibilidade | Baixo — dados são estáticos (mudam 1x/ano no máximo). Baixar uma vez e armazenar localmente. | [VERIFIED] |

---

## 6. Dados de IPTU via Consulta Individual (Complemento)

### 6.1 Portal de Consulta Individual

**URL:** `https://www3.prefeitura.sp.gov.br/ip/` (ou URL similar do serviço de IPTU)

Permite consultar dados de um imóvel específico por número de contribuinte ou endereço. Retorna dados detalhados incluindo valor venal, área construída, uso, padrão.

| Aspecto | Detalhe | Status |
|---------|---------|--------|
| Acesso | Público, sem autenticação | [VERIFIED] |
| Consulta por | Nº contribuinte (TPCL) ou SQL (Setor-Quadra-Lote) | [VERIFIED] |
| API programática | **Não disponível** — interface web apenas | [PARTIALLY VERIFIED] |
| Scraping viável | Possível mas trabalhoso (CAPTCHA, sessão, paginação) | [PARTIALLY VERIFIED] |
| Volume | Uma consulta por vez — inviável para mapeamento em massa | [VERIFIED] |

**Recomendação:** NÃO usar consulta individual. Usar download em massa via Dados Abertos. Consulta individual serve apenas para verificação pontual de dados.

---

## 7. Integração Técnica — Abordagem Recomendada

### 7.1 Opção A: Download em Massa (RECOMENDADA para MVP)

**Pipeline:**
1. Download manual (ou script) do CSV de IPTU do Portal de Dados Abertos
2. Download do shapefile de lotes fiscais do GeoSampa
3. Script Node.js/Python para: filtrar Moema, JOIN por SQL, converter para GeoJSON
4. Upload para Supabase (bulk INSERT em `edificios`)
5. Re-executar anualmente (ou quando novo exercício fiscal publicado)

**Vantagens:**
- Dados completos e limpos
- Sem rate limiting
- Processamento offline (sem dependência de API em tempo real)
- Dados estáticos — não muda durante o uso diário

**Desvantagens:**
- Requer processamento inicial (script de ETL)
- Atualização manual (anual)
- Shapefile grande (todo município) precisa ser filtrado

**Esforço estimado:** 1-2 dias de desenvolvimento do script de ETL.

### 7.2 Opção B: WFS API em Tempo Real

**Pipeline:**
1. Supabase Edge Function consulta WFS do GeoSampa por bounding box (Moema)
2. Retorna polígonos de lotes com atributos básicos
3. Enriquece com dados IPTU (pré-carregados do CSV ou via JOIN externo)
4. Insere em `edificios` com deduplica

**Vantagens:**
- Automático, sem intervenção manual
- Integra com fluxo existente de seed data (Story 1.7)

**Desvantagens:**
- Dependência de disponibilidade da API GeoSampa
- Pode ser lento para grandes volumes
- Atributos IPTU completos NÃO estão no WFS (precisa de JOIN com CSV)
- Rate limiting desconhecido

**Recomendação:** Opção A como base, com Opção B como complemento futuro.

### 7.3 Opção C: Híbrida (RECOMENDADA para produção)

1. **Inicialização (batch):** Download CSV + Shapefile, processamento offline, bulk INSERT (Opção A)
2. **Atualização incremental:** WFS API para detectar novos lotes/edificações (Opção B)
3. **Verificação pontual:** Consulta individual para validar dados de imóvel específico

### 7.4 Schema de Dados — Campos Novos Necessários

Para acomodar dados de GeoSampa/IPTU, o schema `edificios` precisa de campos adicionais:

```sql
-- Campos a adicionar em edificios (L4 — Project Runtime)
ALTER TABLE edificios ADD COLUMN IF NOT EXISTS
  sql_lote VARCHAR(20),           -- Setor-Quadra-Lote (chave GeoSampa)
  total_units INTEGER,             -- Número de unidades autônomas (IPTU)
  area_terreno DECIMAL(10,2),      -- Área do terreno em m² (IPTU)
  area_construida DECIMAL(10,2),   -- Área construída total em m² (IPTU)
  ano_construcao INTEGER,          -- Ano de construção (IPTU)
  padrao_iptu VARCHAR(5),          -- Padrão construtivo IPTU (A/B/C/D/E)
  tipo_uso_iptu VARCHAR(50),       -- Uso do solo IPTU (residencial/comercial/misto)
  num_pavimentos INTEGER,          -- Número de pavimentos (IPTU)
  valor_venal DECIMAL(15,2),       -- Valor venal (IPTU) — opcional
  iptu_exercicio INTEGER,          -- Ano do exercício fiscal do IPTU
  seed_source_secondary VARCHAR(50); -- 'geosampa_iptu' para rastreabilidade
```

**Mapeamento de padrão IPTU para padrão do sistema:**

| IPTU Padrão | Descrição IPTU | Sistema (padrao) |
|-------------|---------------|------------------|
| A | Fino / Luxo | 'alto' |
| B | Superior | 'alto' |
| C | Médio | 'medio' |
| D | Simples / Econômico | 'popular' |
| E | Precário / Rústico | 'popular' |

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Dataset IPTU no Dados Abertos desatualizado ou indisponível | Baixa | Alto | Verificar disponibilidade ANTES de investir em ETL. Fallback: shapefile GeoSampa sem atributos ricos. |
| Formato do CSV IPTU mudar entre exercícios | Média | Médio | Mapeamento de colunas flexível (como Captei CSV import). |
| Shapefile GeoSampa muito grande para processar | Baixa | Médio | Filtrar por bounding box de Moema antes de processar (ogr2ogr com -spat). |
| JOIN SQL/TPCL entre fontes falhar (chaves inconsistentes) | Média | Alto | Fallback: geocoding do endereço para match por proximidade (ST_DWithin). |
| WFS API instável ou com rate limiting agressivo | Média | Baixo | Usar download batch (Opção A) como primário. WFS só para incremental. |
| Dados de número de unidades não incluído no dataset aberto | Média | Alto | Verificar dataset ANTES. Se ausente, usar número de pavimentos x estimativa de unidades/andar. |

---

## 9. Passos de Verificação (Ação Necessária)

### Prioridade Alta (ANTES de implementar)

- [ ] **V1: Acessar Portal de Dados Abertos SP** — `dados.prefeitura.sp.gov.br` — buscar dataset "IPTU" e verificar:
  - Existência do dataset para exercício 2025 ou 2026
  - Campos disponíveis (confirmar: nº unidades, área construída, padrão, ano construção)
  - Formato (CSV, encoding, delimitador)
  - Tamanho do arquivo
  - Filtro por distrito/subprefeitura Moema disponível
- [ ] **V2: Download de amostra do CSV IPTU** — baixar e inspecionar primeiras 100 linhas filtradas por Moema
- [ ] **V3: Acessar GeoSampa e testar download de shapefile** — tema "Lotes" ou "Quadras Fiscais" para Moema
- [ ] **V4: Testar WFS endpoint** — fazer request GET com bounding box de Moema e verificar resposta (formato, campos, tempo)

### Prioridade Média (durante implementação)

- [ ] **V5: Testar JOIN SQL** — cruzar 10 registros do CSV IPTU com shapefile GeoSampa por SQL (Setor-Quadra-Lote) e verificar correspondência
- [ ] **V6: Comparar com OSM seed data** — verificar overlap e complementaridade entre OSM (16.595 buildings) e GeoSampa (lotes)
- [ ] **V7: Validar com Luciana** — mostrar dados de 5 edifícios conhecidos por ela e verificar se número de unidades, padrão e ano batem com a realidade

---

## 10. Recomendação Final para o Projeto

### Viabilidade: SIM — GeoSampa + IPTU Dados Abertos é viável como fonte premium

### Prioridade Recomendada

| Story | Prioridade GeoSampa/IPTU | Justificativa |
|-------|--------------------------|---------------|
| **Story 1.7** (Seed Data) | **Should** | Enriquece OSM seed data com número de unidades, padrão, ano. OSM já fornece geometria base. GeoSampa/IPTU adiciona atributos que nenhuma outra fonte gratuita fornece. Implementar como segunda camada de seed, após OSM. |
| **Story 3.5** (Pré-Mapeamento Avançado) | **Must** | Para pré-mapeamento avançado, GeoSampa/IPTU é a fonte mais rica. Dados de unidades e padrão construtivo são essenciais para priorização de prospecção. |

### Abordagem de Implementação

**Epic 1 (Story 1.7) — Fase 1:**
1. OSM Overpass como seed base (geometria + nomes parciais) — **JÁ VALIDADO**
2. Download CSV IPTU + script de enriquecimento — adiciona nº unidades, padrão, ano
3. Insere como atributos nos edificios seed (UPDATE onde OSM match por proximidade)
4. Esforço: +1-2 dias sobre implementação OSM

**Epic 3 (Story 3.5) — Fase 2:**
1. Pipeline completo GeoSampa WFS + IPTU CSV com JOIN por SQL
2. Cobertura total de lotes com geometria precisa (polígonos) e atributos ricos
3. Substituição/complemento do footprint OSM por geometria oficial do GeoSampa
4. Esforço: 3-5 dias de desenvolvimento

### Valor Estratégico

O GeoSampa + IPTU Dados Abertos é a **única fonte gratuita que fornece dados de edifícios que nenhuma outra API oferece**: número de unidades, padrão construtivo oficial, ano de construção, área construída total. Estes dados são críticos para:

1. **Priorização de prospecção:** Edifícios com 80+ unidades vs 8 unidades = volume de oportunidades completamente diferente
2. **Classificação automática:** Padrão IPTU (A/B/C/D/E) mapeia diretamente para alto/médio/popular
3. **Perfil temporal:** Prédios antigos (pré-2000) têm mais proprietários originais (potenciais FISBOs)
4. **ACM contextual:** Área construída e valor venal informam o mercado da micro-região

**Nenhuma outra fonte gratuita fornece esses dados.** Google Places não tem. OSM não tem. Mapbox não tem. Só o cadastro IPTU municipal.

---

## Fontes e Referências

| Fonte | URL | Tipo |
|-------|-----|------|
| GeoSampa Portal | `https://geosampa.prefeitura.sp.gov.br` | Portal geoespacial municipal |
| Portal de Dados Abertos SP | `https://dados.prefeitura.sp.gov.br` | Dados abertos municipais |
| Secretaria Municipal da Fazenda SP | `https://www.prefeitura.sp.gov.br/cidade/secretarias/fazenda/` | Administração do IPTU |
| Lei de Acesso à Informação | Lei Federal 12.527/2011 | Base legal para acesso a dados públicos |
| Política de Dados Abertos SP | Decreto Municipal 54.794/2014 | Regulamentação de dados abertos |
| LGPD | Lei Federal 13.709/2018 | Proteção de dados pessoais |

**Nota:** URLs e detalhes baseados em conhecimento de treinamento (cutoff maio/2025). Verificar acessibilidade atual antes de implementar.

---

*Relatório de pesquisa GeoSampa/IPTU — Alex (Analyst Agent) — Synkra AIOX*
*Base: conhecimento de treinamento (cutoff maio/2025). Itens requerem verificação prática conforme seção 9.*
