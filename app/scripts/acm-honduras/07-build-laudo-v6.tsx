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
// Projeção coberta medida por satélite (operador, 13-14/Jul) — NÃO oficial; usada
// só nas notas/condicionantes, nunca como base de valor (política H-3).
// v6.1 (3ª auditoria, item C1): faixa 715–817 m² — 816,97 se polígonos disjuntos
// (685 + garagem 101,64 + telheiro 30,48) ou 715,33 se garagem contida na área
// coberta; indecidível por captura — a medição do RT decide.
const PROJECAO_MIN_M2 = 715
const PROJECAO_MAX_M2 = 817

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
  // v6.1: titularidade registral = Dennis + Ermantina (falecida ~2018, inventário
  // pendente de averbação); Clarisia é herdeira e interlocutora da captação.
  proprietario: 'Clarisia Ramos (interlocutora — herdeira; sucessão pendente de averbação)',
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

  // --- Considerações e recomendações (v6.1, 14-Jul-2026 — pós-auditorias) ----
  conclusoesPrincipais: [
    `Base documental do alvo: área construída AVERBADA 441 m² (matrícula 116.360, Av.03/1996) = lançamento IPTU (GeoSampa, SQL 014.071.0030-0); terreno 1.050 m² (21×50 m). Os 800 m² do anúncio não têm suporte em nenhuma fonte oficial. Titularidade registral: Dennis + Ermantina (falecida ~2018 — inventário/partilha SEM averbação na certidão de 01/2023; escritura exige saneamento sucessório).`,
    `Área física observada em visita (gourmet e garagem cobertas): projeção coberta entre ~${PROJECAO_MIN_M2} e ~${PROJECAO_MAX_M2} m² por satélite (medição NÃO oficial; a faixa reflete a indefinição garagem contida×disjunta nos polígonos — a medição do responsável técnico decide). Pelo critério municipal (Lei 10.235/86 / Dec. 58.420/18 art. 56), área coberta por paredes OU pilares e telheiros CONTAM como área construída — a diferença exige regularização municipal + averbação cartorária.`,
    `Cenários pela lente de construção (mesma base do headline deste laudo — mediana homogeneizada COM o redutor de estado −15%): A. documental 441 m² (base deste laudo); B. físico ${PROJECAO_MIN_M2}–${PROJECAO_MAX_M2} m² (sem valor defensável enquanto irregular); C. anunciado 800 m² (sem suporte); D. pós-regularização — na mesma base, ~R$ 9,7–11,6M com a área mínima, até ~R$ 13,2M se o RT confirmar a máxima; condicionado a deferimento (ver bullet seguinte).`,
    `Regularização: a série histórica de satélite (08/09/2013) é INDÍCIO VISUAL FORTE de que a área extra é anterior a 31/07/2014 — potencialmente elegível à Lei 17.202/2019 (protocolo até 30/08/2026). A prova formal de anterioridade é montada pelo responsável técnico (aerofotos oficiais, IPTU antigo). Gates do deferimento: anuência patrimonial CONDEPHAAT/CONPRESP (lote em perímetro tombado dos Jardins) e vedação do art. 3º (restrições convencionais do loteamento — teor a levantar). Não prometer averbação; contratar licenciador com experiência Jardins/CONPRESP JÁ.`,
    `Ônus a sanear ANTES da escritura: alienação fiduciária Banco Máxima (R.10/2015, prazo final 11/04/2025 — obter quitação e averbar baixa), penhora de 50% dos direitos de fiduciante (Av.11/2020, exec. fiscal R$ 85.149,08) e INVENTÁRIO de Ermantina (contrato de intermediação exige Dennis + 3 herdeiros ou inventariante/procurações — Clarisia sozinha não vincula). Certidão de matrícula ATUALIZADA é o primeiro passo.`,
    `Risco fiscal do vendedor: IPTU complementar retroativo (até 5 exercícios) quando a PMSP atualizar o cadastro sobre a área não declarada. Há tese (jurisprudência TJSP) de afastamento do retroativo para quem regulariza pela anistia — A CONFIRMAR pelo advogado para o caso concreto.`,
  ],
  parecerTecnico:
    `Este laudo ancora o valor na área construída DOCUMENTAL (441 m² — matrícula = IPTU), única defensável perante comprador, banco e cartório (política H-3: preferir subavaliar). O headline aplica sobre a mediana homogeneizada o redutor de estado de −15% (declarado nesta versão) e, no fechamento, o deságio da amostra. O preço pretendido de R$ ${TARGET.precoPretendido.toLocaleString('pt-BR')} equivale a R$ ${precoM2PretendidoOficial.toLocaleString('pt-BR')}/m² sobre a área oficial — acima da régua. A área física adicional (projeção ~${PROJECAO_MIN_M2}–${PROJECAO_MAX_M2} m², satélite) só vira valor defensável com regularização DEFERIDA (anistia; gates patrimonial e de loteamento) e medição do RT. A co-âncora de terreno (R$ 9,62M) é RESIDUAL INDICATIVO de cenário único (parâmetros de jun/26, área nova 800 m² sobre terreno então estimado em 1.000 m²) — referência de negociação, não piso garantido; recalibrar com o licenciador. Avaliação bancária sairá sobre os 441 m² averbados.`,
  sensibilidadeLeitura:
    `A sensibilidade abaixo opera sobre a base documental (441 m²). O upside real do ativo está na REGULARIZAÇÃO da área não averbada (~274–376 m², conforme medição do RT): na mesma régua deste laudo (com o redutor de −15%), destrava entre ~R$ 3,7M e ~R$ 6,1M — condicionado ao deferimento da anistia (anuência patrimonial + restrições do loteamento) e ao protocolo até 30/08/2026. Nota metodológica: o deságio medido da amostra (−12,7%) provém de apenas 2 pares anúncio↔venda — indicativo, não estatística. Até a regularização, comunicar a área extra como característica física, nunca como base de precificação.`,

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
  const pdfPath = escreverComFallback(path.join(outDir, `LAUDO-ACM-Honduras-v6.1-${hoje}.pdf`), buf)

  const revisao = {
    geradoEm: new Date().toISOString(),
    versao:
      'v6.1 — base documental (matrícula 116.360 + GeoSampa) + correções das auditorias de 13-14/Jul (datação pré-2014 como indício, área em faixa, redutor −15% declarado, residual indicativo, sucessão)',
    alvoDocumental: {
      areaConstruidaAverbada: TARGET_V6.areaConstruida,
      areaTerreno: TARGET_V6.areaTerreno,
      fontes: [
        'Matrícula 116.360, 4º RI-SP (Av.03/1996; certidão 01/02/2023)',
        "GeoSampa WFS lote_cidadao setor 014 quadra 071 lote 0030 (13-Jul-2026): qt_area_construida=441, qt_area_terreno=1050",
      ],
      projecaoCobertaSateliteM2: { min: PROJECAO_MIN_M2, max: PROJECAO_MAX_M2 },
      notaSatelite:
        'Medições do operador (Google Earth, 13-14/Jul-2026) — NÃO oficiais. Faixa 715–817: 816,97 m² se polígonos disjuntos (685+101,64+30,48) ou 715,33 m² se garagem contida na área coberta — a medição do RT decide. Série histórica 08/09/2013 = indício visual de anterioridade (prova formal pelo RT).',
    },
    metodologiaDeclarada: {
      cadeiaRedutores:
        'mediana homogeneizada FipeZap → redutor de estado −15% (headline mercado) → deságio de fechamento do laudo; deságio medido da amostra −12,7% provém de N=2 pares (indicativo)',
      residualTerreno:
        'R$ 9.624.000 = residual INDICATIVO de cenário único (VGV 34.000/m² × áreaNova 800 − custos; parâmetros jun/26, terreno então 1.000) — âncora de referência, não piso demonstrado; recalibrar com licenciador/RT',
    },
    condicionantes: {
      regularizacao:
        'Indício visual (satélite 08/09/2013) de conclusão ANTERIOR a 31/07/2014 → potencialmente elegível à anistia Lei 17.202/2019 (protocolo até 30/08/2026; modalidade provável declaratória). Gates: anuência CONDEPHAAT/CONPRESP (perímetro tombado Jardins) + art. 3º (restrições convencionais do loteamento — teor a levantar). Prova formal de anterioridade e medição = responsável técnico. NÃO prometer averbação.',
      sucessao:
        'Ermantina (cotitular, comunhão universal) falecida ~2018 SEM inventário/partilha averbados até 01/2023. Escritura exige saneamento sucessório; contrato de intermediação exige Dennis + 3 herdeiros (ou inventariante/procurações). Clarisia Ramos = interlocutora/herdeira.',
      onus: [
        'Alienação fiduciária Banco Máxima (R.10/2015, venc. final 11/04/2025) — obter quitação/averbar baixa',
        'Penhora 50% direitos de fiduciante (Av.11/2020, exec. fiscal municipal R$ 85.149,08) — levantar',
        'Certidão de matrícula atualizada (a analisada é de 01/2023)',
      ],
      riscoFiscal:
        'IPTU complementar retroativo sobre área não declarada (aerolevantamento PMSP). Tese TJSP de afastamento na anistia — a confirmar pelo advogado.',
      referencia: 'docs/acm/honduras-629/DOSSIE-CONSOLIDADO-HONDURAS-629-20260714.md',
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
    path.join(outDir, `LAUDO-ACM-Honduras-v6.1-${hoje}.computation.json`),
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
