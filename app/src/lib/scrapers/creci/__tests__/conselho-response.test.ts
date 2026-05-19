/**
 * Epic 7 Story 7.7 — Conselho Nacional HTML parser tests.
 *
 * Cobre BR-COFECI-004 (AC10):
 *  - HTML com tbody + tr completo -> parseado
 *  - HTML sem tbody -> null
 *  - HTML com tr mas < 6 tds -> null
 *  - Telefone "NAO DIVULGADO" -> ''
 *  - "ATIVO" -> Ativo; "INATIVO" -> Inativo (sem confusao por substring)
 *  - Normalizacao E.164
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseConselhoResponse,
  normalizeTelefoneE164,
} from '@/lib/scrapers/creci/parsers/conselho-response'

const FIXTURE_DIR = join(__dirname, '__fixtures__')
const fx = (name: string) =>
  readFileSync(join(FIXTURE_DIR, name), 'utf-8')

describe('parseConselhoResponse', () => {
  it('parseia HTML completo (tbody + tr com 6 tds) — caso PR-12345', () => {
    const html = fx('conselho-pr-12345.html')
    const result = parseConselhoResponse(html)

    expect(result).not.toBeNull()
    expect(result!.inscricao).toBe('12345')
    expect(result!.nomeCompleto).toBe('FULANO DE TAL DA SILVA')
    expect(result!.situacao).toBe('Ativo')
    expect(result!.telefone).toBe('(41) 99876-5432')
  })

  it('retorna null quando HTML sem tbody (zero resultados)', () => {
    const html = fx('conselho-empty.html')
    expect(parseConselhoResponse(html)).toBeNull()
  })

  it('retorna null quando tr tem menos que 6 tds (malformed)', () => {
    const html = fx('conselho-malformed.html')
    expect(parseConselhoResponse(html)).toBeNull()
  })

  it('telefone "NAO DIVULGADO" -> string vazia (BR-COFECI-004 regra 5)', () => {
    const html = fx('conselho-inativo.html')
    const result = parseConselhoResponse(html)
    expect(result).not.toBeNull()
    expect(result!.telefone).toBe('')
  })

  it('"INATIVO" classifica como Inativo (NAO confundir com "ATIVO" substring)', () => {
    const html = fx('conselho-inativo.html')
    const result = parseConselhoResponse(html)
    expect(result!.situacao).toBe('Inativo')
  })

  it('retorna null se html vazio', () => {
    expect(parseConselhoResponse('')).toBeNull()
  })

  it('retorna null se nome ou inscricao vazios', () => {
    const html = `
      <table><tbody>
        <tr>
          <td>x</td><td><div></div></td><td></td>
          <td>ATIVO</td><td>REGULAR</td><td>11999999999</td>
        </tr>
      </tbody></table>
    `
    expect(parseConselhoResponse(html)).toBeNull()
  })

  it('aceita td sem div explicito no nome (fallback strip_tags)', () => {
    const html = `
      <table><tbody>
        <tr>
          <td>x</td><td>JOAO DA SILVA</td><td>99999</td>
          <td>ATIVO</td><td>REGULAR</td><td>(11) 98765-4321</td>
        </tr>
      </tbody></table>
    `
    const result = parseConselhoResponse(html)
    expect(result?.nomeCompleto).toBe('JOAO DA SILVA')
    expect(result?.inscricao).toBe('99999')
  })

  it('"SUSPENSO" cai em Inativo (qualquer coisa fora de ATIVO)', () => {
    const html = `
      <table><tbody>
        <tr>
          <td>x</td><td><div>FOO</div></td><td>1</td>
          <td>SUSPENSO</td><td>R</td><td>11999999999</td>
        </tr>
      </tbody></table>
    `
    expect(parseConselhoResponse(html)?.situacao).toBe('Inativo')
  })

  it('aceita acentos no nome (encoding UTF-8)', () => {
    const html = `
      <table><tbody>
        <tr>
          <td>x</td><td><div>JOÃO MAURÍCIO DE AQUINO</div></td><td>22222</td>
          <td>ATIVO</td><td>REGULAR</td><td>11999999999</td>
        </tr>
      </tbody></table>
    `
    expect(parseConselhoResponse(html)?.nomeCompleto).toBe(
      'JOÃO MAURÍCIO DE AQUINO',
    )
  })
})

describe('normalizeTelefoneE164', () => {
  it('"(11) 99999-9999" -> +5511999999999', () => {
    expect(normalizeTelefoneE164('(11) 99999-9999')).toBe('+5511999999999')
  })

  it('"11999999999" -> +5511999999999', () => {
    expect(normalizeTelefoneE164('11999999999')).toBe('+5511999999999')
  })

  it('"+55 11 99999-9999" -> +5511999999999', () => {
    expect(normalizeTelefoneE164('+55 11 99999-9999')).toBe('+5511999999999')
  })

  it('fixo "(11) 3333-4444" -> +551133334444', () => {
    expect(normalizeTelefoneE164('(11) 3333-4444')).toBe('+551133334444')
  })

  it('vazio -> vazio', () => {
    expect(normalizeTelefoneE164('')).toBe('')
    expect(normalizeTelefoneE164(null)).toBe('')
    expect(normalizeTelefoneE164(undefined)).toBe('')
  })

  it('formato invalido (muito curto) -> vazio', () => {
    expect(normalizeTelefoneE164('123')).toBe('')
  })

  it('formato invalido (muito longo) -> vazio', () => {
    expect(normalizeTelefoneE164('123456789012345')).toBe('')
  })
})
