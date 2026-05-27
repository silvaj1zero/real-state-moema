# Data Flow — rictom/cnpj-sqlite

ETL pipeline: RFB → ZIP → CSV → SQLite.

## Sequência operacional (3 scripts encadeados)

### Etapa 1 — Download (dados_cnpj_baixa.py)

```
1. consulta_base_webdap(share_token="YggdBLfdninEJX9", base_url="https://arquivos.receitafederal.gov.br/public.php/webdav")
   - HTTP PROPFIND request com Basic Auth (share_token, "")
   - Parse XML WebDAV → lista de diretórios YYYY-MM
   - Pega ultimoAnoMes (último mês disponível)
   - Outro PROPFIND no diretório → lista de arquivos .zip
   - Retorna {anoMes, urlBaseArquivosDoMes, arquivos[37], urlPaginaDownloadMeses}

2. requisitos()
   - Cria pastas se não existem (dados-publicos, dados-publicos-zip)
   - Detecta arquivos legados e pede confirmação para limpar

3. parfive.Downloader(max_conn=5, max_splits=1, config=SessionConfig(headers={User-Agent: Mozilla/5.0 ... Chrome/103}))
   - enqueue_file(url, path=pasta_zip, filename=...) para cada um dos 37 arquivos
   - downloader.download() — paralelo, max 5 conexões concorrentes
```

**Arquivos esperados (dados_cnpj_para_sqlite.py:34):**

```python
if len(arquivos_zip) != 37:
    r = input(f'A pasta {pasta_compactados} deveria conter 37 arquivos zip, mas tem {len(arquivos_zip)}. ...')
```

Os 37 = 10 empresas + 10 estabelecimentos + 10 socios + 1 simples + 6 tabelas-código (cnae, motivo, municipio, natureza, pais, qualificacao).

### Etapa 2 — ETL (dados_cnpj_para_sqlite.py)

```python
# Passo 2.1: Descompactação
for arq in arquivos_zip:
    with zipfile.ZipFile(arq, 'r') as zip_ref:
        zip_ref.extractall(pasta_saida)

# Passo 2.2: Carrega 6 tabelas-código
for (ext, nome) in [('.CNAECSV','cnae'), ('.MOTICSV','motivo'),
                     ('.MUNICCSV','municipio'), ('.NATJUCSV','natureza_juridica'),
                     ('.PAISCSV','pais'), ('.QUALSCSV','qualificacao_socio')]:
    dtab = pd.read_csv(arq, dtype=str, sep=';', encoding='latin1',
                       header=None, names=['codigo','descricao'])
    dtab.to_sql(nomeTabela, engine, if_exists='replace', index=None)
    engine.execute(f'CREATE INDEX idx_{nomeTabela} ON {nomeTabela}(codigo);')

# Passo 2.3: Cria 4 tabelas grandes (DDL) com colunas TEXT
for (nome, colunas) in [('empresas', colunas_empresas),
                        ('estabelecimento', colunas_estabelecimento),
                        ('socios_original', colunas_socios),
                        ('simples', colunas_simples)]:
    engine.execute(sqlCriaTabela(nome, colunas))

# Passo 2.4: Carrega tabelas grandes via DASK
def carregaTipo(nome_tabela, tipo, colunas):
    arquivos = sorted(list(glob.glob(os.path.join(pasta_saida, '*' + tipo))))
    for arq in arquivos:
        ddf = dd.read_csv(arq, sep=';', header=None, names=colunas,
                          encoding='latin1', dtype=str, na_filter=None)
        ddf.to_sql(nome_tabela, engine_url, index=None, if_exists='append',
                   dtype=sqlalchemy.sql.sqltypes.TEXT)

carregaTipo('empresas', '.EMPRECSV', colunas_empresas)
carregaTipo('estabelecimento', '.ESTABELE', colunas_estabelecimento)
carregaTipo('socios_original', '.SOCIOCSV', colunas_socios)
carregaTipo('simples', '.SIMPLES.CSV.*', colunas_simples)

# Passo 2.5: Pós-processamento via batch SQL
sqls = '''
ALTER TABLE empresas ADD COLUMN capital_social real;
update empresas set capital_social = cast(replace(capital_social_str,',', '.') as real);
ALTER TABLE empresas DROP COLUMN capital_social_str;

ALTER TABLE estabelecimento ADD COLUMN cnpj text;
Update estabelecimento set cnpj = cnpj_basico||cnpj_ordem||cnpj_dv;

-- 12 índices nas tabelas grandes
CREATE INDEX idx_empresas_cnpj_basico ON empresas (cnpj_basico);
CREATE INDEX idx_empresas_razao_social ON empresas (razao_social);
CREATE INDEX idx_estabelecimento_cnpj_basico ON estabelecimento (cnpj_basico);
CREATE INDEX idx_estabelecimento_cnpj ON estabelecimento (cnpj);
CREATE INDEX idx_estabelecimento_nomefantasia ON estabelecimento (nome_fantasia);
CREATE INDEX idx_socios_original_cnpj_basico ON socios_original(cnpj_basico);

-- Cria tabela final socios com JOIN (só matrizes)
CREATE TABLE socios AS
SELECT te.cnpj as cnpj, ts.*
from socios_original ts
left join estabelecimento te on te.cnpj_basico = ts.cnpj_basico
where te.matriz_filial='1';

DROP TABLE IF EXISTS socios_original;

CREATE INDEX idx_socios_cnpj ON socios(cnpj);
CREATE INDEX idx_socios_cnpj_cpf_socio ON socios(cnpj_cpf_socio);
CREATE INDEX idx_socios_nome_socio ON socios(nome_socio);
CREATE INDEX idx_socios_representante ON socios(representante_legal);
CREATE INDEX idx_socios_representante_nome ON socios(nome_representante);
CREATE INDEX idx_simples_cnpj_basico ON simples(cnpj_basico);

CREATE TABLE "_referencia" ("referencia" TEXT, "valor" TEXT);
'''

# Passo 2.6: Insere metadata
qtde_cnpjs = engine.execute('select count(*) as contagem from estabelecimento;').fetchone()[0]
engine.execute(f"insert into _referencia (referencia, valor) values ('CNPJ', '{dataReferencia}')")
engine.execute(f"insert into _referencia (referencia, valor) values ('cnpj_qtde', '{qtde_cnpjs}')")
```

### Etapa 3 — CNAE secundária (dados_cnpj_cnae_secundaria.py)

```python
# Variante A (default, bUsaPandas=True): carrega TUDO em RAM, ~10 GB peak, ~18 min
df = pd.read_sql('Select cnpj, cnae_fiscal_secundaria from estabelecimento', conn)
df = df[ df['cnae_fiscal_secundaria']!='']
df['cnae_fiscal_secundaria'] = df['cnae_fiscal_secundaria'].str.split(',')
de = df.explode('cnae_fiscal_secundaria')
de.to_sql('cnae_secundaria', conn, index=None, if_exists='append',
          method='multi', chunksize=100000)

# Variante B (bUsaPandas=False): DASK via parquet intermediário, mais lento (~1h), menos RAM.
```

## Pontos de falha conhecidos

| Falha | Causa | Mitigação |
|---|---|---|
| `Engine object has no attribute execute` | sqlalchemy 2.x breaking change | `pip install sqlalchemy==1.4.47` (v0.5+ usa sqlite3 nativo) |
| `len(arquivos_zip) != 37` | RFB mudou número de arquivos / layout | Atualizar `share_token` (mudou em jan/2026) |
| `database locked` durante DASK to_sql | Concorrência SQLite | Variante B (pandas single-thread) |
| Pasta de saída não vazia | Mistura de dados de meses diferentes | Script aborta e pede limpeza manual |
| HTTP timeout em download | Conexão RFB instável | parfive faz retry implícito; configurar `timeout=99` no Guzzle equivalente |

## Timing real (notebook i7 8th gen, Windows 10)

| Fase | Tempo |
|---|---|
| Download (37 zips) | depende da banda — tipicamente 30-60 min em conexão 100 Mbps |
| Descompactação | ~10 min |
| Carga tabelas-código | <1 min |
| Carga `empresas` | ~10 min |
| Carga `estabelecimento` | ~25 min (maior tabela) |
| Carga `socios_original` | ~25 min |
| Carga `simples` | ~5 min |
| Pós-processamento SQL + índices | ~10 min |
| Build `cnae_secundaria` | ~18 min (variante pandas) |
| **Total (sem download)** | **~95 min** |

## Idempotência

**Não idempotente.** O script aborta se `cnpj.db` já existe (linha 24):

```python
if os.path.exists(cam):
    input(f'O arquivo {cam} já existe. Apague-o primeiro e rode este script novamente.')
    sys.exit()
```

**Implicação Epic 7:** o container deve **rotacionar atomically**: gerar `cnpj-YYYY-MM.db.new`, depois rename para `cnpj.db` apenas após validação básica (count rows, smoke query). Comparar mês anterior via `_referencia` antes do flip.
