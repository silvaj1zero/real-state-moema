// =============================================================================
// contact-links — helpers de telefone/WhatsApp reusáveis (tel:/wa.me)
//
// Extraído de ContactDataCard (Story 6.4) para reuso na call list FISBO
// (Story 10.1). Comportamento idêntico ao original — apenas centralizado.
// =============================================================================

/** Máscara do telefone para exibição parcial: (11) 9****-1234 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits[2]}****-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ****-${digits.slice(6)}`
  }
  return phone.slice(0, 4) + '****' + phone.slice(-4)
}

/** Formata telefone para exibição: (11) 91234-5678 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

/** Monta o href tel: com DDI 55. */
export function telLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `tel:+55${digits}`
}

/** Monta o href wa.me com DDI 55. */
export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/55${digits}`
}
