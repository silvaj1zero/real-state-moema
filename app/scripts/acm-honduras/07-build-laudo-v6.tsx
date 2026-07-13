/**
 * LAUDO ACM Honduras **v6** — migração para a base DOCUMENTAL do alvo
 * (matrícula 116.360 + cadastro fiscal IPTU/GeoSampa, 13-Jul-2026):
 *
 *   - área construída do alvo: 800 m² (anúncio, v5) → **441 m²** (averbação
 *     Av.03/1996 = lançamento IPTU via GeoSampa, SQL 014.071.0030-0);
 *   - área de terreno: 1.000 m² → **1.050 m²** (matrícula: lote 13 q.11, 21×50 m;
 *     GeoSampa qt_area_terreno=1050; medição satélite do operador 1.046,3 m²);
 *   - âncoras comerciais do v4 (anúncio recomendado / meta) SUSPENSAS: eram
 *     função dos 800 m² — decisão comercial pendente com a Luciana (H-3);
 *   - considerações e recomendações (cenários A–D, regularização, ônus) entram
 *     no Sumário/Parecer/Sensibilidade — fonte:
 *     docs/acm/honduras-629/CONDICIONANTES-MATRICULA-116360-20260713.md
 *
 * Dataset dos 23 comparáveis CONGELADO (idêntico ao v5). Art. IV: nenhum número
 * novo inventado — todo valor rastreia a matrícula, ao GeoSampa ou ao dataset.
 *
 * Rodar de `app/`:  npx -y tsx scripts/acm-honduras/07-build-laudo-v6.tsx
 * Saída: `docs/acm/honduras-629/LAUDO-ACM-Honduras-v6-<data>.pdf` (+ JSON).
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

// Alvo DOCUMENTAL (v6) — matrícula 116.360 (4º RI) + GeoSampa (13-Jul-2026).
const TARGET_V6 = {
  areaConstruida: 441, // averbação Av.03/1996 = lançamento IPTU (GeoSampa)
  areaTerreno: 1050, // lote 21×50 m (matrícula) = GeoSampa
}
// Projeção coberta medida por satélite (operador, 13-Jul) — NÃO oficial; usada
// só nas notas/condicionantes, nunca como base de valor (política H-3).
const PROJECAO_COBERTA_SATELITE_M2 = 736

const comparaveis = hondurasComparaveisHomogeneizados()

// Guard-rail 9.8 ativo: alvo com endereço, vagas e preço pretendido (dataset/laudo capa).
const computation = computeLaudo({
  target: {
    ...TARGET_V6,
    endereco: TARGET.endereco,
    vagas: TARGET.vagas,
    precoPretendido: TARGET.precoPretendido,
  },
  comparaveis,
  fatoresLiquidez: HONDURAS_FATORES_LIQUIDEZ,
  residual: HONDURAS_RESIDUAL,
  homogeneizacao: HONDURAS_HOMOGENEIZACAO,
})

// Fonte rica por item (idêntica ao v5): dataset do corretor + ingestão 9.12.
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

const precoM2PretendidoOficial = Math.round(TARGET.precoPretendido / TARGET_V6.areaConstruida)

const input: LaudoInput = {
  enderecoAlvo: TARGET.endereco,
  bairro: 'Jardim América / Jardim Paulista (fronteira — CEP 01428-000)',
  proprietario: 'Clarisia Ramos',
  // v6: base DOCUMENTAL (matrícula + IPTU). A área física não averbada é tratada
  // como condicionante, nunca como base de valor.
  areaConstruida: TARGET_V6.areaConstruida,
  areaTerreno: TARGET_V6.areaTerreno,
  classeNota: '(área construída AVERBADA — matrícula 116.360 = IPTU)',
  programa: {
    dormitorios: TARGET.dormitorios,
    suites: TARGET.suites,
    vagas: TARGET.vagas,
  },
  precoPretendido: TARGET.precoPretendido,
  precoPedidoReal: TARGET.precoPedidoReal,
  // v6: âncoras comerciais do v4 SUSPENSAS — eram função de 800 m² de área
  // anunciada, sem suporte documental. Definir com a Luciana após decisão sobre
  // a regularização (cenário D). Art. IV: não inventamos âncora nova aqui.
  precoAnuncioRecomendado: null,
  metaFechamento: null,
  dataEmissao: new Date().toLocaleDateString('pt-BR'),
  residualParams: HONDURAS_RESIDUAL,

  // --- Considerações e recomendações (13-Jul-2026) --------------------------
  conclusoesPrincipais: [
    `Base documental do alvo CORRIGIDA no v6: área construída AVERBADA 441 m² (matrícula 116.360, Av.03/1996) = lançamento IPTU (GeoSampa, SQL 014.071.0030-0); terreno 1.050 m² (21×50 m). Os 800 m² do anúncio não têm suporte em nenhuma fonte oficial.`,
    `Área física observada em visita (gourmet coberta + garagem coberta, aparentemente recentes): projeção coberta ~${PROJECAO_COBERTA_SATELITE_M2} m² por satélite (medição NÃO oficial; beirais inflam e 2º pavimento não aparece). Pelo critério municipal (Lei 10.235/86 / Dec. 58.420/18 art. 56), área coberta por paredes OU pilares e telheiros CONTAM como área construída — a diferença exige regularização municipal + averbação cartorária.`,
    `Cenários de valor pela lente de construção (mediana homogeneizada): A. documental 441 m² (base deste laudo — única defensável hoje); B. físico ~736 m² (sem valor defensável enquanto irregular); C. anunciado 800 m² (sem suporte); D. pós-regularização (entre A e B, condicionado a viabilidade urbanística, custo e prazo).`,
    `Regularização: obras aparentam ser posteriores a 31/07/2014 → fora da Lei 17.202/2019; rito ordinário do COE (Lei 16.642/2017) com zoneamento atual (recuos/TO/CA) e possível anuência de tombamento (bairros-jardins). Contratar estudo de viabilidade ANTES de prometer regularização. Incentivo econômico: cada m² regularizado ≈ R$ 19 mil de valor defensável.`,
    `Ônus a sanear ANTES da escritura: alienação fiduciária Banco Máxima (R.10/2015, prazo final 11/04/2025 — obter quitação e averbar baixa) e penhora de 50% dos direitos de fiduciante (Av.11/2020, execução fiscal municipal R$ 85.149,08). Certidão de matrícula ATUALIZADA é o primeiro passo (a analisada é de 01/2023).`,
    `Risco fiscal do vendedor: IPTU complementar retroativo quando a PMSP atualizar o cadastro (aerolevantamento) sobre a área não declarada.`,
  ],
  parecerTecnico:
    `Este laudo ancora o valor na área construída DOCUMENTAL (441 m² — matrícula = IPTU), única defensável perante comprador, banco e cartório (política H-3: preferir subavaliar). O preço pretendido de R$ ${TARGET.precoPretendido.toLocaleString('pt-BR')} equivale a R$ ${precoM2PretendidoOficial.toLocaleString('pt-BR')}/m² sobre a área oficial — muito acima da régua da amostra homogeneizada. A área física adicional observada (~${PROJECAO_COBERTA_SATELITE_M2} m² de projeção coberta) só se converte em valor defensável mediante regularização (cenário D); recomenda-se estudo de viabilidade urbanística e, em paralelo, saneamento dos ônus da matrícula. Avaliação bancária de eventual comprador sairá sobre os 441 m² averbados — o excedente físico restringe o público a pagamento à vista enquanto irregular.`,
  sensibilidadeLeitura:
    `A sensibilidade abaixo opera sobre a base documental (441 m²). O upside real do ativo não está na régua de deságio, e sim na REGULARIZAÇÃO da área física não averbada (cenário D): se ~200-295 m² forem regularizáveis, destravam R$ 4-5,6M de valor defensável a custo ordens de magnitude menor — condicionado à viabilidade (recuos/TO/CA/tombamento). Até lá, comunicar a área extra como característica física, nunca como base de precificação.`,

  // Sec. 3 — ofertas ativas georreferenciadas no raio (inalterado vs v5).
  ofertasAtivas: OFERTAS_ATIVAS.filter((o) => o.dist != null).map((o) => ({
    rua: o.end,
    area: o.areaConstruida,
    pedido: o.precoPedido,
    precoM2: o.m2c,
    distancia: o.dist,
  })),
  // Sec. 6 — concorrência (leituras textuais do v4, inalteradas).
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
// Mapa (Sec. 3) — mesmo mecanismo do v5; REUSA o cache de geocode do 06.
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
    await new Promise((r) => setTimeout(r, 120))
    return ponto
  }

  const alvo = await geocodeCached(TARGET.geocodeQuery)
  if (!alvo) {
    console.warn('Geocode do alvo falhou — laudo sai sem mapa.')
    return null
  }

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

  const rawUrl = buildStaticMapUrl({
    token,
    center: { lat: alvo.lat, lng: alvo.lng },
    radiusMeters: RAIO_PADRAO_M,
    markers: buildAcmMapMarkers(alvo, computation.ranking, source),
    width: 942,
    height: 512,
    padding: 44,
  })
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
  const pdfPath = escreverComFallback(path.join(outDir, `LAUDO-ACM-Honduras-v6-${hoje}.pdf`), buf)

  const revisao = {
    geradoEm: new Date().toISOString(),
    versao: 'v6 — base documental do alvo (matrícula 116.360 + GeoSampa 13-Jul-2026)',
    alvoDocumental: {
      areaConstruidaAverbada: TARGET_V6.areaConstruida,
      areaTerreno: TARGET_V6.areaTerreno,
      fontes: [
        'Matrícula 116.360, 4º RI-SP (Av.03/1996; certidão 01/02/2023)',
        "GeoSampa WFS lote_cidadao setor 014 quadra 071 lote 0030 (13-Jul-2026): qt_area_construida=441, qt_area_terreno=1050",
      ],
      projecaoCobertaSateliteM2: PROJECAO_COBERTA_SATELITE_M2,
      notaSatelite:
        'Medição do operador (Google Earth, 13-Jul-2026) — NÃO oficial; beirais inflam, 2º pavimento não aparece.',
    },
    condicionantes: {
      regularizacao:
        'Obras aparentam pós-31/07/2014 → fora da Lei 17.202/2019; rito ordinário COE + verificar recuos/TO/CA e tombamento bairros-jardins. Estudo de viabilidade ANTES de prometer.',
      onus: [
        'Alienação fiduciária Banco Máxima (R.10/2015, venc. final 11/04/2025) — obter quitação/averbar baixa',
        'Penhora 50% direitos de fiduciante (Av.11/2020, exec. fiscal municipal R$ 85.149,08) — levantar',
        'Certidão de matrícula atualizada (a analisada é de 01/2023)',
      ],
      riscoFiscal: 'IPTU complementar retroativo sobre área não declarada (aerolevantamento PMSP).',
      referencia: 'docs/acm/honduras-629/CONDICIONANTES-MATRICULA-116360-20260713.md',
    },
    ancorasComerciais: {
      precoAnuncioRecomendado: null,
      metaFechamento: null,
      nota: 'Âncoras do v4 suspensas no v6 — eram função dos 800 m² anunciados. Definir com a Luciana (H-3) após decisão sobre regularização (cenário D).',
    },
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
  }
  const jsonPath = escreverComFallback(
    path.join(outDir, `LAUDO-ACM-Honduras-v6-${hoje}.computation.json`),
    JSON.stringify(revisao, null, 2),
  )

  console.log(`PDF:  ${pdfPath} (${(buf.length / 1024).toFixed(0)} KB)`)
  console.log(`JSON: ${jsonPath}`)
  console.log(
    `Headline mercado (441 m² documental): ${revisao.headline.mercado.min.toLocaleString('pt-BR')} – ${revisao.headline.mercado.max.toLocaleString('pt-BR')}`,
  )
  console.log(
    `Fechamento: ${revisao.headline.fechamento.min.toLocaleString('pt-BR')} – ${revisao.headline.fechamento.max.toLocaleString('pt-BR')}`,
  )
  console.log(`Mediana homogeneizada: ${computation.medianaPrecoM2.toLocaleString('pt-BR')}/m²`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
