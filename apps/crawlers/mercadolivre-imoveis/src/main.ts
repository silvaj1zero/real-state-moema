/**
 * Apify Actor — MercadoLivre Imoveis crawler (Story 7.4 AC1).
 *
 * Entry point. Le INPUT, monta URLs canonicas, instancia
 * `createPortalCrawler` (shared), roteia via LISTING_PAGE / DETAIL_PAGE
 * handlers, persiste em `scraped_listings`, classifica e atualiza.
 *
 * Pre-build: rode `npm run sync:shared` (copia parsers + schemas para
 * src/shared/). Sem isso, build falha.
 */

import { Actor, log } from 'apify'
import { Dataset, RequestQueue } from 'crawlee'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import {
  createPortalCrawler,
  Telemetry,
  classifyAdvertiser,
  lookupCNAE,
  SupabaseCNAELookupClient,
} from './shared/scrapers'
import {
  parseListingPage,
  parseDetailPage,
  toPropertyEpic7,
  buildAdvertiserSignals,
} from './shared/scrapers/mercadolivre'

// ---------------------------------------------------------------------------
// Input schema (subset usado em runtime — schema completo em input_schema.json)
// ---------------------------------------------------------------------------

interface ActorInput {
  bairros?: string[]
  tipo_negocio?: 'venda' | 'aluguel'
  preco_min?: number
  preco_max?: number
  area_min?: number
  area_max?: number
  quartos_min?: number
  max_listings_per_bairro?: number
  supabase_url?: string
  supabase_service_role_key?: string
}

const DEFAULT_INPUT: Required<Omit<ActorInput, 'supabase_url' | 'supabase_service_role_key'>> = {
  bairros: ['moema', 'vila-olimpia', 'itaim-bibi'],
  tipo_negocio: 'venda',
  preco_min: 0,
  preco_max: 0,
  area_min: 0,
  area_max: 0,
  quartos_min: 0,
  max_listings_per_bairro: 500,
}

// ---------------------------------------------------------------------------
// URL builder — AC2
// ---------------------------------------------------------------------------

const ML_HOST = 'https://imoveis.mercadolivre.com.br'

function buildStartUrls(input: Required<Omit<ActorInput, 'supabase_url' | 'supabase_service_role_key'>>): string[] {
  const urls: string[] = []
  const negocio = input.tipo_negocio
  for (const bairro of input.bairros) {
    urls.push(`${ML_HOST}/casas/${negocio}/sao-paulo/${bairro}/`)
    urls.push(`${ML_HOST}/apartamentos/${negocio}/sao-paulo/${bairro}/`)
  }
  return urls
}

// ---------------------------------------------------------------------------
// Persistence helpers (Supabase)
// ---------------------------------------------------------------------------

async function persistListing(
  db: SupabaseClient,
  payload: ReturnType<typeof toPropertyEpic7>,
): Promise<string | null> {
  const { data, error } = await db
    .from('scraped_listings')
    .upsert(
      {
        portal: payload.portal,
        external_id: payload.external_id,
        url: payload.url,
        nome_anunciante: payload.advertisers?.broker?.name ?? payload.advertisers?.agent?.name ?? null,
        telefone_anunciante:
          (payload.raw_data?.['telefone_anunciante'] as string | null | undefined) ?? null,
        whatsapp_anunciante:
          (payload.raw_data?.['whatsapp_anunciante'] as string | null | undefined) ?? null,
        creci_anunciante: payload.advertisers?.agent?.creci ?? null,
        cnpj_anunciante: payload.advertisers?.broker?.cnpj ?? null,
        home_flags: payload.home_flags,
        raw_data: payload.raw_data,
        classification: payload.advertisers?.classification ?? 'unknown',
        classification_confidence: payload.advertisers?.classification_confidence ?? 0,
        classification_signals: payload.advertisers?.classification_signals ?? [],
      },
      { onConflict: 'portal,external_id' },
    )
    .select('id')
    .single()

  if (error) {
    log.error('persistListing failed', { error: error.message, external_id: payload.external_id })
    return null
  }
  return (data?.id as string) ?? null
}

async function updateClassification(
  db: SupabaseClient,
  listingId: string,
  cls: ReturnType<typeof classifyAdvertiser>,
): Promise<void> {
  const { error } = await db
    .from('scraped_listings')
    .update({
      classification: cls.classification,
      classification_confidence: cls.confidence,
      classification_signals: cls.signals,
    })
    .eq('id', listingId)
  if (error) log.error('updateClassification failed', { error: error.message, id: listingId })
}

async function emitFisboEvent(
  db: SupabaseClient,
  listingId: string,
  confidence: number,
): Promise<void> {
  const { error } = await db.from('intelligence_feed').insert({
    event_type: 'novo_fisbo_detectado',
    metadata: { listing_id: listingId, portal: 'mercadolivre', confidence },
  })
  if (error) log.error('emitFisboEvent failed', { error: error.message, id: listingId })
}

// ---------------------------------------------------------------------------
// Actor main
// ---------------------------------------------------------------------------

await Actor.init()

const rawInput = (await Actor.getInput<ActorInput>()) ?? {}
const input = { ...DEFAULT_INPUT, ...rawInput }

const supabaseUrl = rawInput.supabase_url ?? process.env.SUPABASE_URL ?? ''
const supabaseKey =
  rawInput.supabase_service_role_key ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  log.warning('Supabase credentials missing — running in dry-run (no persistence).')
}

const db: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

const telemetry: Telemetry | null = db
  ? new Telemetry({ supabaseUrl, supabaseServiceRoleKey: supabaseKey })
  : null

if (telemetry) {
  await telemetry.startRun('mercadolivre')
}

const startUrls = buildStartUrls(input)
log.info('Start URLs', { count: startUrls.length, sample: startUrls.slice(0, 2) })

const requestQueue = await RequestQueue.open()
for (const url of startUrls) {
  await requestQueue.addRequest({ url, userData: { label: 'LISTING_PAGE', bairroCount: 0 } })
}

let detailsProcessed = 0

const crawler = createPortalCrawler({
  portal: 'mercadolivre',
  telemetry: telemetry ?? undefined,
  // Wave A — rate-limit defensivo 60 req/min (override sobre defaults 120)
  overrides: {
    maxRequestsPerMinute: 60,
    maxRequestRetries: 2,
  },
  requestHandler: async (ctx) => {
    const { request, body } = ctx as unknown as {
      request: { url: string; userData: Record<string, unknown> }
      body: string | Buffer
    }
    const html = typeof body === 'string' ? body : body.toString('utf8')
    const label = String(request.userData?.label ?? 'LISTING_PAGE')

    if (label === 'LISTING_PAGE') {
      const parsed = parseListingPage(html, request.url)
      log.info('Listing page', { url: request.url, detailUrls: parsed.detailUrls.length })
      for (const u of parsed.detailUrls) {
        await requestQueue.addRequest({ url: u, userData: { label: 'DETAIL_PAGE' } })
      }
      if (parsed.nextPageUrl && detailsProcessed < input.max_listings_per_bairro) {
        await requestQueue.addRequest({
          url: parsed.nextPageUrl,
          userData: { label: 'LISTING_PAGE' },
        })
      }
      return
    }

    if (label === 'DETAIL_PAGE') {
      const detail = parseDetailPage(html, request.url)
      const envelope = toPropertyEpic7(detail, request.url)
      detailsProcessed += 1
      await Dataset.pushData(envelope)

      if (!db) return

      const listingId = await persistListing(db, envelope)
      if (!listingId) return

      // Build signals + lookup CNAE (Story 7.5) + classify (Story 7.3)
      const baseSignals = buildAdvertiserSignals(detail)
      let cnae = ''
      if (baseSignals.cnpj) {
        try {
          const cnaeClient = new SupabaseCNAELookupClient(db)
          cnae = await lookupCNAE(cnaeClient, baseSignals.cnpj)
        } catch (e) {
          log.warning('lookupCNAE failed — falling back to undefined', {
            cnpj: baseSignals.cnpj,
            err: e instanceof Error ? e.message : String(e),
          })
        }
      }
      const cls = classifyAdvertiser({ ...baseSignals, cnae: cnae || undefined })
      await updateClassification(db, listingId, cls)

      if (cls.classification === 'for_sale_by_owner' && cls.confidence >= 0.7) {
        await emitFisboEvent(db, listingId, cls.confidence)
      }
      return
    }
  },
})

try {
  await crawler.run()
  if (telemetry) await telemetry.finishRun('completed')
} catch (err) {
  log.error('Crawler crashed', { err: err instanceof Error ? err.message : String(err) })
  if (telemetry) {
    await telemetry.finishRun(
      'failed',
      err instanceof Error ? err.message : 'unknown',
    )
  }
  throw err
} finally {
  await Actor.exit()
}
