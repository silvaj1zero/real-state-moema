# Domain Model — rictom/cnpj-sqlite

Extraído verbatim de `dados_cnpj_para_sqlite.py` (commit `b20e690b`, 2026-04-12).

## Tabelas e colunas

### `empresas` (matrizes/headers)

Definido em `dados_cnpj_para_sqlite.py:54-60` (lista `colunas_empresas`):

| Coluna | Tipo | Notas |
|---|---|---|
| `cnpj_basico` | TEXT (8 chars) | PK lógica (FK para `estabelecimento`, `socios`, `simples`). Índice idx_empresas_cnpj_basico. |
| `razao_social` | TEXT | Indexado. Crítico para grep "INVESTIMENTOS", "PARTICIPACOES", "HOLDING" (categoria E). |
| `natureza_juridica` | TEXT | Código numérico, FK para tabela `natureza_juridica.codigo`. Ex: `2062` (sociedade limitada). |
| `qualificacao_responsavel` | TEXT | FK para `qualificacao_socio.codigo`. |
| `capital_social` | REAL | Convertido de string `capital_social_str` em pós-processamento (linha 142). Coluna original DROPPED. |
| `porte_empresa` | TEXT | `01`=ME, `03`=EPP, `05`=Demais. |
| `ente_federativo_responsavel` | TEXT | Usado só por entes públicos. |

### `estabelecimento` (matrizes + filiais com endereço)

Definido em `dados_cnpj_para_sqlite.py:62-82` (lista `colunas_estabelecimento`):

| Coluna | Tipo | Relevância para Epic 7 |
|---|---|---|
| `cnpj_basico` | TEXT(8) | FK |
| `cnpj_ordem` | TEXT(4) | identifica filial |
| `cnpj_dv` | TEXT(2) | dígitos verificadores |
| `cnpj` | TEXT(14) | **DERIVADO em pós-processamento** (linha 147: `cnpj_basico||cnpj_ordem||cnpj_dv`). Indexado. |
| `matriz_filial` | TEXT(1) | `'1'`=matriz, `'2'`=filial |
| `nome_fantasia` | TEXT | **Indexado**. Crítico para matching com anunciantes. |
| `situacao_cadastral` | TEXT | `01`=Nula, `02`=Ativa, `03`=Suspensa, `04`=Inapta, `08`=Baixada |
| `data_situacao_cadastral` | TEXT(YYYYMMDD) | |
| `cnae_fiscal` | TEXT(7) | **CRÍTICO p/ classificação tipológica (B, C, D)**. FK para `cnae`. |
| `cnae_fiscal_secundaria` | TEXT | Lista CSV "code,code,..." (exploded em tabela `cnae_secundaria` separada). |
| `logradouro`, `numero`, `complemento`, `bairro`, `cep`, `uf`, `municipio` | TEXT | Endereço, FK `municipio.codigo`. |
| `ddd1`, `telefone1` | TEXT | **Contato principal** para enrichment (Epic 7 categoria B/C/D). |
| `ddd2`, `telefone2`, `ddd_fax`, `fax` | TEXT | Contatos secundários. |
| `correio_eletronico` | TEXT | **E-mail oficial RFB** — sinal de validade quando matching com anunciante. |

### `socios` (vínculos societários)

Definido em `dados_cnpj_para_sqlite.py:84-95` + transformado em SQL (linhas 160-167):

```sql
CREATE TABLE socios AS
SELECT te.cnpj as cnpj, ts.*
from socios_original ts
left join estabelecimento te on te.cnpj_basico = ts.cnpj_basico
where te.matriz_filial='1';
```

| Coluna | Tipo | Relevância |
|---|---|---|
| `cnpj` | TEXT(14) | **DERIVADO** via JOIN com matriz. Indexado. |
| `cnpj_basico` | TEXT(8) | FK |
| `identificador_de_socio` | TEXT(1) | `'1'`=PJ, `'2'`=PF, `'3'`=Estrangeiro. **Sinal direto para categoria E (Holding) se PJ.** |
| `nome_socio` | TEXT | Indexado idx_socios_nome_socio. |
| `cnpj_cpf_socio` | TEXT | **CRÍTICO p/ grafo holding**: quando `identificador_de_socio='1'`, este é o CNPJ da PJ sócia. Indexado. |
| `qualificacao_socio` | TEXT | FK `qualificacao_socio.codigo`. |
| `data_entrada_sociedade` | TEXT(YYYYMMDD) | |
| `representante_legal` | TEXT | CPF do representante para PJ. Indexado. |
| `nome_representante` | TEXT | Indexado idx_socios_representante_nome. |
| `qualificacao_representante_legal` | TEXT | FK |
| `faixa_etaria` | TEXT | `0`=N/A, `1`=0-12, ..., `9`=80+. Sem PII direto. |

### `simples` (regime tributário)

Definido em `dados_cnpj_para_sqlite.py:97-103`. Útil para sinalizar **porte declarado**:

| Coluna | Tipo |
|---|---|
| `cnpj_basico` | TEXT(8), indexado |
| `opcao_simples` | TEXT(`S`/`N`) |
| `data_opcao_simples`, `data_exclusao_simples` | TEXT |
| `opcao_mei`, `data_opcao_mei`, `data_exclusao_mei` | TEXT |

### `cnae_secundaria` (exploded de `estabelecimento.cnae_fiscal_secundaria`)

Tabela produzida por `dados_cnpj_cnae_secundaria.py`:

| Coluna | Tipo |
|---|---|
| `cnpj` | TEXT(14) |
| `cnae_fiscal_secundaria` | TEXT(7) — uma linha por CNAE |

**Importante:** essa tabela inflate o DB significativamente (~60M empresas * 2-4 CNAEs/empresa = ~150-200M rows). Para Epic 7, se grafo holding for o foco, considerar não materializar essa tabela (já há `cnae_fiscal` primary).

### Tabelas-código (lookup tables)

| Tabela | Linhas | Conteúdo |
|---|---|---|
| `cnae` | ~1.3k | Código + descrição CNAE (FK target) |
| `motivo` | ~80 | Motivos situação cadastral |
| `municipio` | ~5.6k | Códigos IBGE de municípios |
| `natureza_juridica` | ~80 | LTDA, S.A., MEI, ASSOC, etc. |
| `pais` | ~250 | ISO 3166 |
| `qualificacao_socio` | ~70 | Sócio-Administrador, Diretor, etc. |

Cada uma indexada via `CREATE INDEX idx_{nomeTabela} ON {nomeTabela}(codigo)`.

### `_referencia` (metadata)

```sql
CREATE TABLE "_referencia" (
    "referencia" TEXT,  -- "CNPJ" ou "cnpj_qtde"
    "valor" TEXT
);
```

Conteúdo: data de referência da base + contagem de CNPJs. Útil para versionar a base no Supabase.

## Índices criados (verbatim, `dados_cnpj_para_sqlite.py:148-172`)

```sql
CREATE INDEX idx_empresas_cnpj_basico ON empresas (cnpj_basico);
CREATE INDEX idx_empresas_razao_social ON empresas (razao_social);
CREATE INDEX idx_estabelecimento_cnpj_basico ON estabelecimento (cnpj_basico);
CREATE INDEX idx_estabelecimento_cnpj ON estabelecimento (cnpj);
CREATE INDEX idx_estabelecimento_nomefantasia ON estabelecimento (nome_fantasia);
CREATE INDEX idx_socios_original_cnpj_basico ON socios_original(cnpj_basico);
CREATE INDEX idx_socios_cnpj ON socios(cnpj);
CREATE INDEX idx_socios_cnpj_cpf_socio ON socios(cnpj_cpf_socio);
CREATE INDEX idx_socios_nome_socio ON socios(nome_socio);
CREATE INDEX idx_socios_representante ON socios(representante_legal);
CREATE INDEX idx_socios_representante_nome ON socios(nome_representante);
CREATE INDEX idx_simples_cnpj_basico ON simples(cnpj_basico);
-- + 6 índices nas tabelas-código (idx_cnae, idx_motivo, idx_municipio, idx_natureza_juridica, idx_pais, idx_qualificacao_socio)
```

**Total: 18 índices** (12 nas tabelas grandes + 6 nas tabelas-código).

## Relações (ER simplificado)

```
empresas (cnpj_basico) <---FK--- estabelecimento (cnpj_basico)
                       <---FK--- socios          (cnpj_basico)
                       <---FK--- simples         (cnpj_basico)

estabelecimento (cnpj) <---FK--- cnae_secundaria (cnpj)
estabelecimento.cnae_fiscal --> cnae.codigo
estabelecimento.municipio   --> municipio.codigo
estabelecimento.pais        --> pais.codigo
empresas.natureza_juridica  --> natureza_juridica.codigo
empresas.qualificacao_responsavel --> qualificacao_socio.codigo
socios.qualificacao_socio   --> qualificacao_socio.codigo
socios.identificador_de_socio  --> {'1'=PJ, '2'=PF, '3'=Estr.}
```

## PII e LGPD

| Coluna | PII? | Tratamento Epic 7 |
|---|---|---|
| `socios.nome_socio` (quando PF) | **Sim** | Hash + criptografar at-rest no Supabase |
| `socios.cnpj_cpf_socio` (PF format CPF mascarado: 11 dígitos) | **Sim** | A RFB **já mascara** mostrando apenas 6 dígitos centrais (`***.XXX.XXX-**`) — verificar versão atual |
| `socios.nome_representante` | **Sim** | Idem |
| `socios.representante_legal` (CPF) | **Sim** | Idem |
| `estabelecimento.correio_eletronico` | Médio | Tratado como PI corporativa |
| `estabelecimento.telefone*` | Médio | Idem |
| `socios.faixa_etaria` (faixa, não data) | Não | OK |

**Verificar empiricamente** na base atual (mar/2026) se RFB ainda mascara CPF de sócios PF — política mudou com LGPD. Se sim, o risco de exposição é menor.
