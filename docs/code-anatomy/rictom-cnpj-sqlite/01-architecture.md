# Architecture — rictom/cnpj-sqlite

## Topology (ASCII)

```
+-------------------------------------------------------------+
|                  Receita Federal Brasileira                  |
|   arquivos.receitafederal.gov.br/public.php/webdav/          |
|                                                              |
|   /YYYY-MM/  (37 arquivos zip, ~6-8 GB total)               |
|     - 10x Empresas{0..9}.zip       (~ EMPRECSV)             |
|     - 10x Estabelecimentos{0..9}.zip (~ ESTABELE)           |
|     - 10x Socios{0..9}.zip         (~ SOCIOCSV)             |
|     - Simples.zip                  (~ SIMPLES.CSV)          |
|     - Cnaes.zip / Motivos.zip / Municipios.zip /            |
|       Naturezas.zip / Paises.zip / Qualificacoes.zip        |
+-------------------------------------------------------------+
                       |
                       | dados_cnpj_baixa.py
                       |  - PROPFIND WebDAV (share_token configurável)
                       |  - parfive Downloader (max_conn=5, parallel)
                       |  - User-Agent rotação manual
                       v
+-------------------------------------------------------------+
|     pasta_compactados/ "dados-publicos-zip"  (~6-8 GB)       |
+-------------------------------------------------------------+
                       |
                       | dados_cnpj_para_sqlite.py
                       |  - zipfile.ZipFile.extractall()
                       v
+-------------------------------------------------------------+
|     pasta_saida/ "dados-publicos"  (~25 GB descompactado)    |
|     Arquivos CSV separados por ";" encoding latin1           |
+-------------------------------------------------------------+
                       |
                       | dados_cnpj_para_sqlite.py
                       |  - dask.dataframe.read_csv() em chunks
                       |  - .to_sql(if_exists='append', engine_url)
                       |  - CREATE INDEX em 16 colunas
                       v
+-------------------------------------------------------------+
|     dados-publicos/cnpj.db   (~30 GB)                        |
|                                                              |
|     8 tabelas:                                               |
|       Pequenas (códigos)                                     |
|         - cnae           (~1.3k rows)                        |
|         - motivo         (~80 rows)                          |
|         - municipio      (~5.6k rows)                        |
|         - natureza_juridica  (~80 rows)                      |
|         - pais           (~250 rows)                         |
|         - qualificacao_socio (~70 rows)                      |
|       Grandes                                                |
|         - empresas        (~22M rows matrizes)               |
|         - estabelecimento (~60M rows matrizes + filiais)     |
|         - socios          (subset com join em matrizes)      |
|         - simples         (subset MEI/Simples)               |
|         - cnae_secundaria (explode da coluna text)           |
|       Metadata                                               |
|         - _referencia (key/value: CNPJ data ref, qtde)       |
+-------------------------------------------------------------+
                       |
                       | (Epic 7 boundary - container Docker isolado)
                       v
+-------------------------------------------------------------+
|     Supabase (views materializadas ou FDW)                   |
|     - Consumido pelo Next.js / Crawlee Wave A                |
+-------------------------------------------------------------+
```

## Componentes-chave

| Componente | Arquivo | Responsabilidade |
|---|---|---|
| **Downloader** | `dados_cnpj_baixa.py` | PROPFIND WebDAV no RFB + download paralelo via `parfive` (max_conn=5, max_splits=1). Fallback manual com User-Agent estático Mozilla/Chrome. |
| **ETL principal** | `dados_cnpj_para_sqlite.py` | Descompacta 37 zips, lê 12+ tipos de CSV via `dask.dataframe`, persiste em SQLite via `sqlalchemy` engine. Cria 16 índices ao final. |
| **CNAE secundária** | `dados_cnpj_cnae_secundaria.py` | "Explode" coluna `cnae_fiscal_secundaria` (CSV de códigos separados por vírgula) em rows separados. Ocupa até 10 GB RAM. |
| **Storage** | `pasta_saida/cnpj.db` | SQLite single-file ~30 GB. Indexado e indexável via DB Browser for SQLite. |

## Bibliotecas críticas (requirements.txt)

```
pandas
sqlalchemy
dask
dask-expr
beautifulsoup4
requests
bs4
wget
parfive
lxml
pyarrow
psutil
```

**Nota Epic 7:** `dask` é dependência pesada (~80 MB instalado). Para minimizar imagem Docker, considerar swap por `polars` ou `duckdb` durante o ETL — mas isso é micro-opt, **não prioridade**.

## Footprint operacional

| Recurso | Valor |
|---|---|
| Disco temporário | ~25 GB CSV + 6-8 GB ZIP = **~33 GB peak** |
| Disco final | ~30 GB (`cnpj.db`) |
| RAM peak | **~10 GB** (carga de cnae_secundária via pandas) |
| Tempo (i7 8th, Win10) | ~2 h |
| Tempo (M1 Mac) | ~1 h |
| Tempo (Ubuntu i7) | ~1.5 h |
| Tempo no container Hetzner CPX31 (estimativa) | ~1.5 h |

## Anti-bot / proteções RFB

- **RFB não bloqueia** o download (dados públicos por lei 13.709/18 + LAI). Apenas exige User-Agent não vazio.
- **WebDAV PROPFIND** é o método oficial — sem rate-limiting publicado.
- **Falha esperada:** quando a RFB muda layout (ocorreu jan/2026 e mar/2026). Tracking: monitor de mudanças no `share_token` da URL `arquivos.receitafederal.gov.br/index.php/s/{token}`.

## Decisões arquiteturais herdadas

| Decisão | Por quê |
|---|---|
| SQLite single-file vs Postgres | Portabilidade do `.db` (rsync, S3, container volume). Conversão para Postgres existe em `rictom/cnpj-mysql`. |
| `dask` vs `pandas` puro | Performance: dask é 10x mais rápido na carga (citação no arquivo). |
| `wget`/`parfive` vs `aiohttp` | Estabilidade + retry built-in para arquivos GB. |
| Cria tabela `socios` derivada de `socios_original` JOIN `estabelecimento` (matriz_filial='1') | Filtragem em ETL, evita JOIN custoso em runtime. |
| 16 índices criados ao final do batch (não during-load) | Carga rápida (CSV → table), indexação one-shot ao final via DDL. |
