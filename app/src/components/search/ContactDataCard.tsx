'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Mail, Shield, UserSearch, Loader2 } from 'lucide-react'
import type { ScrapedListing } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ContactDataCardProps {
  listing: ScrapedListing
  onEnrich?: () => void
  isEnriching?: boolean
}

// =============================================================================
// Helpers
// =============================================================================

/** Mask phone: (11) 9****-1234 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits[2]}****-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ****-${digits.slice(6)}`
  }
  return phone.slice(0, 4) + '****' + phone.slice(-4)
}

/** Format phone for display: (11) 91234-5678 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

/** Format phone digits for tel: link */
function telLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `tel:+55${digits}`
}

/** Format phone digits for wa.me link */
function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/55${digits}`
}

// =============================================================================
// ContactDataCard
// =============================================================================

export function ContactDataCard({
  listing,
  onEnrich,
  isEnriching = false,
}: ContactDataCardProps) {
  const hasContact = !!(
    listing.nome_anunciante ||
    listing.telefone_anunciante ||
    listing.email_anunciante ||
    listing.whatsapp_anunciante ||
    listing.creci_anunciante
  )

  // --- No contact data: show enrich button ---
  if (!hasContact) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="text-center py-3">
          <UserSearch className="size-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 mb-3">
            Dados de contato ainda nao enriquecidos.
          </p>
          {onEnrich && (
            <button
              onClick={onEnrich}
              disabled={isEnriching}
              className={cn(
                'min-h-[48px] px-5 py-3 rounded-xl font-medium text-sm',
                'inline-flex items-center gap-2 transition-colors',
                isEnriching
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#003DA5] text-white hover:bg-[#002d7a] active:bg-[#002266]',
              )}
            >
              {isEnriching ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enriquecendo...
                </>
              ) : (
                <>
                  <UserSearch className="size-4" />
                  Enriquecer contato
                </>
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // --- Has contact data: show contact info ---
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Advertiser name */}
      {listing.nome_anunciante && (
        <p className="text-sm font-semibold text-gray-900 mb-3">
          {listing.nome_anunciante}
        </p>
      )}

      {/* Contact icons row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Phone */}
        {listing.telefone_anunciante && (
          <PhoneButton phone={listing.telefone_anunciante} />
        )}

        {/* WhatsApp */}
        {listing.whatsapp_anunciante && (
          <a
            href={whatsappLink(listing.whatsapp_anunciante)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl',
              'bg-green-50 text-green-700 border border-green-200',
              'inline-flex items-center gap-2 text-xs font-medium',
              'hover:bg-green-100 active:bg-green-200 transition-colors',
            )}
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </a>
        )}

        {/* Email */}
        {listing.email_anunciante && (
          <a
            href={`mailto:${listing.email_anunciante}`}
            className={cn(
              'min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl',
              'bg-blue-50 text-blue-700 border border-blue-200',
              'inline-flex items-center gap-2 text-xs font-medium',
              'hover:bg-blue-100 active:bg-blue-200 transition-colors',
            )}
          >
            <Mail className="size-4" />
            E-mail
          </a>
        )}
      </div>

      {/* CRECI badge */}
      {listing.creci_anunciante && (
        <div className="mb-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full',
              'bg-green-100 text-green-800 text-xs font-semibold',
            )}
          >
            <Shield className="size-3.5" />
            CRECI {listing.creci_anunciante}
          </span>
        </div>
      )}

      {/* Enrich button (refresh) */}
      {onEnrich && (
        <button
          onClick={onEnrich}
          disabled={isEnriching}
          className={cn(
            'text-[10px] font-medium transition-colors',
            isEnriching
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-[#003DA5] hover:underline',
          )}
        >
          {isEnriching ? 'Atualizando...' : 'Atualizar dados'}
        </button>
      )}

      {/* LGPD notice */}
      <p className="text-[10px] text-gray-400 mt-2">
        Dados publicos do portal
      </p>
    </div>
  )
}

// =============================================================================
// PhoneButton — reveals full number on click
// =============================================================================

function PhoneButton({ phone }: { phone: string }) {
  const [revealed, setRevealed] = useState(false)

  if (revealed) {
    return (
      <a
        href={telLink(phone)}
        className={cn(
          'min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl',
          'bg-blue-50 text-blue-700 border border-blue-200',
          'inline-flex items-center gap-2 text-xs font-medium',
          'hover:bg-blue-100 active:bg-blue-200 transition-colors',
        )}
      >
        <Phone className="size-4" />
        {formatPhone(phone)}
      </a>
    )
  }

  return (
    <button
      onClick={() => setRevealed(true)}
      className={cn(
        'min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl',
        'bg-gray-50 text-gray-700 border border-gray-200',
        'inline-flex items-center gap-2 text-xs font-medium',
        'hover:bg-gray-100 active:bg-gray-200 transition-colors',
      )}
    >
      <Phone className="size-4" />
      <span>{maskPhone(phone)}</span>
      <span className="text-[10px] text-[#003DA5] font-semibold ml-1">Revelar</span>
    </button>
  )
}
