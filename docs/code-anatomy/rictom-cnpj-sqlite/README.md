# Code Anatomy — rictom/cnpj-sqlite

**Priority:** P0
**Mission scope:** ETL CNPJ → SQLite for Epic 7 Wave A FISBO classification (categoria E = Holding) + sinais B/C/D.

## TL;DR

`rictom/cnpj-sqlite` é um pipeline ETL Python que **baixa os 37 arquivos zipados mensais da Receita Federal Brasileira (RFB), descompacta, parseia CSVs e materializa em SQLite (`cnpj.db`)** com 8 tabelas e índices estratégicos. Output final: ~30 GB SQLite DB com >60 milhões de registros (empresas, estabelecimentos, sócios, simples, e 6 tabelas-código).

**Distribuição operacional para o Epic 7:**
- **Container Python isolado** (decisão Wave 2 confirmada por BENCH-01)
- **Comunicação com o app Next.js apenas via Supabase tables/views** materializadas a partir das tabelas do `cnpj.db`
- **Surface de consumo restrita a SELECT** sobre `empresas`, `estabelecimento`, `socios` joinadas por `cnpj_basico`

## Arquitetura em 1 frase

3 scripts Python sequenciais (`dados_cnpj_baixa.py` → `dados_cnpj_para_sqlite.py` → `dados_cnpj_cnae_secundaria.py`) que materializam o dump mensal da RFB em um único arquivo SQLite indexado.

## Status do repo (2026-05-14)

| Métrica | Valor |
|---|---|
| Estrelas | 223 |
| Forks | 68 |
| Linguagem | Python (100%) |
| Default branch | `main` |
| Último push | 2026-04-12 |
| Última versão | 0.7 (mar/2026) |
| License | **MIT** (verificada) |
| Issues abertas | 4 |
| Maintainer | rictom (autor único) |
| Risco abandono | Baixo — atualizado em mar/2026 após RFB mudar layout |

## Por que é P0 para Epic 7

1. **Tipologia categoria E (Holding):** sócio PJ + alta razão social com termos imobiliários → grafo holding via `socios.cnpj_cpf_socio` ligando empresas.
2. **Sinais B (Imobiliária):** `estabelecimento.cnae_fiscal == '6822500'` (administração de imóveis) ou `cnae_fiscal_secundaria` contendo 6822500/6831700.
3. **Sinais C (Construtora):** CNAE 4110700 (incorporação) ou 4120400 (construção edifícios).
4. **Sinais D (Adm. Predial):** CNAE 8112500 (serviços de prédios) ou 8121400 (limpeza prédios).
5. **Enriquecimento de contato:** `estabelecimento.correio_eletronico`, `ddd1+telefone1` para anunciantes PJ.
6. **License MIT** permite incorporação direta no container Epic 7.

## Mapa de artefatos nesta pasta

- `01-architecture.md` — diagrama ASCII do pipeline ETL + footprint
- `02-domain-model.md` — schema completo das 8 tabelas + relacionamentos
- `03-data-flow.md` — pipeline RFB ZIP → SQLite (sequência detalhada)
- `04-api-surface.md` — consultas SELECT que o Epic 7 vai executar
- `07-business-rules.md` — regras de classificação tipológica baseadas em CNAE
- `extraction-notes.md` — o que aproveitar / adaptar / descartar
- `provenance.json` — metadata, commit SHA, license

## Decisões para o handoff de Phase 5

- **Não copiar código.** Empacotar o `cnpj.db` resultante e expor via Supabase Foreign Data Wrapper OU views materializadas alimentadas por um job Python rodando em container Docker isolado, conforme BENCH-01.
- **Frequência de update:** mensal (após RFB publicar nova base). Schedule via cron-Supabase chamando container.
- **Disco:** garantir 60 GB para o ciclo de build (25 GB zip + 25 GB descompactado + 30 GB SQLite).
- **Build inicial:** 1-2 h em hardware típico (notebook i7 / M1).
