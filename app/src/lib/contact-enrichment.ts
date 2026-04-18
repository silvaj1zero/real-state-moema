/**
 * Contact Enrichment — Server-side logic
 * Story 6.4: Extract contact data from Apify raw, ViaCEP lookup, CRECI lookup
 */

import { createAdminClient } from '@/lib/supabase/admin'

// =============================================================================
// Types
// =============================================================================

export interface ExtractedContact {
  nome_anunciante: string | null
  telefone_anunciante: string | null
  email_anunciante: string | null
  whatsapp_anunciante: string | null
  creci_anunciante: string | null
}

export interface ViaCEPResult {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  cep: string
}

export interface CRECIResult {
  creci: string
  nome: string
  status: 'ativo' | 'inativo'
  cidade: string
}

export interface EnrichmentResult {
  listing_id: string
  contact: ExtractedContact | null
  address: ViaCEPResult | null
  creci: CRECIResult | null
  enriched_at: string
}

// =============================================================================
// extractContactFromApifyRaw
// =============================================================================

/**
 * Extracts contact data from Apify raw listing object.
 * Checks multiple field paths that different portals may use.
 */
export function extractContactFromApifyRaw(
  raw: Record<string, unknown>,
): ExtractedContact | null {
  const advertiser = (raw.advertiser ?? {}) as Record<string, unknown>
  const advertiserPhones = Array.isArray(advertiser.phones)
    ? advertiser.phones
    : []

  // --- Nome ---
  const nome =
    asString(raw.advertiserName) ??
    asString(advertiser.name) ??
    asString(raw.name) ??
    null

  // --- Telefone ---
  const rawPhone =
    asString(raw.advertiserPhone) ??
    asString(advertiserPhones[0]) ??
    asString(raw.phone) ??
    null

  // Fallback: ddd + phone concatenation
  const dddPhone =
    rawPhone ??
    (asString(raw.ddd) && asString(raw.phone)
      ? `${asString(raw.ddd)}${asString(raw.phone)}`
      : null)

  const telefone = normalizePhone(dddPhone)

  // --- Email ---
  const email =
    asString(raw.advertiserEmail) ??
    asString(advertiser.email) ??
    asString(raw.email) ??
    null

  // --- WhatsApp ---
  const whatsapp =
    asString(raw.advertiserWhatsapp) ??
    asString(raw.whatsappNumber) ??
    null

  const whatsappNormalized = normalizePhone(whatsapp)

  // --- CRECI ---
  const creci =
    asString(raw.professionalId) ??
    asString(raw.creci) ??
    null

  // Return null if nothing was extracted
  if (!nome && !telefone && !email && !whatsappNormalized && !creci) {
    return null
  }

  return {
    nome_anunciante: nome,
    telefone_anunciante: telefone,
    email_anunciante: email,
    whatsapp_anunciante: whatsappNormalized,
    creci_anunciante: creci,
  }
}

// =============================================================================
// lookupViaCEP
// =============================================================================

/**
 * Looks up a CEP via the ViaCEP API (3s timeout).
 * Returns enriched address data or null on error.
 */
export async function lookupViaCEP(
  cep: string,
): Promise<ViaCEPResult | null> {
  const cleanCep = cep.replace(/\D/g, '')
  if (cleanCep.length !== 8) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(
      `https://viacep.com.br/ws/${cleanCep}/json/`,
      { signal: controller.signal },
    )

    clearTimeout(timeout)

    if (!res.ok) return null

    const data = (await res.json()) as Record<string, unknown>

    // ViaCEP returns { erro: true } for invalid CEPs
    if (data.erro) return null

    return {
      logradouro: asString(data.logradouro) ?? '',
      bairro: asString(data.bairro) ?? '',
      localidade: asString(data.localidade) ?? '',
      uf: asString(data.uf) ?? '',
      cep: asString(data.cep) ?? cleanCep,
    }
  } catch {
    // Network error, timeout, or abort — graceful fallback
    return null
  }
}

/**
 * Extracts a CEP (XXXXX-XXX or XXXXXXXX) from an address string.
 */
export function extractCEP(address: string): string | null {
  const match = address.match(/\d{5}-?\d{3}/)
  return match ? match[0] : null
}

// =============================================================================
// lookupCRECI
// =============================================================================

/**
 * Looks up a professional CRECI via the BuscaCRECI API.
 * 3-step: submit search, poll status, get result. 5s total timeout.
 * Returns null on any error (graceful fallback).
 */
export async function lookupCRECI(
  nome: string,
  uf: string,
): Promise<CRECIResult | null> {
  if (!nome || !uf) return null

  const baseUrl = 'https://api.buscacreci.com.br'
  const deadline = Date.now() + 5000

  try {
    // Step 1: Submit search
    const submitRes = await fetchWithDeadline(
      `${baseUrl}/search`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, uf: uf.toUpperCase() }),
      },
      deadline,
    )

    if (!submitRes.ok) return null

    const submitData = (await submitRes.json()) as Record<string, unknown>
    const searchId = asString(submitData.search_id) ?? asString(submitData.id)
    if (!searchId) return null

    // Step 2: Poll status (up to remaining time)
    let attempts = 0
    const maxAttempts = 5
    let status = 'pending'

    while (status === 'pending' && attempts < maxAttempts && Date.now() < deadline) {
      await delay(500)
      attempts++

      const statusRes = await fetchWithDeadline(
        `${baseUrl}/search/${searchId}/status`,
        { method: 'GET' },
        deadline,
      )

      if (!statusRes.ok) return null

      const statusData = (await statusRes.json()) as Record<string, unknown>
      status = asString(statusData.status) ?? 'failed'
    }

    if (status !== 'completed') return null

    // Step 3: Get result
    const resultRes = await fetchWithDeadline(
      `${baseUrl}/search/${searchId}/result`,
      { method: 'GET' },
      deadline,
    )

    if (!resultRes.ok) return null

    const resultData = (await resultRes.json()) as Record<string, unknown>
    const results = Array.isArray(resultData.results)
      ? resultData.results
      : []

    if (results.length === 0) return null

    const first = results[0] as Record<string, unknown>

    return {
      creci: asString(first.creci) ?? '',
      nome: asString(first.nome) ?? nome,
      status: asString(first.status) === 'inativo' ? 'inativo' : 'ativo',
      cidade: asString(first.cidade) ?? '',
    }
  } catch {
    // Any error → graceful fallback
    return null
  }
}

// =============================================================================
// enrichListingContact — Main enrichment orchestrator
// =============================================================================

/**
 * Server-side function that enriches a scraped listing with contact/address data.
 *
 * 1. Fetches listing from scraped_listings
 * 2. If has endereco, try extractCEP → lookupViaCEP to enrich address
 * 3. If tipo_anunciante === 'corretor' and nome_anunciante, try lookupCRECI
 * 4. Updates scraped_listings with enriched data + contact_enriched_at + lgpd_consent_origin
 * 5. Returns enriched fields
 */
export async function enrichListingContact(
  listingId: string,
): Promise<EnrichmentResult> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // 1. Fetch the listing
  const { data: listing, error } = await supabase
    .from('scraped_listings')
    .select('*')
    .eq('id', listingId)
    .single()

  if (error || !listing) {
    throw new Error(`Listing ${listingId} not found: ${error?.message}`)
  }

  let contact: ExtractedContact | null = null
  let address: ViaCEPResult | null = null
  let creciResult: CRECIResult | null = null

  // Try to extract contact from raw metadata if available
  // The listing itself already has contact fields from scraping
  const existingContact: ExtractedContact = {
    nome_anunciante: asString(listing.nome_anunciante) ?? null,
    telefone_anunciante: asString(listing.telefone_anunciante) ?? null,
    email_anunciante: asString(listing.email_anunciante) ?? null,
    whatsapp_anunciante: asString(listing.whatsapp_anunciante) ?? null,
    creci_anunciante: asString(listing.creci_anunciante) ?? null,
  }

  contact = existingContact

  // 2. Address enrichment via ViaCEP
  const endereco = asString(listing.endereco) ?? ''
  if (endereco) {
    const cep = extractCEP(endereco)
    if (cep) {
      address = await lookupViaCEP(cep)
    }
  }

  // 3. CRECI lookup for corretores
  if (
    listing.tipo_anunciante === 'corretor' &&
    contact.nome_anunciante
  ) {
    // Default to SP for Moema region
    const uf = address?.uf ?? 'SP'
    creciResult = await lookupCRECI(contact.nome_anunciante, uf)

    // Enrich CRECI if found and not already present
    if (creciResult?.creci && !contact.creci_anunciante) {
      contact.creci_anunciante = creciResult.creci
    }
  }

  // 4. Build update payload
  const updatePayload: Record<string, unknown> = {
    contact_enriched_at: now,
    lgpd_consent_origin: 'portal_publico',
  }

  // Merge contact fields (only set non-null values)
  if (contact.nome_anunciante) updatePayload.nome_anunciante = contact.nome_anunciante
  if (contact.telefone_anunciante) updatePayload.telefone_anunciante = contact.telefone_anunciante
  if (contact.email_anunciante) updatePayload.email_anunciante = contact.email_anunciante
  if (contact.whatsapp_anunciante) updatePayload.whatsapp_anunciante = contact.whatsapp_anunciante
  if (contact.creci_anunciante) updatePayload.creci_anunciante = contact.creci_anunciante

  // Address enrichment — update bairro if ViaCEP returned it
  if (address?.bairro && !listing.bairro) {
    updatePayload.bairro = address.bairro
  }

  // Normalize address if ViaCEP returned logradouro
  if (address?.logradouro && !listing.endereco_normalizado) {
    updatePayload.endereco_normalizado =
      `${address.logradouro}, ${address.bairro}, ${address.localidade} - ${address.uf}, ${address.cep}`
  }

  // 5. Update the listing
  const { error: updateError } = await supabase
    .from('scraped_listings')
    .update(updatePayload)
    .eq('id', listingId)

  if (updateError) {
    console.error(`Failed to update listing ${listingId}:`, updateError.message)
  }

  return {
    listing_id: listingId,
    contact,
    address,
    creci: creciResult,
    enriched_at: now,
  }
}

// =============================================================================
// Helpers
// =============================================================================

/** Safely cast unknown to string, return undefined if not a string */
function asString(val: unknown): string | undefined {
  if (typeof val === 'string' && val.trim().length > 0) return val.trim()
  if (typeof val === 'number') return String(val)
  return undefined
}

/** Normalize phone: remove non-digits, ensure 10-11 digits */
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  // Brazilian phone: 10 (landline) or 11 (mobile) digits
  if (digits.length >= 10 && digits.length <= 13) {
    // Remove country code 55 if present
    const phone = digits.startsWith('55') && digits.length > 11
      ? digits.slice(2)
      : digits
    return phone.length >= 10 && phone.length <= 11 ? phone : null
  }
  return null
}

/** Fetch with a deadline timestamp */
async function fetchWithDeadline(
  url: string,
  init: RequestInit,
  deadline: number,
): Promise<Response> {
  const remaining = deadline - Date.now()
  if (remaining <= 0) throw new Error('Deadline exceeded')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), remaining)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

/** Simple delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
