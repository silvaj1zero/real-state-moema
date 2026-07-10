/**
 * Deck Comercial RE/MAX — documento React-PDF em PAISAGEM (Story 8.4 AC1 · redesign 8.7).
 *
 * Slides derivados do `ACM_Apresentacao_Completa_Honduras_RE-MAX_v2.pdf`. Componente
 * PURO: recebe um `DeckModel` já computado por `buildDeckModel` (zero recálculo —
 * consistência com o laudo 8.3b, AC3).
 *
 * Branding em VETOR (barras RE/MAX + wordmark tipográfico): renderiza de forma
 * idêntica e crisp no browser (toBlob) e em node (renderToBuffer/testes), sem
 * depender de embed de PNG — que o renderer não embute de forma confiável. Mantém
 * a capacidade offline da ADR-EPIC8-001. Mapa via `staticMap.ts` (imagem runtime).
 */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatBRL } from '@/lib/format'
import { COLORS, FONTS, CONSULTORA } from './theme'
import type { DeckModel, DeckStat } from './deckModel'
import type { LaudoTopRow } from './laudoModel'

const DASH = '—'
const fmt = (v: number | null | undefined) => (v == null ? DASH : formatBRL(v))
const mi = (v: number | null | undefined) => (v == null ? DASH : `R$ ${(v / 1e6).toFixed(1).replace('.', ',')} mi`)
const intM = (v: number | null | undefined) => (v == null ? DASH : `${Math.round(v).toLocaleString('pt-BR')} m²`)
const numInt = (v: number | null | undefined) => (v == null ? DASH : Math.round(v).toLocaleString('pt-BR'))
const faixaMi = (f?: { min: number; max: number } | null) =>
  f == null ? DASH : `R$ ${(f.min / 1e6).toFixed(1).replace('.', ',')}–${(f.max / 1e6).toFixed(1).replace('.', ',')} mi`

const s = StyleSheet.create({
  page: {
    flexDirection: 'column',
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 48,
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.corpo,
    lineHeight: 1.45,
  },
  pageDark: { backgroundColor: COLORS.azulEscuro },
  // corpo flexível — preenche a tela entre cabeçalho e rodapé (corrige subutilização vertical)
  body: { flexGrow: 1, justifyContent: 'center' },
  bodyTop: { flexGrow: 1, justifyContent: 'flex-start', paddingTop: 6 },

  // ---- topo do slide
  slideTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  kicker: { flex: 1, paddingRight: 8, fontSize: 8, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 1.2 },
  kickerLight: { flex: 1, paddingRight: 8, fontSize: 8, color: '#9DB2D9', textTransform: 'uppercase', letterSpacing: 1.2 },
  h1Light: { fontFamily: FONTS.heading, fontSize: 34, color: COLORS.branco, lineHeight: 1.12 },
  h2: { fontFamily: FONTS.heading, fontSize: 24, color: COLORS.azulEscuro, lineHeight: 1.15 },
  // a régua de acento fica claramente ABAIXO do título (não cruza os glifos)
  titleRule: { borderBottomWidth: 3, borderBottomColor: COLORS.vermelho, width: 48, marginTop: 12, marginBottom: 4 },
  lead: { fontSize: 12, color: COLORS.corpo, maxWidth: 660, lineHeight: 1.5 },
  leadLight: { fontSize: 13, color: '#D6E0F2', maxWidth: 660, lineHeight: 1.5 },
  rule: { borderBottomWidth: 3, borderBottomColor: COLORS.vermelho, width: 64, marginTop: 14, marginBottom: 14 },

  // ---- marca RE/MAX (vetor: barras + wordmark)
  brand: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 8 },
  brandBars: { width: 22, height: 26, borderRadius: 3, overflow: 'hidden', flexDirection: 'column' },
  brandWord: { fontFamily: FONTS.heading, fontSize: 13, letterSpacing: 0.3 },

  // ---- stats — card com barra de acento no topo; altura moderada, centrado pelo body
  statRow: { flexDirection: 'row', gap: 14 },
  statCard: {
    flex: 1, minHeight: 160, borderWidth: 1, borderColor: COLORS.cinzaBorda, borderTopWidth: 3,
    borderTopColor: COLORS.vermelho, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 18,
    backgroundColor: COLORS.branco, justifyContent: 'center',
  },
  statValor: { fontFamily: FONTS.heading, fontSize: 30, color: COLORS.azulEscuro, lineHeight: 1.08 },
  statValorSm: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.azulEscuro, lineHeight: 1.15 },
  statRotulo: { fontSize: 9.5, color: COLORS.corpo, marginTop: 10, lineHeight: 1.4 },

  // ---- cards genéricos
  cardRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', flexGrow: 1, alignContent: 'center' },
  card: {
    flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderColor: COLORS.cinzaBorda, borderLeftWidth: 3,
    borderLeftColor: COLORS.vermelho, borderRadius: 8, padding: 14, justifyContent: 'center',
  },
  cardNum: { fontFamily: FONTS.heading, fontSize: 13, color: COLORS.vermelho, marginBottom: 5 },
  cardTitulo: { fontFamily: FONTS.bodyMedium, fontSize: 12.5, color: COLORS.azulEscuro, marginBottom: 5 },
  cardTexto: { fontSize: 9.8, color: COLORS.corpo, lineHeight: 1.45 },

  // ---- bullets
  bulletWrap: { justifyContent: 'center', flexGrow: 1 },
  bullet: { flexDirection: 'row', marginBottom: 9 },
  bulletDot: { width: 16, fontFamily: FONTS.bodyMedium, color: COLORS.vermelho, fontSize: 12 },
  bulletNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.azulEscuro, color: COLORS.branco,
    fontFamily: FONTS.heading, fontSize: 11, textAlign: 'center', paddingTop: 4, marginRight: 10,
  },
  bulletText: { flex: 1, fontSize: 11.5, lineHeight: 1.45, paddingTop: 1 },

  // ---- duas colunas
  twoCol: { flexDirection: 'row', gap: 18 },
  col: { flex: 1 },
  metricBox: {
    borderWidth: 1, borderColor: COLORS.cinzaBorda, borderTopWidth: 3, borderTopColor: COLORS.vermelho,
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: COLORS.branco,
  },
  bigValue: { fontFamily: FONTS.heading, fontSize: 28, color: COLORS.azul, lineHeight: 1.1, marginTop: 4 },
  bigValueGreen: { color: COLORS.verde },
  smallNote: { fontSize: 9, color: COLORS.cinzaClaro },

  // ---- destaque (recomendação)
  hiBox: { borderWidth: 1.5, borderColor: COLORS.verde, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 22 },

  // ---- mapa
  mapImg: { width: '58%', height: 320, borderRadius: 8, objectFit: 'cover' },
  mapPlaceholder: {
    width: '58%', height: 320, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cinzaBorda,
    backgroundColor: COLORS.fundoSuave, alignItems: 'center', justifyContent: 'center',
  },
  legend: { fontSize: 8.5, color: COLORS.cinzaClaro, lineHeight: 1.4 },

  // ---- tabela
  table: { borderWidth: 1, borderColor: COLORS.cinzaBorda, borderRadius: 6, overflow: 'hidden' },
  tr: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 10 },
  trAlt: { backgroundColor: COLORS.fundoSuave },
  trHead: { backgroundColor: COLORS.azulEscuro, paddingVertical: 8, paddingHorizontal: 10 },
  th: { fontSize: 7.5, color: COLORS.branco, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: FONTS.bodyMedium },
  td: { fontSize: 10 },
  tdStrong: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },

  // ---- rodapé
  footer: {
    position: 'absolute', bottom: 18, left: 48, right: 48,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: COLORS.cinzaBorda, paddingTop: 6,
  },
  footerText: { fontSize: 7.5, color: COLORS.cinzaClaro },

  // ---- elementos decorativos de capa/encerramento
  edgeBar: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 6, backgroundColor: COLORS.vermelho },
  watermark: { position: 'absolute', right: -70, bottom: -90, width: 300, height: 360, borderRadius: 20, overflow: 'hidden', flexDirection: 'column', opacity: 0.05 },
  coverBottom: { borderTopWidth: 0.5, borderTopColor: '#2A4A7A', paddingTop: 10 },
  coverName: { fontFamily: FONTS.heading, fontSize: 13, color: COLORS.branco },
  coverContato: { fontSize: 8, color: '#9DB2D9', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
})

/** Barras RE/MAX (vermelho / branco / azul) — assinatura visual da marca, em vetor. */
function RemaxBars({ big }: { big?: boolean }) {
  return (
    <View style={big ? s.watermark : s.brandBars}>
      <View style={{ flex: 1, backgroundColor: COLORS.vermelho }} />
      <View style={{ flex: 1, backgroundColor: COLORS.branco }} />
      <View style={{ flex: 1, backgroundColor: COLORS.azul }} />
    </View>
  )
}

/** Lockup RE/MAX: barras + wordmark. `light` = texto branco (slides escuros). */
function BrandLockup({ light }: { light?: boolean }) {
  return (
    <View style={s.brand}>
      <RemaxBars />
      <Text style={[s.brandWord, { color: light ? COLORS.branco : COLORS.azulEscuro }]}>
        RE/MAX <Text style={{ color: COLORS.vermelho }}>GALERIA</Text>
      </Text>
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{CONSULTORA.nome} · {CONSULTORA.creci} · RE/MAX Galeria Moema</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function SlideHead({ kicker, titulo }: { kicker: string; titulo: string }) {
  return (
    <>
      <View style={s.slideTop}>
        <Text style={s.kicker}>{kicker}</Text>
        <BrandLockup />
      </View>
      <Text style={[s.h2, { marginTop: 14 }]}>{titulo}</Text>
      <View style={s.titleRule} />
    </>
  )
}

function Stats({ stats }: { stats: DeckStat[] }) {
  return (
    <View style={s.statRow}>
      {stats.map((st, i) => {
        const longo = st.valor.length > 8
        return (
          <View key={i} style={s.statCard}>
            <Text style={longo ? s.statValorSm : s.statValor}>{st.valor}</Text>
            <Text style={s.statRotulo}>{st.rotulo}</Text>
          </View>
        )
      })}
    </View>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={s.bulletWrap}>
      {items.map((b, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={s.bulletDot}>›</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  )
}

const TOP_W = { rank: '6%', end: '34%', constr: '14%', terr: '14%', m2t: '16%', m2c: '16%' } as const
function TopTable({ rows }: { rows: LaudoTopRow[] }) {
  return (
    <View style={s.table}>
      <View style={[s.tr, s.trHead]} wrap={false}>
        <Text style={[s.th, { width: TOP_W.rank }]}>#</Text>
        <Text style={[s.th, { width: TOP_W.end }]}>Endereço (vendido)</Text>
        <Text style={[s.th, { width: TOP_W.constr, textAlign: 'right' }]}>Constr.</Text>
        <Text style={[s.th, { width: TOP_W.terr, textAlign: 'right' }]}>Terreno</Text>
        <Text style={[s.th, { width: TOP_W.m2t, textAlign: 'right' }]}>R$/m² terreno</Text>
        <Text style={[s.th, { width: TOP_W.m2c, textAlign: 'right' }]}>R$/m² constr.</Text>
      </View>
      {rows.map((r, i) => (
        <View key={r.rank} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]} wrap={false}>
          <Text style={[s.tdStrong, { width: TOP_W.rank, color: COLORS.dourado }]}>{r.rank}</Text>
          <Text style={[s.td, { width: TOP_W.end }]}>{r.endereco}</Text>
          <Text style={[s.td, { width: TOP_W.constr, textAlign: 'right' }]}>{intM(r.construido)}</Text>
          <Text style={[s.td, { width: TOP_W.terr, textAlign: 'right' }]}>{intM(r.terreno)}</Text>
          <Text style={[s.tdStrong, { width: TOP_W.m2t, textAlign: 'right' }]}>{numInt(r.precoM2Terreno)}</Text>
          <Text style={[s.td, { width: TOP_W.m2c, textAlign: 'right' }]}>{numInt(r.precoM2Construido)}</Text>
        </View>
      ))}
    </View>
  )
}

export function DeckDocument({ model }: { model: DeckModel }) {
  return (
    <Document
      title={`Deck Comercial ACM — ${model.capa.cidadeRegiao}`}
      author={CONSULTORA.nome}
      subject="Apresentação Comercial — Análise Comparativa de Mercado"
    >
      {/* 1. CAPA */}
      <Page size="A4" orientation="landscape" style={[s.page, s.pageDark]}>
        <View style={s.edgeBar} fixed />
        <RemaxBars big />
        <View style={s.slideTop}>
          <Text style={s.kickerLight}>RE/MAX Galeria · Análise Comparativa de Mercado</Text>
          <BrandLockup light />
        </View>
        <View style={s.body}>
          <Text style={s.leadLight}>{model.capa.saudacao}</Text>
          <Text style={[s.h1Light, { marginTop: 10 }]}>O caminho mais eficiente para vender seu imóvel.</Text>
          <View style={s.rule} />
          <Text style={s.leadLight}>{model.capa.cidadeRegiao} · {model.capa.dataEmissao}</Text>
        </View>
        <View style={s.coverBottom}>
          <Text style={s.coverName}>{CONSULTORA.nome}</Text>
          <Text style={s.coverContato}>
            {CONSULTORA.cargo} · {CONSULTORA.creci} · {CONSULTORA.telefone} · {CONSULTORA.email}
          </Text>
        </View>
      </Page>

      {/* 2. PAUTA */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Pauta desta ACM" titulo="O que vamos percorrer" />
        <View style={s.cardRow}>
          {model.pauta.map((p, i) => (
            <View key={i} style={[s.card, { flexBasis: '30%' }]} wrap={false}>
              <Text style={s.cardNum}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={s.cardTexto}>{p}</Text>
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      {/* 3. RE/MAX no mundo */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="A RE/MAX no mundo" titulo="A maior rede imobiliária do mundo em VGV" />
        <View style={s.body}>
          <Text style={s.lead}>
            Empresa americana fundada em 1973, em Denver (Colorado), líder mundial em número de franquias —
            todos os corretores ligados por um sistema tecnológico único, em tempo real.
          </Text>
          <View style={[s.statRow, { marginTop: 22 }]}>
            {model.remaxMundo.map((st, i) => {
              const longo = st.valor.length > 8
              return (
                <View key={i} style={s.statCard}>
                  <Text style={longo ? s.statValorSm : s.statValor}>{st.valor}</Text>
                  <Text style={s.statRotulo}>{st.rotulo}</Text>
                </View>
              )
            })}
          </View>
        </View>
        <Footer />
      </Page>

      {/* 4. RE/MAX Brasil */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="RE/MAX Brasil · desde 2009 · nº 1 em vendas" titulo="O melhor trimestre da nossa história" />
        <View style={s.body}>
          <Stats stats={model.remaxBrasil} />
        </View>
        <Footer />
      </Page>

      {/* 5. Diferenciais */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Como trabalhamos" titulo="Os diferenciais RE/MAX" />
        <View style={s.cardRow}>
          {model.diferenciais.map((d, i) => (
            <View key={i} style={s.card} wrap={false}>
              <Text style={s.cardTitulo}>{d.titulo}</Text>
              <Text style={s.cardTexto}>{d.texto}</Text>
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      {/* 6. Sobre o imóvel */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Sobre o seu imóvel" titulo="Características confirmadas em anúncio publicado" />
        <View style={[s.twoCol, s.body]}>
          <View style={s.col}>
            <Bullets items={model.imovel.bullets} />
          </View>
          <View style={[s.col, { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'center' }]}>
            <View style={[s.statCard, { flexBasis: '45%', flexGrow: 1 }]}>
              <Text style={s.statValor}>{intM(model.imovel.terreno)}</Text>
              <Text style={s.statRotulo}>Terreno</Text>
            </View>
            <View style={[s.statCard, { flexBasis: '45%', flexGrow: 1 }]}>
              <Text style={s.statValor}>{intM(model.imovel.construido)}</Text>
              <Text style={s.statRotulo}>Área construída</Text>
            </View>
            <View style={[s.statCard, { flexBasis: '45%', flexGrow: 1 }]}>
              <Text style={s.statValorSm}>{model.imovel.dormSuites ?? DASH}</Text>
              <Text style={s.statRotulo}>Programa</Text>
            </View>
            <View style={[s.statCard, { flexBasis: '45%', flexGrow: 1 }]}>
              <Text style={s.statValorSm}>
                {model.imovel.score ? `Score ${model.imovel.score}` : DASH} · {model.imovel.garagem ?? DASH}
              </Text>
              <Text style={s.statRotulo}>Classe · garagem</Text>
            </View>
          </View>
        </View>
        <Footer />
      </Page>

      {/* 7. Precificação ponto de partida */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Precificação · ponto de partida" titulo="Onde o imóvel está posicionado hoje" />
        <View style={s.body}>
          <View style={s.twoCol}>
            <View style={[s.metricBox, s.col]}>
              <Text style={s.smallNote}>{model.precificacao.pretendido.nota}</Text>
              <Text style={s.bigValue}>{mi(model.precificacao.pretendido.valor)}</Text>
            </View>
            <View style={[s.metricBox, s.col]}>
              <Text style={s.smallNote}>{model.precificacao.pedidoReal.nota}</Text>
              <Text style={s.bigValue}>{mi(model.precificacao.pedidoReal.valor)}</Text>
            </View>
          </View>
          <Text style={[s.lead, { marginTop: 18 }]}>{model.precificacao.leitura}</Text>
        </View>
        <Footer />
      </Page>

      {/* 8. Fator oferta */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Por que precificar certo" titulo="Anunciar acima do preço afasta o comprador" />
        <View style={s.body}>
          <Text style={[s.lead, { marginBottom: 8 }]}>{model.fatorOferta.intro}</Text>
          <Bullets items={model.fatorOferta.efeitos} />
        </View>
        <Footer />
      </Page>

      {/* 9. Metodologia · 3 fontes */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Metodologia · três fontes cruzadas" titulo="Como chegamos ao valor" />
        <View style={s.body}>
          <Stats stats={model.metodologiaFontes} />
          <Text style={[s.lead, { marginTop: 16 }]}>
            Cada comparável é uma transação registrada, rastreável pelo cadastro municipal (SQL). Preço de anúncio
            entra só como leitura de concorrência — nunca como verdade de valor.
          </Text>
        </View>
        <Footer />
      </Page>

      {/* 10. Geografia · mapa */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Geografia · raio de análise" titulo="Os comparáveis no entorno imediato" />
        <View style={[s.twoCol, s.body, { alignItems: 'center' }]}>
          {model.mapa.url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={s.mapImg} src={model.mapa.url} />
          ) : (
            <View style={s.mapPlaceholder}>
              <Text style={s.legend}>Mapa indisponível neste preview</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.cardTexto}>{model.mapa.legenda}</Text>
            <View style={s.titleRule} />
            <Text style={s.lead}>{model.mapa.nota}</Text>
          </View>
        </View>
        <Footer />
      </Page>

      {/* 11. Comparáveis de maior aderência */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Comparáveis de maior aderência" titulo="Os 5 imóveis mais parecidos, já vendidos" />
        <View style={s.bodyTop}>
          <TopTable rows={model.topComparaveis} />
          <Text style={[s.legend, { marginTop: 10 }]}>
            Os lotes grandes lideram a aderência por refletirem o terreno do imóvel-alvo.
          </Text>
        </View>
        <Footer />
      </Page>

      {/* 12. Tese central · deságio */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="A tese central · evidência empírica medida" titulo="O mercado fecha abaixo do anúncio" />
        <View style={s.body}>
          <Bullets items={model.desagio.medicoes} />
          <Text style={[s.lead, { marginTop: 8 }]}>{model.desagio.conclusao}</Text>
        </View>
        <Footer />
      </Page>

      {/* 13. Co-âncora de terreno */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="O diferencial · o valor está na terra" titulo="O lote é uma co-âncora de valor" />
        <View style={s.body}>
          <View style={s.statRow}>
            {model.coAncora.abordagens.map((a, i) => (
              <View key={i} style={s.statCard}>
                <Text style={s.statValor}>{mi(a.valor)}</Text>
                <Text style={s.statRotulo}>{a.rotulo}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.lead, { marginTop: 18 }]}>{model.coAncora.nota}</Text>
        </View>
        <Footer />
      </Page>

      {/* 14. Duas frentes de demanda */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Por que o valor é robusto" titulo="Duas frentes de demanda no mesmo patamar" />
        <View style={s.body}>
          <View style={s.twoCol}>
            <View style={[s.card, s.col, { borderLeftColor: COLORS.azul }]}>
              <Text style={s.cardTitulo}>Comprador-usuário</Text>
              <Text style={s.bigValue}>{mi(model.duasFrentes.usuario.valor)}</Text>
              <Text style={[s.cardTexto, { marginTop: 6 }]}>{model.duasFrentes.usuario.texto}</Text>
            </View>
            <View style={[s.card, s.col, { borderLeftColor: COLORS.verde }]}>
              <Text style={s.cardTitulo}>Comprador-terreno</Text>
              <Text style={[s.bigValue, s.bigValueGreen]}>{mi(model.duasFrentes.terreno.valor)}</Text>
              <Text style={[s.cardTexto, { marginTop: 6 }]}>{model.duasFrentes.terreno.texto}</Text>
            </View>
          </View>
          <Text style={[s.lead, { marginTop: 16 }]}>{model.duasFrentes.sintese}</Text>
        </View>
        <Footer />
      </Page>

      {/* 15. Robustez · sensibilidade */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Robustez · mesma estratégia de cálculo" titulo="Três cenários, um mesmo intervalo" />
        <View style={s.bodyTop}>
          <View style={s.table}>
            <View style={[s.tr, s.trHead]} wrap={false}>
              <Text style={[s.th, { width: '46%' }]}>Cenário de amostragem</Text>
              <Text style={[s.th, { width: '10%', textAlign: 'right' }]}>N</Text>
              <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>Valor de mercado</Text>
              <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>Valor de fechamento</Text>
            </View>
            {model.sensibilidade.cenarios.map((c, i) => (
              <View key={i} style={[s.tr, ...(i % 2 ? [s.trAlt] : [])]} wrap={false}>
                <Text style={[s.td, { width: '46%' }]}>{c.cenario}</Text>
                <Text style={[s.td, { width: '10%', textAlign: 'right' }]}>{c.n}</Text>
                <Text style={[s.td, { width: '22%', textAlign: 'right' }]}>{fmt(c.valorMercado)}</Text>
                <Text style={[s.tdStrong, { width: '22%', textAlign: 'right', color: COLORS.verde }]}>{fmt(c.valorFechamento)}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.lead, { marginTop: 14 }]}>{model.sensibilidade.nota}</Text>
        </View>
        <Footer />
      </Page>

      {/* 16. Recomendação de preço */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Sugestão RE/MAX Galeria" titulo="Recomendação de precificação" />
        <View style={s.body}>
          <View style={s.hiBox}>
            <View style={s.twoCol}>
              <View style={s.col}>
                <Text style={s.smallNote}>Anúncio recomendado</Text>
                <Text style={s.bigValue}>{mi(model.recomendacao.anuncio)}</Text>
              </View>
              <View style={s.col}>
                <Text style={s.smallNote}>Meta de fechamento</Text>
                <Text style={[s.bigValue, s.bigValueGreen]}>{faixaMi(model.recomendacao.meta)}</Text>
              </View>
            </View>
            <Text style={[s.cardTexto, { marginTop: 16 }]}>{model.recomendacao.texto}</Text>
          </View>
        </View>
        <Footer />
      </Page>

      {/* 17. Plano de marketing */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Plano de marketing exclusivo" titulo="Material de alta qualidade, padronizado" />
        <Bullets items={model.planoMarketing} />
        <Footer />
      </Page>

      {/* 18. Garantia contratual */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Representação exclusiva e parceria" titulo="Compromisso de parte a parte, por contrato" />
        <Bullets items={model.garantia} />
        <Footer />
      </Page>

      {/* 19. Próximos passos */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Estratégia de venda · próximos passos" titulo="Do contrato à venda" />
        <View style={s.bulletWrap}>
          {model.proximosPassos.map((p, i) => (
            <View key={i} style={s.bullet} wrap={false}>
              <Text style={s.bulletNum}>{i + 1}</Text>
              <Text style={s.bulletText}>{p}</Text>
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      {/* 20. Encerramento */}
      <Page size="A4" orientation="landscape" style={[s.page, s.pageDark]}>
        <View style={s.edgeBar} fixed />
        <RemaxBars big />
        <View style={s.slideTop}>
          <Text style={s.kickerLight}>RE/MAX Galeria · Moema</Text>
          <BrandLockup light />
        </View>
        <View style={s.body}>
          <Text style={s.h1Light}>{model.encerramento.titulo}</Text>
          <View style={s.rule} />
          <Text style={s.leadLight}>{model.encerramento.texto}</Text>
        </View>
        <View style={s.coverBottom}>
          <Text style={s.coverName}>{CONSULTORA.nome}</Text>
          <Text style={s.coverContato}>
            {CONSULTORA.cargo} · {CONSULTORA.creci} · {CONSULTORA.telefone} · {CONSULTORA.email}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
