/**
 * Configuração geográfica canônica do pipeline ACM/crawler — Story 9.7.
 *
 * Fonte única importável para viewbox, whitelist de bairros ViaCEP, aliases,
 * CEPs/pontos de geocode de referência e raio canônico de análise.
 *
 * Art. IV (No Invention): cada constante tem fonte rastreável ao arquivo de
 * origem ou ao dado ITBI PROD. Nenhum bairro ou coordenada foi inventado.
 *
 * Regra de imutabilidade: os datasets congelados em docs/acm/{caso}/dataset.json
 * NAO devem ser regenerados ao alterar este arquivo. Esta config é para
 * FUTUROS builders; os casos 113/132/honduras permanecem com seus valores
 * de origem (iguais a estes, exceto divergências documentadas abaixo).
 */

// ---------------------------------------------------------------------------
// Raio canônico de análise
// ---------------------------------------------------------------------------

/**
 * Raio padrão de análise em metros (1.000 m).
 * Fonte canônica: methodology.ts (RAIO_PADRAO_M) — RE-EXPORTADO aqui, não
 * duplicado (QA-fix 9.7: duas fontes de verdade era o anti-padrão da story).
 * Builders 113/132/honduras convergem para o mesmo valor (RAIO_M=1000).
 */
export { RAIO_PADRAO_M } from './methodology'

// ---------------------------------------------------------------------------
// Viewbox / bounding box para geocoding Mapbox (crawler + geocode de alvo)
// ---------------------------------------------------------------------------

/**
 * Bounding box Mapbox para geocoding de endereços na região Moema/Jardins.
 * Formato: 'lng_sw,lat_sw,lng_ne,lat_ne' (SW → NE).
 *
 * Fonte: app/src/lib/geocoding.ts:11 (MOEMA_BBOX = '-46.68,-23.62,-46.63,-23.57').
 *
 * NOTA: app/src/lib/apify.ts usa MOEMA_NEIGHBORHOODS (lista textual, não viewbox)
 * para filtro pós-scrape. Não há viewbox no apify.ts atual.
 * Pendente de migração para cá quando o Épico 7 (edição paralela do founder)
 * encerrar — registrado em CONFIG-GEOGRAFICA.md §Pendências.
 */
export const MOEMA_BBOX = '-46.68,-23.62,-46.63,-23.57'

// ---------------------------------------------------------------------------
// Whitelist de bairros ViaCEP (filtro de homônimos city-wide)
// ---------------------------------------------------------------------------

/**
 * Bairros oficiais que intersectam o círculo de 1 km em torno do alvo
 * (fronteira Vila Olímpia / Moema-Pássaros / Jardins).
 *
 * A busca ViaCEP é por NOME de logradouro — nomes de rua repetem city-wide
 * (ex.: "Rua das Flores" existe em 40 bairros). Um match fora desta lista é
 * homônimo de outra região → descartado como 'não verificado'.
 *
 * Fonte: scripts/acm-andrade-pertence/04-build-dataset.mjs:124 (BAIRROS_NO_RAIO)
 *        scripts/acm-andrade-pertence-132/04-build-dataset.mjs:120 (idêntico)
 * Status: CONVERGENTE — ambos os builders têm exatamente os mesmos 8 bairros.
 *
 * NOTA para o caso Honduras: o raio de 1 km em torno de Rua Honduras 629
 * (Jardim Paulista) abrange outros bairros (Jardim América, Jardim Europa,
 * Jardim Paulistano, Itaim Bibi). O caso Honduras usa whitelist diferente
 * — o dataset está congelado e NÃO deve importar daqui.
 */
export const BAIRROS_NO_RAIO_VILA_OLIMPIA: ReadonlySet<string> = new Set([
  'Vila Olímpia',
  'Vila Uberabinha', // denominação ViaCEP de parte da Vila Olímpia
  'Moema',
  'Indianópolis',   // denominação ViaCEP de parte de Moema
  'Vila Nova Conceição',
  'Cidade Monções',
  'Itaim Bibi',
  'Brooklin Novo',
])

/**
 * Filtro pós-scrape para Apify: bairros aceitos pelo portal (lista de mercado,
 * sem acento normalizado). Fonte: app/src/lib/apify.ts:434 (MOEMA_NEIGHBORHOODS).
 *
 * NOTA: esta lista é mais ampla que BAIRROS_NO_RAIO_VILA_OLIMPIA porque serve
 * para pré-filtro do portal (captura ampla), enquanto a whitelist ViaCEP serve
 * para confirmação de bairro real (restrição). São propósitos distintos.
 *
 * Pendente de migração do apify.ts → aqui (arquivo em edição paralela Épico 7).
 */
export const MOEMA_NEIGHBORHOODS_PORTAL: ReadonlyArray<string> = [
  'moema', 'indianópolis', 'indianopolis', 'vila olímpia', 'vila olimpia',
  'itaim bibi', 'vila nova conceição', 'vila nova conceicao',
  'planalto paulista', 'campo belo', 'brooklin', 'jardim lusitânia',
  'jardim lusitania', 'vila clementino',
]

// ---------------------------------------------------------------------------
// Aliases ViaCEP → nome de mercado
// ---------------------------------------------------------------------------

/**
 * Denominações ViaCEP → nome de mercado (mesma região oficial).
 * ViaCEP usa nomes históricos/administrativos que divergem do uso corrente.
 *
 * Fonte: scripts/acm-andrade-pertence/04-build-dataset.mjs:164 (BAIRRO_NORMALIZADO)
 *        scripts/acm-andrade-pertence-132/04-build-dataset.mjs:130 (idêntico)
 * Status: CONVERGENTE — ambos os builders têm exatamente o mesmo mapeamento.
 *
 * Racional dos aliases (Dev Notes da Story 9.7):
 *  - "Vila Uberabinha" = Vila Olímpia no cadastro PMSP/ViaCEP; mesmo bairro no mercado.
 *  - "Indianópolis" = Moema no cadastro ViaCEP; subdivide o bairro oficial de Moema.
 */
export const BAIRRO_NORMALIZADO: Readonly<Record<string, string>> = {
  'Vila Uberabinha': 'Vila Olímpia',
  'Indianópolis': 'Moema',
}

/**
 * Função auxiliar: normaliza bairro ViaCEP → nome de mercado.
 */
export function normalizaBairro(bairro: string | null | undefined): string | null {
  if (bairro == null) return null
  return BAIRRO_NORMALIZADO[bairro] ?? bairro
}

// ---------------------------------------------------------------------------
// Pontos de geocode de referência (alvos canônicos)
// ---------------------------------------------------------------------------

/**
 * Coordenadas dos imóveis-alvo dos casos congelados.
 * Fonte: TARGET.geo em cada builder (mapbox geocode com data).
 * Documentados aqui para referência; os datasets usam seus próprios valores.
 * NUNCA alterar retroativamente — datasets congelados.
 */
export const GEO_REFERENCIAS = {
  ANDRADE_PERTENCE_113: {
    endereco: 'Rua Dr. Andrade Pertence, 113',
    bairro: 'Vila Olímpia',
    cep: '04549-020',
    lat: -23.604671,
    lng: -46.675232,
    fonte: 'mapbox 2026-07-08',
  },
  ANDRADE_PERTENCE_132: {
    endereco: 'Rua Dr. Andrade Pertence, 132',
    bairro: 'Vila Olímpia',
    cep: '04549-020',
    lat: -23.604158,
    lng: -46.676145,
    fonte: 'mapbox 2026-07-09',
  },
  HONDURAS_629: {
    endereco: 'Rua Honduras, 629',
    bairro: 'Jardim Paulista', // CEP 01428-000 → Jardim Paulista (não Jardim América)
    cep: '01428-000',
    // lat/lng resolvidos em runtime pelo script 01-discover.mjs (Google/Mapbox)
    // não hardcoded aqui pois o script de descoberta os deriva dinamicamente
    lat: null as number | null,
    lng: null as number | null,
    fonte: 'google/mapbox dinâmico (01-discover.mjs)',
  },
} as const

// ---------------------------------------------------------------------------
// Consultant ID padrão
// ---------------------------------------------------------------------------

/**
 * UUID do consultor que detém os ITBI PROD.
 * Fonte: scripts/acm-andrade-pertence/04-build-dataset.mjs:56 + 132/04 + 9.4-sink.
 * Todos os scripts usam o mesmo valor — CONVERGENTE.
 */
export const CONSULTANT_ID_DEFAULT = '1f7ec2b3-d414-4850-8b6a-32faa8e1f47c'

// ---------------------------------------------------------------------------
// Filtros de recorte canônicos
// ---------------------------------------------------------------------------

/**
 * Teto de R$/m² para o recorte de classe de valor (R4).
 * Fonte: builders 113 e 132 (TETO_PRECO_M2 = 22_000).
 * Racional: piso do Score A na régua do Material Didático 1.2.
 * Status: CONVERGENTE — ambos os builders usam 22.000.
 */
export const TETO_PRECO_M2 = 22_000
