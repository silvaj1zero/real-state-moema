'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useFrogContacts, FROG_CONFIG, FROG_CATEGORIES } from '@/hooks/useFrog'
import type { FonteFrog, FrogContact } from '@/lib/supabase/types'
import { FrogContactForm } from './FrogContactForm'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// FrogContactList — Ambassador management list
// ---------------------------------------------------------------------------

interface FrogContactListProps {
  filterCategory?: FonteFrog
  className?: string
}

export function FrogContactList({ filterCategory, className }: FrogContactListProps) {
  const user = useAuthStore((s) => s.user)
  const { contacts, isLoading } = useFrogContacts(
    user?.id ?? null,
    filterCategory
  )
  const [showForm, setShowForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FonteFrog | undefined>(filterCategory)

  // Group contacts by category
  const grouped = contacts.reduce<Record<FonteFrog, FrogContact[]>>(
    (acc, contact) => {
      if (!acc[contact.categoria]) {
        acc[contact.categoria] = []
      }
      acc[contact.categoria].push(contact)
      return acc
    },
    {} as Record<FonteFrog, FrogContact[]>
  )

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="w-5 h-5 border-2 border-[#003DA5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveFilter(undefined)}
          className={cn(
            'shrink-0 h-7 px-3 rounded-full text-xs font-medium border transition-colors',
            !activeFilter
              ? 'bg-[#003DA5] text-white border-transparent'
              : 'bg-white text-gray-600 border-gray-300'
          )}
        >
          Todos
        </button>
        {FROG_CATEGORIES.map((cat) => {
          const config = FROG_CONFIG[cat]
          const isActive = activeFilter === cat

          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(isActive ? undefined : cat)}
              className={cn(
                'shrink-0 h-7 px-3 rounded-full text-xs font-medium border transition-colors',
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-300'
              )}
              style={isActive ? { backgroundColor: config.color } : undefined}
            >
              {config.label} - {config.fullLabel}
            </button>
          )
        })}
      </div>

      {/* Contact list, grouped by category */}
      {contacts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">Nenhum embaixador cadastrado</p>
          <p className="text-xs text-gray-400 mt-1">
            Adicione contatos que geram indica\u00e7\u00f5es
          </p>
        </div>
      ) : (
        <>
          {/* If no active filter, show grouped; otherwise show flat list */}
          {!activeFilter ? (
            FROG_CATEGORIES.filter((cat) => grouped[cat]?.length > 0).map(
              (cat) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: FROG_CONFIG[cat].color }}
                    >
                      {FROG_CONFIG[cat].label}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">
                      {FROG_CONFIG[cat].fullLabel}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({grouped[cat].length})
                    </span>
                  </div>
                  <div className="space-y-2 ml-7">
                    {grouped[cat].map((contact) => (
                      <ContactRow key={contact.id} contact={contact} />
                    ))}
                  </div>
                </div>
              )
            )
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <ContactRow key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add button */}
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-[#003DA5] hover:text-[#003DA5] transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        + Embaixador
      </button>

      {/* Contact form sheet */}
      {showForm && (
        <FrogContactForm
          onClose={() => setShowForm(false)}
          defaultCategory={activeFilter}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ContactRow — single contact row
// ---------------------------------------------------------------------------

function ContactRow({ contact }: { contact: FrogContact }) {
  const config = FROG_CONFIG[contact.categoria]

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
      {/* Avatar placeholder */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: config.color }}
      >
        {contact.nome.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {contact.nome}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: config.color }}
          >
            {config.fullLabel}
          </span>
          {contact.notas && (
            <span className="text-[10px] text-gray-400 truncate">
              {contact.notas}
            </span>
          )}
        </div>
      </div>

      {/* Leads generated badge */}
      <div className="text-right shrink-0">
        <span className="text-lg font-bold text-gray-900">
          {contact.leads_gerados}
        </span>
        <p className="text-[9px] text-gray-400">leads</p>
      </div>
    </div>
  )
}
