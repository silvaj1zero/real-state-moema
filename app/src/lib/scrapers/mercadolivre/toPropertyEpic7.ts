/**
 * Epic 7 — Mapper ParsedDetail -> PropertyEpic7 envelope (Story 7.4 AC4).
 *
 * Constroi tambem `AdvertiserSignals` (subset sincrono — CRECI lookup +
 * CNAE lookup ficam para o caller via Story 7.7 + Story 7.5).
 *
 * PUREZA: TS puro. Importa schemas Epic 7 e classifier (Story 7.3).
 */

import type { PropertyEpic7 } from '../../schemas/epic7/property-epic7'
import type {
  AdvertiserSignals,
  PhoneType,
  PublisherType,
} from '../classify-advertiser'
import { nameAppearsPersonal } from '../classify-advertiser'

import type { ParsedDetail } from './parseDetail'

export interface ToPropertyOptions {
  /** Resultado do CRECI lookup (Story 7.7) — boolean. Default false. */
  hasCRECI?: boolean
  /**
   * Contagem de anuncios desse telefone — Story 7.4 caller faz query a
   * `scraped_listings` e injeta. Default 1 (FISBO-friendly).
   */
  listingCountByPhone?: number
  /** Override fixo para testes — geralmente nao usado em prod. */
  phoneType?: PhoneType
  /**
   * Story 7.11 — publisherType nativo, se a fonte expuser. MercadoLivre
   * NAO expoe -> caller ML deixa undefined (segue heuristica 4-signal).
   */
  publisherType?: PublisherType
}

const MOBILE_DIGIT9_RE = /^\(\d{2}\)\s+9/

/**
 * Detecta tipo de telefone via heuristica brasileira:
 *  - 5 digitos na primeira metade ('(11) 91234-5678') => mobile
 *  - 4 digitos => landline
 *  - mascarado ('(11) ****-1234') => unknown
 */
export function detectPhoneType(phone: string | null): PhoneType {
  if (!phone) return 'unknown'
  if (/\*/.test(phone)) return 'unknown'
  if (MOBILE_DIGIT9_RE.test(phone)) return 'mobile'
  if (/^\(\d{2}\)\s+\d{4}-\d{4}$/.test(phone)) return 'landline'
  return 'unknown'
}

/** Extrai DDD do telefone (`'(11) ...'` -> `'11'`). */
export function extractDDD(phone: string | null): string | undefined {
  if (!phone) return undefined
  const m = /^\((\d{2})\)/.exec(phone)
  return m ? m[1] : undefined
}

/**
 * AC4 — converte ParsedDetail + url para envelope canonico PropertyEpic7.
 *
 * Campos `classification`/`confidence`/`signals` ficam vazios aqui — a
 * Story 7.4 caller chama `classifyAdvertiser` e UPDATE a row depois.
 */
export function toPropertyEpic7(
  parsed: ParsedDetail,
  url: string,
): PropertyEpic7 {
  const external_id = parsed.external_id ?? `ml-${hashUrl(url)}`
  const cnpjClean = parsed.cnpj_anunciante ?? null

  return {
    portal: 'mercadolivre',
    external_id,
    url,
    advertisers: {
      agent: parsed.creci_anunciante
        ? {
            uuid: null,
            name: parsed.nome_anunciante,
            email: null,
            phones: parsed.telefone_anunciante
              ? [
                  {
                    number: parsed.telefone_anunciante,
                    type: detectPhoneType(parsed.telefone_anunciante) === 'mobile' ? 'mobile' : null,
                    primary: true,
                  },
                ]
              : null,
            creci: parsed.creci_anunciante,
            creci_validated: false,
          }
        : null,
      broker:
        cnpjClean && parsed.nome_anunciante
          ? {
              uuid: null,
              name: parsed.nome_anunciante,
              cnpj: cnpjClean,
            }
          : null,
      builder: null,
      office: null,
      classification: 'unknown',
      classification_confidence: 0,
      classification_signals: [],
      // Story 7.11 — MercadoLivre nao expoe publisherType nativo -> null
      // (segue heuristica 4-signal).
      publisher_type: null,
    },
    home_flags: {
      is_pending: false,
      is_contingent: false,
      is_new_construction: /lancamento|na planta|em obra/i.test(parsed.descricao ?? '') || false,
      is_fisbo_inferred: false,
      is_pf_disclosed: !cnpjClean && nameAppearsPersonal(parsed.nome_anunciante),
      is_pj_disclosed: !!cnpjClean,
      has_creci_validated: false,
    },
    raw_data: {
      titulo: parsed.titulo,
      preco: parsed.preco,
      area_m2: parsed.area_m2,
      quartos: parsed.quartos,
      banheiros: parsed.banheiros,
      endereco_texto: parsed.endereco_texto,
      bairro: parsed.bairro,
      cidade: parsed.cidade,
      telefone_anunciante: parsed.telefone_anunciante,
      whatsapp_anunciante: parsed.whatsapp_anunciante,
      descricao: parsed.descricao,
      foto_urls: parsed.foto_urls,
    },
  }
}

/**
 * AC5 — constroi AdvertiserSignals para alimentar classifyAdvertiser
 * (Story 7.3). CNAE e responsabilidade do caller (resolvido async via
 * lookupCNAE antes de classificar — ver Story 7.3 contract).
 */
export function buildAdvertiserSignals(
  parsed: ParsedDetail,
  opts: ToPropertyOptions = {},
): AdvertiserSignals {
  const phoneType = opts.phoneType ?? detectPhoneType(parsed.telefone_anunciante)
  return {
    hasCRECI: !!opts.hasCRECI || !!parsed.creci_anunciante,
    cnpj: parsed.cnpj_anunciante ?? undefined,
    cnae: undefined, // caller resolve via lookupCNAE
    phoneType,
    phoneDDD: extractDDD(parsed.telefone_anunciante),
    listingCountByPhone: opts.listingCountByPhone ?? 1,
    nameAppearsPersonal: nameAppearsPersonal(parsed.nome_anunciante),
    // Story 7.11 — passthrough; undefined para ML (sem publisherType nativo).
    publisherType: opts.publisherType,
  }
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Hash determinstico fraco — usado so como fallback de external_id. */
function hashUrl(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}
