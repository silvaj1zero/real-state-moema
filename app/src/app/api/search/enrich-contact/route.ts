import { NextResponse } from 'next/server'
import { enrichListingContact } from '@/lib/contact-enrichment'

/**
 * POST /api/search/enrich-contact
 *
 * Story 6.4 — Enrich a scraped listing with contact data.
 *
 * Body: { listing_id: string }
 *
 * Returns enriched contact, address and CRECI data.
 * 15s timeout via AbortController.
 */
export async function POST(request: Request) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const body = (await request.json()) as { listing_id?: string }

    if (!body.listing_id) {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400 },
      )
    }

    const result = await enrichListingContact(body.listing_id)

    return NextResponse.json(result)
  } catch (err) {
    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: 'Enrichment timed out after 15 seconds' },
        { status: 504 },
      )
    }

    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Contact enrichment error:', message)

    return NextResponse.json(
      { error: `Enrichment failed: ${message}` },
      { status: 500 },
    )
  } finally {
    clearTimeout(timeout)
  }
}
