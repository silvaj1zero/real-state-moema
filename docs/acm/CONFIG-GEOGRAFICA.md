# Config Geográfica — Pipeline ACM/Crawler

**Story:** 9.7 | **Gerado em:** 2026-07-12 | **Agente:** @dev (Sonnet YOLO)

Inventário de todas as constantes geográficas hardcoded do pipeline ACM/crawler,
com fonte, valor e status de convergência entre scripts.

---

## AC1 — Inventário de Constantes

| Constante | Valor | Arquivo:linha | Fonte/Racional | Status |
|-----------|-------|---------------|----------------|--------|
| `RAIO_M` / `RAIO_PADRAO_M` | `1000` m | `methodology.ts:587`, `lib.mjs:33`, `builders 113/132:56,63` | Raio padrão ACM (Material Didático 1.2) | **CONVERGENTE** |
| `MOEMA_BBOX` | `'-46.68,-23.62,-46.63,-23.57'` | `geocoding.ts:11` | Viewbox Mapbox para geocode (SW→NE lng,lat) — Moema + adjacências | **ÚNICO** (só no geocoding.ts) |
| `MOEMA_NEIGHBORHOODS` | 14 termos (ver abaixo) | `apify.ts:434–439` | Filtro pós-scrape de portal por bairro (busca textual, sem acento) | **ÚNICO** (só no apify.ts) |
| `BAIRROS_NO_RAIO` | 8 bairros (Ver abaixo) | `builder-113:124`, `builder-132:120` | Whitelist ViaCEP — nomes de rua repetem city-wide; homônimos fora desta lista são descartados | **CONVERGENTE** (idêntico nos 2 builders) |
| `BAIRRO_NORMALIZADO` | `{'Vila Uberabinha':'Vila Olímpia', 'Indianópolis':'Moema'}` | `builder-113:164`, `builder-132:130` | Aliases ViaCEP → nome de mercado | **CONVERGENTE** (idêntico nos 2 builders) |
| `TETO_PRECO_M2` | `22_000` R$/m² | `builder-113:57`, `builder-132:64` | Piso do Score A (régua Material Didático 1.2) — recorte R4 | **CONVERGENTE** |
| `CONSULTANT` | `1f7ec2b3-d414-4850-8b6a-32faa8e1f47c` | `builder-113:56`, `builder-132:63`, `9.4-sink:56` | UUID do consultor que detém os ITBI PROD | **CONVERGENTE** |
| `GEO alvo 113` | `lat -23.604671, lng -46.675232` | `builder-113:51–53` | Mapbox geocode 2026-07-08 — Rua Dr. Andrade Pertence, 113 | Dataset congelado |
| `GEO alvo 132` | `lat -23.604158, lng -46.676145` | `builder-132:59` | Mapbox geocode 2026-07-09 — Rua Dr. Andrade Pertence, 132 | Dataset congelado |
| `CEP alvo 113/132` | `04549-020` | `builder-113:43`, `builder-132:48` | ViaCEP (logradouro completo — rua de CEP único) | **CONVERGENTE** |
| `GEO alvo Honduras` | Dinâmico | `01-discover.mjs:61–99` | Google Maps / Mapbox via 01-discover.mjs em runtime | Dinâmico |

### BAIRROS_NO_RAIO (whitelist Vila Olímpia — 8 bairros)

Aplicável ao raio de 1 km em torno de Rua Dr. Andrade Pertence 113/132:

- Vila Olímpia
- Vila Uberabinha *(denominação ViaCEP de parte da Vila Olímpia)*
- Moema
- Indianópolis *(denominação ViaCEP de parte de Moema)*
- Vila Nova Conceição
- Cidade Monções
- Itaim Bibi
- Brooklin Novo

### MOEMA_NEIGHBORHOODS (filtro portal — 14 termos, sem acento)

Fonte: `app/src/lib/apify.ts:434–439` (filtro pós-scrape de portal):

```
moema, indianópolis, indianopolis, vila olímpia, vila olimpia,
itaim bibi, vila nova conceição, vila nova conceicao,
planalto paulista, campo belo, brooklin, jardim lusitânia,
jardim lusitania, vila clementino
```

---

## Divergências Identificadas

### D1 — Duas whitelists com propósitos distintos (não é erro)

`BAIRROS_NO_RAIO` (ViaCEP, 8 bairros) ≠ `MOEMA_NEIGHBORHOODS` (portal, 14 termos).
São propósitos diferentes: a whitelist ViaCEP filtra homônimos city-wide por NOME OFICIAL;
a lista de portal faz pré-filtragem ampla de scraping. **Não é divergência — é design correto.**

### D2 — `MOEMA_BBOX` não está em `apify.ts`

O `geocoding.ts` usa viewbox explícito; `apify.ts` usa lista textual de bairros sem viewbox.
O arquivo `apify.ts` está em edição paralela no Épico 7 (founder) — pendente de migração
para `geoConfig.ts` quando o Épico 7 encerrar.

### D3 — Whitelist Honduras é diferente (esperado)

O caso Honduras (Rua Honduras, 629 — Jardim Paulista) usa raio diferente de bairros.
O dataset Honduras está congelado e NÃO importa de `geoConfig.ts`.

---

## Pendências (migração futura)

- `app/src/lib/apify.ts` — `MOEMA_NEIGHBORHOODS` e lógica de `buildSearchInput`/`isInMoemaRegion`:
  migrar para importar de `geoConfig.ts` após encerramento do Épico 7 (edição paralela do founder).
- `app/src/lib/geocoding.ts` — `MOEMA_BBOX`:
  importar de `geoConfig.ts` (trivial, zero risco; pode ser feito na janela pós-Épico 7).

---

## Config Canônica

Fonte única consolidada: `app/src/lib/acm/geoConfig.ts`

Exports disponíveis:
- `RAIO_PADRAO_M` — raio de análise (1.000 m)
- `MOEMA_BBOX` — viewbox Mapbox
- `BAIRROS_NO_RAIO_VILA_OLIMPIA` — whitelist ViaCEP (Set)
- `MOEMA_NEIGHBORHOODS_PORTAL` — lista de portal (Array)
- `BAIRRO_NORMALIZADO` — aliases ViaCEP → mercado
- `normalizaBairro()` — função auxiliar
- `GEO_REFERENCIAS` — coordenadas de referência dos casos
- `CONSULTANT_ID_DEFAULT` — UUID do consultor PROD
- `TETO_PRECO_M2` — teto R4 (22.000 R$/m²)

## Validação contra ITBI PROD — 2026-07-12

**Script:** `app/scripts/acm-audit/9.7-geo-crosscheck.mjs`
**Consultant:** `1f7ec2b3-d414-4850-8b6a-32faa8e1f47c`
**Ponto de referência:** lat=-23.604671, lng=-46.675232 (Andrade Pertence 113)

### Contexto: formato do campo `notas`

O campo `notas` da tabela `acm_comparaveis` armazena a **categoria de ingestão**
no formato `[ITBI] SQL <sql>; Moema e região` — todos os 3.618 registros ITBI
têm exatamente `"Moema e região"` como valor após o ponto-e-vírgula.

Isso confirma que o campo **não** armazena o bairro granular por comparável.
O bairro individual é resolvido pelos builders via **ViaCEP por logradouro**
(cache em `scripts/acm-andrade-pertence/viacep-cache.json`).

### Estatísticas do banco

| Métrica | Valor |
|---------|-------|
| Total ITBI no banco (consultant) | 3618 |
| ITBI is_venda_real no raio 1 km | 891 |
| Logradouros únicos no raio | 54 |
| Cobertos pelo cache ViaCEP | 54 |
| Sem cache (novos logradouros) | 0 |
| Inconclusivos no cache (null) | 10 |

### Distribuição por bairro (logradouros do raio, pós-normalização)

| Bairro | N logradouros | % | Whitelist |
|--------|--------------|---|-----------|
| Vila Olímpia | 20 | 45.5% | ✓ |
| Moema | 18 | 40.9% | ✓ |
| Vila Nova Conceição | 6 | 13.6% | ✓ |

### Divergências

**Bairros resolvidos fora da whitelist:** nenhum ✓

**Bairros da whitelist sem logradouros no raio:** Brooklin Novo, Cidade Monções, Indianópolis, Itaim Bibi, Vila Uberabinha

**Logradouros do raio sem cache ViaCEP:** 0 novos

### Conclusão AC2

Todos os bairros resolvidos via ViaCEP nos logradouros do raio estão cobertos pela whitelist canônica. Cobertura nominal validada.
