/**
 * H-2 (roadmap ACM) — gera o LAUDO ACM Honduras **v5** em PDF, offline, com:
 *   - guard-rail anti-auto-referência ATIVO (Story 9.8: endereco/vagas/precoPretendido);
 *   - homogeneização FipeZap + bairro real via CEP (Stories 9.11/9.12);
 *   - headline em FAIXA com cenário aderente de referência (Story 9.10).
 *
 * Rodar de `app/`:  npx -y tsx scripts/acm-honduras/06-build-laudo-v5.tsx
 * Saída: `docs/acm/honduras-629/LAUDO-ACM-Honduras-v5-<data>.pdf` (+ JSON de revisão).
 *
 * Fontes: fixture congelado (laudo v4) + dataset do corretor (S/V/D, status, fonte
 * por item) + ingestão Story 9.12 (SQL/data/CEP/bairro reais). Art. IV: nenhum
 * número novo é inventado aqui — comercial (meta/anúncio) permanece o do v4 até
 * a validação com a Luciana (H-3).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToBuffer } from '@react-pdf/renderer'

import { computeLaudo, RAIO_PADRAO_M } from '@/lib/acm/methodology'
import { haversineMeters } from '@/lib/geo'
import { buildAcmMapMarkers } from '@/lib/acm/comparavelAdapter'
import { buildStaticMapUrl, resolveStaticMapImage } from '@/lib/acm/pdf/staticMap'
import { loadEnv } from './lib.mjs'
import {
  HONDURAS_FATORES_LIQUIDEZ,
  HONDURAS_RESIDUAL,
  HONDURAS_TARGET,
} from '@/lib/acm/honduras.fixture'
import {
  HONDURAS_HOMOGENEIZACAO,
  HONDURAS_VENDAS,
  hondurasComparaveisHomogeneizados,
} from '@/lib/acm/data/hondurasVendas'
import {
  buildLaudoModel,
  type LaudoInput,
  type LaudoSourceComparable,
} from '@/lib/acm/pdf/laudoModel'
import { registerBrandFonts } from '@/lib/acm/pdf/theme'
import { COMPARAVEIS, OFERTAS_ATIVAS, TARGET } from './honduras-dataset.mjs'

const comparaveis = hondurasComparaveisHomogeneizados()

// Guard-rail 9.8 ativo: alvo com endereço, vagas e preço pretendido (dataset/laudo capa).
const computation = computeLaudo({
  target: {
    ...HONDURAS_TARGET,
    endereco: TARGET.endereco,
    vagas: TARGET.vagas,
    precoPretendido: TARGET.precoPretendido,
  },
  comparaveis,
  fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
  residual: HONDURAS_RESIDUAL,
  homogeneizacao: HONDURAS_HOMOGENEIZACAO,
})

// Fonte rica por item: dataset do corretor (S/V/D, status, fonte) + Story 9.12
// (SQL real dos 23 e bairro verificado via CEP — corrige o rótulo do v4).
const vendaPorEndereco = new Map(HONDURAS_VENDAS.map((v) => [v.endereco, v]))
const source: LaudoSourceComparable[] = COMPARAVEIS.map((c) => {
  const venda = vendaPorEndereco.get(c.end)
  if (!venda) throw new Error(`Sem registro Story 9.12 para "${c.end}"`)
  return {
    endereco: c.end,
    areaConstruida: c.areaConstruida,
    areaTerreno: c.areaTerreno,
    preco: c.preco,
    precoM2Terreno: c.m2t,
    distancia: c.dist,
    codigoRef: c.ref,
    bairro: venda.bairroReal,
    dormitorios: c.svd?.d ?? null,
    suites: c.svd?.s ?? null,
    vagas: c.svd?.v ?? null,
    sqlCadastral: venda.sql,
    statusAnuncio: c.status,
    fonte: 'ITBI/PMSP',
    fonteAnuncio: c.fonteRef,
    anuncioUrl: c.anuncioUrl,
    isVendaReal: true,
  }
})

const input: LaudoInput = {
  enderecoAlvo: TARGET.endereco,
  // Rótulo honesto v5: o CEP do alvo (01428-000) é Jardim Paulista — laudo Sec. 3 já
  // admitia a fronteira; a capa deixa de afirmar "Jardim América" seco.
  bairro: 'Jardim América / Jardim Paulista (fronteira — CEP 01428-000)',
  proprietario: 'Clarisia Ramos',
  areaConstruida: TARGET.areaConstruida,
  areaTerreno: TARGET.areaTerreno,
  programa: {
    dormitorios: TARGET.dormitorios,
    suites: TARGET.suites,
    vagas: TARGET.vagas,
  },
  precoPretendido: TARGET.precoPretendido,
  precoPedidoReal: TARGET.precoPedidoReal,
  // Âncoras comerciais do v4 — revisar com a Luciana (H-3) antes da captação.
  precoAnuncioRecomendado: 11_500_000,
  metaFechamento: TARGET.faixaFechamento,
  dataEmissao: new Date().toLocaleDateString('pt-BR'),
  residualParams: HONDURAS_RESIDUAL,
  // Sec. 3 — ofertas ativas georreferenciadas no raio (laudo v4 Sec. 3).
  ofertasAtivas: OFERTAS_ATIVAS.filter((o) => o.dist != null).map((o) => ({
    rua: o.end,
    area: o.areaConstruida,
    pedido: o.precoPedido,
    precoM2: o.m2c,
    distancia: o.dist,
  })),
  // Sec. 6 — concorrência (laudo v4 Sec. 6a/6b, leituras textuais do v4).
  concorrentesDiretos: [
    {
      rua: 'Rua Groenlândia',
      area: 600,
      programa: '3 dorm',
      pedido: 8_000_000,
      precoM2: 13_300,
      leitura: 'Mesmo nº de dormitórios; preço de reposicionamento',
    },
    {
      rua: 'Rua Suécia, 526',
      area: 700,
      programa: '6 dorm',
      pedido: 9_795_000,
      precoM2: 13_993,
      leitura: '"Potencial p/ reformar ou construir"',
    },
  ],
  referenciasSuperiores: [
    {
      rua: 'Rua Argentina, 685',
      area: 865,
      programa: '9d/5s',
      pedido: 26_000_000,
      precoM2: 30_058,
      leitura: 'Usada, c/ potencial de modernização',
    },
    {
      rua: 'Rua México',
      area: 900,
      programa: '4s',
      pedido: 24_000_000,
      precoM2: 26_667,
      leitura: 'Usada, alto padrão',
    },
    {
      rua: 'Jardim América (Oito)',
      area: 800,
      programa: '5s/12v',
      pedido: 29_000_000,
      precoM2: 36_250,
      leitura: 'Área idêntica, porém programa superior',
    },
  ],
}

// ---------------------------------------------------------------------------
// Mapa (Sec. 3) — mesmo mecanismo da UI (Mapbox Static Images, light-v11):
// geocodifica alvo + 23 comparáveis (cache em 06-geocode-cache.json, auditável)
// e embute o PNG como data URL. Sem token/rede → degrada para "sem mapa".
// ---------------------------------------------------------------------------
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const geocodeCachePath = path.join(scriptDir, '06-geocode-cache.json')

interface GeoPonto {
  lat: number
  lng: number
  placeName: string
}

async function geocode(
  query: string,
  token: string,
  perto?: { lat: number; lng: number },
): Promise<GeoPonto | null> {
  // bbox ±~2,2 km em torno do alvo: exclui homônimas do interior (Chile/Canadá/
  // Cuba em Paulínia, Catanduva...) por construção.
  const extra = perto
    ? `&proximity=${perto.lng},${perto.lat}&bbox=${perto.lng - 0.022},${perto.lat - 0.02},${
        perto.lng + 0.022
      },${perto.lat + 0.02}`
    : ''
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query,
  )}.json?access_token=${encodeURIComponent(token)}&country=br&limit=1${extra}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as {
    features?: { center: [number, number]; place_name: string }[]
  }
  const f = data.features?.[0]
  if (!f) return null
  return { lat: f.center[1], lng: f.center[0], placeName: f.place_name }
}

async function resolverMapaUrl(): Promise<string | null> {
  const env = loadEnv() as Record<string, string>
  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN || env.MAPBOX_TOKEN
  if (!token) {
    console.warn('Sem NEXT_PUBLIC_MAPBOX_TOKEN em .env.local — laudo sai sem mapa.')
    return null
  }

  const cache: Record<string, GeoPonto> = existsSync(geocodeCachePath)
    ? (JSON.parse(readFileSync(geocodeCachePath, 'utf8')) as Record<string, GeoPonto>)
    : {}
  const geocodeCached = async (
    query: string,
    proximity?: { lat: number; lng: number },
  ): Promise<GeoPonto | null> => {
    if (cache[query]) return cache[query]
    const ponto = await geocode(query, token, proximity)
    if (ponto) cache[query] = ponto
    await new Promise((r) => setTimeout(r, 120)) // rate limit Mapbox free tier
    return ponto
  }

  const alvo = await geocodeCached(TARGET.geocodeQuery)
  if (!alvo) {
    console.warn('Geocode do alvo falhou — laudo sai sem mapa.')
    return null
  }

  // Pins dos comparáveis: geocode com CEP verificado (Story 9.12) + proximity do
  // alvo — ruas curtas (Canadá, Chile, Cuba...) têm homônimas no interior. Ponto a
  // mais de 2 km do alvo = match ruim → fica fora do mapa, com aviso.
  for (const s of source) {
    const cep = vendaPorEndereco.get(s.endereco)?.cep
    const ponto = await geocodeCached(
      `${s.endereco}, ${s.bairro}, São Paulo, SP, ${cep ?? ''}, Brasil`,
      alvo,
    )
    if (!ponto) {
      console.warn(`Geocode falhou (sem pin): ${s.endereco}`)
      continue
    }
    if (haversineMeters(alvo, ponto) > 2 * RAIO_PADRAO_M) {
      console.warn(`Geocode fora do raio 2 km (sem pin): ${s.endereco} → ${ponto.placeName}`)
      continue
    }
    s.lat = ponto.lat
    s.lng = ponto.lng
  }
  writeFileSync(geocodeCachePath, JSON.stringify(cache, null, 2))

  // Proporção = caixa do PDF (515×280pt, `objectFit: cover`): imagem 942×512@2x
  // (mesma razão ≈1,84) não sofre corte vertical e dobra o detalhe de ruas/bairros;
  // padding=44 dá folga para o pin mais extremo (o nº 4, Henrique Martins,
  // geocodificado ao sul) não encostar na borda.
  const rawUrl = buildStaticMapUrl({
    token,
    center: { lat: alvo.lat, lng: alvo.lng },
    radiusMeters: RAIO_PADRAO_M,
    markers: buildAcmMapMarkers(alvo, computation.ranking, source),
    width: 942,
    height: 512,
    padding: 44,
  })
  // toDataUrl injetado: o default usa FileReader (browser); em node é Buffer.
  return resolveStaticMapImage(rawUrl, {
    toDataUrl: async (b) =>
      `data:${b.type || 'image/png'};base64,${Buffer.from(await b.arrayBuffer()).toString('base64')}`,
  })
}

/** Grava o arquivo; se estiver aberto no visualizador (EBUSY), usa sufixo -revN. */
function escreverComFallback(destino: string, dados: Buffer | string): string {
  for (let rev = 0; ; rev++) {
    const alvo =
      rev === 0 ? destino : destino.replace(/(\.[a-z.]+)$/i, `-rev${rev + 1}$1`)
    try {
      writeFileSync(alvo, dados)
      return alvo
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EBUSY' || rev >= 9) throw err
    }
  }
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const outDir = path.join(repoRoot, 'docs', 'acm', 'honduras-629')
mkdirSync(outDir, { recursive: true })
const hoje = new Date().toISOString().slice(0, 10)

async function main(): Promise<void> {
  // Fontes da marca (Montserrat/Inter) ANTES de importar o Document — em node o
  // registro automático do theme é no-op e o StyleSheet captura FONTS por valor;
  // sem isto o PDF sai em Helvetica (WinAnsi), que não tem −, ≥, ● etc.
  const fontsDir = path.join(scriptDir, '..', '..', 'public', 'fonts')
  const fontsOk = registerBrandFonts({
    montserratBold: path.join(fontsDir, 'Montserrat-Bold.ttf'),
    montserratSemiBold: path.join(fontsDir, 'Montserrat-SemiBold.ttf'),
    interRegular: path.join(fontsDir, 'Inter-Regular.ttf'),
    interMedium: path.join(fontsDir, 'Inter-Medium.ttf'),
  })
  console.log(`Fontes de marca: ${fontsOk ? 'Montserrat/Inter registradas' : 'FALLBACK Helvetica'}`)
  const { LaudoDocument } = await import('@/lib/acm/pdf/LaudoDocument')

  const mapaUrl = await resolverMapaUrl()
  if (mapaUrl) console.log(`Mapa: embutido (${(mapaUrl.length / 1024).toFixed(0)} KB base64)`)
  const model = buildLaudoModel(computation, source, { ...input, mapaUrl })
  const buf = await renderToBuffer(<LaudoDocument model={model} />)
  const pdfPath = escreverComFallback(path.join(outDir, `LAUDO-ACM-Honduras-v5-${hoje}.pdf`), buf)

  // Resumo de revisão (H-2: "revisar à luz da auditoria antes de usar na captação").
  const revisao = {
  geradoEm: new Date().toISOString(),
  homogeneizacao: {
    indice: computation.homogeneizacao.indice,
    dataReferencia: computation.homogeneizacao.dataReferencia,
    ajustados: computation.homogeneizacao.ajustes.length,
    semAjuste: computation.homogeneizacao.semAjuste,
    fatorMin: Math.min(...computation.homogeneizacao.ajustes.map((a) => a.fator)),
    fatorMax: Math.max(...computation.homogeneizacao.ajustes.map((a) => a.fator)),
  },
  medianaPrecoM2: computation.medianaPrecoM2,
  headline: computation.headline,
  faixaSensibilidade: computation.faixaSensibilidade,
  composicaoBairros: computation.composicaoBairros,
  desagioMedidoPercent: computation.desagioMedidoPercent,
  coAncoraTerreno: computation.coAncoraTerreno,
  autoReferenciasExcluidas: computation.autoReferenciasExcluidas,
  ancorasComerciaisV4: {
    precoAnuncioRecomendado: input.precoAnuncioRecomendado,
    metaFechamento: input.metaFechamento,
    nota: 'Mantidas do v4 — validar com a Luciana (H-3) frente à faixa homogeneizada.',
  },
}
const jsonPath = escreverComFallback(
  path.join(outDir, `LAUDO-ACM-Honduras-v5-${hoje}.computation.json`),
  JSON.stringify(revisao, null, 2),
)

console.log(`PDF:  ${pdfPath} (${(buf.length / 1024).toFixed(0)} KB)`)
console.log(`JSON: ${jsonPath}`)
console.log(
  `Headline mercado: ${revisao.headline.mercado.min.toLocaleString('pt-BR')} – ${revisao.headline.mercado.max.toLocaleString('pt-BR')}`,
)
console.log(
  `Fechamento: ${revisao.headline.fechamento.min.toLocaleString('pt-BR')} – ${revisao.headline.fechamento.max.toLocaleString('pt-BR')}`,
)
console.log(`Composição:`, revisao.composicaoBairros)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
