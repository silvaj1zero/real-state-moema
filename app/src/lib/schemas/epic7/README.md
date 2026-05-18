# Epic 7 — Schemas Zod unificados

**Path canonico:** `app/src/lib/schemas/epic7/` — fixado em ADR-EPIC7-006 (in-app monolith).

**Story de origem:** [`docs/stories/7.1.story.md`](../../../../../docs/stories/7.1.story.md)

**Consumidores:** Stories 7.2 (PortalCrawler), 7.3 (classifyAdvertiser), 7.4 (MercadoLivre crawler), 7.5 (writer), 7.7 (creciService) — todas devem importar via barrel:

```ts
import {
  AdvertisersSchema,
  HomeFlagsSchema,
  PropertyEpic7Schema,
  type Advertisers,
  type HomeFlags,
  type AdvertiserClassification,
} from '@/lib/schemas/epic7'
```

## Pureza TS (requisito ADR-EPIC7-006)

Todo modulo deste pacote e TS puro: sem imports `next/*`, sem `fs`/`path`/`crypto` Node-specific, sem React, sem Supabase client. A razao e que estes schemas viajam por copy-on-build para:

1. **Apify Actors** (`apps/crawlers/{portal}/src/_shared/`) — bundle isolado per ator.
2. **Supabase Edge Functions** (Deno runtime) — sem Node API disponivel.

Violar essa pureza quebra os builds downstream. CI sync-check (Story 7.4) valida.

## Mapping conceitual HomeHarvest -> Zod

Referencia primaria: [`docs/code-anatomy/bunsly-homeharvest/extraction-notes.md`](../../../../../docs/code-anatomy/bunsly-homeharvest/extraction-notes.md) Sec. 1.

| HomeHarvest (Pydantic) | Epic 7 (Zod) | Notas |
|---|---|---|
| `AgentSchema` | `AgentSchema` (`agent.ts`) | Adicionado: `creci` regex + `creci_validated` (extensao BR) |
| `BrokerSchema` | `BrokerSchema` (`broker.ts`) | Adicionado: `cnpj` regex |
| `BuilderSchema` | `BuilderSchema` (`builder.ts`) | Adicionado: `cnpj` regex |
| `OfficeSchema` | `OfficeSchema` (`office.ts`) | Mantido proximo do upstream |
| `Advertisers` (composicao) | `AdvertisersSchema` (`advertisers.ts`) | Adicionado: `classification` enum (5+1 categorias), `classification_confidence`, `classification_signals` |
| `HomeFlags` (7 booleans US) | `HomeFlagsSchema` (`home-flags.ts`) | 3 herdadas + 4 BR-especificas (`is_fisbo_inferred`, `is_pf_disclosed`, `is_pj_disclosed`, `has_creci_validated`) |
| `Property` (63 colunas) | `PropertyEpic7Schema` (`property-epic7.ts`) | Envelope minimo crawler -> writer; campos escalares ficam em `raw_data` ou `scraped_listings` |

## Estrutura

```
epic7/
  agent.ts            Agent + AgentPhone + CreciRegex
  broker.ts           Broker + CnpjRegex
  builder.ts          Builder
  office.ts           Office + OfficePhone
  advertisers.ts      Advertisers + AdvertiserClassification + ClassificationSignal
  home-flags.ts       HomeFlags (7 booleans, default false)
  property-epic7.ts   PropertyEpic7 + PortalEnum
  index.ts            barrel (publica)
  README.md           este arquivo
  __tests__/
    advertisers.test.ts
    home-flags.test.ts
```

## Classification taxonomy (AC2)

5 categorias canonicas + fallback:

| Valor | Descricao | Sinais tipicos |
|---|---|---|
| `agent` | Corretor pessoa fisica com CRECI | `has_creci` |
| `broker` | Imobiliaria pessoa juridica | `cnpj_match_imobiliaria` |
| `builder` | Construtora/incorporadora | `cnpj_match_construtora` |
| `for_sale_by_owner` | Proprietario anunciando direto (FISBO) | `ddd_mobile` + `no_creci_match` + `single_listing` + `name_appears_personal` |
| `unknown` | Classificacao indeterminada (default seguro) | — |

A logica que atribui esses valores fica em **Story 7.3** (`classifyAdvertiser`). Este pacote so define o vocabulario.

## CRECI e CNPJ (regex AC6)

- **CRECI:** `/^\d{1,6}[-/]?[A-Z]?$/` — 1-6 digitos, separador opcional, letra UF opcional (maiuscula).
- **CNPJ:** `/^\d{14}$/` — caller deve normalizar antes (`replace(/\D/g, '')`).

Ambos exportados como constantes `CreciRegex`/`CnpjRegex` para reuso fora do schema (Story 7.7).

## Migration acoplada

Story 7.1 entrega tambem [`supabase/migrations/20260514000001_008_epic7_schemas.sql`](../../../../../supabase/migrations/20260514000001_008_epic7_schemas.sql) — colunas em `scraped_listings` + `leads`. Aplicacao em prod e de @devops; tipos Supabase (`app/src/lib/supabase/types.ts`) sao regerados apos `supabase gen types typescript`.
