# API Surface — rictom/cnpj-sqlite

O repo **NÃO expõe API Python pública** — é um ETL pipeline para produzir o `cnpj.db`. A "surface" que o Epic 7 vai consumir é **o SQLite resultante via SQL** (ou via Supabase Foreign Data Wrapper / views materializadas).

## Surface SQL para Epic 7

### Query 1 — Lookup direto CNPJ → empresa completa

```sql
-- Input: CNPJ 14 dígitos (sem máscara)
-- Output: empresa + estabelecimento matriz + sócios
SELECT
    em.cnpj_basico,
    em.razao_social,
    em.natureza_juridica,
    em.capital_social,
    em.porte_empresa,
    est.cnpj,
    est.nome_fantasia,
    est.cnae_fiscal,
    cae.descricao AS cnae_descricao,
    est.logradouro || ', ' || est.numero AS endereco,
    est.bairro,
    est.cep,
    est.uf,
    est.ddd1 || est.telefone1 AS telefone1,
    est.correio_eletronico
FROM estabelecimento est
LEFT JOIN empresas em ON em.cnpj_basico = est.cnpj_basico
LEFT JOIN cnae cae ON cae.codigo = est.cnae_fiscal
WHERE est.cnpj = :cnpj_input
  AND est.matriz_filial = '1';
```

Performance: O(1) via `idx_estabelecimento_cnpj`.

### Query 2 — Sócios PJ (sinal categoria E — Holding)

```sql
-- Input: CNPJ
-- Output: sócios PJ que possuem >5% (mascarado pela RFB)
SELECT
    s.cnpj_cpf_socio AS cnpj_socio,
    s.nome_socio,
    s.qualificacao_socio,
    qs.descricao AS qualificacao,
    s.data_entrada_sociedade,
    s.identificador_de_socio  -- '1'=PJ, '2'=PF, '3'=Estr.
FROM socios s
LEFT JOIN qualificacao_socio qs ON qs.codigo = s.qualificacao_socio
WHERE s.cnpj = :cnpj_input
ORDER BY s.identificador_de_socio, s.data_entrada_sociedade;
```

### Query 3 — Detecção tipologia B/C/D por CNAE

```sql
-- Busca todas as empresas com CNAE imobiliário primário no município de São Paulo
SELECT
    est.cnpj,
    em.razao_social,
    est.cnae_fiscal,
    cae.descricao,
    est.nome_fantasia,
    est.bairro,
    est.cep
FROM estabelecimento est
INNER JOIN empresas em ON em.cnpj_basico = est.cnpj_basico
INNER JOIN cnae cae ON cae.codigo = est.cnae_fiscal
WHERE est.municipio = '7107'  -- São Paulo (código IBGE truncado RFB)
  AND est.uf = 'SP'
  AND est.situacao_cadastral = '02'  -- ativa
  AND est.cnae_fiscal IN (
      '6822500',  -- Administração de imóveis (categoria B)
      '6831700',  -- Intermediação compra/venda
      '6810201',  -- Compra e venda de imóveis próprios
      '6810202',  -- Aluguel de imóveis próprios
      '4110700',  -- Incorporação imobiliária (categoria C)
      '4120400',  -- Construção edifícios (categoria C)
      '8112500',  -- Adm. de prédios (categoria D)
      '8121400'   -- Limpeza de prédios (categoria D)
  );
```

### Query 4 — Grafo holding (recursivo)

```sql
-- Input: CNPJ raiz (ex: holding suspeita)
-- Output: empresas que têm o CNPJ raiz como sócio PJ
SELECT DISTINCT
    s.cnpj AS cnpj_subsidiaria,
    em.razao_social AS subsidiaria_razao_social,
    est.cnae_fiscal,
    cae.descricao AS atividade,
    est.uf
FROM socios s
LEFT JOIN estabelecimento est ON est.cnpj = s.cnpj AND est.matriz_filial = '1'
LEFT JOIN empresas em ON em.cnpj_basico = est.cnpj_basico
LEFT JOIN cnae cae ON cae.codigo = est.cnae_fiscal
WHERE s.cnpj_cpf_socio = :holding_cnpj_raiz  -- 14 dígitos
  AND s.identificador_de_socio = '1';
```

**Limitação:** profundidade 1 (1º nível). Para múltiplos níveis usar `WITH RECURSIVE` ou loop em camada aplicação.

### Query 5 — Match por nome do anunciante

```sql
-- Input: nome do anunciante extraído do portal (ex: "ANDRE IMOVEIS LTDA")
-- Output: candidatas em empresas/estabelecimento
SELECT
    est.cnpj,
    em.razao_social,
    est.nome_fantasia,
    est.bairro,
    est.cep,
    est.cnae_fiscal,
    est.ddd1 || est.telefone1 AS contato,
    est.correio_eletronico
FROM estabelecimento est
INNER JOIN empresas em ON em.cnpj_basico = est.cnpj_basico
WHERE (
        em.razao_social LIKE '%ANDRE IMOVEIS%'
        OR est.nome_fantasia LIKE '%ANDRE IMOVEIS%'
    )
  AND est.uf = 'SP'
  AND est.situacao_cadastral = '02';
```

Performance: O(log n) via `idx_empresas_razao_social` e `idx_estabelecimento_nomefantasia`. **LIKE prefix-only é mais rápido** que LIKE com `%` no início — preferir prefix matching e/ou normalizar para uppercase no extrator.

## Custos operacionais por query

| Query | Tipo | Tempo estimado em ~30 GB DB |
|---|---|---|
| Q1 (PK lookup) | Index seek | < 1 ms |
| Q2 (CNPJ → sócios) | Index seek + small fanout | 1-5 ms |
| Q3 (filtro município + CNAE) | Index scan parcial | 50-500 ms |
| Q4 (grafo nível 1) | Index seek + JOIN | 10-50 ms |
| Q5 (LIKE com `%` início) | Full-scan ou index range | 100 ms - 5 s |

**Implicação Epic 7:** Q5 é a única query custosa. Para uso em hot path do scoring, materializar **view normalizada** com `razao_social_normalizada` (uppercase, sem acentos, trim) e índice trigram (`pg_trgm` no Postgres).

## Como o Epic 7 vai consumir

### Opção A — Foreign Data Wrapper (FDW)

```sql
-- No Supabase (Postgres):
CREATE EXTENSION sqlite_fdw;
CREATE SERVER cnpj_sqlite_server
    FOREIGN DATA WRAPPER sqlite_fdw
    OPTIONS (database '/data/cnpj.db');
CREATE FOREIGN TABLE rfb_estabelecimento (...) SERVER cnpj_sqlite_server OPTIONS (table 'estabelecimento');
```

**Pro:** zero ETL adicional, sempre live.
**Contra:** SQLite FDW não está em Supabase managed por default. Confirmar com @data-engineer.

### Opção B — ETL para Postgres dedicado (recomendado para Epic 7 Wave A)

1. Container Docker roda mensalmente: download → build cnpj.db
2. Após validação, container roda `pgloader` ou Python script que copia para Supabase Postgres `rfb_*` schema.
3. Vantagem: queries dentro do mesmo Postgres, sem cross-DB JOIN.
4. Custo de storage: ~30 GB no Supabase Pro (alvo: filtrar antes — só SP, só CNAE imobiliário/construção/admin).

### Opção C — Filtragem antecipada (recomendado para MVP)

Reescrever o ETL para criar `cnpj-imobiliario-sp.db` (<2 GB) com apenas:

- `estabelecimento` filtrado: `uf='SP' AND cnae_fiscal IN (lista 8 CNAEs imobiliários)`
- `empresas` correspondentes via `cnpj_basico`
- `socios` correspondentes via `cnpj`
- Tabelas-código completas

Cabe em <5 GB Supabase free tier, query latency <50 ms para queries do scoring.

## License compliance

MIT → uso comercial OK + redistribuição OK desde que mantida a notice de copyright em qualquer fork/derivado. Para Epic 7, **se for empacotar o cnpj.db gerado para clientes RE/MAX**, incluir:

```
This product includes data structures derived from the rictom/cnpj-sqlite project
(https://github.com/rictom/cnpj-sqlite), licensed under MIT License.
```

Os dados em si (CNPJ Brasil RFB) são públicos pela LAI/LGPD art. 7º — sem restrição adicional.
