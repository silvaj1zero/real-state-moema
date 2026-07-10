# Business Rules — Bunsly/HomeHarvest

## SCOPE — o que este documento extrai

As regras codificadas que classificam **quem está anunciando** (FSBO vs broker vs builder vs agent) e os flags discriminantes (pending, foreclosure, new_construction). Cada regra tem **citação verbatim com `path:line`** para auditoria.

## TL;DR — a "FSBO detection" do HomeHarvest é via API, não heurística

> **Achado-chave:** HomeHarvest **NÃO infere** "for sale by owner" via regex em nome, telefone, ou ausência de license. Ele **confia 100% no campo `advertiser["type"]`** que o Realtor.com já entrega tipificado. Logo:
>
> - `advertiser["type"] == "seller"` → tipo `Agent` (corretor profissional)
> - `advertiser["type"] == "community"` → tipo `Builder` (incorporadora)
> - **sem advertiser** OU `advertiser["type"] not in ("seller","community")` → implicitamente FSBO/outro (inferência nossa, NÃO codificada no repo)
>
> Para Epic 7 (BR), onde os portais NÃO tipificam o anunciante, **a heurística FISBO determinística da Wave 2 (DDD móvel + ausência CRECI + nome PF + único anúncio) continua sendo a abordagem correta**. HomeHarvest fornece o **schema-alvo** (`Agent / Broker / Builder / Office / Advertisers`) e o **pattern de pós-processamento**, não a inferência probabilística.

---

## BR-ADV-001 — Tipagem do advertiser via `type` field (Realtor entrega tipificado)

**Severidade:** critical
**Fonte:** `homeharvest/core/scrapers/realtor/processors.py:33-79` (função `process_advertisers`)

### Trecho verbatim

```python
# processors.py:33-79
def process_advertisers(advertisers: list[dict] | None) -> Advertisers | None:
    """Process advertisers data from GraphQL response"""
    if not advertisers:
        return None

    def _parse_fulfillment_id(fulfillment_id: str | None) -> str | None:
        return fulfillment_id if fulfillment_id and fulfillment_id != "0" else None

    processed_advertisers = Advertisers()

    for advertiser in advertisers:
        advertiser_type = advertiser.get("type")
        if advertiser_type == "seller":  #: agent
            processed_advertisers.agent = Agent(
                uuid=_parse_fulfillment_id(advertiser.get("fulfillment_id")),
                nrds_id=advertiser.get("nrds_id"),
                mls_set=advertiser.get("mls_set"),
                name=advertiser.get("name"),
                email=advertiser.get("email"),
                phones=advertiser.get("phones"),
                state_license=advertiser.get("state_license"),
            )

            if advertiser.get("broker") and advertiser["broker"].get("name"):  #: has a broker
                processed_advertisers.broker = Broker(
                    uuid=_parse_fulfillment_id(advertiser["broker"].get("fulfillment_id")),
                    name=advertiser["broker"].get("name"),
                )

            if advertiser.get("office"):  #: has an office
                processed_advertisers.office = Office(
                    uuid=_parse_fulfillment_id(advertiser["office"].get("fulfillment_id")),
                    mls_set=advertiser["office"].get("mls_set"),
                    name=advertiser["office"].get("name"),
                    email=advertiser["office"].get("email"),
                    phones=advertiser["office"].get("phones"),
                )

        if advertiser_type == "community":  #: could be builder
            if advertiser.get("builder"):
                processed_advertisers.builder = Builder(
                    uuid=_parse_fulfillment_id(advertiser["builder"].get("fulfillment_id")),
                    name=advertiser["builder"].get("name"),
                )

    return processed_advertisers
```

### Regra formalizada (SBVR-style)

```
RULE BR-ADV-001
WHEN  processing advertisers array from GraphQL response
THEN  for each advertiser:
  IF advertiser.type == "seller":
    classify as Agent (with optional nested Broker and Office)
  ELSE IF advertiser.type == "community":
    IF advertiser.builder is set:
      classify as Builder
  ELSE:
    (advertiser is silently dropped — not classified)

SOURCE: Realtor.com GraphQL API contract; `type` field is canonical
TRACEABILITY: processors.py:46 (seller path), processors.py:71 (community path)
```

### Inferência sobre FSBO no schema HomeHarvest

```
IF result.advertisers IS NULL
   OR (result.advertisers.agent IS NULL
       AND result.advertisers.broker IS NULL
       AND result.advertisers.builder IS NULL
       AND result.advertisers.office IS NULL)
THEN
   property is implicitly "for sale by owner" or "non-MLS source"
   (the code does NOT make this inference — caller must)
```

### Implicação para Epic 7 BR

O Realtor.com já fez o trabalho pesado: distinguiu agent/broker/builder no payload. Em **Zap/OLX/VivaReal essa tipagem não existe** — o campo "anunciante" pode ser:
- imobiliária (broker)
- corretor autônomo (agent)
- proprietário direto (FSBO/FISBO)
- portal/automação (lead-gen)

A **inferência é nossa**. Confirmamos no Wave 2: heurística determinística "DDD móvel + ausência de CRECI + nome PF + único anúncio" é o melhor caminho.

---

## BR-ADV-002 — Fulfillment ID "0" é tratado como ausente

**Severidade:** minor
**Fonte:** `homeharvest/core/scrapers/realtor/processors.py:39-40` (`_parse_fulfillment_id`)

```python
# processors.py:39-40
def _parse_fulfillment_id(fulfillment_id: str | None) -> str | None:
    return fulfillment_id if fulfillment_id and fulfillment_id != "0" else None
```

### Regra
```
RULE BR-ADV-002
WHEN  agent/broker/office/builder has fulfillment_id == "0"
THEN  treat as missing (return None for uuid field)

WHY   "0" é placeholder do Realtor para "no canonical ID"
      (não é um ID válido)
TRACEABILITY: processors.py:39
```

### Implicação para Epic 7 BR

Em portais BR, equivalente é tratar IDs `"0"`, `"null"`, `""`, `"00000000000"` (CPF zero) como ausentes — adicionar normalização defensiva no parser.

---

## BR-FLAG-001 — Pending/Contingent skip rule

**Severidade:** major
**Fonte:** `homeharvest/core/scrapers/realtor/processors.py:111-115`

```python
# processors.py:111-115
is_pending = result["flags"].get("is_pending")
is_contingent = result["flags"].get("is_contingent")

if (is_pending or is_contingent) and (exclude_pending and listing_type != ListingType.PENDING):
    return None
```

### Regra
```
RULE BR-FLAG-001
WHEN  parameter exclude_pending == True
  AND result.flags.is_pending OR result.flags.is_contingent
  AND user not explicitly searching for PENDING
THEN  skip this property (return None — exclui do resultado)

WHY   pending/contingent properties não são compráveis ativamente;
      usuário deve opt-in via listing_type="pending"
TRACEABILITY: processors.py:114
```

### Implicação para Epic 7 BR

**Adotar pattern idêntico.** Em BR, "em proposta" / "vendido condicional" são equivalentes a `is_contingent`. Schema sugerido em `02-domain-model.md`. Filtragem padrão deve **excluir** essas listings, exceto se buscar `listing_type=em_negociacao` explicitamente.

---

## BR-FLAG-002 — Status derivation (PENDING > CONTINGENT > raw)

**Severidade:** minor
**Fonte:** `homeharvest/core/scrapers/realtor/processors.py:122`

```python
# processors.py:122
status=("PENDING" if is_pending else "CONTINGENT" if is_contingent else result["status"].upper()),
```

### Regra
```
RULE BR-FLAG-002
WHEN  computing canonical Property.status field
THEN  precedence:
  flags.is_pending == True  → status = "PENDING"
  flags.is_contingent == True → status = "CONTINGENT"
  ELSE → status = result["status"].upper() (raw enum)

TRACEABILITY: processors.py:122
```

---

## BR-FLAG-003 — Status enum normalization for new construction

**Severidade:** informational
**Fonte:** `homeharvest/core/scrapers/realtor/processors.py:148`

```python
# processors.py:148
new_construction=result["flags"].get("is_new_construction") is True,
```

### Regra
```
RULE BR-FLAG-003
Property.new_construction is True only if flags.is_new_construction is strictly True
(not truthy-False, not None — strict identity)

WHY   evita coerção implícita (None/0/"" → False ambíguo)
TRACEABILITY: processors.py:148
```

---

## BR-DATE-001 — Date precision enhancement via last_status_change_date

**Severidade:** major
**Fonte:** `homeharvest/core/scrapers/realtor/processors.py:170-187`

```python
# processors.py:170-187
# Enhance date precision using last_status_change_date
# pending_date and last_sold_date only have day-level precision
# last_status_change_date has hour-level precision
if realty_property.last_status_change_date:
    status = realty_property.status.upper() if realty_property.status else None

    # For PENDING/CONTINGENT properties, use last_status_change_date for hour-precision on pending_date
    if status in ["PENDING", "CONTINGENT"] and realty_property.pending_date:
        # Only replace if dates are on the same day
        if realty_property.pending_date.date() == realty_property.last_status_change_date.date():
            realty_property.pending_date = realty_property.last_status_change_date

    # For SOLD properties, use last_status_change_date for hour-precision on last_sold_date
    elif status == "SOLD" and realty_property.last_sold_date:
        # Only replace if dates are on the same day
        if realty_property.last_sold_date.date() == realty_property.last_status_change_date.date():
            realty_property.last_sold_date = realty_property.last_status_change_date
```

### Regra
```
RULE BR-DATE-001
GIVEN pending_date and last_sold_date have day-level precision in Realtor API
  AND last_status_change_date has hour-level precision
WHEN  pending_date.date() == last_status_change_date.date()
THEN  override pending_date with last_status_change_date (now has hour precision)

WHY   downstream consumers (alertas, ML) precisam de ordering por hora,
      não dia. Sem essa promoção, 200 imóveis com mesma data perdem ordering.
TRACEABILITY: processors.py:174-187
```

### Implicação para Epic 7 BR

Replicar pattern: portais BR também misturam "publicado há X dias" (dia) e "última atualização: agora há pouco" (hora). Strategy: usar a fonte de hora-precision quando disponível.

---

## BR-PAGE-001 — Hard cap de 10k resultados

**Severidade:** critical (business-level)
**Fonte:** `homeharvest/__init__.py:48` + `homeharvest/utils.py` (`validate_limit`/`validate_offset`)

```python
# __init__.py:48 (parameter docs)
limit: int = 10000,
# "Maximum is 10,000."
# "offset + limit cannot exceed 10,000"
# "Note: Cannot be used to bypass the 10k API limit"
# "use date ranges (date_from/date_to) to narrow searches and fetch more data"
```

### Regra
```
RULE BR-PAGE-001
Realtor.com GraphQL API has a hard limit of 10,000 results per query.
WHEN total available > 10,000:
THEN user MUST use date_from/date_to ranges to chunk
ELSE results > 10,000 are silently truncated

TRACEABILITY: __init__.py:48, README "## Output" section
```

### Implicação para Epic 7 BR

Em portais BR, **mapear o cap real de cada portal:**
- Zap: ~10.000 visíveis em busca pública (similar)
- OLX: 50 páginas × 50 resultados = 2.500 visíveis (mais restritivo)
- VivaReal: ~10.000 similar a Zap

→ **Estratégia de chunking por bairro + tipo + faixa de preço** é mandatória.

---

## BR-SORT-001 — Auto-apply pending_date sort for date-filtered PENDING

**Severidade:** minor
**Fonte:** `homeharvest/__init__.py:117-126`

```python
# __init__.py:117-126
# Auto-apply optimal sort for PENDING listings with date filters
# PENDING API filtering is broken, so we rely on client-side filtering
# Sorting by pending_date ensures efficient pagination with early termination
elif (converted_listing_type == ListingType.PENDING and
      (converted_past_days or converted_past_hours or converted_date_from) and
      not sort_by):
    sort_by = "pending_date"
    if not sort_direction:
        sort_direction = "desc"  # Most recent first
```

### Regra
```
RULE BR-SORT-001
WHEN listing_type == PENDING AND date filter is set AND sort_by is not user-specified
THEN auto-apply sort_by = "pending_date", direction = "desc"

WHY   "PENDING API filtering is broken" (server-side date filter for pending
      is unreliable). Client-side filtering com sort by pending_date desc
      permite early termination ao iterar (achado o primeiro dt < min_filter,
      todos os subsequentes são out-of-range).
TRACEABILITY: __init__.py:117-126
```

### Implicação para Epic 7 BR

Portais BR também têm filtros server-side com bugs — preferível **sort by data_publicacao desc** + **client-side filter** quando precisão temporal é crítica. Pattern já está em uso parcial nos crawlers atuais do projeto.

---

## BR-LOC-001 — Location resolution flow

**Severidade:** informational
**Fonte:** `homeharvest/core/scrapers/realtor/__init__.py:95-145`

### Regra
```
RULE BR-LOC-001
WHEN user passes any string in `location`:
1. Send to Search_suggestions GraphQL endpoint
2. Take first result: geo_results[0]
3. Determine geo.area_type:
   - "address" → grab mpr_id (Master Property Record ID)
   - else      → use geo.city/state_code/postal_code/county/centroid
4. If area_type == "address" and no mpr_id direct:
   - Extract from geo._id prefix "addr:XXXX"
5. Return geo object for use by search()

TRACEABILITY: realtor/__init__.py:95-145
```

### Implicação para Epic 7 BR

Para Zona Sul SP, usar o **autocomplete API de cada portal** como camada de location resolution:
- Zap: `/api/autocomplete/?q={query}` retorna bairros/CEPs
- OLX: `/v2/locations?term={query}`
- VivaReal: similar a Zap

→ **Cache de 30 dias** dos resultados de autocomplete (bairros e CEPs raramente mudam).

---

## BR-AUTH-001 — 403 sem proxy = AuthenticationError; com proxy = retry

**Severidade:** major
**Fonte:** `homeharvest/core/scrapers/realtor/__init__.py:79-86`

```python
# realtor/__init__.py:79-86
if response.status_code == 403:
    if not self.proxy:
        raise AuthenticationError(
            "Received 403 Forbidden from Realtor.com API.",
            response=response
        )
    else:
        raise Exception("Received 403 Forbidden, retrying...")
```

### Regra
```
RULE BR-AUTH-001
WHEN HTTP 403 from Realtor:
  IF no proxy configured → raise AuthenticationError (fatal, NOT retried)
  IF proxy configured    → raise generic Exception (triggers tenacity retry)

WHY   sem proxy, mesmo IP banido vai continuar 403; falha rápido.
      com proxy, é provável transiente (rate-limit, geo) — retry com backoff.
TRACEABILITY: realtor/__init__.py:79-86
```

### Implicação para Epic 7 BR

Adotar **fail-fast no path sem proxy**; retry só com pool de proxies/Apify residencial. Wave 2 já decide por residencial para portais BR — pattern alinhado.

---

## Mapa de regras → severidade

| Regra | Severidade | Path |
|---|---|---|
| BR-ADV-001 | critical | processors.py:33-79 |
| BR-ADV-002 | minor | processors.py:39-40 |
| BR-FLAG-001 | major | processors.py:111-115 |
| BR-FLAG-002 | minor | processors.py:122 |
| BR-FLAG-003 | informational | processors.py:148 |
| BR-DATE-001 | major | processors.py:170-187 |
| BR-PAGE-001 | critical | __init__.py:48 |
| BR-SORT-001 | minor | __init__.py:117-126 |
| BR-LOC-001 | informational | realtor/__init__.py:95-145 |
| BR-AUTH-001 | major | realtor/__init__.py:79-86 |

## Regras NÃO encontradas (esperadas mas ausentes)

- **Phone number normalization:** não há regex que limpe/valide `agent.phones[].number`. Em Epic 7, normalizar para formato E.164 (`+55XXXXXXXXXXX`) é mandatório.
- **CRECI/license validation:** Realtor expõe `state_license` mas não valida formato. Em Epic 7, **regex de CRECI** (`^\d{1,6}[-/]?[A-Z]?$`) + lookup ao CRECI-SP (vide `buscacreci`) é diferencial.
- **Duplicate detection:** não há dedup entre listings repetidas (mesma propriedade anunciada por agentes diferentes). Em Epic 7, hash de `(endereco_normalizado, area_construida, list_price)` para detectar reanúncios.
- **Quality score / fraud detection:** sem heurística para identificar anúncios suspeitos (preço muito abaixo de mercado, fotos genéricas, etc).
- **Lead intent inference:** sem inferência de "quem é o anunciante real" — assume API verdade.

Essas lacunas são **oportunidades de diferenciação** para Epic 7.
