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
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToBuffer } from '@react-pdf/renderer'

import { computeLaudo } from '@/lib/acm/methodology'
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
import { LaudoDocument } from '@/lib/acm/pdf/LaudoDocument'
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

const model = buildLaudoModel(computation, source, input)

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const outDir = path.join(repoRoot, 'docs', 'acm', 'honduras-629')
mkdirSync(outDir, { recursive: true })
const hoje = new Date().toISOString().slice(0, 10)

async function main(): Promise<void> {
  const buf = await renderToBuffer(<LaudoDocument model={model} />)
  const pdfPath = path.join(outDir, `LAUDO-ACM-Honduras-v5-${hoje}.pdf`)
  writeFileSync(pdfPath, buf)

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
const jsonPath = path.join(outDir, `LAUDO-ACM-Honduras-v5-${hoje}.computation.json`)
writeFileSync(jsonPath, JSON.stringify(revisao, null, 2))

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
