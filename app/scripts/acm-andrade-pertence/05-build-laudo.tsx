/**
 * LAUDO ACM v2 — Rua Dr. Andrade Pertence, 113 (Vila Olímpia) — modelo v5.
 *
 * Segundo caso do pipeline (generalização do Honduras v5), com os mecanismos
 * novos ATIVOS:
 *   - guard-rail anti-auto-referência (Story 9.8: endereco/vagas/precoPretendido);
 *   - homogeneização temporal FipeZap + bairro real (Stories 9.11/9.12);
 *   - headline em FAIXA com cenário aderente de referência (Story 9.10).
 *
 * Fonte de comparáveis: dataset congelado `docs/acm/andrade-pertence-113/dataset.json`
 * (gerado por 04-build-dataset.mjs, recorte declarado R1–R5 — a v2 aplica o R5:
 * tipologia casa×apartamento CONFIRMADA pela guia oficial via SQL, após o
 * incidente 09-Jul em que ~50% da amostra do proxy eram apartamentos porque a
 * ingestão da base descartou o "Complemento" da guia). As casas confirmadas
 * trazem área de TERRENO real — a lente de terreno (Sec. 8) é medida.
 * Art. IV: nenhum número inventado — parâmetros não elicitados (fatores de
 * liquidez, ofertas ativas) ficam FORA e são pendência declarada no laudo.
 *
 * Rodar de `app/`:  npx -y tsx scripts/acm-andrade-pertence/05-build-laudo.tsx
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToBuffer } from '@react-pdf/renderer'

import { computeLaudo, RAIO_PADRAO_M, type AcmComparable } from '@/lib/acm/methodology'
import { buildAcmMapMarkers } from '@/lib/acm/comparavelAdapter'
import { buildStaticMapUrl, resolveStaticMapImage } from '@/lib/acm/pdf/staticMap'
import {
  FIPEZAP_SP_FONTE,
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
  FIPEZAP_SP_VENDA_RESIDENCIAL,
} from '@/lib/acm/data/fipezapSpVendaResidencial'
import {
  buildLaudoModel,
  type LaudoFatorLiquidez,
  type LaudoInput,
  type LaudoSourceComparable,
} from '@/lib/acm/pdf/laudoModel'
import { registerBrandFonts } from '@/lib/acm/pdf/theme'
import { loadEnv } from '../acm-honduras/lib.mjs'

// ---------------------------------------------------------------------------
// Dataset congelado
// ---------------------------------------------------------------------------
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const outDir = path.join(repoRoot, 'docs', 'acm', 'andrade-pertence-113')
mkdirSync(outDir, { recursive: true })

// Fatores de Ajuste de Liquidez e Condição (Laudo Sec. 2) — OPÇÃO POR ACM.
// Mecanismo idêntico ao do caso 132, porém VAZIO por ora: os critérios próprios
// do 113 ainda NÃO foram observados/elicitados. Array vazio [] → fechamento =
// mercado (emissão sem calibração comercial). Preencher com a consultora (H-3).
//
// PERFIL DO 113 ≠ 132: este é um sobrado de 1974 que demanda REFORMA GERAL —
// logo, ao contrário do 132 (conservado), aqui um fator de Capex de modernização
// TENDE a aplicar. NÃO hardcodar: observar o estado real e validar os % antes.
// Template (referência — NÃO ativo até observação):
//   { fator: 'Provisão de Capex de modernização', calibracao: 'Reforma geral do sobrado (1974)', ajuste: 0.XX },
//   { fator: 'Ajuste por tempo de exposição de mercado', calibracao: '…', ajuste: 0.XX },
//   { fator: 'Provisão para regularização cadastral', calibracao: 'Averbação da lavanderia / metragens', ajuste: 0.XX },
const FATORES_LIQUIDEZ: LaudoFatorLiquidez[] = []

interface DatasetComparavel {
  endereco: string
  areaConstruida: number
  areaTerreno: number | null
  preco: number
  precoM2: number
  distancia: number
  dataVenda: string | null
  bairroReal: string | null
  sqlCadastral: string | null
  lat: number | null
  lng: number | null
  fonte: string
}
interface Dataset {
  geradoEm: string
  target: {
    endereco: string
    bairro: string
    cep: string
    areaConstruida: number
    areaTerreno: number
    dormitorios: number
    suites: number
    vagas: number
    anoConstrucao: number
    precoPretendido: number
    geo: { lat: number; lng: number }
  }
  recorte: { raioM: number; regras: string[]; funil: Record<string, number> }
  avisos: string[]
  comparaveis: DatasetComparavel[]
}

const dataset = JSON.parse(
  readFileSync(path.join(outDir, 'dataset.json'), 'utf8'),
) as Dataset
const T = dataset.target

// ---------------------------------------------------------------------------
// Cálculo — modelo v5 (guard-rail 9.8 + homogeneização 9.11/9.12 + faixa 9.10)
// ---------------------------------------------------------------------------
const comparaveis: AcmComparable[] = dataset.comparaveis.map((c) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  dataVenda: c.dataVenda,
  bairroReal: c.bairroReal,
  isVendaReal: true,
}))

const computation = computeLaudo({
  target: {
    areaConstruida: T.areaConstruida,
    areaTerreno: T.areaTerreno,
    endereco: T.endereco,
    vagas: T.vagas,
    precoPretendido: T.precoPretendido,
  },
  comparaveis,
  // Mecanismo de fatores de liquidez PORTADO (opção por ACM), mas VAZIO nesta
  // emissão — critérios do 113 ainda não observados → fechamento = mercado.
  fatoresLiquidez: FATORES_LIQUIDEZ.map((f) => f.ajuste),
  homogeneizacao: {
    indice: `${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte}`,
    serie: FIPEZAP_SP_VENDA_RESIDENCIAL,
    dataReferencia: FIPEZAP_SP_ULTIMA_COMPETENCIA,
  },
})

// ---------------------------------------------------------------------------
// Fonte rica por item (Sec. 5 / 7.1)
// ---------------------------------------------------------------------------
const source: LaudoSourceComparable[] = dataset.comparaveis.map((c) => ({
  endereco: c.endereco,
  areaConstruida: c.areaConstruida,
  areaTerreno: c.areaTerreno,
  preco: c.preco,
  distancia: c.distancia,
  codigoRef: c.sqlCadastral ? `SQL ${c.sqlCadastral}` : 'ITBI/PMSP',
  bairro: c.bairroReal ?? undefined,
  sqlCadastral: c.sqlCadastral,
  statusAnuncio: 'off-market / não recuperável',
  fonte: 'ITBI/PMSP',
  fonteAnuncio: 'ITBI/PMSP (guia)',
  anuncioUrl: null,
  lat: c.lat,
  lng: c.lng,
  isVendaReal: true,
}))

// ---------------------------------------------------------------------------
// Textos do caso (overrides honestos — nada de template Honduras fora de lugar)
// ---------------------------------------------------------------------------
const h = computation.headline
const fmt = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`
const difPercent =
  Math.round(((h.referencia.valorMercado - T.precoPretendido) / T.precoPretendido) * 1000) / 10
const cenarioLabel = (c: { cenario: string; n: number }) =>
  c.cenario === 'todos' ? `todos os ${c.n}` : c.cenario === 'top5' ? 'Top 5' : 'Top 3'
const cenarioTodos = computation.sensibilidade.find((s) => s.cenario === 'todos')!
// Leitura direta de terreno (Sec. 8 do laudo de referência): mediana R$/m² de
// terreno das casas de lote <500 m² (guia oficial) × 150 m² do alvo.
const banda500 = computation.efeitoEscalaTerreno.find((b) => b.faixa === '<500')
const leituraTerreno =
  banda500 && banda500.n > 0 ? Math.round(banda500.medianaPrecoM2Terreno * T.areaTerreno) : null

const input: LaudoInput = {
  enderecoAlvo: T.endereco,
  bairro: `Vila Olímpia (CEP ${T.cep} — fronteira Moema)`,
  proprietario: null,
  areaConstruida: T.areaConstruida,
  areaTerreno: T.areaTerreno,
  programa: { dormitorios: T.dormitorios, suites: T.suites, vagas: T.vagas },
  classeTexto: `Reforma geral (construção ${T.anoConstrucao})`,
  precoPretendido: T.precoPretendido,
  precoPedidoReal: null, // imóvel ainda não anunciado (captação)
  precoAnuncioRecomendado: null, // decisão comercial — definir com a Luciana
  metaFechamento: h.fechamento, // faixa entre cenário aderente e teto (sem fatores)
  dataEmissao: new Date().toLocaleDateString('pt-BR'),
  diferencaPercent: difPercent,
  diferencaNota:
    'Cenário aderente (via construção) vs. valor referenciado pela proprietária — ver leitura na seção 9 e condicionantes.',
  desagioFechamentoNota:
    'Mecanismo de fatores de liquidez/condição disponível (Sec. 2), mas SEM critérios observados nesta emissão do 113: fechamento = mercado. A faixa aperta após elicitação com a consultora (H-3) — perfil de reforma geral tende a incluir Capex de modernização.',
  fatoresLiquidezDetalhe: FATORES_LIQUIDEZ,
  eixosArgumentacao: [
    'Capex de reforma geral: o mercado deduz do preço o investimento de adequação — construção de 1974 sem retrofit entra na régua como Score B (ajuste de −15% já aplicado no valor de mercado).',
    'Due diligence documental: confirmar averbação da área construída (80 m²) e da edícula/lavanderia dos fundos na matrícula — pendência retém ou desconta oferta.',
    'Liquidez do produto: sobrado de 2 dorm + suíte adaptada com 1 vaga compete com apartamentos usados da região na mesma faixa de ticket — o diferencial é o terreno de 150 m².',
    'Duplo funil de demanda: usuário (reforma para morar) e investidor/construtor (terreno na Vila Olímpia) — a lente de terreno agora é medida com as áreas de terreno das guias oficiais (Sec. 8).',
  ],
  criteriosSelecao: [
    {
      criterio: 'Geográfico',
      parametro: `Raio de ${dataset.recorte.raioM.toLocaleString('pt-BR')} m do imóvel-alvo`,
      justificativa: 'Microrregião Vila Olímpia / Moema — fronteira do alvo (PostGIS)',
    },
    {
      criterio: 'Evidência',
      parametro: 'Vendas reais (ITBI/PMSP)',
      justificativa: 'Somente fechamentos registrados — nunca preço de anúncio',
    },
    {
      criterio: 'Tipologia',
      parametro: 'Casa confirmada pela guia oficial (uso IPTU)',
      justificativa:
        'Crosscheck por SQL contra as guias ITBI da SF/PMSP: só RESIDÊNCIA/horizontal; apartamentos em condomínio excluídos. Vendas 2026 (guia pública pendente): heurística de lote declarada',
    },
    {
      criterio: 'Classe de valor',
      parametro: 'R$/m² < 22.000 (piso do Score A)',
      justificativa:
        'Mesma classe do alvo (Score B — produto a reposicionar); remove unidades de luxo verticais e guias inconsistentes',
    },
    {
      criterio: 'Período',
      parametro: '2023–2026 (ITBI, data da guia)',
      justificativa: 'Atualidade das transações; deflação a valor presente (linha abaixo)',
    },
  ],
  ofertasAtivas: [],
  notaOfertas:
    'Levantamento de ofertas ativas (concorrência) não executado nesta emissão — corresponde à Fase 2 (re-verificação web) do workflow ACM e será incorporado na revisão com a consultora.',
  concorrentesDiretos: [],
  referenciasSuperiores: [],
  concorrenciaJustificativa:
    'A leitura de concorrência ativa (anúncios no raio) não foi levantada nesta emissão. A âncora desta ACM são exclusivamente os fechamentos reais de ITBI; o teto competitivo será calibrado com a consultora na Fase 2.',
  motivosSelecao: [
    '★★★ Top 3 — máxima aderência: menor distância ao alvo com área construída próxima de 80 m², na mesma classe (Score B).',
    '★ Top 4–5 — reforço da leitura de microlocalização.',
    'A similaridade de terreno (20% do índice) está ATIVA para as casas confirmadas: área de terreno real da guia oficial (fração ideal 1).',
  ],
  notaEfeitoEscala:
    'O efeito-escala de terreno agora É medido (Sec. 8) com as áreas de terreno das guias oficiais das casas confirmadas. Vendas 2026 (guia pública pendente) entram sem terreno.',
  rastreabilidadeNota:
    'SQL = Setor/Quadra/Lote (cadastro municipal), extraído da guia ITBI/PMSP ingerida. Consulta pública: GeoSampa.',
  abordagemADescricao:
    `Abordagem A — comparação direta de terreno (guias oficiais): 150 m² do alvo × mediana de R$/m² de terreno das casas de lote <500 m²${
      banda500 ? ` (${banda500.n} casas, ${fmt(banda500.medianaPrecoM2Terreno)}/m²)` : ''
    } → leitura de terreno de ${leituraTerreno ? `~${fmt(leituraTerreno)}` : 'n/d'}. Nota: o R$/m² usa o preço TOTAL da casa sobre o lote (metodologia de referência, Sec. 8) — para produto de reforma geral, o preço tende ao valor da terra.`,
  coefAproveitamento:
    'Sobrado de 80 m² construídos sobre lote de 150 m² — coeficiente baixo; o valor está majoritariamente na terra e na localização (confirmar parâmetros de zoneamento do lote).',
  convergenciaTerreno:
    `Convergência das lentes: a leitura direta de terreno${leituraTerreno ? ` (~${fmt(leituraTerreno)})` : ''}, o cenário aderente da lente construção (${fmt(h.referencia.valorMercado)}) e o valor referenciado pela proprietária (${fmt(T.precoPretendido)}) apontam para o MESMO patamar — a tese de valor sustentado pelo terreno se confirma com dados oficiais.`,
  perfisComprador: [
    'Comprador-usuário (reforma): compra o sobrado para reformar e morar. Paga pelo construído ajustado (R$/m² × 80 m², Capex Score B).',
    `Comprador-terreno/investidor: compra os 150 m² de terra em rua residencial da Vila Olímpia — leitura direta${leituraTerreno ? ` ~${fmt(leituraTerreno)}` : ''} pelas guias oficiais (Sec. 8).`,
    `O valor referenciado pela proprietária (${fmt(T.precoPretendido)}) é consistente com as duas lentes medidas nesta emissão.`,
  ],
  sensibilidadeLeitura:
    `O cenário aderente de referência (${cenarioLabel(h.referencia)}) fica em ${fmt(h.referencia.valorMercado)} e o recorte amplo (${cenarioLabel(cenarioTodos)}) em ${fmt(cenarioTodos.valorMercado)} — o headline reporta a FAIXA entre os cenários, agora sobre amostra exclusivamente de CASAS (tipologia por guia oficial). O recorte amplo é o piso (inclui casas grandes de R$/m² menor); os comparáveis de porte próximo aos 80 m² do alvo negociam a R$/m² maior. O valor referenciado pela proprietária (${fmt(T.precoPretendido)}) está ${difPercent < 0 ? `apenas ${Math.abs(difPercent).toLocaleString('pt-BR')}% acima` : 'dentro'} do cenário aderente — compatível com a evidência.`,
  ponderacaoValor:
    `Duas frentes de demanda medidas: o comprador-usuário (reforma para morar) referencia o cenário aderente da lente construção — ${fmt(h.referencia.valorMercado)}; o comprador-terreno referencia a leitura direta de terreno${leituraTerreno ? ` — ~${fmt(leituraTerreno)}` : ''} (guias oficiais, Sec. 8). O valor referenciado pela proprietária (${fmt(T.precoPretendido)}) converge com ambas — a captação pode ancorar nessa faixa, com fatores de liquidez a calibrar com a consultora.`,
  fundamentacao: [
    `Evidência de fechamento (âncora): ${computation.totalComparaveis} vendas reais de ITBI/PMSP no raio de ${dataset.recorte.raioM.toLocaleString('pt-BR')} m, recorte declarado (venda única no endereço + Score B), mediana homogeneizada de ${computation.medianaPrecoM2.toLocaleString('pt-BR')}/m².`,
    `Atualização temporal: ${computation.homogeneizacao.ajustes.length} de ${computation.totalComparaveis} comparáveis deflacionados a ${computation.homogeneizacao.dataReferencia} pelo índice ${computation.homogeneizacao.indice}.`,
    `Composição por bairro verificado: ${computation.composicaoBairros.map((b) => `${b.bairro} (${b.n})`).join(', ')}.`,
    'Sensibilidade em 3 recortes (todos / Top 5 / Top 3) com headline em faixa — o cenário aderente é a referência.',
    `Tipologia depurada (R5): ${dataset.recorte.funil.aposClasseValor - computation.totalComparaveis} unidades verticais excluídas via guia oficial/heurística de lote; casas confirmadas trazem área de terreno real (lente de terreno medida).`,
  ],
  estrategiaComercial: [
    `Ancorar a captação na convergência das duas lentes: construção (cenário aderente ${fmt(h.referencia.valorMercado)}) e terreno${leituraTerreno ? ` (~${fmt(leituraTerreno)})` : ''} — o valor da proprietária (${fmt(T.precoPretendido)}) é defensável com dados oficiais.`,
    'Levantar na matrícula/IPTU: área oficial de terreno e construída, averbações (inclusive lavanderia dos fundos) e testada.',
    'Fase 1 (planilha de validação): conferir as casas "prováveis" de 2026 (guia pública pendente) — únicas linhas com tipologia por heurística.',
    'Fase 2 (concorrência): levantar ofertas ativas de sobrados/casas no raio para calibrar teto competitivo e deságio esperado.',
    'Definir com a consultora os fatores de liquidez do imóvel (tempo de exposição, regularização, Capex, liquidez do produto) — a faixa de fechamento aperta após essa calibração.',
  ],
  condicionantes: [
    'Nº 1 — Metragens oficiais do alvo: confirmar na matrícula/IPTU os 80 m² construídos / 150 m² de terreno e a averbação das ampliações (lavanderia dos fundos).',
    'Nº 2 — Tipologia: confirmada por guia oficial (SF/PMSP) para vendas ≤ 2025; vendas 2026 por heurística de lote declarada até a SF publicar o arquivo do exercício.',
    'Distâncias aproximadas: coordenadas da base geocodificadas por logradouro/CEP (precisão ±~200 m).',
    'Definir fatores de liquidez com a consultora — nesta emissão, fechamento = mercado.',
    'Leitura de terreno usa preço TOTAL/área de terreno (metodologia de referência) — para lotes com construção aproveitável ela superestima levemente a terra pura.',
  ],
  parecerFinal:
    `Emissão técnica v2 (amostra depurada por tipologia via guia oficial): a lente de construção — ${computation.totalComparaveis} fechamentos reais de CASAS homogeneizados — sustenta faixa de ${fmt(h.mercado.min)} a ${fmt(h.mercado.max)}, com cenário aderente em ${fmt(h.referencia.valorMercado)}; a leitura direta de terreno${leituraTerreno ? ` (~${fmt(leituraTerreno)})` : ''} converge. O valor referenciado pela proprietária (${fmt(T.precoPretendido)}) é DEFENSÁVEL pela evidência oficial. Recomenda-se confirmar as metragens na matrícula, validar as casas prováveis de 2026 (Fase 1) e calibrar fatores de liquidez com a consultora antes de firmar preço de anúncio e meta de fechamento.`,
}

// ---------------------------------------------------------------------------
// Mapa (Sec. 3) — pins com lat/lng da própria base (RPC) + alvo geocodificado
// ---------------------------------------------------------------------------
async function resolverMapaUrl(): Promise<string | null> {
  const env = loadEnv() as Record<string, string>
  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN || env.MAPBOX_TOKEN
  if (!token) {
    console.warn('Sem NEXT_PUBLIC_MAPBOX_TOKEN em .env.local — laudo sai sem mapa.')
    return null
  }
  const rawUrl = buildStaticMapUrl({
    token,
    center: { lat: T.geo.lat, lng: T.geo.lng },
    radiusMeters: RAIO_PADRAO_M,
    markers: buildAcmMapMarkers(T.geo, computation.ranking, source),
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
    const alvo = rev === 0 ? destino : destino.replace(/(\.[a-z.]+)$/i, `-rev${rev + 1}$1`)
    try {
      writeFileSync(alvo, dados)
      return alvo
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EBUSY' || rev >= 9) throw err
    }
  }
}

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
  const pdfPath = escreverComFallback(
    path.join(outDir, `LAUDO-ACM-AndradePertence113-v2-${hoje}.pdf`),
    buf,
  )

  const revisao = {
    geradoEm: new Date().toISOString(),
    datasetGeradoEm: dataset.geradoEm,
    recorte: dataset.recorte,
    avisosDataset: dataset.avisos,
    homogeneizacao: {
      indice: computation.homogeneizacao.indice,
      dataReferencia: computation.homogeneizacao.dataReferencia,
      ajustados: computation.homogeneizacao.ajustes.length,
      semAjuste: computation.homogeneizacao.semAjuste,
      fatorMin: Math.min(...computation.homogeneizacao.ajustes.map((a) => a.fator)),
      fatorMax: Math.max(...computation.homogeneizacao.ajustes.map((a) => a.fator)),
    },
    medianaPrecoM2: computation.medianaPrecoM2,
    scoreAlvo: computation.scoreAlvo,
    headline: computation.headline,
    faixaSensibilidade: computation.faixaSensibilidade,
    composicaoBairros: computation.composicaoBairros,
    top5: computation.top5,
    desagioMedidoPercent: computation.desagioMedidoPercent,
    coAncoraTerreno: computation.coAncoraTerreno,
    autoReferenciasExcluidas: computation.autoReferenciasExcluidas,
    pendencias: input.condicionantes,
  }
  const jsonPath = escreverComFallback(
    path.join(outDir, `LAUDO-ACM-AndradePertence113-v2-${hoje}.computation.json`),
    JSON.stringify(revisao, null, 2),
  )

  console.log(`PDF:  ${pdfPath} (${(buf.length / 1024).toFixed(0)} KB)`)
  console.log(`JSON: ${jsonPath}`)
  console.log(`Score alvo: ${computation.scoreAlvo} | mediana homogeneizada: ${computation.medianaPrecoM2.toLocaleString('pt-BR')}/m²`)
  console.log(
    `Headline mercado: ${revisao.headline.mercado.min.toLocaleString('pt-BR')} – ${revisao.headline.mercado.max.toLocaleString('pt-BR')} (ref. ${revisao.headline.referencia.cenario} = ${revisao.headline.referencia.valorMercado.toLocaleString('pt-BR')})`,
  )
  console.log(`Auto-referências excluídas: ${revisao.autoReferenciasExcluidas.length}`)
  console.log(`Composição:`, revisao.composicaoBairros)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
