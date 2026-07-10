# Domain Model — Bunsly/HomeHarvest

Todos os modelos vivem em `homeharvest/core/scrapers/models.py`. São **Pydantic v2 BaseModels** com tipos opcionais (campo ausente da API → `None`).

## Enums

### `SiteName` (linhas 13-22)
```python
class SiteName(Enum):
    ZILLOW = "zillow"
    REDFIN = "redfin"
    REALTOR = "realtor.com"
```

> Apenas REALTOR está implementado em 0.8.18. Zillow/RedFin estão no enum por compatibilidade histórica mas **sem scrapers correspondentes**.

### `ListingType` (linhas 39-47)
```python
class ListingType(Enum):
    FOR_SALE = "FOR_SALE"
    FOR_RENT = "FOR_RENT"
    PENDING = "PENDING"
    SOLD = "SOLD"
    OFF_MARKET = "OFF_MARKET"
    NEW_COMMUNITY = "NEW_COMMUNITY"
    OTHER = "OTHER"
    READY_TO_BUILD = "READY_TO_BUILD"
```

**Status mapping para Epic 7 BR (Zap/OLX/VivaReal):**

| HomeHarvest (US) | Equivalente BR aproximado |
|---|---|
| FOR_SALE | "venda" |
| FOR_RENT | "aluguel" / "locacao" |
| PENDING | "vendido condicional" / "em negociação" (raramente exposto em BR) |
| SOLD | "vendido" / "fechado" |
| OFF_MARKET | "fora do ar" / "desativado" |
| NEW_COMMUNITY | "lançamento" |
| READY_TO_BUILD | "pré-lançamento" |

### `PropertyType` (linhas 65-87)
22 tipos de imóvel — alta granularidade.

### `SearchPropertyType` (linhas 25-36)
11 tipos para filtragem na query.

### `ReturnType` (linhas 7-10)
```python
class ReturnType(Enum):
    pydantic = "pydantic"
    pandas = "pandas"
    raw = "raw"
```

## Entidades-Pessoa (Advertisers)

Esta é a **família de modelos mais relevante** para Epic 7 — ela define **quem está anunciando**.

### `Entity` (base abstrata)
```python
class Entity(BaseModel):
    name: str | None = None
    uuid: str | None = None
```

### `Agent` (extends Entity)
```python
class Agent(Entity):
    mls_set: str | None = None
    nrds_id: str | None = None              # NAR National Realtor Database ID
    phones: list[dict] | AgentPhone | None = None
    email: str | None = None
    href: str | None = None
    state_license: str | None = Field(..., description="Advertiser agent state license number")
```

> `nrds_id` é o **identificador nacional do agente imobiliário licenciado** nos EUA. Equivalente direto BR seria o **CRECI** — papel idêntico de "registro profissional do agente".

### `Office` (extends Entity)
```python
class Office(Entity):
    mls_set: str | None = None
    email: str | None = None
    href: str | None = None
    phones: list[dict] | AgentPhone | None = None
```

Escritório físico — branch da imobiliária.

### `Broker` (extends Entity)
```python
class Broker(Entity):
    pass
```

Empresa/marca da imobiliária.

### `Builder` (extends Entity)
```python
class Builder(Entity):
    pass
```

**Construtora/incorporadora** — vende `new_community` / `ready_to_build`. Equivalente BR direto: CNAE 4110700/4120400 (construtoras Epic 7).

### `Advertisers` (composição)
```python
class Advertisers(BaseModel):
    agent: Agent | None = None
    broker: Broker | None = None
    builder: Builder | None = None
    office: Office | None = None
```

### `AgentPhone`
```python
class AgentPhone(BaseModel):
    number: str | None = None
    type: str | None = None       # "office" / "mobile" / "fax"
    primary: bool | None = None
    ext: str | None = None
```

## Entidade principal

### `Property` (linhas 175-235)

| Campo | Tipo | Notas |
|---|---|---|
| `property_url` | `HttpUrl` | URL pública no Realtor.com |
| `property_id` | `str` | obrigatório |
| `listing_id` | `str \| None` | ID do anúncio |
| `permalink` | `str \| None` | slug humano |
| `mls` | `str \| None` | MLS source name |
| `mls_id` | `str \| None` | número MLS |
| `status` | `str \| None` | enum string |
| `address` | `Address \| None` | nested |
| `list_price` | `int \| None` | |
| `list_price_min/max` | `int \| None` | range para anúncios sem preço fixo |
| `list_date` | `datetime \| None` | |
| `pending_date`, `last_sold_date`, `last_status_change_date`, `last_update_date` | `datetime \| None` | |
| `prc_sqft` | `int \| None` | preço por sqft |
| `new_construction` | `bool \| None` | |
| `hoa_fee` | `int \| None` | mensal |
| `days_on_mls` | `int \| None` | |
| `description` | `Description \| None` | beds/baths/sqft etc. |
| `tags` | `list[str] \| None` | |
| `latitude` / `longitude` | `float \| None` | |
| `neighborhoods` | `str \| None` | |
| `county`, `fips_code` | `str \| None` | |
| `nearby_schools` | `list[str] \| None` | |
| `assessed_value` / `estimated_value` / `tax` | `int \| None` | |
| `tax_history` | `list[TaxHistory] \| None` | |
| `advertisers` | `Advertisers \| None` | **chave para FSBO** |
| `open_houses` | `list[OpenHouse] \| None` | |
| `pet_policy` | `PetPolicy \| None` | |
| `units` | `list[Unit] \| None` | multi-family |
| `monthly_fees` / `one_time_fees` | nested | |
| `parking` | `HomeParkingDetails \| None` | |
| `popularity` | `Popularity \| None` | clicks/views/leads/saves |
| `tax_record` | `TaxRecord \| None` | |
| `parcel_info` | `dict \| None` | |
| `current_estimates` / `estimates` | nested | AVM |
| `photos` | `list[dict] \| None` | |
| `flags` | `HomeFlags \| None` | **booleanas críticas** |

## `HomeFlags` — booleanas discriminantes

```python
class HomeFlags(BaseModel):
    is_pending: bool | None = None
    is_contingent: bool | None = None
    is_new_construction: bool | None = None
    is_coming_soon: bool | None = None
    is_new_listing: bool | None = None
    is_price_reduced: bool | None = None
    is_foreclosure: bool | None = None
```

**ALTA TRANSFERIBILIDADE para Epic 7 BR.** Sugestão: incluir as 7 flags equivalentes no schema unificado:

| HomeHarvest flag | Mapeamento BR (Epic 7) |
|---|---|
| `is_pending` | `is_em_negociacao` (parsing do título: "vendido condicional", "em proposta") |
| `is_contingent` | derivar do mesmo `is_em_negociacao` |
| `is_new_construction` | `is_lancamento` (cnae construtora + status "lançamento" no portal) |
| `is_coming_soon` | `is_pre_lancamento` (label "em breve", "será lançado") |
| `is_new_listing` | `is_anuncio_novo` (data_publicacao < 7 dias) |
| `is_price_reduced` | `is_reduzido` (delta preço histórico > -5%) |
| `is_foreclosure` | `is_leilao` (label "leilão", "alienação fiduciária") |

## `Address`

```python
class Address(BaseModel):
    full_line: str | None = None
    street: str | None = None
    unit: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    street_direction: str | None = None     # GraphQL extension
    street_number: str | None = None
    street_name: str | None = None
    street_suffix: str | None = None

    @computed_field
    @property
    def formatted_address(self) -> str | None: ...
```

`computed_field` Pydantic v2 — renderiza `full_line, city, state, zip` quando serializado.

## `Description`

`beds`, `baths_full`, `baths_half`, `sqft`, `lot_sqft`, `sold_price`, `year_built`, `garage`, `stories`, `text`, `style`, `primary_photo`, `alt_photos`, `type`, `name`.

## Modelos auxiliares (resumo)

| Model | Função |
|---|---|
| `OpenHouse` | start/end date, methods (in-person, virtual), href |
| `PetPolicy` | cats/dogs/dogs_small/dogs_large boolean |
| `Unit` | sub-unidade (multi-family) |
| `HomeMonthlyFee` / `HomeOneTimeFee` | aluguel — fees |
| `HomeParkingDetails` | spaces / rent |
| `TaxRecord` | tax-record id, year |
| `TaxHistory` | year + tax + assessment |
| `Popularity` | clicks/views/leads/saves períodos |
| `PopularityPeriod` | clicks_total, views_total, dwell_time_mean, last_n_days |
| `PropertyEstimate` | AVM estimates |

## Reusabilidade para Epic 7 (Zod schema sketch)

```ts
// packages/shared/schemas/property.ts (proposta Epic 7)

export const AdvertiserClassification = z.enum([
  'agent',           // CRECI ativo, mobile pessoal, único anúncio
  'broker',          // marca imobiliária (multiple agents)
  'builder',         // CNPJ construtora (CNAE 4110700/4120400)
  'for_sale_by_owner', // FISBO — DDD móvel + sem CRECI + nome PF + único anúncio (Wave 2)
])

export const HomeFlagsBR = z.object({
  is_em_negociacao: z.boolean().nullable(),
  is_lancamento: z.boolean().nullable(),
  is_pre_lancamento: z.boolean().nullable(),
  is_anuncio_novo: z.boolean().nullable(),
  is_reduzido: z.boolean().nullable(),
  is_leilao: z.boolean().nullable(),
})

export const Property = z.object({
  property_id: z.string(),
  source_portal: z.enum(['zap', 'olx', 'vivareal']),
  advertiser_classification: AdvertiserClassification,
  advertiser_agent_name: z.string().nullable(),
  advertiser_agent_creci: z.string().nullable(),   // ← inferida via Wave 2 heurística
  advertiser_agent_phone: z.string().nullable(),
  advertiser_broker_name: z.string().nullable(),
  advertiser_broker_cnpj: z.string().nullable(),   // ← cruzado com base CNPJ-SP
  advertiser_builder_name: z.string().nullable(),
  advertiser_builder_cnpj: z.string().nullable(),
  flags: HomeFlagsBR,
  // ... resto dos campos
})
```
