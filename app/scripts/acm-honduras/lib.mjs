/**
 * Utilidades compartilhadas dos scripts ACM Honduras — cópia ÚNICA (Story 9.9).
 *
 * Antes, loadEnv/aderência/haversine estavam duplicados em 01/03/04/05. Node não
 * importa os módulos .ts do app sem transpiler, então esta é a cópia-espelho dos
 * canônicos (`src/lib/acm/methodology.ts` e `src/lib/geo.ts`) — a paridade é
 * presa pelo teste `src/lib/acm/scriptsParity.test.ts`: se pesos/fórmulas
 * canônicos mudarem, o teste quebra apontando para cá.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Parse manual de `app/.env.local` (sem dotenv). */
export function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[m[1]] = v
  }
  return env
}

/** Raio de análise padrão (m) — espelho de RAIO_PADRAO_M (methodology.ts). */
export const RAIO_PADRAO_M = 1000

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const sim = (v, alvo) => (alvo <= 0 ? 0 : clamp01(1 - Math.abs(v - alvo) / alvo))

/**
 * Aderência 50/20/30 — espelho de adherenceIndex() (methodology.ts).
 * O comparável dos scripts usa {areaConstruida, areaTerreno, dist}.
 */
export function adherence(target, c, raio = RAIO_PADRAO_M) {
  const simC = sim(c.areaConstruida, target.areaConstruida)
  const simT = c.areaTerreno != null ? sim(c.areaTerreno, target.areaTerreno) : 0
  const prox = c.dist != null ? clamp01(1 - c.dist / raio) : 0
  return 0.5 * simC + 0.2 * simT + 0.3 * prox
}

/** Haversine em metros (não arredondado) — espelho de src/lib/geo.ts. */
export function haversineMeters(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
