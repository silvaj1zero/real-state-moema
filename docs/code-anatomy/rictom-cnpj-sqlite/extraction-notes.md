# Extraction Notes — rictom/cnpj-sqlite → Epic 7

Decisão por componente: O QUE APROVEITAR, O QUE ADAPTAR, O QUE DESCARTAR.

## Mapa de extração

| Item | Decisão | Justificativa |
|---|---|---|
| **Pipeline ETL Python (3 scripts)** | **APROVEITAR verbatim** | Funciona, é MIT, comunidade ativa. Empacotar em container Docker. |
| **Schema das 8 tabelas** | **APROVEITAR verbatim** | Schema RFB é canônico — espelha o publicado em `cnpj-metadados.pdf`. |
| **Logica de PROPFIND WebDAV** (`dados_cnpj_baixa.py:38-77`) | **APROVEITAR verbatim** | Pattern correto para a API RFB. Sensível a mudança de layout (jan/2026, mar/2026) — monitorar share_token. |
| **18 índices SQL** | **APROVEITAR verbatim** | Já cobrem todas as queries Epic 7. Adicionar **apenas** trigram para fuzzy match em `razao_social` se usar Postgres. |
| **`dados_cnpj_cnae_secundaria.py`** | **AVALIAR caso a caso** | Materializa ~150-200M rows. Se Epic 7 não usar cnae_secundaria para classificação, **NÃO rodar** (economiza ~3 GB de DB + 18 min de build). |
| **Filtragem após ETL** | **ADICIONAR** | Novo script `filter_epic7_imobiliario.py` que produz `cnpj-imobiliario-sp.db` < 5 GB (vide Opção C em `04-api-surface.md`). |
| **Rotação atômica** | **ADICIONAR** | O script aborta se cnpj.db existe. Wrap em shell script: build → validate → flip rename. |
| **Variante DASK do CNAE secundária** | **DESCARTAR** | Comentário no código diz "database locked" — variante pandas é mais estável. |
| **`from bs4 import BeautifulSoup`** import legado | **DESCARTAR** | Não é mais usado no path principal (RFB removeu HTML scraping). |
| **Dependency `wget`** | **DESCARTAR** | Substituída por `parfive`. |
| **Confirmação interativa (input(...) prompts)** | **REMOVER** em container | Substituir por flags CLI (`--force`, `--share-token=XYZ`, `--output=/data/cnpj.db`). |

## Sugestões de hardening específicas para Epic 7

### 1. Containerização

```dockerfile
FROM python:3.11-slim
WORKDIR /app

# System deps para dask (sqlite, libs C)
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Scripts
COPY dados_cnpj_baixa.py dados_cnpj_para_sqlite.py dados_cnpj_cnae_secundaria.py ./
COPY entrypoint.sh ./

VOLUME /data
ENV PASTA_ZIP=/data/dados-publicos-zip
ENV PASTA_SAIDA=/data/dados-publicos

ENTRYPOINT ["./entrypoint.sh"]
```

`entrypoint.sh` faria: download → ETL → cnae_secundaria opcional → validate → push para Supabase via psql/COPY.

### 2. Filtragem para Epic 7 (script novo, post-ETL)

```python
# filter_epic7_imobiliario.py — NÃO existe no repo upstream, criar
import sqlite3, sys

CNAES_TARGET = (
    '6822500', '6831700', '6810201', '6810202',
    '4110700', '4120400', '4399105',
    '8112500', '8121400', '8130300',
)

src = sqlite3.connect('cnpj.db')
dst = sqlite3.connect('cnpj-imobiliario-sp.db')

# Copia schema completo (tabelas-código + DDL)
for table in ['cnae', 'motivo', 'municipio', 'natureza_juridica',
              'pais', 'qualificacao_socio', '_referencia']:
    src.backup(dst, name=table)  # ou attach + INSERT INTO ... SELECT

# Filtra estabelecimento por UF + CNAE primário
src.execute(f'''
    ATTACH DATABASE 'cnpj-imobiliario-sp.db' AS dst_db;
    CREATE TABLE dst_db.estabelecimento AS
    SELECT * FROM estabelecimento
    WHERE uf = 'SP'
      AND situacao_cadastral = '02'
      AND cnae_fiscal IN {CNAES_TARGET};
''')

# Filtra empresas correspondentes
src.execute('''
    CREATE TABLE dst_db.empresas AS
    SELECT em.* FROM empresas em
    WHERE em.cnpj_basico IN (SELECT DISTINCT cnpj_basico FROM dst_db.estabelecimento);
''')

# Filtra sócios correspondentes
src.execute('''
    CREATE TABLE dst_db.socios AS
    SELECT s.* FROM socios s
    WHERE s.cnpj_basico IN (SELECT cnpj_basico FROM dst_db.empresas);
''')

# Reindex
for stmt in ['CREATE INDEX ...']:  # repetir 18 índices
    dst.execute(stmt)
```

**Resultado:** ~50-100 mil estabelecimentos em SP (vs 60M total), DB < 2 GB, query latency <50 ms.

### 3. Frequência de update

**RFB publica mensalmente, dia ~5-15 do mês.**

Schedule:
- Wave A: trigger manual no Supabase Edge Function → invoca container via webhook.
- Wave B: pg_cron mensal dia 20 (margem para RFB publicar).

### 4. Monitoramento contínuo

| Métrica | Threshold |
|---|---|
| Quantidade de CNPJs vs mês anterior | Mudança > ±5% → alerta (RFB pode ter quebrado) |
| Tempo de build | Mudança > 2x média histórica → alerta |
| Schema novo | Adição de colunas não previstas → alerta + bloqueio |
| share_token muda | Re-detectar via PROPFIND, atualizar config |

### 5. Mitigação LGPD

Para o subset filtrado armazenado em Supabase:

- Criptografar colunas com PII at-rest: `socios.nome_socio`, `socios.cnpj_cpf_socio`, `socios.nome_representante`, `estabelecimento.correio_eletronico`
- Audit log de toda consulta cruzando CPF/CNPJ
- TTL de cache: 30 dias (renovar com base nova)
- Política de retenção: descartar bases >12 meses (regra interna)

## Risco — comunidade pequena de 1 maintainer

| Vetor | Probabilidade | Mitigação |
|---|---|---|
| Maintainer abandona | Médio (1 dev, código com comentários abandonados — "RedeCNPJ" referenced) | Fork interno do repo; Anchor commit SHA em pin |
| RFB muda layout novamente | Alto (mudou 2x em 6 meses) | Test automatizado mensal que valida primeira página de download |
| Bibliotecas (dask, parfive) breaking changes | Médio | Pin versões em requirements; renovar via test em CI |
| 30 GB SQLite corromper | Baixo | Backup S3 mensal do `.db`; quick checksum SHA256 |

## Alternativas avaliadas pré-Wave 2

| Alternativa | Por que NÃO escolhida |
|---|---|
| `cuducos/minha-receita` (1.5k⭐) | **ARCHIVED 2026-01-04** — runtime morto |
| `caiopizzol/cnpj-data-pipeline` | Mais complexo (Postgres-first, k8s). rictom v0.7 já incorporou as melhorias do download. |
| Brasil.IO CNPJ API (paga) | Custo escala com volume; Epic 7 precisa de bulk |
| ReceitaWS API (paga) | Mesmo problema; rate-limited |
| Build próprio do zero | Reinventar roda — sem ROI |

## Recomendação final

**APROVAR adoção de rictom/cnpj-sqlite como base do container Python isolado do Epic 7.** Justificativa:

1. **Open source first** ✓ (MIT)
2. **Comunidade ativa** ✓ (223⭐, 68 forks, atualizado em mar/2026 após mudança RFB)
3. **Schema canônico RFB** ✓ (espelha doc oficial)
4. **Performance suficiente** ✓ (1.5h build, 30 GB final, <50ms queries quando filtrado)
5. **Compatível com decisão Wave 2** ✓ (Python isolado em container, sem misturar com Crawlee TS)
6. **License permissiva** ✓ (MIT, uso comercial sem ônus)

**Adicionar à Phase 5:** story Epic 7 "Container CNPJ ETL — ingest mensal" com responsável `@data-engineer`, custo estimado em 1 sprint (5 dias) considerando containerização + filtragem Epic 7 + integração Supabase + smoke tests.
