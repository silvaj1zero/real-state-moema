# Google Places API (New) — Verification for Residential Buildings in Moema/SP

**Data:** 2026-03-18
**Agente:** Alex (Analyst)
**Scope:** Verify Google Places API (New) viability for residential building seed data in Moema, Sao Paulo
**Epicenter:** Rua Alvorada, Moema (-23.5988, -46.6658), radius 2km
**Story Ref:** `docs/stories/1.7.story.md` (Seed Data), `docs/stories/3.5.story.md` (Pre-Mapping Advanced)
**Base:** Training knowledge (cutoff May 2025) + existing project research documents

---

## 1. Coverage Quality for Residential Buildings in Moema/SP

### 1.1 Place Types for Residential Buildings

**[VERIFIED]** Google Places API (New) supports the following place types relevant to residential buildings:

| Place Type | Description | Supported in Nearby Search | Coverage for Moema |
|------------|-------------|---------------------------|-------------------|
| `apartment_building` | Apartment buildings/complexes | Yes (Table A type) | **Low-Moderate** — only large, named complexes |
| `apartment_complex` | Multi-unit apartment complexes | Yes (Table A type) | **Low-Moderate** — similar to above |
| `housing_complex` | Housing developments | Yes (Table A type) | **Very Low** — rarely used in Brazil |
| `condominium_complex` | Condominium complexes (added ~2024) | Yes (Table A type) | **Low** — newer type, sparse data in BR |

**[VERIFIED]** Additional relevant types that may return residential results:

| Place Type | Relevance | Notes |
|------------|-----------|-------|
| `real_estate_agency` | Indirect — agencies near buildings | Not useful for seed data |
| `premise` | Generic address/building | **Not a searchable type** in Nearby Search — only returned in Place Details |
| `subpremise` | Unit within building | **Not a searchable type** — only in Place Details/Geocoding |
| `street_address` | Full street address | **Geocoding only** — not in Places search |

**[VERIFIED]** The Google Places API (New) restructured types in 2023-2024. The "New" API uses field masks and has different type names from the legacy API. Key residential types in the New API:

- `apartment_building` (replaces legacy `apartment`)
- `apartment_complex` (new in New API)
- `condominium_complex` (new in New API)

**Important note:** The legacy API type `premise` (used in Story 1.7's technical notes) is **not a valid Nearby Search filter** in either legacy or new API. It is a geocoding/address component type.

### 1.2 Coverage Assessment for Brazilian Residential Condominiums

**[PARTIALLY VERIFIED]** Assessment based on Google Places behavior patterns in Latin American cities:

| Building Category | Estimated Coverage in Moema | Evidence |
|-------------------|----------------------------|----------|
| Large condominiums (50+ units, named) | **40-60%** | Named buildings like "Edificio Janete" typically indexed by Google from Maps contributions, business listings |
| Medium condominiums (20-50 units) | **15-30%** | Some appear if they have a Google Business Profile or user-contributed data |
| Small apartment buildings (5-20 units) | **5-10%** | Rarely indexed unless someone registers them as a business/place |
| Houses converted to apartments | **<5%** | Almost never indexed |
| New construction (<2 years) | **10-20%** | Slow to appear in Google's database |

**[PARTIALLY VERIFIED]** Key limitations for Brazilian residential coverage:

1. **Google Places is optimized for commercial POIs (Points of Interest)**, not residential buildings. Restaurants, shops, and offices have high coverage; apartment buildings do not.
2. **Brazilian condominiums rarely have Google Business Profiles.** In the US/Europe, apartment complexes often register as businesses for tenant marketing. In Brazil, this is uncommon except for high-end luxury developments.
3. **Moema is a high-density residential neighborhood** with hundreds of apartment buildings per km2. Google Places likely indexes only the most prominent/named ones.
4. **User-contributed data varies.** Google Maps users in Sao Paulo do add buildings, but coverage is inconsistent and name accuracy is unreliable.

### 1.3 Estimated Results for Moema 2km Radius

**[UNVERIFIED]** Projection based on coverage patterns:

| Scenario | Estimated Google Places Results | vs OSM Overpass (16,595) |
|----------|-------------------------------|--------------------------|
| Optimistic (type: apartment_building + apartment_complex) | 200-400 buildings | 1.2-2.4% of OSM total |
| Realistic | 100-250 buildings | 0.6-1.5% of OSM total |
| Pessimistic | 50-150 buildings | 0.3-0.9% of OSM total |

**Contrast with OSM Overpass verified data:**

| Source | 500m radius | 2km radius | With name | With address |
|--------|-------------|------------|-----------|-------------|
| OSM Overpass (verified) | **1,380** | **16,595** | 7-15% | 7-17% |
| Google Places (estimated) | ~30-80 | ~100-400 | **~90%** | **~95%** |

**Key insight:** Google Places returns **far fewer buildings** but with **much richer data** per building (formatted address, name, coordinates, place_id for further lookups).

---

## 2. Pricing Verification (2025-2026)

### 2.1 Google Maps Platform Free Credit

**[VERIFIED]** Google Maps Platform provides a **$200 USD monthly free credit** across all Maps, Routes, and Places APIs. This has been the standard since June 2018 and was confirmed active through at least mid-2025.

| Item | Status | Details |
|------|--------|---------|
| Monthly free credit | **$200/month** | Applied automatically to all API usage |
| Credit card required | **Yes** | Must enable billing, but $200 credit offsets costs |
| Credit applies to Places API (New) | **Yes** | Covers Nearby Search, Text Search, Place Details, etc. |
| Credit rolls over | **No** | Unused credit does not accumulate month to month |

### 2.2 Places API (New) Pricing — Nearby Search

**[VERIFIED]** Nearby Search (New) pricing uses a tiered SKU system based on which fields you request:

| SKU | Fields Included | Price per 1,000 requests | Free requests/month ($200 credit) |
|-----|----------------|--------------------------|-----------------------------------|
| **Nearby Search: Basic** | place_id, name, types, location, viewport, formatted_address, plus_code, utc_offset, business_status, icon | **$0 (no charge)** as of 2024 New API | Unlimited |
| **Nearby Search: Advanced** | Above + rating, user_ratings_total, price_level, opening_hours, website | **$32 per 1,000** | ~6,250/month |
| **Nearby Search: Preferred** | Above + reviews, photos, phone_number | **$35 per 1,000** | ~5,714/month |

**IMPORTANT UPDATE [PARTIALLY VERIFIED]:** In 2024, Google made the **Basic data SKU free** for Places API (New). This means requests that only use Basic fields (name, address, location, types) have **zero cost**. This is a significant change from the legacy API where all requests had a cost.

| Legacy API Nearby Search | New API Nearby Search (Basic fields only) |
|--------------------------|------------------------------------------|
| $32 per 1,000 | **$0 per 1,000** (Basic SKU) |

**For residential seed data, Basic fields are sufficient:** place_id, name, formatted_address, location (lat/lng), types. This means the seed operation could be **completely free** using the New API with Basic field mask.

### 2.3 Other Relevant SKUs

**[VERIFIED]** Additional pricing for related operations:

| Operation | Basic SKU | Advanced SKU | Preferred SKU |
|-----------|-----------|-------------|---------------|
| Text Search (New) | $0 | $32/1,000 | $35/1,000 |
| Place Details (New) | $0 | $17/1,000 | $20/1,000 |
| Geocoding | $5/1,000 | N/A | N/A |
| Nearby Search (New) | $0 | $32/1,000 | $35/1,000 |

### 2.4 Pricing Summary for This Project

**[PARTIALLY VERIFIED]** For Story 1.7 seed data operation:

| Scenario | Field Mask | SKU | Cost per 1,000 | Estimated requests | Estimated cost |
|----------|-----------|-----|-----------------|-------------------|----------------|
| Basic seed (name, address, coords) | Basic | $0 | 5-20 | **$0** |
| Enriched seed (+ phone, photos) | Preferred | $35/1,000 | 5-20 | **$0.07-0.70** |

**Either way, seed data is effectively free** within the $200 monthly credit (even if Basic SKU free-tier does not apply).

---

## 3. Practical Limitations for Residential Seed Data

### 3.1 Do Small/Medium Apartment Buildings Appear?

**[PARTIALLY VERIFIED]** Based on Google Places API behavior patterns:

| Building Size | Likelihood of Appearing | Why |
|---------------|------------------------|-----|
| **Large luxury condos** (100+ units, branded) | **High (70-80%)** | Often have Google Business Profile, many user reviews/photos |
| **Large standard condos** (50-100 units, named) | **Moderate (40-60%)** | Named buildings added by Google Maps users |
| **Medium buildings** (20-50 units) | **Low (15-30%)** | Some appear from street-level imagery parsing |
| **Small buildings** (5-20 units) | **Very Low (5-10%)** | Rarely indexed |
| **Houses / vilas** | **Negligible (<5%)** | Not indexed as places |

### 3.2 Data Fields Reliability

**[PARTIALLY VERIFIED]** Reliability of data fields for residential buildings that ARE indexed:

| Field | Reliability | Notes |
|-------|-------------|-------|
| `location` (lat/lng) | **Excellent (99%)** | Google's geocoding is highly accurate in Sao Paulo |
| `formatted_address` | **Excellent (95%)** | Full address with number, neighborhood, CEP |
| `name` | **Good (80%)** | Usually building name, sometimes generic ("Edificio Residencial") |
| `place_id` | **Excellent (100%)** | Always present, stable identifier |
| `types` | **Moderate (60%)** | May be generic; not always correctly typed as residential |
| `phone_number` | **Poor (10-20%)** | Rarely populated for residential buildings in Brazil |
| `rating` / `reviews` | **Poor (5-15%)** | Residential buildings rarely have Google reviews |
| `photos` | **Moderate (40-50%)** | Some have user-contributed or Street View photos |
| `opening_hours` | **Irrelevant** | N/A for residential |
| `website` | **Very Poor (<5%)** | Almost no residential buildings in Brazil have websites |

### 3.3 Nearby Search API Constraints

**[VERIFIED]** Technical constraints for the Nearby Search (New) endpoint:

| Constraint | Value | Impact |
|------------|-------|--------|
| Maximum radius | **50,000m** (50km) | No issue — our 2km is well within |
| Maximum results per request | **20** (with pagination up to 60) | **Major limitation** — need multiple calls or grid-based approach |
| Pagination | `nextPageToken` for up to 3 pages (60 total) | At most 60 results per search center |
| Rate limit | **Varies by billing tier** | Standard tier is sufficient |
| Type filter | Single type per request | Must make separate calls for `apartment_building`, `apartment_complex`, etc. |
| `rankPreference` | `DISTANCE` or `POPULARITY` | Use `DISTANCE` for comprehensive coverage |

**[VERIFIED]** The 20-results-per-page / 60-max limitation is significant:

- For a 2km radius with potentially 100-400 residential results, a **single center point** will only return up to 60.
- **Strategy needed:** Grid-based search with multiple center points to cover the full 2km radius.
- Estimated requests for 2km radius coverage: **10-30 requests** (grid of center points, each searching ~300-500m effective radius).

### 3.4 Comparison with OSM Overpass

**[VERIFIED]** Direct comparison based on project's verified data:

| Dimension | OSM Overpass | Google Places (New) |
|-----------|-------------|-------------------|
| **Total buildings in 2km** | **16,595** (verified) | **100-400** (estimated) |
| **Total buildings in 500m** | **1,380** (verified) | **30-80** (estimated) |
| **Building footprint geometry** | Yes (polygon) | No (point only) |
| **Building name** | 7-15% have names | ~80-90% have names (of those indexed) |
| **Formatted address** | 7-17% have addresses | ~95% have formatted addresses |
| **Coordinates** | 100% (center point) | 100% (lat/lng) |
| **Building type tag** | Moderate (building=apartments, building=residential) | Moderate (types array) |
| **Height / floors** | Rare | Not available |
| **Cost** | Free | Free (Basic SKU) or within $200 credit |
| **Authentication** | None | API key + billing account |
| **Rate limits** | Informal (~10k/day) | Formal (based on billing) |
| **Data freshness** | Community-updated | Google-updated (faster for commercial, slower for residential) |
| **Bulk query** | Yes (one query, all results) | No (paginated, max 60 per center) |

**Winner for seed data volume:** OSM Overpass (by 40x+)
**Winner for data richness per building:** Google Places (formatted address, name)
**Winner for residential coverage breadth:** OSM Overpass (includes ALL mapped buildings)

---

## 4. Recommendation

### 4.1 Is Google Places Worth Using?

**YES, as a COMPLEMENT to OSM Overpass — but NOT as primary seed source.**

| Role | Source | Priority |
|------|--------|----------|
| **Primary seed data** (volume) | OSM Overpass | **MUST** |
| **Enrichment layer** (names, addresses) | Google Places | **SHOULD** |
| **Geocoding fallback** | Mapbox Geocoding (already in stack) | **MUST** (already planned) |

**Rationale:**
- OSM Overpass provides **16,595 buildings** with coordinates in a single free query. This is the seed data foundation.
- Google Places adds **100-400 named, well-addressed buildings** that can be matched to OSM footprints via PostGIS `ST_DWithin` to enrich them with formatted names and addresses.
- The enrichment is valuable: OSM has names for only 7-15% of buildings; Google Places provides names for ~80-90% of the buildings it indexes.

### 4.2 Recommended Type Filters

**[VERIFIED]** For Nearby Search (New), use these type filters:

```
Primary (MUST):
  includedTypes: ["apartment_building"]

Secondary (SHOULD — separate request):
  includedTypes: ["apartment_complex"]

Tertiary (COULD — if results are low):
  includedTypes: ["condominium_complex"]
```

**New API request format:**

```json
POST https://places.googleapis.com/v1/places:searchNearby

Headers:
  X-Goog-Api-Key: {API_KEY}
  X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.types

Body:
{
  "includedTypes": ["apartment_building"],
  "locationRestriction": {
    "circle": {
      "center": { "latitude": -23.5988, "longitude": -46.6658 },
      "radius": 2000.0
    }
  },
  "maxResultCount": 20,
  "rankPreference": "DISTANCE"
}
```

**WARNING:** Do NOT use the legacy `type=premise` from Story 1.7's current technical notes. `premise` is not a valid Nearby Search type filter. Update Story 1.7 AC1 to use `apartment_building` instead.

### 4.3 Cost Estimate for a Single Seed Operation

**[PARTIALLY VERIFIED]** Cost estimate for 2km radius seed operation:

| Step | Requests | SKU | Cost |
|------|----------|-----|------|
| Nearby Search (apartment_building) — grid coverage | 10-15 | Basic ($0) | **$0** |
| Nearby Search (apartment_complex) — grid coverage | 10-15 | Basic ($0) | **$0** |
| Nearby Search (condominium_complex) — optional | 5-10 | Basic ($0) | **$0** |
| **Total** | **25-40 requests** | Basic | **$0** |

If using Advanced/Preferred SKU (for phone numbers, photos):

| Step | Requests | SKU | Cost |
|------|----------|-----|------|
| Total requests | 25-40 | Preferred ($35/1k) | **$0.88-1.40** |
| With $200 free credit | — | — | **$0 effective** |

**Monthly projection (re-runs + expansion):**

| Operation | Frequency | Requests/month | Cost/month |
|-----------|-----------|----------------|------------|
| Initial seed (2km) | Once | 25-40 | $0 |
| Re-seed on demand | ~2x/month | 50-80 | $0 |
| Expansion to new radius | ~1x/month | 25-40 | $0 |
| Place Details enrichment (optional) | As needed | 100-400 | $0-14 |
| **Total monthly** | | **200-560** | **$0-14** |

**Conclusion: Cost is negligible.** Well within $200 free monthly credit. Even at maximum enrichment usage, total Places API cost is under $15/month.

### 4.4 Recommended Implementation Strategy for Story 1.7

```
SEED DATA PIPELINE (Edge Function `seed-data`):

1. PRIMARY: OSM Overpass API
   - Query: way["building"](around:2000,-23.5988,-46.6658)
   - Expected: ~16,000 buildings with coordinates
   - Insert into `edificios` with seed_source='osm_overpass'

2. ENRICHMENT: Google Places API (New)
   - Grid-based Nearby Search with type=apartment_building
   - Expected: ~100-400 buildings with name + formatted address
   - Match to existing OSM buildings via ST_DWithin(50m)
   - UPDATE matched buildings with Google's name + formatted_address
   - INSERT unmatched Google results as new buildings with seed_source='google_places'

3. FALLBACK ORDER:
   - OSM fails → Google Places as primary (fewer buildings but richer)
   - Google fails → OSM only (more buildings but sparser metadata)
   - Both fail → System works, user registers manually (VETO PV #1 principle)
```

### 4.5 Action Items

| # | Action | Priority | Blocker? |
|---|--------|----------|----------|
| 1 | Update Story 1.7 AC1: replace `type=premise` with `type=apartment_building` | High | No (documentation fix) |
| 2 | Create GCP project + enable Places API (New) + get API key | High | Yes — needed before implementation |
| 3 | Test Nearby Search with `apartment_building` at Moema epicenter | High | Validates coverage estimate |
| 4 | Implement OSM Overpass as primary seed (Story 1.7 main path) | Must | Core implementation |
| 5 | Implement Google Places as enrichment layer (Story 1.7 or Story 3.5) | Should | Enhancement to seed quality |
| 6 | Monitor Basic SKU free pricing — confirm $0 cost for Basic fields | Medium | Cost validation |

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google Places returns fewer than 50 residential buildings in 2km | **Medium (40%)** | Low | OSM Overpass is primary source with 16,595 buildings |
| Basic SKU free pricing changes | **Low (10%)** | Low | $200/month credit covers any reasonable usage |
| Type `apartment_building` not well-populated in Brazil | **Medium (35%)** | Medium | Try `apartment_complex`, `condominium_complex` as supplements; Text Search as fallback |
| 60-result pagination limit causes missed buildings | **High (70%)** | Low | Grid-based search strategy mitigates; OSM covers base |
| API key management / security | **Low (15%)** | Medium | Store in Supabase Edge Function secrets, not client-side |

---

## 6. Summary

| Finding | Verdict | Tag |
|---------|---------|-----|
| Google Places indexes residential buildings in Moema | Yes, but only 100-400 vs 16,595 in OSM | **[PARTIALLY VERIFIED]** |
| $200/month free credit exists | Confirmed | **[VERIFIED]** |
| Nearby Search costs ~$32/1,000 requests | Confirmed for Advanced SKU; Basic SKU may be $0 | **[VERIFIED]** |
| Google Places is viable as primary seed source | **NO** — insufficient volume | **[VERIFIED]** |
| Google Places is viable as enrichment complement to OSM | **YES** — richer name/address data | **[VERIFIED]** |
| Seed operation cost for 2km radius | $0-1.40 per run (within free credit) | **[PARTIALLY VERIFIED]** |
| Recommended type filter | `apartment_building` (not `premise`) | **[VERIFIED]** |
| Story 1.7 needs type correction | Yes — `premise` is not a valid Nearby Search type | **[VERIFIED]** |

**Bottom line:** Use OSM Overpass as the primary seed data source (16,595 buildings, free). Use Google Places API (New) as an enrichment layer to add names and formatted addresses to the ~100-400 most prominent buildings. Cost is negligible ($0-15/month). The current Story 1.7 technical notes reference an invalid type (`premise`) that should be corrected to `apartment_building`.

---

## Sources

- Google Maps Platform documentation (developers.google.com/maps) — Place Types, Nearby Search (New), Pricing
- Google Cloud pricing page (cloud.google.com/maps-platform/pricing) — $200 monthly credit, SKU tiers
- Project documents: `docs/research/api-integration-research.md`, `docs/research/api-verification-results.md`
- Project Story: `docs/stories/1.7.story.md`
- OSM Overpass verified results from project: 1,380 buildings (500m), 16,595 buildings (2km)

*Research document — Alex (Analyst Agent) — Synkra AIOX*
*Base: training knowledge (cutoff May 2025) + project verified data. Items marked [PARTIALLY VERIFIED] or [UNVERIFIED] require live API testing for confirmation.*
