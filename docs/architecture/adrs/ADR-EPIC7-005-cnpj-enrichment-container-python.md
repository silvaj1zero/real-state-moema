# ADR-EPIC7-005: CNPJ Enrichment em Container Python Isolado (rictom/cnpj-sqlite)

**Date:** 2026-05-14
**Status:** Accepted
**Epic:** 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte

## Context

O enriquecimento de CNPJ e fundamental para:
- Classificar PJ anunciante (Categoria B Imobiliaria via CNAE 68.xx; Categoria C Construtora via CNAE 41.xx; Categoria D Administradora via CNAE 81.12-81.13)
- Identificar Categoria E (PJ Holding patrimonial — CNAE 68.10 + multiplas unidades)
- Validar razao social vs nome fantasia em anuncios PJ

A base RFB CNPJ e publica, atualizada mensalmente, em formato ZIP gigante (~20GB descompactado). Processamento exige Python (bibliotecas dask/parfive/sqlalchemy) e nao se beneficia de runtime Crawlee TS.

CQ-003 RESOLVED e bench `crawlee-ts-vs-crawlee-py` confirmaram que TypeScript vence para crawlers mas Python isolado em container e a abordagem certa para ETL CNPJ. `rictom/cnpj-sqlite` (MIT, 223 stars, mantido ativo, schema espelha doc oficial RFB) e o melhor candidato.

## Decision

**Adotar `rictom/cnpj-sqlite` em container Docker Python isolado para a pipeline ETL CNPJ.**

Componentes:
1. **Container Docker** baseado em `python:3.11-slim`, com scripts `dados_cnpj_baixa.py` + `dados_cnpj_para_sqlite.py` + script NOVO `filter_epic7_imobiliario.py`
2. **Entrypoint shell:** download -> ETL -> filter Epic 7 -> validate -> push subset para Supabase via `psql COPY`
3. **Filtragem Epic 7:** CNAEs primarios target = `{6822500, 6831700, 6810201, 6810202, 4110700, 4120400, 4399105, 8112500, 8121400, 8130300}`. Resultado: ~50-100k estabelecimentos SP em DB filtrado < 2GB (vs 30GB total).
4. **Frequencia:** mensal, executado dia 20 de cada mes (margem para RFB publicar entre dia 5-15). Wave A trigger manual via Edge Function webhook; Wave B pg_cron mensal.
5. **Tabela Supabase target:** `cnpj_enrichment` com colunas (`cnpj`, `razao_social`, `nome_fantasia`, `cnae_primario`, `cnaes_secundarios`, `uf`, `municipio`, `situacao_cadastral`, `data_situacao_cadastral`, `socios JSONB`, `updated_at`).
6. **Sem mistura de runtimes:** o container Python NAO importa codigo TS, NAO comparte processo com Crawlee. Comunicacao via Supabase tables apenas.

## Alternatives Considered

| Alternativa | Avaliada | Por que rejeitada |
|---|---|---|
| **`cuducos/minha-receita`** (1.5k stars) | Possivel | ARCHIVED em 2026-01-04 (runtime morto). Ecossistema estagnado. |
| **`caiopizzol/cnpj-data-pipeline`** | Possivel | Mais complexo (Postgres-first, k8s); rictom v0.7 ja incorporou as melhorias relevantes do download |
| **Brasil.IO CNPJ API (paga)** | Possivel | Custo escala com volume; Epic 7 precisa de bulk consultas, nao individuais |
| **ReceitaWS API (paga)** | Possivel | Mesmo problema; rate-limited; sem bulk |
| **Build proprio do zero** | Possivel | Reinventar roda; sem ROI; pipeline RFB tem complexidades (PROPFIND WebDAV, layout muda) |
| **Crawlee TypeScript reescrevendo o ETL** | Avaliada | Linguagem mismatch para dask/parfive; ecossistema npm fraco em ETL escala dezenas de GB; quebraria ADR-EPIC7-001 (TS only para crawlers) |
| **Import codigo Python in-process via execnet/pyodide** | Possivel | Acoplamento alto, debugging dificil; container isolado e padrao ja consolidado |

## Consequences

**Positive:**
- Reutilizacao de codigo MIT testado em producao (223 stars, schema canonico RFB)
- Container isolado = zero contaminacao do runtime TS principal
- Schema espelha doc oficial RFB (`cnpj-metadados.pdf`) — semantica clara
- 18 indices SQL ja cobrem queries esperadas Epic 7
- Build mensal automatizado, ~1.5h, DB final ~2GB filtrado
- Comunicacao via Supabase tables = mesmo padrao do projeto (sem novo paradigma)
- Frequencia mensal alinhada com publicacao RFB (dia 5-15) -> trigger dia 20

**Negative:**
- Mais um runtime para manter (Python + container Docker). **Mitigacao:** Lifecycle simples (apenas dispara mensal); imagem versionada
- Maintainer rictom e 1 dev (risco bus factor). **Mitigacao:** fork interno; pin SHA commit
- RFB pode mudar layout (mudou 2x em 6 meses). **Mitigacao:** test schema automatizado mensal valida primeira pagina download; alert se shape change
- ~30GB SQLite intermediario pode corromper. **Mitigacao:** backup S3 mensal do .db; checksum SHA256
- Schema PII: socios.nome_socio, socios.cnpj_cpf_socio sao PII. **Mitigacao:** cifragem em repouso (NFR-012); audit log de consultas; politica retencao 12 meses

## Evidence

- **`docs/code-anatomy/rictom-cnpj-sqlite/extraction-notes.md`** — mapa extracao detalhado, containerizacao Dockerfile, filtragem Epic 7 script, hardening LGPD.
- **`docs/research/2026-05-14-leads-zonasul-sp/03-recommendations.md`** REC-2.1 + REC-2.4.
- **`docs/research/2026-05-14-leads-zonasul-sp/curiosity_queue.yaml`** CQ-003 RESOLVED ("Python isolado em container so para subsistema CNPJ").
- **`docs/bench/crawlee-ts-vs-crawlee-py/executive-report.md`** decision row "CNPJ ETL -> Python (Crawlee Python optional, plain Python script likely enough)".

---

*ADR-EPIC7-005 — Aria (@architect) + Morgan (@pm) — 2026-05-14*
