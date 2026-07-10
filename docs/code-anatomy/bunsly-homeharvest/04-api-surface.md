# API Surface — Bunsly/HomeHarvest

## Função pública única: `scrape_property()`

**Localização:** `homeharvest/__init__.py:13`

```python
def scrape_property(
    location: str,
    listing_type: str | list[str] | None = None,
    return_type: str = "pandas",
    property_type: Optional[List[str]] = None,
    radius: float = None,
    mls_only: bool = False,
    past_days: int | timedelta = None,
    proxy: str = None,
    date_from: datetime | date | str = None,
    date_to: datetime | date | str = None,
    foreclosure: bool = None,
    extra_property_data: bool = True,
    exclude_pending: bool = False,
    limit: int = 10000,
    offset: int = 0,
    past_hours: int | timedelta = None,
    updated_since: datetime | str = None,
    updated_in_past_hours: int | timedelta = None,
    beds_min: int = None, beds_max: int = None,
    baths_min: float = None, baths_max: float = None,
    sqft_min: int = None, sqft_max: int = None,
    price_min: int = None, price_max: int = None,
    lot_sqft_min: int = None, lot_sqft_max: int = None,
    year_built_min: int = None, year_built_max: int = None,
    sort_by: str = None,
    sort_direction: str = "desc",
    parallel: bool = True,
) -> Union[pd.DataFrame, list[dict], list[Property]]:
```

## Parâmetros — síntese rápida

| Categoria | Parâmetros |
|---|---|
| **Identificação** | `location` (zip/cidade/endereço/condado/state), `radius` |
| **Status** | `listing_type` (1 ou lista), `exclude_pending` |
| **Tipos de imóvel** | `property_type` (lista de SearchPropertyType) |
| **Filtros temporais** | `past_days`, `past_hours`, `date_from`, `date_to`, `updated_since`, `updated_in_past_hours` |
| **Filtros físicos** | `beds_min/max`, `baths_min/max`, `sqft_min/max`, `lot_sqft_min/max`, `year_built_min/max` |
| **Filtros financeiros** | `price_min/max` |
| **Casos especiais** | `foreclosure`, `mls_only`, `extra_property_data` |
| **Pagination/Sort** | `limit`, `offset`, `sort_by`, `sort_direction`, `parallel` |
| **Output** | `return_type` (pandas/pydantic/raw) |
| **Network** | `proxy` |

## Exemplos minimal (extraídos do README)

### Caso simples — SOLD nos últimos 30 dias
```python
from homeharvest import scrape_property

properties = scrape_property(
    location="San Diego, CA",
    listing_type="sold",
    past_days=30
)
properties.to_csv("results.csv", index=False)
```

### Múltiplos status
```python
properties = scrape_property(
    location="Miami, FL",
    listing_type=["for_sale", "pending"],
    sort_by="list_price",
    sort_direction="asc",
    limit=100
)
```

### Filtros físicos
```python
properties = scrape_property(
    location="San Francisco, CA",
    listing_type="for_sale",
    beds_min=3, beds_max=5,
    baths_min=2.0,
    sqft_min=1500, sqft_max=3000,
    price_min=300000, price_max=800000,
    year_built_min=2000,
)
```

### Filtragem em janelas curtas com early termination
```python
properties = scrape_property(
    location="Los Angeles, CA",
    listing_type="for_sale",
    updated_in_past_hours=2,
    parallel=False   # ← economiza threads em janelas estreitas
)
```

### Retorno Pydantic (recomendado para pipelines)
```python
props = scrape_property(
    location="San Diego, CA",
    listing_type="for_sale",
    return_type="pydantic"
)
for p in props[:5]:
    print(p.address.formatted_address, p.list_price, p.advertisers.broker.name)
```

## Output schema — DataFrame (63 colunas em ordem fixa)

Sequência conforme `homeharvest/utils.py:9-67` (`ordered_properties`):

```
property_url, property_id, listing_id, permalink, mls, mls_id, status,
mls_status, text, style, formatted_address, full_street_line, street, unit,
city, state, zip_code,
beds, full_baths, half_baths, sqft, year_built, days_on_mls,
list_price, list_price_min, list_price_max,
list_date, pending_date, sold_price, last_sold_date, last_sold_price,
last_status_change_date, last_update_date,
assessed_value, estimated_value, tax, tax_history,
new_construction, lot_sqft, price_per_sqft,
latitude, longitude, neighborhoods, county, fips_code,
stories, hoa_fee, parking_garage,
agent_id, agent_name, agent_email, agent_phones, agent_mls_set, agent_nrds_id,
broker_id, broker_name,
builder_id, builder_name,
office_id, office_mls_set, office_name, office_email, office_phones,
nearby_schools,
primary_photo, alt_photos
```

> Observação: os campos `agent_*`, `broker_*`, `builder_*`, `office_*` são **flattened do nested `Advertisers`** (linhas 78-105 de `utils.py`). Esse é o pattern útil para Epic 7 — manter o objeto aninhado nos Pydantic models, mas serializar plano para CSV/Supabase.

## Tipos de retorno

| `return_type` | Output |
|---|---|
| `"pandas"` (default) | `pd.DataFrame` 63 colunas (`utils.process_result`) |
| `"pydantic"` | `list[Property]` — modelos Pydantic completos (com nested address, description, advertisers, flags) |
| `"raw"` | `list[dict]` — JSON cru do GraphQL Realtor |

## Subsistemas chamados (composição interna)

| Função | Linha | Papel |
|---|---|---|
| `validate_input()` | `utils.py:147` | listing_type ∈ ListingType |
| `validate_limit()` | `utils.py:` | limit ≤ 10000 |
| `validate_offset()` | `utils.py:` | offset+limit ≤ 10000 |
| `validate_filters()` | `utils.py:` | min/max coerência |
| `validate_sort()` | `utils.py:` | sort_by ∈ allowed, direction ∈ asc/desc |
| `validate_dates()` | `utils.py:158` | ISO format, date_to > date_from |
| `validate_last_update_filters()` | `utils.py:` | updated_since/hours coerência |
| `detect_precision_and_convert()` | `utils.py:` | "2025-01-20" → ("2025-01-20", "day"); "2025-01-20T09:00:00" → ("2025-01-20T09:00:00+00:00", "hour") |
| `extract_timedelta_hours()` | `utils.py:` | int OR timedelta → int hours |
| `extract_timedelta_days()` | `utils.py:` | int OR timedelta → int days |
| `convert_to_datetime_string()` | `utils.py:` | datetime/str → ISO string |

## Constantes operacionais críticas

| Constante | Local | Valor | Significado |
|---|---|---|---|
| `SEARCH_GQL_URL` | `realtor/__init__.py:39` | `https://www.realtor.com/frontdoor/graphql` | Endpoint único |
| `NUM_PROPERTY_WORKERS` | `realtor/__init__.py:40` | 20 | Threads do pool paralelo |
| `DEFAULT_PAGE_SIZE` | `realtor/__init__.py:41` | 200 | Results por página GraphQL |
| Limite total | parâmetro `limit` | 10000 | Hard cap da API Realtor |
| Retry attempts | `realtor/__init__.py:88-92` | 3 | `tenacity.stop_after_attempt(3)` |
| Backoff exponential | `realtor/__init__.py:90` | `min=1, max=4` | em segundos |

## Surface NÃO-pública (interna)

Tudo dentro de `homeharvest/core/scrapers/` é **considerado privado** — `__init__.py` raiz só re-exporta `scrape_property`, `ListingType` enum e `Property` model. Usuário consumidor não deveria importar `RealtorScraper` diretamente, embora não haja `__all__` declarado para proteger.

## Auth flow (legacy / fallback)

```python
# realtor/__init__.py:154 — método estático no Scraper base
@staticmethod
def get_access_token():
    device_id = str(uuid.uuid4()).upper()
    response = requests.post(
        "https://graph.realtor.com/auth/token",
        headers={
            "X-Client-ID": "rdc_mobile_native,iphone",
            "X-Visitor-ID": device_id,
            "X-Client-Version": "24.21.23.679885",
            "User-Agent": "Realtor.com/24.21.23.679885 CFNetwork/1494.0.7 Darwin/23.4.0",
        },
        data=json.dumps({
            "grant_type": "device_mobile",
            "device_id": device_id,
            "client_app_id": "rdc_mobile_native,24.21.23.679885,iphone",
        }),
    )
    if not (access_token := response.json().get("access_token")):
        raise AuthenticationError(...)
    return access_token
```

> **NÃO está sendo usado** na versão 0.8.18 — `DEFAULT_HEADERS` (web user-agent) é suficiente atualmente. Mantido como fallback para quando Realtor.com endurecer o anti-bot. **Pattern muito útil para Epic 7** se algum portal BR expor endpoint mobile mais permissivo.

## Reusabilidade resumida para Epic 7

| Componente HomeHarvest | Decisão Epic 7 |
|---|---|
| `scrape_property()` API | **Padrão de superfície única** com kwargs para portal scraper |
| 38 parâmetros de filtros | **Re-aproveitar todos** os filtros físicos/temporais/financeiros |
| 63 colunas ordenadas | **Adotar** modelo de schema canônico (Zod) com ordem explícita |
| `validate_*` helpers | **Replicar** — Zod tem `.refine()` para coerências cross-field |
| `detect_precision_and_convert` | **Útil** — janelas de hora vs dia ajudam pagination cap |
| `ReturnType` (3 formas) | **Adotar** — JSON raw + Zod parsed + tabular (DuckDB?) |
| Token mobile fallback | **Estudar** — pode haver endpoint mobile menos defendido em Zap/OLX |
