/**
 * LAUDO ACM v2 — Rua Dr. Andrade Pertence, 132 (Vila Olímpia) — modelo v5.
 *
 * Caso Rodolpho: sobrado ~220 m² CONSERVADO, anunciado ESTAGNADO a R$ 1.495.000
 * (70+ anúncios em 3 portais — apresentação RE/MAX 14-Abr-2026). A pedido do
 * operador, a análise da apresentação (amostras de preço pedido + fator oferta)
 * é DESCONSIDERADA: este laudo posiciona o imóvel exclusivamente contra
 * FECHAMENTOS REAIS (ITBI/PMSP) homogeneizados — modelo v5 com guard-rail 9.8,
 * FipeZap 9.11/9.12 e headline em faixa 9.10.
 *
 * Revisão 09-Jul (R5): o crosscheck por SQL contra as guias oficiais provou que
 * ~metade da amostra do proxy R3 era APARTAMENTO (a ingestão da base descartou o
 * "Complemento" da guia — "AP 82" etc.). O dataset agora aplica R5 (tipologia
 * confirmada pela guia; 2026 por heurística de lote declarada) e as duas vendas
 * da própria rua saíram: nº 45 = "AP 82" (guia oficial) e nº 110 = unidade
 * provável (lote condominial). As casas confirmadas trazem ÁREA DE TERRENO real
 * da guia — o efeito-escala (Sec. 8) passa a ser medido.
 *
 * Rodar de `app/`:  npx -y tsx scripts/acm-andrade-pertence-132/05-build-laudo.tsx
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

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const outDir = path.join(repoRoot, 'docs', 'acm', 'andrade-pertence-132')
mkdirSync(outDir, { recursive: true })

// Versão do laudo — parametrizável (LAUDO_VERSAO=v3 preserva os arquivos v2).
const VERSAO = process.env.LAUDO_VERSAO ?? 'v2'

// Fatores de Ajuste de Liquidez e Condição (Laudo Sec. 2) — OPÇÃO POR ACM.
// São INPUTS da consultora POR IMÓVEL (elicitação H-3): editar/reordenar aqui.
// Array vazio [] → fechamento = mercado (emissão sem calibração comercial).
// Compostos multiplicativamente sobre o valor de mercado (recorte amplo) →
// valor de fechamento estratégico. Aplicação: valorMercado × Π(1 − ajuste).
//
// NB (Art. IV): este é um cenário ILUSTRATIVO ancorado na narrativa do próprio
// 132 (estagnação de mercado + divergência cadastral) para demonstração — os
// percentuais FINAIS devem ser validados com a consultora. Diferente do Honduras
// (−7/−5/−3/−4%), aqui NÃO há Capex de modernização: o imóvel é CONSERVADO (tese
// C-1), então a dedução de padrão/estado é nula por decisão declarada.
const FATORES_LIQUIDEZ: LaudoFatorLiquidez[] = [
  {
    fator: 'Ajuste por tempo de exposição de mercado',
    calibracao: 'Estagnação (70+ anúncios, preço parado) — liquidez para conversão em oferta firme',
    ajuste: 0.07,
  },
  {
    fator: 'Provisão para regularização cadastral',
    calibracao: 'Divergência de área (196–220 m²) e terreno não averbado (due diligence)',
    ajuste: 0.05,
  },
  {
    fator: 'Ajuste de liquidez do produto',
    calibracao: 'Área ampla (220 m²) com público-alvo mais específico',
    ajuste: 0.04,
  },
]

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
}
interface Dataset {
  geradoEm: string
  target: {
    endereco: string
    bairro: string
    cep: string
    proprietario: string
    areaConstruida: number
    areaTerreno: number | null
    dormitorios: number
    suites: number
    vagas: number
    estado: string
    precoPretendido: number
    precoPedidoReal: number
    geo: { lat: number; lng: number }
  }
  recorte: { raioM: number; regras: string[]; funil: Record<string, number> }
  avisos: string[]
  comparaveis: DatasetComparavel[]
}

const dataset = JSON.parse(readFileSync(path.join(outDir, 'dataset.json'), 'utf8')) as Dataset
const T = dataset.target
// Área construída OFICIAL confirmada = 196 m² (anúncios divergiam 196–220; a
// consultora/matrícula fixou 196). Corrige a lente de construção e o ranking de
// aderência (que compara contra a área do alvo). O dataset trazia 220 (estimativa).
T.areaConstruida = 196

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

// Área de terreno do alvo ~220 m² (PROVISÓRIO — condicionante nº1, a confirmar na
// matrícula/IPTU). Usada como SEGUNDA LENTE de valor (Sec. 8: R$/m² terreno × 220)
// e no display — NÃO como peso de aderência no ranking de construção.
//
// DECISÃO METODOLÓGICA (132): o ranking de construção fica com areaTerreno=0 (terreno
// inerte no índice). Motivo: ativar a similaridade de terreno (20%) puxa para o Top-N
// casas terreno-similares porém baratas em construção (ex.: José Cândido 74/77 a ~5.000/m²c
// — ITBI subdeclarado/valor de terra), colapsando a mediana de CONSTRUÇÃO e invertendo a
// tese. Para imóvel CONSERVADO (valor no construído), a lente de construção deve rankear por
// construção+proximidade; o terreno entra como leitura independente que CONVERGE (~R$ 1,98M).
const AREA_TERRENO_ALVO = 220
const computation = computeLaudo({
  target: {
    areaConstruida: T.areaConstruida,
    areaTerreno: 0, // ranking de construção limpo — terreno entra como 2ª lente (ver acima)
    endereco: T.endereco,
    vagas: T.vagas,
    precoPretendido: T.precoPretendido,
  },
  comparaveis,
  fatoresLiquidez: FATORES_LIQUIDEZ.map((f) => f.ajuste),
  // Story 9.16 — caso 132: tese construção (evita artefato terreno-barato no Top N).
  tese: 'construcao',
  propertyType: 'casa',
  precoPedidoReal: T.precoPretendido,
  subprecificacaoMeta: { nAnuncios: 70, tempoExposicaoDias: 90 },
  homogeneizacao: {
    indice: `${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte}`,
    serie: FIPEZAP_SP_VENDA_RESIDENCIAL,
    dataReferencia: FIPEZAP_SP_ULTIMA_COMPETENCIA,
  },
})

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

const h = computation.headline
const fmt = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`
const difPercent =
  Math.round(((h.referencia.valorMercado - T.precoPretendido) / T.precoPretendido) * 1000) / 10
const cenarioLabel = (c: { cenario: string; n: number }) =>
  c.cenario === 'todos' ? `todos os ${c.n}` : c.cenario === 'top5' ? 'Top 5' : 'Top 3'
const cenarioTodos = computation.sensibilidade.find((s) => s.cenario === 'todos')!

// C-1 nível 1 — sensibilidade DECLARADA ao estado de conservação (deságio/Capex).
// A NBR 14653-2 admite campo de arbítrio até ±15% para atributo relevante não
// modelado (aqui: estado de conservação do alvo) DESDE QUE declarado. Trocamos o
// −15% OCULTO (Capex Score B) por 3 cenários explícitos sobre a mediana aderente
// (Top 5). Para imóvel CONSERVADO, o provável é 0 a −7,5%, não −15%.
const medRefBruta = h.referencia.medianaPrecoM2 // R$/m² bruto do cenário aderente
const valorDesagio = (f: number) => Math.round(medRefBruta * T.areaConstruida * f)
const dConservador = valorDesagio(0.85) // −15% (piso Capex Score B) = h.referencia.valorMercado
const dProvavel = valorDesagio(0.925) // −7,5% — imóvel conservado
const dAgressivo = valorDesagio(1.0) // 0% — reformado / muito conservado

// Lente de TERRENO (Sec. 8) — agora ATIVA com o terreno do alvo (~220 m²).
// Mediana de R$/m² de terreno das casas de lote <500 m² (guia oficial) × área do alvo.
const banda500 = computation.efeitoEscalaTerreno.find((b) => b.faixa === '<500')
const leituraTerreno =
  banda500 && banda500.n > 0 ? Math.round(banda500.medianaPrecoM2Terreno * AREA_TERRENO_ALVO) : null

// Faixa entre as duas lentes independentes (construção Top 5 × terreno).
const lenteConstr = h.referencia.valorMercado
const faixaLentesMin = leituraTerreno ? Math.min(lenteConstr, leituraTerreno) : lenteConstr
const faixaLentesMax = leituraTerreno ? Math.max(lenteConstr, leituraTerreno) : lenteConstr

const input: LaudoInput = {
  enderecoAlvo: T.endereco,
  bairro: `Vila Olímpia (CEP ${T.cep})`,
  proprietario: T.proprietario,
  areaConstruida: T.areaConstruida,
  areaTerreno: AREA_TERRENO_ALVO, // ~220 m² (provisório — condicionante nº1, confirmar na matrícula)
  programa: { dormitorios: T.dormitorios, suites: T.suites, vagas: T.vagas },
  classeTexto: 'Conservado — pronto para morar',
  precoPretendido: T.precoPretendido,
  precoPedidoReal: T.precoPedidoReal,
  refAnuncioReal: '70+ anúncios em 3 portais — preço estagnado desde a captação',
  precoM2ConstrPedido: Math.round(T.precoPedidoReal / T.areaConstruida),
  precoAnuncioRecomendado: null, // decisão comercial — definir com a consultora
  metaFechamento: h.fechamento,
  dataEmissao: new Date().toLocaleDateString('pt-BR'),
  diferencaPercent: difPercent,
  diferencaNota:
    'Cenário aderente (fechamentos ITBI homogeneizados) vs. preço anunciado — leitura na seção 9.',
  desagioFechamentoNota:
    'Cenário ILUSTRATIVO de calibração comercial (Sec. 2): fatores de liquidez/condição declarados e compostos sobre o valor de mercado. Percentuais a validar com a consultora (H-3); o valor TÉCNICO de mercado (faixa das seções 1 e 9) não é afetado por esta camada.',
  fatoresLiquidezDetalhe: FATORES_LIQUIDEZ,
  eixosArgumentacao: [
    'Anúncio ≠ fechamento: a âncora deste laudo são transações registradas (ITBI/PMSP) deflacionadas a valor presente — não preços pedidos de concorrentes.',
    'Pulverização de anúncios: 70+ anúncios simultâneos com informações divergentes (196–220 m², 3–4 quartos) corroem a percepção de valor — consolidar em representação única com dados uniformizados.',
    'Estagnação: preço parado no mesmo patamar reduz visitas e alonga a exposição; o reposicionamento deve ser guiado pela evidência de fechamento, não por teste de mercado.',
    'Tipologia depurada por guia oficial (R5): a amostra usa exclusivamente CASAS — as duas transações ITBI da própria rua eram unidades verticais ("AP 82" no nº 45; unidade provável no nº 110) e foram excluídas; a referência vem das casas do raio, que sustentam patamar SUPERIOR ao anúncio atual.',
  ],
  criteriosSelecao: [
    {
      criterio: 'Geográfico',
      parametro: `Raio de ${dataset.recorte.raioM.toLocaleString('pt-BR')} m do imóvel-alvo`,
      justificativa: 'Microrregião Vila Olímpia / Moema (PostGIS)',
    },
    {
      criterio: 'Evidência',
      parametro: 'Vendas reais (ITBI/PMSP)',
      justificativa: 'Somente fechamentos registrados — nunca preço de anúncio',
    },
    {
      criterio: 'Tipologia (proxy)',
      parametro: 'Endereço com venda única no período',
      justificativa:
        'Exclui edifícios verticais (N vendas no mesmo endereço); campo "tipo" indisponível até a Story 9.4 — validação humana recomendada',
    },
    {
      criterio: 'Classe de valor',
      parametro: 'R$/m² < 22.000 (piso do Score A)',
      justificativa: 'Mesma classe do alvo; remove unidades de luxo verticais e guias inconsistentes',
    },
    {
      criterio: 'Período',
      parametro: '2023–2026 (ITBI, data da guia)',
      justificativa: 'Atualidade das transações; deflação a valor presente (linha abaixo)',
    },
  ],
  ofertasAtivas: [],
  notaOfertas:
    'A leitura de concorrência ativa foi deliberadamente excluída desta emissão (pedido do proprietário do processo): o posicionamento é ancorado apenas em fechamentos reais. As amostras de preço pedido da apresentação de abril/2026 NÃO entram na estatística.',
  concorrentesDiretos: [],
  referenciasSuperiores: [],
  concorrenciaJustificativa:
    `Nota sobre a própria rua: as duas únicas transações ITBI registradas na Rua Dr. Andrade Pertence no período (nº 45 e nº 110) são unidades VERTICAIS — o nº 45 é o "AP 82" de um condomínio de 1994 (guia oficial: apartamento, fração ideal 0,0851) e o nº 110 tem SQL em faixa condominial. Ambas foram EXCLUÍDAS da amostra pela regra R5 (tipologia por guia). Não há fechamento de CASA na própria rua no período coberto; a âncora de posicionamento são as ${computation.totalComparaveis} casas do raio de 1 km, cuja faixa (${fmt(h.mercado.min)}–${fmt(h.mercado.max)}) fica bem ACIMA do anúncio estagnado de ${fmt(T.precoPedidoReal)} — a tese de SUBPRECIFICAÇÃO se mantém, agora sobre amostra depurada.`,
  motivosSelecao: [
    '★★★ Top 3 — máxima aderência: área construída próxima de 220 m² e menor distância ao alvo, na mesma classe e tipologia (casa confirmada por guia).',
    '★ Top 4–5 — reforço da leitura de microlocalização.',
    `A similaridade de terreno (20% do índice) é mantida FORA do ranking de construção por decisão metodológica: com terreno ~${AREA_TERRENO_ALVO} m² a similaridade puxaria casas terreno-similares porém baratas em construção (ITBI subdeclarado/valor de terra), distorcendo a mediana de construção. O terreno entra como LENTE INDEPENDENTE (Sec. 8), não como peso de aderência.`,
  ],
  notaEfeitoEscala:
    `O efeito-escala de terreno é medido (Sec. 8) com as áreas reais das guias oficiais. Com o terreno do alvo ~${AREA_TERRENO_ALVO} m² (provisório), a lente é aplicada: mediana de R$/m² de terreno das casas de lote <500 m²${banda500 ? ` (${banda500.n} casas, ${fmt(banda500.medianaPrecoM2Terreno)}/m²)` : ''} × ${AREA_TERRENO_ALVO} m² ⇒ ${leituraTerreno ? `~${fmt(leituraTerreno)}` : 'n/d'}.`,
  rastreabilidadeNota:
    'SQL = Setor/Quadra/Lote (cadastro municipal), extraído da guia ITBI/PMSP ingerida. Consulta pública: GeoSampa.',
  abordagemADescricao:
    `Abordagem A (comparação direta de terreno): R$/m² de terreno das casas da amostra (guias oficiais) × ${AREA_TERRENO_ALVO} m² do alvo (provisório) ⇒ leitura de terreno ${leituraTerreno ? `~${fmt(leituraTerreno)}` : 'n/d'}. Confirmar a metragem na matrícula/IPTU (condicionante nº 1).`,
  coefAproveitamento:
    `Terreno do alvo ~${AREA_TERRENO_ALVO} m² (provisório): com ~${T.areaConstruida} m² construídos, o coeficiente de aproveitamento fica em ~1,0 (sobrado de 2 pavimentos). ATENÇÃO: 6 vagas num lote de ~220 m² é apertado — é possível que o terreno real seja MAIOR; conferir na matrícula/IPTU antes de fixar a lente de terreno.`,
  convergenciaTerreno:
    `Duas lentes independentes: construção (${T.areaConstruida} m² × mediana R$/m²c, Top 5) = ${fmt(lenteConstr)}; terreno (~${AREA_TERRENO_ALVO} m² × R$/m² de terreno da amostra) = ${leituraTerreno ? `~${fmt(leituraTerreno)}` : 'n/d'}. Formam uma faixa de ${fmt(faixaLentesMin)}–${fmt(faixaLentesMax)}, ambas ACIMA do anúncio de ${fmt(T.precoPedidoReal)} — a leitura por dois caminhos independentes reforça a tese de subprecificação. (Terreno provisório — confirmar na matrícula; se o lote for maior, a lente de terreno sobe.)`,
  perfisComprador: [
    `Comprador-usuário: casa conservada, pronta para morar, 4 quartos/6 vagas perto do Metrô Eucaliptos — paga pelo construído (R$/m² × ${T.areaConstruida} m²); para imóvel conservado é a lente PRIMÁRIA.`,
    `Comprador-terreno/investidor: com terreno ~${AREA_TERRENO_ALVO} m², a lente de terreno (${leituraTerreno ? `~${fmt(leituraTerreno)}` : 'n/d'}) converge com a de construção — mas num imóvel conservado o valor está no construído, não na terra.`,
  ],
  sensibilidadeLeitura:
    `O cenário aderente de referência (${cenarioLabel(h.referencia)}) fica em ${fmt(h.referencia.valorMercado)} e o recorte amplo (${cenarioLabel(cenarioTodos)}) em ${fmt(cenarioTodos.valorMercado)} — os três recortes praticamente convergem, sinal de amostra homogênea (só casas, tipologia confirmada). O preço anunciado (${fmt(T.precoPedidoReal)}) situa-se ${difPercent >= 0 ? `${Math.abs(difPercent).toLocaleString('pt-BR')}% ABAIXO do cenário aderente` : 'acima do cenário aderente'} — o dado NÃO sustenta corte de preço; sustenta reposicionamento da apresentação e verificação das metragens oficiais. Ressalva: o valor de mercado embute Capex de −15% (Score B da régua); para imóvel conservado essa dedução é conservadora — a faixa real tende ao topo. SENSIBILIDADE DECLARADA AO ESTADO DE CONSERVAÇÃO (campo de arbítrio NBR): em vez do −15% fixo, esta emissão declara três cenários sobre a mediana aderente — conservador ${fmt(dConservador)} (−15%, piso Capex Score B), provável ${fmt(dProvavel)} (−7,5%, imóvel conservado) e agressivo ${fmt(dAgressivo)} (0%, reformado). Para o 132 (conservado, pronto para morar, contra amostra de casas de padrão ~1970), o cenário PROVÁVEL é ${fmt(dProvavel)}; o −15% é PISO conservador, não a leitura central.`,
  ponderacaoValor:
    `O comprador-usuário referencia a faixa via construção — ${fmt(h.mercado.min)} a ${fmt(h.mercado.max)} (${computation.totalComparaveis} fechamentos de CASAS, ITBI homogeneizado a ${FIPEZAP_SP_ULTIMA_COMPETENCIA}). O preço anunciado de ${fmt(T.precoPedidoReal)} está ${Math.abs(difPercent).toLocaleString('pt-BR')}% abaixo dessa referência. Hipótese de trabalho: o problema do imóvel não é preço alto — é apresentação pulverizada (70+ anúncios divergentes) e, possivelmente, preço BAIXO demais para o produto. Validar metragens oficiais (construída e terreno) antes de reposicionar.`,
  fundamentacao: [
    `Evidência de fechamento (âncora): ${computation.totalComparaveis} vendas reais de ITBI/PMSP no raio de ${dataset.recorte.raioM.toLocaleString('pt-BR')} m, recorte declarado, mediana homogeneizada de ${computation.medianaPrecoM2.toLocaleString('pt-BR')}/m².`,
    `Atualização temporal: ${computation.homogeneizacao.ajustes.length} de ${computation.totalComparaveis} comparáveis deflacionados a ${computation.homogeneizacao.dataReferencia} pelo índice ${computation.homogeneizacao.indice}.`,
    `Composição por bairro verificado: ${computation.composicaoBairros.map((b) => `${b.bairro} (${b.n})`).join(', ')}.`,
    `Tipologia depurada (R5): amostra exclusivamente de casas — ${dataset.recorte.funil.aposClasseValor - computation.totalComparaveis - computation.autoReferenciasExcluidas.length} unidades verticais excluídas via guia oficial/heurística de lote (inclui as duas transações da própria rua — seção 6).`,
    `Segunda lente (terreno): R$/m² de terreno das casas de lote <500 m² × ${AREA_TERRENO_ALVO} m² (provisório) ⇒ ${leituraTerreno ? `~${fmt(leituraTerreno)}` : 'n/d'}, convergente com a lente de construção (${fmt(h.referencia.valorMercado)}) — confirmar metragem na matrícula (condicionante nº 1).`,
  ],
  estrategiaComercial: [
    `NÃO cortar preço com base em preços pedidos de concorrentes: a evidência de fechamento de CASAS (faixa ${fmt(h.mercado.min)}–${fmt(h.mercado.max)}, tipologia confirmada por guia oficial) não indica sobrepreço no anúncio atual — indica o contrário.`,
    'Consolidar a oferta: eliminar a pulverização (70+ anúncios divergentes) e uniformizar metragem/programa em representação única.',
    'Levantar na matrícula/IPTU: área construída oficial (196 × 220 m²) e metragem do TERRENO — com o R$/m² de terreno da amostra já medido (Sec. 8), essa metragem destrava a segunda lente de valor.',
    'Conferir na planilha Fase 1 as casas "prováveis" (vendas 2026 ainda sem guia pública) — únicas linhas com tipologia por heurística.',
    'Definir fatores de liquidez com a consultora — a meta de fechamento aperta após essa calibração.',
  ],
  condicionantes: [
    `Nº 1 — Metragens oficiais: confirmar na matrícula/IPTU a área construída (anúncios divergem 196–220 m²) e a área de TERRENO (adotada ~${AREA_TERRENO_ALVO} m² PROVISÓRIA nesta emissão). Ressalva: 6 vagas num lote de ~220 m² é apertado — o terreno real pode ser maior; a lente de terreno se ajusta proporcionalmente à metragem confirmada.`,
    'Nº 2 — Tipologia: confirmada por guia oficial (SF/PMSP) para as vendas ≤ 2025; as vendas de 2026 usam heurística de lote declarada até a SF publicar o arquivo do exercício. Dois endereços que a heurística havia classificado como casa (Av. Cotovia 726 e Av. Pavão 700) foram reclassificados como EDIFÍCIO por verificação visual (Google Street View, dez/2024) e excluídos da amostra.',
    'Distâncias aproximadas: coordenadas da base geocodificadas por logradouro/CEP (±~200 m).',
    'Fatores de liquidez/condição (Sec. 2): cenário ILUSTRATIVO (−7% / −5% / −4%) ancorado na estagnação e na divergência cadastral do imóvel; validar os percentuais com a consultora (H-3). Sem Capex de modernização (imóvel conservado).',
    `Deságio/Capex DECLARADO (campo de arbítrio NBR — C-1): o valor de mercado computado usa o PISO conservador de −15% (Score B). Para imóvel conservado o cenário provável é −7,5% (${fmt(dProvavel)}) e o teto 0% (${fmt(dAgressivo)}) — confirmar o estado do alvo (ficha/vistoria) para fixar o fator final.`,
  ],
  parecerFinal:
    `Emissão técnica ${VERSAO} (amostra depurada por tipologia): DUAS lentes independentes convergem. Lente de construção — ${computation.totalComparaveis} fechamentos reais de CASAS no raio de 1 km, homogeneizados — sustenta ${fmt(h.referencia.valorMercado)} (Top 5; faixa ${fmt(h.mercado.min)}–${fmt(h.mercado.max)}) para ${T.areaConstruida} m². Lente de terreno — ~${AREA_TERRENO_ALVO} m² × R$/m² de terreno da amostra ⇒ ${leituraTerreno ? `~${fmt(leituraTerreno)}` : 'n/d'}. As duas formam a faixa ${fmt(faixaLentesMin)}–${fmt(faixaLentesMax)}, ambas ACIMA do anúncio (${fmt(T.precoPedidoReal)}, ~${Math.abs(difPercent).toLocaleString('pt-BR')}% abaixo da lente de construção): a evidência NÃO sustenta corte de preço — sustenta consolidar a oferta e reposicionar. Recomenda-se (1) confirmar metragens oficiais na matrícula/IPTU (área construída fixada em ${T.areaConstruida} m²; terreno ~${AREA_TERRENO_ALVO} m² provisório — 6 vagas sugerem possível lote maior), (2) validar na Fase 1 as casas prováveis de 2026, e só então calibrar preço de anúncio e fechamento com a consultora. Faixa por estado de conservação (deságio declarado): conservador ${fmt(dConservador)} (−15%) · provável ${fmt(dProvavel)} (−7,5%) · agressivo ${fmt(dAgressivo)} (0%) — para imóvel conservado a leitura central é ${fmt(dProvavel)}.`,
}

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
  // Terreno do alvo ~220 m² (provisório): a lente de terreno agora É exibida.
  model.header.programa.terreno = AREA_TERRENO_ALVO
  const coAncoraRow = model.sec10.tabela.find((r) => r.rotulo.startsWith('Co-âncora'))
  if (coAncoraRow) coAncoraRow.rotulo = 'Co-âncora de terreno (~220 m², provisório)'

  // C-1 nível 1: anexa a sensibilidade de deságio (estado de conservação) à Sec. 9.
  // Campo de arbítrio DECLARADO — troca o −15% oculto por 3 cenários explícitos.
  const desagioRows = [
    { rot: 'Deságio 0% — reformado / muito conservado (agressivo)', f: 1 },
    { rot: 'Deságio −7,5% — conservado, pronto p/ morar (PROVÁVEL)', f: 0.925 },
    { rot: 'Deságio −15% — piso Capex Score B (conservador)', f: 0.85 },
  ]
  for (const d of desagioRows) {
    const v = Math.round(medRefBruta * T.areaConstruida * d.f)
    model.sec9.cenarios.push({
      cenario: d.rot,
      n: h.referencia.n,
      medianaPrecoM2: medRefBruta,
      valorMercado: v,
      valorFechamento: v,
      precoM2Fechamento: Math.round(v / T.areaConstruida),
    })
  }

  const buf = await renderToBuffer(<LaudoDocument model={model} />)
  const pdfPath = escreverComFallback(
    path.join(outDir, `LAUDO-ACM-AndradePertence132-${VERSAO}-${hoje}.pdf`),
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
    autoReferenciasExcluidas: computation.autoReferenciasExcluidas,
    excluidosTipologia: (dataset.recorte as { excluidosTipologia?: unknown }).excluidosTipologia ?? [],
    precoAnunciado: T.precoPedidoReal,
    diferencaAnuncioVsReferenciaPercent: difPercent,
    pendencias: input.condicionantes,
  }
  const jsonPath = escreverComFallback(
    path.join(outDir, `LAUDO-ACM-AndradePertence132-${VERSAO}-${hoje}.computation.json`),
    JSON.stringify(revisao, null, 2),
  )

  console.log(`PDF:  ${pdfPath} (${(buf.length / 1024).toFixed(0)} KB)`)
  console.log(`JSON: ${jsonPath}`)
  console.log(`Score alvo: ${computation.scoreAlvo} | mediana homogeneizada: ${computation.medianaPrecoM2.toLocaleString('pt-BR')}/m²`)
  console.log(
    `Headline mercado: ${revisao.headline.mercado.min.toLocaleString('pt-BR')} – ${revisao.headline.mercado.max.toLocaleString('pt-BR')} (ref. ${revisao.headline.referencia.cenario} = ${revisao.headline.referencia.valorMercado.toLocaleString('pt-BR')})`,
  )
  console.log(`Anunciado: ${T.precoPedidoReal.toLocaleString('pt-BR')} | dif. vs referência: ${difPercent}%`)
  console.log(`Auto-referências excluídas (guard-rail):`, revisao.autoReferenciasExcluidas)
  console.log(`Composição:`, revisao.composicaoBairros)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
