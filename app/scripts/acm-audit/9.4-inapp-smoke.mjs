/**
 * Story 9.4 — smoke de aceite in-app sobre PROD (READ-ONLY).
 *
 * Valida os itens (a) e (b) do SPEC-EXEC-STORY-9.4-CROSS-REPO.md §Requisitos 4,
 * usando as funções REAIS do app (adapter → computeLaudo):
 *   (a) `computeLaudo` com `propertyType:'casa'` exclui verticais VIA GUIA
 *       (uso_iptu/complemento do banco, não heurística);
 *   (b) homogeneização FipeZap com `ajustados > 0` (data_venda → dataVenda).
 *
 * Uso (de `app/`):  npx tsx scripts/acm-audit/9.4-inapp-smoke.mjs
 * Exit 1 se (a) ou (b) falharem.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { toAcmComparables } from '../../src/lib/acm/adapter.ts'
import { computeLaudo } from '../../src/lib/acm/methodology.ts'
import {
  FIPEZAP_SP_FONTE,
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
  FIPEZAP_SP_VENDA_RESIDENCIAL,
} from '../../src/lib/acm/data/fipezapSpVendaResidencial.ts'
import { GEO_REFERENCIAS, CONSULTANT_ID_DEFAULT } from '../../src/lib/acm/geoConfig.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return env
}

const env = loadEnv()
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const alvo = GEO_REFERENCIAS.ANDRADE_PERTENCE_132

const { data, error } = await supa.rpc('fn_comparaveis_no_raio', {
  p_lat: alvo.lat,
  p_lng: alvo.lng,
  p_consultant_id: CONSULTANT_ID_DEFAULT,
  p_raio_metros: 1000,
})
if (error) {
  console.error('RPC error:', error.message)
  process.exit(1)
}
console.log(`RPC: ${data.length} comparáveis no raio de 1 km (Andrade Pertence 132)`)

const vendas = data.filter((r) => r.is_venda_real)
const comData = vendas.filter((r) => r.data_venda != null).length
const comUso = vendas.filter((r) => r.uso_iptu != null).length
console.log(`vendas reais: ${vendas.length} | data_venda: ${comData} | uso_iptu: ${comUso}`)

const comparaveis = toAcmComparables(data)
const computation = computeLaudo({
  target: { areaConstruida: 200, areaTerreno: 250 },
  comparaveis,
  propertyType: 'casa',
  homogeneizacao: {
    indice: `${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte}`,
    serie: FIPEZAP_SP_VENDA_RESIDENCIAL,
    dataReferencia: FIPEZAP_SP_ULTIMA_COMPETENCIA,
  },
})

const homog = computation.homogeneizacao
const ajustados = homog.ajustes.length
console.log(`\n(b) homogeneização: aplicada=${homog.aplicada} ajustados=${ajustados} semAjuste=${homog.semAjuste.length}`)

const excluidos = computation.excluidosTipologia ?? []
const guiaExcl = excluidos.filter((e) => e.classificacao?.fonte === 'guia').length
console.log(`(a) gate R5 (alvo casa): excluídos=${excluidos.length} (via guia: ${guiaExcl})`)
for (const e of excluidos.slice(0, 3)) {
  console.log(`    - ${e.endereco} → ${e.classificacao?.rotulo} [${e.classificacao?.fonte}]`)
}

const okB = homog.aplicada === true && ajustados > 0
const okA = excluidos.length > 0 && guiaExcl > 0
console.log(`\n${okA ? 'OK ' : 'FAIL'} (a) verticais excluídos via guia`)
console.log(`${okB ? 'OK ' : 'FAIL'} (b) ajustados > 0`)
process.exit(okA && okB ? 0 : 1)
