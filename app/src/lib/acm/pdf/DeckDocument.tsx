/**
 * Deck Comercial RE/MAX — documento React-PDF em PAISAGEM (Story 8.4 AC1).
 *
 * Slides derivados do `ACM_Apresentacao_Completa_Honduras_RE-MAX_v2.pdf`. Componente
 * PURO: recebe um `DeckModel` já computado por `buildDeckModel` (zero recálculo —
 * consistência com o laudo 8.3b, AC3). Branding/mapa via `theme.ts`/`staticMap.ts`.
 */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatBRL } from '@/lib/format'
import { COLORS, FONTS, CONSULTORA, REMAX_WORDMARK_PNG, REMAX_BALLOON_PNG } from './theme'
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
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 48,
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.corpo,
    lineHeight: 1.45,
  },
  pageDark: { backgroundColor: COLORS.azulEscuro },
  // topo do slide
  slideTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 16 },
  kicker: { flex: 1, paddingRight: 8, fontSize: 8, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 1 },
  kickerLight: { flex: 1, paddingRight: 8, fontSize: 8, color: '#9DB2D9', textTransform: 'uppercase', letterSpacing: 1 },
  h1: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.azulEscuro, marginTop: 6 },
  h1Light: { fontFamily: FONTS.heading, fontSize: 30, color: COLORS.branco, marginTop: 6 },
  h2: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.azulEscuro, marginTop: 2, marginBottom: 8 },
  lead: { fontSize: 12, color: COLORS.corpo, marginBottom: 10, maxWidth: 620 },
  leadLight: { fontSize: 13, color: '#D6E0F2', marginTop: 10, maxWidth: 620 },
  rule: { borderBottomWidth: 2, borderBottomColor: COLORS.vermelho, width: 60, marginVertical: 8 },
  // brand
  brandLockup: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  brandWordmark: { width: 116, height: 29, objectFit: 'contain' },
  brandBalloon: { width: 22, height: 26, objectFit: 'contain', marginRight: 6 },
  brandGaleriaLight: { fontFamily: FONTS.heading, fontSize: 13, color: COLORS.branco, letterSpacing: 0.5 },
  // stats
  statRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  statCard: { flex: 1, borderWidth: 1, borderColor: COLORS.cinzaBorda, borderRadius: 8, padding: 14 },
  statValor: { fontFamily: FONTS.heading, fontSize: 24, color: COLORS.azul },
  statRotulo: { fontSize: 9.5, color: COLORS.corpo, marginTop: 6 },
  // cards genéricos
  cardRow: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  card: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderColor: COLORS.cinzaBorda, borderRadius: 8, padding: 12 },
  cardTitulo: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.azulEscuro, marginBottom: 4 },
  cardTexto: { fontSize: 9.5, color: COLORS.corpo },
  // bullets
  bullet: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { width: 12, fontFamily: FONTS.bodyMedium, color: COLORS.vermelho, fontSize: 12 },
  bulletText: { flex: 1, fontSize: 11 },
  // duas colunas
  twoCol: { flexDirection: 'row', gap: 18, marginTop: 6 },
  col: { flex: 1 },
  bigValue: { fontFamily: FONTS.heading, fontSize: 28, color: COLORS.azul, marginTop: 4 },
  bigValueGreen: { color: COLORS.verde },
  smallNote: { fontSize: 9, color: COLORS.cinzaClaro, marginTop: 2 },
  // destaque (recomendação)
  hiBox: { borderWidth: 1.5, borderColor: COLORS.verde, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 16, marginTop: 8 },
  // mapa
  mapImg: { width: '60%', height: 300, borderRadius: 8, objectFit: 'cover' },
  mapPlaceholder: {
    width: '60%', height: 220, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cinzaBorda,
    backgroundColor: COLORS.fundoSuave, alignItems: 'center', justifyContent: 'center',
  },
  legend: { fontSize: 8.5, color: COLORS.cinzaClaro, marginTop: 6 },
  // tabela
  table: { marginTop: 8 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.cinzaBorda, paddingVertical: 5 },
  trHead: { borderBottomWidth: 1, borderBottomColor: COLORS.corpo },
  th: { fontSize: 8, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.3 },
  td: { fontSize: 9.5 },
  tdStrong: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  // rodapé
  footer: {
    position: 'absolute', bottom: 18, left: 48, right: 48,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: COLORS.cinzaBorda, paddingTop: 6,
  },
  footerText: { fontSize: 7.5, color: COLORS.cinzaClaro },
})

function BrandLockup({ light }: { light?: boolean }) {
  // Slides escuros (capa/encerramento): balão + texto branco (o wordmark é preto).
  // Slides claros: wordmark oficial.
  if (light) {
    return (
      <View style={s.brandLockup}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={REMAX_BALLOON_PNG} style={s.brandBalloon} />
        <Text style={s.brandGaleriaLight}>RE/MAX GALERIA · MOEMA</Text>
      </View>
    )
  }
  return (
    <View style={s.brandLockup}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={REMAX_WORDMARK_PNG} style={s.brandWordmark} />
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
      <Text style={s.h2}>{titulo}</Text>
    </>
  )
}

function Stats({ stats }: { stats: DeckStat[] }) {
  return (
    <View style={s.statRow}>
      {stats.map((st, i) => (
        <View key={i} style={s.statCard}>
          <Text style={s.statValor}>{st.valor}</Text>
          <Text style={s.statRotulo}>{st.rotulo}</Text>
        </View>
      ))}
    </View>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((b, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={s.bulletDot}>›</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </>
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
      {rows.map((r) => (
        <View key={r.rank} style={s.tr} wrap={false}>
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
        <View style={s.slideTop}>
          <Text style={s.kickerLight}>RE/MAX Galeria · Análise Comparativa de Mercado</Text>
          <BrandLockup light />
        </View>
        <View style={{ marginTop: 60 }}>
          <Text style={s.leadLight}>{model.capa.saudacao}</Text>
          <Text style={s.h1Light}>O caminho mais eficiente para vender seu imóvel.</Text>
          <View style={s.rule} />
          <Text style={s.leadLight}>{model.capa.cidadeRegiao} · {model.capa.dataEmissao}</Text>
          <Text style={[s.leadLight, { fontSize: 10, marginTop: 18 }]}>
            {CONSULTORA.nome} · Consultora Imobiliária · RE/MAX Galeria · {CONSULTORA.creci}
          </Text>
        </View>
      </Page>

      {/* 2. PAUTA */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Pauta desta ACM" titulo="O que vamos percorrer" />
        <View style={s.cardRow}>
          {model.pauta.map((p, i) => (
            <View key={i} style={[s.card, { flexBasis: '30%' }]} wrap={false}>
              <Text style={s.cardTitulo}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={s.cardTexto}>{p}</Text>
            </View>
          ))}
        </View>
        <Footer />
      </Page>

      {/* 3. RE/MAX no mundo */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="A RE/MAX no mundo" titulo="A maior rede imobiliária do mundo em VGV" />
        <Text style={s.lead}>
          Empresa americana fundada em 1973, em Denver (Colorado), líder mundial em número de franquias —
          todos os corretores ligados por um sistema tecnológico único, em tempo real.
        </Text>
        <Stats stats={model.remaxMundo} />
        <Footer />
      </Page>

      {/* 4. RE/MAX Brasil */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="RE/MAX Brasil · desde 2009 · nº 1 em vendas" titulo="O melhor trimestre da nossa história" />
        <Stats stats={model.remaxBrasil} />
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
        <View style={s.twoCol}>
          <View style={s.col}>
            <Bullets items={model.imovel.bullets} />
          </View>
          <View style={[s.col, { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }]}>
            <View style={[s.statCard, { flexBasis: '45%' }]}>
              <Text style={s.statValor}>{intM(model.imovel.terreno)}</Text>
              <Text style={s.statRotulo}>Terreno</Text>
            </View>
            <View style={[s.statCard, { flexBasis: '45%' }]}>
              <Text style={s.statValor}>{intM(model.imovel.construido)}</Text>
              <Text style={s.statRotulo}>Área construída</Text>
            </View>
            <View style={[s.statCard, { flexBasis: '45%' }]}>
              <Text style={[s.statValor, { fontSize: 16 }]}>{model.imovel.dormSuites ?? DASH}</Text>
              <Text style={s.statRotulo}>Programa</Text>
            </View>
            <View style={[s.statCard, { flexBasis: '45%' }]}>
              <Text style={[s.statValor, { fontSize: 16 }]}>
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
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.smallNote}>{model.precificacao.pretendido.nota}</Text>
            <Text style={s.bigValue}>{mi(model.precificacao.pretendido.valor)}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.smallNote}>{model.precificacao.pedidoReal.nota}</Text>
            <Text style={s.bigValue}>{mi(model.precificacao.pedidoReal.valor)}</Text>
          </View>
        </View>
        <Text style={[s.lead, { marginTop: 16 }]}>{model.precificacao.leitura}</Text>
        <Footer />
      </Page>

      {/* 8. Fator oferta */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Por que precificar certo" titulo="Anunciar acima do preço afasta o comprador" />
        <Text style={s.lead}>{model.fatorOferta.intro}</Text>
        <Bullets items={model.fatorOferta.efeitos} />
        <Footer />
      </Page>

      {/* 9. Metodologia · 3 fontes */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Metodologia · três fontes cruzadas" titulo="Como chegamos ao valor" />
        <Stats stats={model.metodologiaFontes} />
        <Text style={[s.lead, { marginTop: 14 }]}>
          Cada comparável é uma transação registrada, rastreável pelo cadastro municipal (SQL). Preço de anúncio
          entra só como leitura de concorrência — nunca como verdade de valor.
        </Text>
        <Footer />
      </Page>

      {/* 10. Geografia · mapa */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Geografia · raio de análise" titulo="Os comparáveis no entorno imediato" />
        <View style={[s.twoCol, { alignItems: 'flex-start' }]}>
          {model.mapa.url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={s.mapImg} src={model.mapa.url} />
          ) : (
            <View style={s.mapPlaceholder}>
              <Text style={s.legend}>Mapa indisponível</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.cardTexto}>{model.mapa.legenda}</Text>
            <Text style={[s.lead, { marginTop: 10 }]}>{model.mapa.nota}</Text>
          </View>
        </View>
        <Footer />
      </Page>

      {/* 11. Comparáveis de maior aderência */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Comparáveis de maior aderência" titulo="Os 5 imóveis mais parecidos, já vendidos" />
        <TopTable rows={model.topComparaveis} />
        <Text style={[s.legend, { marginTop: 8 }]}>
          Os lotes grandes lideram a aderência por refletirem o terreno do imóvel-alvo.
        </Text>
        <Footer />
      </Page>

      {/* 12. Tese central · deságio */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="A tese central · evidência empírica medida" titulo="O mercado fecha abaixo do anúncio" />
        <Bullets items={model.desagio.medicoes} />
        <Text style={[s.lead, { marginTop: 8 }]}>{model.desagio.conclusao}</Text>
        <Footer />
      </Page>

      {/* 13. Co-âncora de terreno */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="O diferencial · o valor está na terra" titulo="O lote é uma co-âncora de valor" />
        <View style={s.statRow}>
          {model.coAncora.abordagens.map((a, i) => (
            <View key={i} style={s.statCard}>
              <Text style={s.statValor}>{mi(a.valor)}</Text>
              <Text style={s.statRotulo}>{a.rotulo}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.lead, { marginTop: 14 }]}>{model.coAncora.nota}</Text>
        <Footer />
      </Page>

      {/* 14. Duas frentes de demanda */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Por que o valor é robusto" titulo="Duas frentes de demanda no mesmo patamar" />
        <View style={s.twoCol}>
          <View style={[s.card, s.col]}>
            <Text style={s.cardTitulo}>Comprador-usuário</Text>
            <Text style={s.bigValue}>{mi(model.duasFrentes.usuario.valor)}</Text>
            <Text style={s.cardTexto}>{model.duasFrentes.usuario.texto}</Text>
          </View>
          <View style={[s.card, s.col]}>
            <Text style={s.cardTitulo}>Comprador-terreno</Text>
            <Text style={[s.bigValue, s.bigValueGreen]}>{mi(model.duasFrentes.terreno.valor)}</Text>
            <Text style={s.cardTexto}>{model.duasFrentes.terreno.texto}</Text>
          </View>
        </View>
        <Text style={[s.lead, { marginTop: 12 }]}>{model.duasFrentes.sintese}</Text>
        <Footer />
      </Page>

      {/* 15. Robustez · sensibilidade */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Robustez · mesma estratégia de cálculo" titulo="Três cenários, um mesmo intervalo" />
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '46%' }]}>Cenário de amostragem</Text>
            <Text style={[s.th, { width: '10%', textAlign: 'right' }]}>N</Text>
            <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>Valor de mercado</Text>
            <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>Valor de fechamento</Text>
          </View>
          {model.sensibilidade.cenarios.map((c, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.td, { width: '46%' }]}>{c.cenario}</Text>
              <Text style={[s.td, { width: '10%', textAlign: 'right' }]}>{c.n}</Text>
              <Text style={[s.td, { width: '22%', textAlign: 'right' }]}>{fmt(c.valorMercado)}</Text>
              <Text style={[s.tdStrong, { width: '22%', textAlign: 'right', color: COLORS.verde }]}>{fmt(c.valorFechamento)}</Text>
            </View>
          ))}
        </View>
        <Text style={[s.lead, { marginTop: 12 }]}>{model.sensibilidade.nota}</Text>
        <Footer />
      </Page>

      {/* 16. Recomendação de preço */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <SlideHead kicker="Sugestão RE/MAX Galeria" titulo="Recomendação de precificação" />
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
          <Text style={[s.cardTexto, { marginTop: 10 }]}>{model.recomendacao.texto}</Text>
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
        {model.proximosPassos.map((p, i) => (
          <View key={i} style={s.bullet} wrap={false}>
            <Text style={[s.bulletDot, { color: COLORS.azul }]}>{i + 1}</Text>
            <Text style={s.bulletText}>{p}</Text>
          </View>
        ))}
        <Footer />
      </Page>

      {/* 20. Encerramento */}
      <Page size="A4" orientation="landscape" style={[s.page, s.pageDark]}>
        <View style={s.slideTop}>
          <Text style={s.kickerLight}>RE/MAX Galeria · Moema</Text>
          <BrandLockup light />
        </View>
        <View style={{ marginTop: 80 }}>
          <Text style={s.h1Light}>{model.encerramento.titulo}</Text>
          <View style={s.rule} />
          <Text style={s.leadLight}>{model.encerramento.texto}</Text>
          <Text style={[s.leadLight, { fontSize: 10, marginTop: 18 }]}>
            {CONSULTORA.nome} · Consultora Imobiliária · RE/MAX Galeria · {CONSULTORA.creci}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
