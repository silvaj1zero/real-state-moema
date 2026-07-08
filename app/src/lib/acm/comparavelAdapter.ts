/**
 * Adapter compartilhado ComparavelNoRaio (RPC/DB) → LaudoSourceComparable (modelos
 * de PDF) + montagem dos pins do mapa. Centraliza a lógica antes duplicada nas
 * sheets de exportação (Laudo, Deck/Didático, Pacote) — Story 8.7.
 *
 * Inclui os campos da migration 20260616000001: `latitude`/`longitude` (pins) e
 * `anuncio_url` (revisão humana). Dado ausente vira null/"—" — nunca inventado (Art. IV).
 */
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import type { LaudoSourceComparable } from '@/lib/acm/pdf/laudoModel'
import type { MapMarker } from '@/lib/acm/pdf/staticMap'

/** Rótulo de exibição da fonte (tolerante a 'itbi' do DB, fora do union TS). */
export function fonteLabel(fonte: string): string {
  const map: Record<string, string> = {
    itbi: 'ITBImap',
    manual: 'Manual',
    scraping: 'Portal',
    captei: 'Captei',
    cartorio: 'Cartório',
  }
  return map[fonte] ?? (fonte ? fonte.charAt(0).toUpperCase() + fonte.slice(1) : '—')
}

/** ComparavelNoRaio → LaudoSourceComparable (fonte rica dos 4 entregáveis). */
export function comparavelToLaudoSource(c: ComparavelNoRaio): LaudoSourceComparable {
  const f = fonteLabel(c.fonte)
  return {
    endereco: c.endereco,
    areaConstruida: c.area_construida_m2 ?? c.area_m2 ?? 0,
    areaTerreno: c.area_terreno_m2 ?? null,
    preco: c.preco,
    precoM2Terreno: c.preco_m2_terreno ?? null,
    distancia: c.distancia_m,
    fonte: f,
    fonteRef: c.sql_cadastral ?? null,
    codigoRef: c.sql_cadastral ?? null,
    dormitorios: c.dormitorios ?? null,
    suites: c.suites ?? null,
    vagas: c.vagas ?? null,
    sqlCadastral: c.sql_cadastral ?? null,
    // Status confirmado: com URL real → "anúncio confirmado"; senão off-market.
    statusAnuncio:
      c.status_anuncio ?? (c.anuncio_url ? 'anúncio confirmado' : c.is_venda_real ? 'off-market' : null),
    fonteAnuncio: c.sql_cadastral ? `${f} (SQL ${c.sql_cadastral})` : f,
    anuncioUrl: c.anuncio_url ?? null,
    lat: c.latitude ?? null,
    lng: c.longitude ?? null,
    isVendaReal: c.is_venda_real,
  }
}

// Cores dos pins (hex SEM '#') — paleta RE/MAX da legenda do laudo.
const MARKER = { top3: 'D4A843', top45: 'F97316', outros: '2563EB' } as const

/**
 * Pins do mapa estático: imóvel-alvo (vermelho grande) + Top 3 (dourado, numerados
 * 1-3) + Top 4-5 (laranja, 4-5) + demais comparáveis com coords (azul, pequenos).
 * Só plota quem tem lat/lng (degrada graciosamente). `maxOutros` limita o tamanho
 * da URL da Static API. Ranking = ordem de aderência da 8.2 (`computation.ranking`).
 *
 * A Static API desenha os overlays NA ORDEM da lista (o último fica por cima) —
 * por isso a saída vai em camadas: azuis → laranjas → dourados → alvo. Um Top 3
 * nunca fica escondido atrás de um pin azul.
 */
export function buildAcmMapMarkers(
  target: { lat: number; lng: number },
  ranking: { endereco: string }[],
  source: LaudoSourceComparable[],
  opts?: { maxOutros?: number },
): MapMarker[] {
  const rankByEndereco = new Map<string, number>()
  ranking.forEach((r, i) => {
    if (!rankByEndereco.has(r.endereco)) rankByEndereco.set(r.endereco, i)
  })
  const maxOutros = opts?.maxOutros ?? 22
  const top3: MapMarker[] = []
  const top45: MapMarker[] = []
  const outros: MapMarker[] = []
  for (const s of source) {
    if (s.lat == null || s.lng == null) continue
    const rank = rankByEndereco.get(s.endereco)
    if (rank != null && rank < 3) {
      top3.push({ lat: s.lat, lng: s.lng, label: rank + 1, color: MARKER.top3 })
    } else if (rank != null && rank < 5) {
      top45.push({ lat: s.lat, lng: s.lng, label: rank + 1, color: MARKER.top45 })
    } else if (outros.length < maxOutros) {
      outros.push({ lat: s.lat, lng: s.lng, color: MARKER.outros, size: 's' })
    }
  }
  return [...outros, ...top45, ...top3, { lat: target.lat, lng: target.lng, color: '#DC1431', size: 'l' }]
}
