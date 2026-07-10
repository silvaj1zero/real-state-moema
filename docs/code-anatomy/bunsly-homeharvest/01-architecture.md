# Architecture — Bunsly/HomeHarvest

## Visão em 1 frase

Biblioteca Python single-process que enfileira chamadas HTTP POST contra a API GraphQL interna do Realtor.com (`https://www.realtor.com/frontdoor/graphql`), parseia o JSON em modelos Pydantic e serializa para DataFrame/raw — paginação paralela via `ThreadPoolExecutor`, retry exponencial via `tenacity`.

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | Python ≥ 3.9 |
| HTTP client | `requests ^2.32.4` |
| Modelos / Validação | `pydantic ^2.11.7` |
| Output tabular | `pandas ^2.3.1` |
| Retry / Backoff | `tenacity ^9.1.2` |
| Build | Poetry |
| Testes | pytest |

## Diagrama do pipeline (ASCII)

```
              ┌────────────────────────────────────────────────────────────────┐
              │  scrape_property(location, listing_type, ...)                  │
              │  homeharvest/__init__.py:13                                    │
              └───────────────────────┬────────────────────────────────────────┘
                                      │ validação + conversão de tipos
                                      ▼
              ┌────────────────────────────────────────────────────────────────┐
              │  ScraperInput (Pydantic BaseModel)                             │
              │  homeharvest/core/scrapers/__init__.py:37                      │
              └───────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
              ┌────────────────────────────────────────────────────────────────┐
              │  RealtorScraper(Scraper)                                       │
              │  homeharvest/core/scrapers/realtor/__init__.py:38              │
              │    SEARCH_GQL_URL = "https://www.realtor.com/frontdoor/graphql"│
              │    NUM_PROPERTY_WORKERS = 20                                   │
              │    DEFAULT_PAGE_SIZE = 200                                     │
              └───────────────────────┬────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────────────────────┐
              │                       │                                       │
              ▼                       ▼                                       ▼
        handle_location()      search() pagina               handle_home(property_id)
        Search_suggestions     GeneralSearch                  GetHomeDetails
        retry x3               (paralelo se parallel=True)    (única chamada)
              │                       │                                       │
              ▼                       ▼                                       ▼
          ┌─────────────────────────────────────────────────────────┐
          │  POST GraphQL                                            │
          │  Headers: DEFAULT_HEADERS (Mozilla UA + rdc-client-name)│
          │  Status 403 → AuthenticationError ou retry              │
          └────────────────────────────┬────────────────────────────┘
                                       │
                                       ▼
          ┌─────────────────────────────────────────────────────────┐
          │  process_property() — processors.py:91                  │
          │     ├─ process_advertisers() → Advertisers              │
          │     ├─ parse_address()                                  │
          │     ├─ parse_description()                              │
          │     ├─ parse_open_houses() / parse_units()              │
          │     ├─ parse_tax_record()                               │
          │     └─ Property(BaseModel) ← TUDO                       │
          └────────────────────────────┬────────────────────────────┘
                                       │
                                       ▼
          ┌─────────────────────────────────────────────────────────┐
          │  Output                                                  │
          │   return_type=pandas    → DataFrame (process_result)     │
          │   return_type=pydantic  → list[Property]                 │
          │   return_type=raw       → list[dict]                     │
          └─────────────────────────────────────────────────────────┘
```

## Camadas lógicas

### 1. Entry point — `homeharvest/__init__.py`
Função `scrape_property(...)` é a única interface pública. Faz:
- Validação dos argumentos (`validate_input`, `validate_dates`, `validate_filters`, ...)
- Conversão de strings → enums (`ListingType`, `SearchPropertyType`)
- Montagem do `ScraperInput`
- Instanciação `RealtorScraper(scraper_input)`
- Chamada `.search()`
- Pós-processamento por `return_type`

### 2. Scraper core — `homeharvest/core/scrapers/`

#### `__init__.py`
- `DEFAULT_HEADERS` — dict com User-Agent Mac Chrome 135 + headers `sec-*` + `x-is-bot: 'false'` (linhas 12-30).
- `ScraperInput` — Pydantic BaseModel com **38 campos** opcionais (listing_type, property_type, filters, sorting, pagination, date ranges).
- `Scraper` (classe abstrata): construtor copia o `ScraperInput` em atributos; `get_access_token()` é estático e faz POST em `graph.realtor.com/auth/token` com payload de mobile (`device_mobile` + UUID device_id).

#### `realtor/__init__.py` (`RealtorScraper`)
- Herda de `Scraper`.
- `_graphql_post(query, variables, operation_name)` — POST único contra `SEARCH_GQL_URL`. Minifica a query (whitespace → single space). Status 403 → `AuthenticationError` se sem proxy, senão re-raise para retry.
- `handle_location()` — usa `SEARCH_SUGGESTIONS_QUERY` para resolver "Dallas, TX" → coordenadas/geo_id. Wrap em `@retry(stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=4))`.
- `handle_home(property_id)` — fetch single home.
- `general_search(variables, search_type)` — query principal de listagens, monta GraphQL string concatenando `date_param`, `property_type_param`, `property_filters`, `sort_param`, `bucket_param`, `status_param`, `pending_or_contingent_param`.
- `search()` — orquestra paginação (até 10k results, page_size 200) usando `ThreadPoolExecutor` com `NUM_PROPERTY_WORKERS = 20`.

#### `realtor/queries.py`
3 strings GraphQL: `GENERAL_RESULTS_QUERY`, `HOMES_DATA`, `SEARCH_SUGGESTIONS_QUERY`. Não analisado em profundidade — estruturadas para apontar todos os campos esperados pelo `process_property()`.

#### `realtor/processors.py`
- `process_advertisers(advertisers: list[dict])` — itera dicts e tipifica por `advertiser["type"]` (`"seller"` ou `"community"`). Esta é **A função-chave de classificação broker/agent/builder** (vide `07-business-rules.md`).
- `process_property(result, mls_only, ...)` — função central que assembla `Property(...)` Pydantic a partir do dict GraphQL.
- `process_extra_property_details(result)` — campos extras (schools, tax_history, assessed_value).
- `get_key(data, keys)` — safe nested dict access.

#### `realtor/parsers.py`
Funções `parse_*` para sub-objetos: `parse_address`, `parse_description`, `parse_open_houses`, `parse_units`, `parse_tax_record`, `parse_current_estimates`, `parse_estimates`, `parse_neighborhoods`, `calculate_days_on_mls`, `process_alt_photos`.

### 3. Domain models — `homeharvest/core/scrapers/models.py`
Enums (`SiteName`, `ListingType`, `PropertyType`, `SearchPropertyType`, `ReturnType`) + Pydantic BaseModels (`Property`, `Address`, `Description`, `Agent`, `Broker`, `Builder`, `Office`, `Advertisers`, `HomeFlags`, `OpenHouse`, `Unit`, etc.). 200+ linhas, ~30 entidades.

### 4. Utils — `homeharvest/utils.py`
- `ordered_properties` — lista de **63 colunas** na ordem canônica para o DataFrame de saída.
- `process_result(prop: Property) → DataFrame` — flatten do Pydantic para colunas tabulares.
- Validadores: `validate_input`, `validate_dates`, `validate_filters`, `validate_sort`, `validate_limit`, `validate_offset`, `validate_last_update_filters`.
- Helpers: `convert_to_datetime_string`, `extract_timedelta_hours`, `extract_timedelta_days`, `detect_precision_and_convert`.

### 5. Exceptions — `homeharvest/exceptions.py`
`AuthenticationError`, `InvalidListingType`, `InvalidDate`.

## Footprint operacional

| Recurso | Notas |
|---|---|
| **Concorrência** | `ThreadPoolExecutor` com 20 workers. Sem async/await — `requests` síncrono em threads. |
| **Rate limiting** | Implícito via `tenacity` (3 tentativas, exponential backoff 1-4s). Sem rate limit explícito. |
| **Proxy** | Opcional via `proxy: str` no input — formato `http://user:pass@host:port`, passado como `proxies={"http": ..., "https": ...}`. |
| **State** | Stateless por chamada. Não há cache local nem persistência. |
| **Memory** | Limite hard-coded: `limit=10000` (Realtor API cap). Total in-memory antes do flatten. |
| **Timeout** | Sem timeout HTTP explícito — usa default do `requests` (sem). **RISCO**. |
| **Testes** | `tests/test_realtor.py` único — testes E2E que dependem de live API. |

## Anti-bot strategy (observada)

| Camada | Mecanismo |
|---|---|
| Headers realistas | UA Mac Chrome 135 + sec-ch-ua hints + `Origin: realtor.com` + `Referer: realtor.com/` |
| `x-is-bot: 'false'` | Header explícito alegando humano (irônico — pattern comum). |
| Endpoint mobile alternativo | `graph.realtor.com/auth/token` aceita `grant_type=device_mobile` com UUID device → bypass do flow web. |
| Retry 3x exponential | Cobre 403/429 transientes. |
| Proxy passthrough | Sem rotation embutido — usuário fornece. |

## Pontos fracos / Risk surface

- **Single point of failure:** se Realtor.com mudar o schema GraphQL, **todos** os campos do `process_property()` quebram silenciosamente (cada campo é `dict.get()`, retorna `None`).
- **Sem timeout explícito** — uma chamada pode travar indefinidamente.
- **20 workers fixos** — não há throttle dinâmico baseado em rate-limit do servidor.
- **Token mobile pode ser revogado** — `get_access_token()` está implementado mas **não chamado** no path principal (DEFAULT_HEADERS suficiente atualmente).
- **`extra_property_data` temporariamente desabilitado** (`scrapers/__init__.py:103` — `self.extra_property_data = False  # TODO: temporarily disabled`) — indica que o feature de detalhes extras quebrou recentemente, autores ainda não consertaram.
