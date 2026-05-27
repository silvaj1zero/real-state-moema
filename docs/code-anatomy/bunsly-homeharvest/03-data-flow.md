# Data Flow — Bunsly/HomeHarvest

## Sequência completa: chamada `scrape_property(location, listing_type)` → DataFrame

```
═══════════════════════════════════════════════════════════════════════════════
PHASE 1 — Input validation (homeharvest/__init__.py:71-86)
═══════════════════════════════════════════════════════════════════════════════
  • validate_input(listing_type)
  • validate_limit(limit)             # < 10000
  • validate_offset(offset, limit)    # offset+limit < 10000
  • validate_filters(beds_min, ..., year_built_max)
  • validate_sort(sort_by, sort_direction)
  • validate_last_update_filters(updated_since, updated_in_past_hours)
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 2 — Type conversion (homeharvest/__init__.py:88-106)
═══════════════════════════════════════════════════════════════════════════════
  • listing_type string/list → ListingType enums
  • date_from/date_to strings → datetime via detect_precision_and_convert()
                                  │ (retorna tupla (str_iso, "day"|"hour"))
  • past_days / past_hours timedelta → int
  • property_type strings → SearchPropertyType enums
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 3 — Sort defaults (__init__.py:108-126)
═══════════════════════════════════════════════════════════════════════════════
  IF (updated_since OR updated_in_past_hours) AND NOT sort_by:
     sort_by = "last_update_date", sort_direction = "desc"
  ELIF listing_type=PENDING AND date_filter AND NOT sort_by:
     sort_by = "pending_date",     sort_direction = "desc"
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 4 — ScraperInput construction (__init__.py:128-170)
═══════════════════════════════════════════════════════════════════════════════
  ScraperInput(BaseModel) com 38 atributos opcionais
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 5 — RealtorScraper instantiation
                            (homeharvest/__init__.py:174)
═══════════════════════════════════════════════════════════════════════════════
  scraper = RealtorScraper(scraper_input)
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 6 — Location resolution (realtor/__init__.py:95-145)
═══════════════════════════════════════════════════════════════════════════════
  scraper.handle_location()                  # decorada com @retry(stop_after_attempt(3))

    POST realtor.com/frontdoor/graphql
      operationName: "Search_suggestions"
      variables:    {searchInput: {search_term: location}}

    Resposta esperada:
      data.search_suggestions.geo_results[0].geo:
        - area_type: "city" | "address" | "postal_code" | ...
        - city, state_code, postal_code, county, centroid
        - mpr_id (se area_type == "address")
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 7 — Single-property OR Search dispatch
═══════════════════════════════════════════════════════════════════════════════
  IF area_type == "address":
     scraper.handle_home(mpr_id)            # 1 GraphQL call → Property
  ELSE:
     scraper.search()                        # paginação geral
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 8 — Search pagination (search() em realtor/__init__.py)
═══════════════════════════════════════════════════════════════════════════════

  • Page 1: scraper.general_search(variables, search_type)
       ↓
       monta GraphQL string concatenando:
         status_param        : "status: for_sale" ou lista
         date_param          : "list_date: { min: '...', max: '...' }"
         property_type_param : "type: [...]"
         property_filters    : beds/baths/sqft/price/lot_sqft/year_built
         sort_param          : "sort: [{ field: list_price, direction: asc }]"
         pending_or_contingent_param : "or_filters: { contingent: true, pending: true }"
         bucket_param        : 'bucket: { sort: "fractal_v1.1.3_fr" }'  (default)
         is_foreclosure      : "foreclosure: true"
       ↓
       _graphql_post(query, vars, "GeneralSearch")
       ↓
       resp.data.home_search:
         - count, total
         - results: list[dict]   (até 200 por page)
       ↓
  • Detecta total_count
  • IF parallel=True:
       ThreadPoolExecutor(max_workers=NUM_PROPERTY_WORKERS=20)
         para offset = 200, 400, 600, ..., total OR 10000
       cada thread:    scraper.general_search(variables, search_type) com offset

  • IF parallel=False:
       loop sequencial com early termination:
         após cada página, inspeciona último resultado vs date filter
         se já passou da janela temporal → break
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 9 — process_property() por resultado (processors.py:91-189)
═══════════════════════════════════════════════════════════════════════════════
  Para cada dict da response:
  1. result["source"].get("id") → mls
  2. IF not mls AND mls_only → skip
  3. is_pending = result["flags"]["is_pending"]
     is_contingent = result["flags"]["is_contingent"]
  4. IF (is_pending OR is_contingent) AND exclude_pending → skip
  5. advertisers = process_advertisers(result.get("advertisers"))
       ┌──────────────────────────────────────────────────┐
       │ For cada item in advertisers list (do GraphQL):  │
       │  IF advertiser_type == "seller":                 │
       │     processed.agent = Agent(...)                 │
       │     IF advertiser["broker"]["name"]:             │
       │        processed.broker = Broker(...)            │
       │     IF advertiser["office"]:                     │
       │        processed.office = Office(...)            │
       │  IF advertiser_type == "community":              │
       │     IF advertiser["builder"]:                    │
       │        processed.builder = Builder(...)          │
       └──────────────────────────────────────────────────┘
  6. parse_address(result, search_type="general_search") → Address
  7. parse_description(result) → Description
  8. parse_neighborhoods(result) → str
  9. calculate_days_on_mls(result) → int
  10. parse_open_houses, parse_units, parse_tax_record, parse_current_estimates,
      parse_estimates
  11. Property(...) Pydantic — instância completa
  12. Date precision enhancement (processors.py:170-188):
      IF last_status_change_date AND status in (PENDING, CONTINGENT, SOLD):
         IF dates have same date() → swap pending_date/last_sold_date
         pela last_status_change_date (que tem hora).
                                  │
                                  ▼
═══════════════════════════════════════════════════════════════════════════════
PHASE 10 — Output formatting (homeharvest/__init__.py:179-188)
═══════════════════════════════════════════════════════════════════════════════
  IF return_type == ReturnType.raw:
     return list[dict]  (raw GraphQL results)
  ELIF return_type == ReturnType.pydantic:
     return list[Property]
  ELIF return_type == ReturnType.pandas:
     dfs = [process_result(prop) for prop in properties]
     return pd.concat(dfs)  # 63 colunas (ordered_properties)
```

## Trecho-chave da pagination paralela

```python
# realtor/__init__.py (search method, conceitual)
with ThreadPoolExecutor(max_workers=self.NUM_PROPERTY_WORKERS) as executor:
    futures = [
        executor.submit(self.general_search, variables, search_type)
        for offset in range(self.DEFAULT_PAGE_SIZE, total, self.DEFAULT_PAGE_SIZE)
    ]
    for future in as_completed(futures):
        page_results = future.result()
        all_properties.extend(page_results["properties"])
```

## Padrões transferíveis para Epic 7 / Crawlee

### 1. **Pagination + Limit Cap**
```typescript
// packages/scrapers/zap-scraper.ts (esboço Epic 7)
const PAGE_SIZE = 50;  // ZAP page size típico
const MAX_RESULTS = 10000;  // mesmo cap

const fetchAllPages = async (totalCount: number) => {
  const offsets = range(PAGE_SIZE, Math.min(totalCount, MAX_RESULTS), PAGE_SIZE);

  // Crawlee equivalent: enqueueLinks() c/ depth-limit
  await crawler.run(offsets.map(o => ({ url: buildPageUrl(o), label: 'detail' })));
};
```

### 2. **Retry exponencial**
Crawlee tem nativamente. Configuração equivalente ao HomeHarvest:
```typescript
new PlaywrightCrawler({
  maxRequestRetries: 3,
  // exponential by default
});
```

### 3. **Detect & skip pending/contingent**
Skip-pending pattern (HomeHarvest `processors.py:114-115`):
```typescript
// Epic 7 equivalent
if ((prop.is_em_negociacao || prop.is_contingent) && excludePending) {
  return null;  // skip
}
```

### 4. **Date precision enhancement**
HomeHarvest pega `last_status_change_date` (com hora) e substitui em campos só-dia. **Mesma técnica útil para BR** — portais BR às vezes dão "publicado há X dias" (dia) e "última atualização" com hora.

### 5. **Pré-emptive early termination**
Quando `parallel=False`, o scraper para a paginação tão logo o `last_result.date < min_filter_date`. Crawlee equivalent: `requestHandler` retorna `crawler.stop()` quando heurística falha.

## Pitfalls observados que NÃO portar

- **`get_access_token()` não usado no path principal** (`scrapers/__init__.py:154`) — mas está lá. Em Epic 7, evite código morto.
- **`extra_property_data = False` hard-coded** (`scrapers/__init__.py:103`) — feature flag desabilitado sem documentar a regressão. Em Epic 7, manter feature flags em config.
- **No timeout em `requests.post`** — uma chamada lenta trava o thread pool. Sempre setar `timeout=30` (ou config) nas chamadas HTTP.
- **Pagination cap implícito 10k** — sem warning ao usuário se total > 10k. Em Epic 7, **log + telemetria** quando hit cap.
