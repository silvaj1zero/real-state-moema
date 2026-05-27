# Extraction Notes — Bunsly/HomeHarvest → Epic 7

Decisão por componente: **APROVEITAR / ADAPTAR / DESCARTAR** para o Crawlee TS Wave A.

## Mapa de extração

| Item | Decisão | Justificativa |
|---|---|---|
| **Código Python** (`requests` + `tenacity` + GraphQL) | **DESCARTAR** | Epic 7 é Crawlee TS — não portar código, portar conceitos. |
| **Schema Pydantic completo** (`Property/Address/Description/Advertisers`) | **APROVEITAR (transpiled para Zod)** | Schema canônico MLS, internacionalmente validado. ~30 models compõem o domain completo. |
| **`Advertisers` composition** (agent + broker + builder + office) | **APROVEITAR verbatim (em Zod)** | 4 entidades + nested optional. Match exato com nosso modelo de "anunciante BR". |
| **`HomeFlags` (7 booleanas)** | **APROVEITAR e adaptar** (vide tabela 02-domain-model.md) | Pattern de booleanas discriminantes é superior a string-status. |
| **`advertiser.type == "seller" / "community"` switch** | **DESCARTAR** (não aplicável BR) | Realtor entrega tipificado. Zap/OLX/VivaReal não — usar heurística FISBO Wave 2. |
| **`status` precedence** (`PENDING > CONTINGENT > raw`) | **APROVEITAR** | Pattern simples e auditável. |
| **`exclude_pending` filter pattern** | **APROVEITAR** | Replicar no scraper Epic 7. |
| **Date precision enhancement via `last_status_change_date`** | **APROVEITAR** | Pattern útil quando portal mistura dia/hora. |
| **Pagination paralela com `ThreadPoolExecutor(20)`** | **ADAPTAR** | Crawlee tem AutoscaledPool nativo. Limite ~ similar (15-25 concurrent). |
| **`detect_precision_and_convert()`** | **ADAPTAR** | Útil em filtros de janela curta. Reimplementar em TS. |
| **`_parse_fulfillment_id("0") → None`** | **APROVEITAR** | Adicionar normalização defensiva para IDs zero/null/empty. |
| **`tenacity` retry exponential 3x** | **ADAPTAR** (Crawlee equivalent) | `maxRequestRetries: 3` no Crawlee. Verificar backoff config. |
| **DEFAULT_HEADERS (UA + sec-ch-ua + x-is-bot)** | **APROVEITAR template, NÃO valores** | Pattern correto; valores precisam vir do FingerprintGenerator do Crawlee (rotation). |
| **`get_access_token()` mobile flow** | **ESTUDAR** (não portar imediato) | Investigar se Zap/OLX/VivaReal expõem endpoint mobile com `grant_type=device_*`. Se sim, alta alavancagem. |
| **`ordered_properties` (63 colunas em ordem fixa)** | **APROVEITAR** (em Zod schema) | Schema canônico para serializar CSV/Supabase. |
| **GraphQL string concatenation manual** (`general_search`) | **DESCARTAR** | Anti-pattern (string concat de GraphQL). Crawlee + Apollo Client OU graphql-request library. |
| **GraphQL minification (`_minify_query`)** | **DESCARTAR** | graphql-request já minifica. Não reinventar. |
| **`extra_property_data = False` hard-coded** | **NÃO COPIAR** | Bug não-documentado do upstream. Em Epic 7, feature flags em `config.yaml`. |
| **Sem timeout HTTP explícito** | **NÃO COPIAR** | Bug — sempre setar `timeout: 30000` em chamadas. |

## Sugestões de hardening específicas para Epic 7

### 1. Schema unificado Zod (consumir de `packages/shared/schemas/`)

```ts
// packages/shared/schemas/advertiser.ts
import { z } from 'zod';

export const AgentSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  phones: z.array(z.object({
    number: z.string(),
    type: z.enum(['office', 'mobile', 'fax']).nullable(),
    primary: z.boolean().nullable(),
  })).nullable(),
  creci: z.string().regex(/^\d{1,6}[-/]?[A-Z]?$/).nullable(),  // ← extensão BR (Wave 2)
  creci_validated: z.boolean().default(false),                // ← validado contra buscacreci/COFECI
});

export const BrokerSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  cnpj: z.string().regex(/^\d{14}$/).nullable(),  // ← extensão BR
});

export const BuilderSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  cnpj: z.string().regex(/^\d{14}$/).nullable(),
});

export const OfficeSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  phones: z.array(z.object({ number: z.string() })).nullable(),
});

export const AdvertiserClassification = z.enum([
  'agent',
  'broker',
  'builder',
  'for_sale_by_owner',
  'unknown',  // ← fallback explícito
]);

export const AdvertisersSchema = z.object({
  agent: AgentSchema.nullable(),
  broker: BrokerSchema.nullable(),
  builder: BuilderSchema.nullable(),
  office: OfficeSchema.nullable(),
  classification: AdvertiserClassification,
  classification_confidence: z.number().min(0).max(1),  // ← Wave 2 heurística
  classification_signals: z.array(z.enum([
    'ddd_mobile',
    'no_creci_match',
    'single_listing',
    'name_appears_personal',
    'cnpj_match_construtora',
    'cnpj_match_imobiliaria',
  ])),  // ← rastreabilidade dos sinais que levaram à classificação
});
```

### 2. FSBO inference layer (não-existente em HomeHarvest)

Como Realtor entrega `type` tipificado mas Zap/OLX/VivaReal não, **precisamos implementar a inferência client-side** consumindo a heurística Wave 2:

```ts
// packages/scrapers/lib/classify-advertiser.ts
export interface AdvertiserSignals {
  hasCRECI: boolean;
  cnpj?: string;          // se disponível
  phoneType?: 'mobile' | 'landline' | 'unknown';
  phoneDDD?: string;
  listingCountByPhone?: number;  // anúncios ativos do mesmo telefone
  nameAppearsPersonal: boolean;  // heurística regex (CPF-style names)
}

export function classifyAdvertiser(s: AdvertiserSignals): {
  classification: 'agent' | 'broker' | 'builder' | 'for_sale_by_owner' | 'unknown';
  confidence: number;
  signals: string[];
} {
  const signals: string[] = [];

  // Builder
  if (s.cnpj) {
    const cnaeMatch = lookupCNAE(s.cnpj);
    if (cnaeMatch === '4110700' || cnaeMatch === '4120400') {
      signals.push('cnpj_match_construtora');
      return { classification: 'builder', confidence: 0.95, signals };
    }
    if (cnaeMatch === '6822500' || cnaeMatch === '6831700') {
      signals.push('cnpj_match_imobiliaria');
      return { classification: 'broker', confidence: 0.90, signals };
    }
  }

  // FISBO — heurística Wave 2 (4 sinais, todos devem casar)
  if (
    !s.hasCRECI &&
    s.phoneType === 'mobile' &&
    s.listingCountByPhone === 1 &&
    s.nameAppearsPersonal
  ) {
    signals.push('ddd_mobile', 'no_creci_match', 'single_listing', 'name_appears_personal');
    return { classification: 'for_sale_by_owner', confidence: 0.85, signals };
  }

  // Agent (CRECI ativo, possivelmente múltiplos anúncios)
  if (s.hasCRECI) {
    signals.push('has_creci');
    return { classification: 'agent', confidence: 0.80, signals };
  }

  // Default
  return { classification: 'unknown', confidence: 0.0, signals: [] };
}
```

### 3. Pagination chunking by date+location

Inspirado em BR-PAGE-001 (cap de 10k). Para portais BR:

```ts
// packages/scrapers/zap-pagination.ts
const PORTAL_CAPS = {
  zap: 10000,
  vivareal: 10000,
  olx: 2500,  // mais restritivo
};

async function fetchChunked(portal: 'zap', filters: ZapFilters) {
  const cap = PORTAL_CAPS[portal];

  // Probe sem date filter
  const total = await fetchTotalCount(portal, filters);
  if (total <= cap) return await fetchAll(portal, filters);

  // Chunking por janela de 7 dias até cobrir
  let allResults: Property[] = [];
  let cursor = filters.dateFrom ?? subDays(new Date(), 30);
  while (cursor < (filters.dateTo ?? new Date())) {
    const windowEnd = addDays(cursor, 7);
    const chunk = await fetchAll(portal, { ...filters, dateFrom: cursor, dateTo: windowEnd });
    allResults.push(...chunk);
    cursor = windowEnd;
  }
  return allResults;
}
```

### 4. Pattern de retry — Crawlee equivalent ao tenacity

```ts
// packages/scrapers/zap/crawler.ts
new PlaywrightCrawler({
  requestHandler: async ({ request, page, enqueueLinks }) => {
    // ...
  },
  maxRequestRetries: 3,
  // backoff exponencial é default (Crawlee usa 2^n * 1000ms até max)

  failedRequestHandler: async ({ request, error }) => {
    if (error?.statusCode === 403 && !request.proxyUrl) {
      // Fail-fast sem proxy — HomeHarvest pattern BR-AUTH-001
      throw new FatalError('403 without proxy — aborting');
    }
    // com proxy: log e deixar Crawlee retry
  },
});
```

### 5. License — incorporação direta OK

- HomeHarvest é **MIT** (`pyproject.toml` + LICENSE no repo)
- Permite uso comercial, modificação, distribuição
- Atribuição obrigatória — manter `Cullen Watson <cullen@bunsly.com>, Zachary Hampton <zachary@bunsly.com>` no `NOTICE` se redistribuirmos código (não vamos — só conceitos)

## Risco — comunidade

| Vetor | Probabilidade | Mitigação |
|---|---|---|
| Realtor.com endurecer anti-bot | **Alta** | Crawlee fingerprint rotation; Apify residencial; fallback para Zillow scrapers (se reimplementarem) |
| HomeHarvest abandonar refactor | **Baixa** (último commit dez/2025) | Não dependemos do código — só do schema. Mudança não afeta. |
| Realtor mudar GraphQL schema | **Média** (já mudou: `extra_property_data` quebrou) | N/A — não consumimos Realtor. Apenas referência conceitual. |

## Alternativas avaliadas pré-Wave 2

| Alternativa | Por que NÃO escolhida (para Epic 7) |
|---|---|
| **Portar `homeharvest` para Python isolado** | Adiciona um runtime extra. Crawlee TS cobre todos os portais BR melhor. |
| **Usar Realtor.com diretamente** | Não há equivalente BR oficial. Realtor é mercado US. |
| **Fork de HomeHarvest para BR** | Reescrever scrapers de Zap/OLX/VivaReal não tem nada a ver com Realtor API. Fork-and-rewrite > 80% do código. Não justifica. |

## Recomendação final

**ADOTAR como REFERÊNCIA CONCEITUAL para Epic 7.** Justificativa:

1. **Schema validado em produção** ✓ (679⭐, ~2 anos, NAR-compatible)
2. **License MIT** ✓ — sem ônus para inspirar nosso design
3. **Padrão `Advertisers` composition** ✓ — match exato com modelo BR
4. **`HomeFlags` discriminantes** ✓ — adotar 7 flags equivalentes BR
5. **Patterns de retry/pagination/auth** ✓ — base sólida para Crawlee config

**Não copiar código.** Transpilar **schema** (Pydantic → Zod) + **conceitos** (date precision, pending filter, fulfillment_id="0" normalization, fail-fast no-proxy 403).

**Adicionar à Phase 5:** story Epic 7 "Schema unificado de Property/Advertisers" com responsável `@architect` + `@data-engineer`, custo estimado 0.5 sprint (3 dias) — Zod schemas + tests + migration plan Supabase.
