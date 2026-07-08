/**
 * Laudo Técnico ACM completo — documento React-PDF (Story 8.3b AC1/AC4).
 *
 * Reproduz as 10 seções do `LAUDO_ACM_Rua_Honduras_RE-MAX_v4_NOVO.pdf` (~18 págs).
 * Componente PURO: recebe um `LaudoModel` já computado por `buildLaudoModel`
 * (zero recálculo — ADR-EPIC8-001). Branding/mapa via `theme.ts`/`staticMap.ts`,
 * reusando os primitivos da 8.3a (Art. IV — rótulos e estrutura fiéis à referência).
 *
 * Paginação: capa própria (ficha + faixa + sumário) + um `<Page>` com `wrap` que
 * flui as 10 seções por múltiplas páginas impressas. Linhas de tabela `wrap={false}`
 * (não quebram no meio); rodapé `fixed` repetido por página.
 */
import { Document, Page, View, Text, Image, Link, StyleSheet } from '@react-pdf/renderer'
import { formatBRL } from '@/lib/format'
import { COLORS, FONTS, CONSULTORA, REMAX_WORDMARK_PNG } from './theme'
import type {
  LaudoModel,
  LaudoTopRow,
  LaudoComparavelRow,
  LaudoConcorrente,
} from './laudoModel'

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const DASH = '—'
const fmt = (v: number | null | undefined) => (v == null ? DASH : formatBRL(v))
const intM = (v: number | null | undefined) =>
  v == null ? DASH : `${Math.round(v).toLocaleString('pt-BR')} m²`
const numInt = (v: number | null | undefined) =>
  v == null ? DASH : Math.round(v).toLocaleString('pt-BR')
const pct = (v: number | null | undefined) =>
  v == null ? DASH : `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const faixaFull = (f?: { min: number; max: number } | null) =>
  f == null ? DASH : `${formatBRL(f.min)} – ${formatBRL(f.max)}`

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontFamily: FONTS.body,
    fontSize: 8.5,
    color: COLORS.corpo,
    lineHeight: 1.4,
  },
  // Header / capa
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerLeft: { flex: 1, paddingRight: 8 },
  eyebrow: { fontSize: 7, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontFamily: FONTS.heading, fontSize: 18, color: COLORS.azulEscuro, marginTop: 3, lineHeight: 1.15 },
  subtitle: { fontSize: 8, color: COLORS.cinzaClaro, marginTop: 3 },
  brandBox: { alignItems: 'flex-end', flexShrink: 0, width: 132 },
  brandLogo: { width: 104, height: 26, objectFit: 'contain' },
  brandGaleria: { fontSize: 8, fontFamily: FONTS.heading, color: COLORS.azulEscuro, letterSpacing: 1, marginTop: 3 },
  consultora: { fontSize: 8, color: COLORS.corpo, marginTop: 3, fontFamily: FONTS.bodyMedium },
  consultoraContato: { fontSize: 6.5, color: COLORS.cinzaClaro, marginTop: 1 },
  emissao: { fontSize: 7, color: COLORS.cinzaClaro, marginTop: 1 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: COLORS.vermelho, marginTop: 10, marginBottom: 12 },
  // Ficha (dados do imóvel)
  fichaBox: {
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    borderRadius: 6,
    padding: 10,
  },
  fichaRow: { flexDirection: 'row', gap: 4 },
  fichaCol: { flex: 1, paddingHorizontal: 4, paddingVertical: 3 },
  fichaLabel: { fontSize: 6.5, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.4 },
  fichaValue: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, marginTop: 2 },
  scoreBadge: {
    marginTop: 8,
    backgroundColor: COLORS.fundoSuave,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.dourado,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreText: { fontSize: 9, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  // Faixa de valores (5 cards)
  faixaRow: { flexDirection: 'row', marginTop: 12, gap: 6 },
  faixaCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  faixaCardHi: { borderColor: COLORS.verde, backgroundColor: '#F0FDF4' },
  faixaLabel: { fontSize: 6, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  faixaValue: { fontSize: 11, fontFamily: FONTS.heading, color: COLORS.azul, marginTop: 4, textAlign: 'center' },
  faixaValueHi: { color: COLORS.verde },
  // Seções
  h2: { fontFamily: FONTS.heading, fontSize: 13, color: COLORS.azulEscuro, marginTop: 16, marginBottom: 5 },
  h3: { fontFamily: FONTS.bodyMedium, fontSize: 9.5, color: COLORS.azul, marginTop: 8, marginBottom: 3 },
  paragraph: { fontSize: 8.5, color: COLORS.corpo, marginBottom: 5 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 10, fontFamily: FONTS.bodyMedium, color: COLORS.azul },
  bulletText: { flex: 1, fontSize: 8.5 },
  // Cartões de posicionamento (Sec. 1)
  posCard: {
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  posCardHi: { borderColor: COLORS.verde, backgroundColor: '#F0FDF4' },
  posLabel: { fontSize: 7, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.3 },
  posValue: { fontSize: 14, fontFamily: FONTS.heading, color: COLORS.azulEscuro, marginTop: 2 },
  posValueHi: { color: COLORS.verde },
  posNota: { fontSize: 7.5, color: COLORS.cinzaClaro, marginTop: 1 },
  parecerBox: {
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    backgroundColor: COLORS.fundoSuave,
    borderRadius: 6,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  parecerLabel: { fontSize: 8, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, marginBottom: 3 },
  parecerText: { fontSize: 8.5, color: COLORS.corpo },
  // Mapa
  mapImg: { width: '100%', height: 200, borderRadius: 6, marginBottom: 4, objectFit: 'cover' },
  mapPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    backgroundColor: COLORS.fundoSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  legend: { fontSize: 6.5, color: COLORS.cinzaClaro, marginBottom: 6 },
  // Tabelas
  table: { marginTop: 4, marginBottom: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.cinzaBorda, paddingVertical: 3 },
  trHead: { borderBottomWidth: 1, borderBottomColor: COLORS.corpo },
  // paddingHorizontal separa coluna alinhada à direita da vizinha à esquerda
  // (ex.: Sec. 6 "Área|Programa" e "R$/m²|Leitura" colavam sem o respiro).
  th: { fontSize: 6, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.2, paddingHorizontal: 2 },
  td: { fontSize: 7.5, paddingHorizontal: 2 },
  tdStrong: { fontSize: 7.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, paddingHorizontal: 2 },
  green: { color: COLORS.verde, fontFamily: FONTS.bodyMedium },
  gold: { color: COLORS.dourado, fontFamily: FONTS.bodyMedium },
  // Conclusão (Sec. 10)
  concRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.cinzaBorda,
    paddingVertical: 6,
  },
  concLabel: { fontSize: 9, fontFamily: FONTS.bodyMedium, color: COLORS.corpo, flex: 1 },
  concValue: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  parecerFinalBox: {
    borderWidth: 1,
    borderColor: COLORS.verde,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
  },
  assinatura: { fontSize: 8.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, marginTop: 16 },
  // Rodapé fixo
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.cinzaBorda,
    paddingTop: 6,
  },
  footerText: { fontSize: 6.5, color: COLORS.cinzaClaro },
})

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function BrandLockup() {
  return (
    <View style={s.brandBox}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={REMAX_WORDMARK_PNG} style={s.brandLogo} />
      <Text style={s.brandGaleria}>GALERIA · MOEMA</Text>
      <Text style={s.consultora}>
        {CONSULTORA.nome} · {CONSULTORA.creci}
      </Text>
      <Text style={s.consultoraContato}>
        {CONSULTORA.telefone} · {CONSULTORA.email}
      </Text>
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{CONSULTORA.rodape} · Laudo Técnico ACM</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={s.h2} minPresenceAhead={40}>
      {children}
    </Text>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((b, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </>
  )
}

function Paragraphs({ text }: { text: string }) {
  return <Text style={s.paragraph}>{text}</Text>
}

// --- Tabelas específicas ----------------------------------------------------

const TOP_W = { rank: '7%', faixa: '13%', end: '30%', constr: '11%', terr: '11%', dist: '9%', m2c: '9%', m2t: '10%' } as const

function TopTable({ rows }: { rows: LaudoTopRow[] }) {
  return (
    <View style={s.table}>
      <View style={[s.tr, s.trHead]} wrap={false}>
        <Text style={[s.th, { width: TOP_W.rank }]}>#</Text>
        <Text style={[s.th, { width: TOP_W.faixa }]}>Faixa</Text>
        <Text style={[s.th, { width: TOP_W.end }]}>Endereço</Text>
        <Text style={[s.th, { width: TOP_W.constr, textAlign: 'right' }]}>Constr.</Text>
        <Text style={[s.th, { width: TOP_W.terr, textAlign: 'right' }]}>Terreno</Text>
        <Text style={[s.th, { width: TOP_W.dist, textAlign: 'right' }]}>Dist.</Text>
        <Text style={[s.th, { width: TOP_W.m2c, textAlign: 'right' }]}>R$/m² C</Text>
        <Text style={[s.th, { width: TOP_W.m2t, textAlign: 'right' }]}>R$/m² T</Text>
      </View>
      {rows.map((r) => (
        <View key={r.rank} style={s.tr} wrap={false}>
          <Text style={[s.tdStrong, { width: TOP_W.rank, color: COLORS.dourado }]}>{r.rank}</Text>
          <Text style={[s.td, { width: TOP_W.faixa }]}>{r.faixa}</Text>
          <Text style={[s.td, { width: TOP_W.end }]}>{r.endereco}</Text>
          <Text style={[s.td, { width: TOP_W.constr, textAlign: 'right' }]}>{intM(r.construido)}</Text>
          <Text style={[s.td, { width: TOP_W.terr, textAlign: 'right' }]}>{intM(r.terreno)}</Text>
          <Text style={[s.td, { width: TOP_W.dist, textAlign: 'right' }]}>
            {r.distancia == null ? DASH : `${Math.round(r.distancia)} m`}
          </Text>
          <Text style={[s.td, { width: TOP_W.m2c, textAlign: 'right' }]}>{numInt(r.precoM2Construido)}</Text>
          <Text style={[s.tdStrong, { width: TOP_W.m2t, textAlign: 'right' }]}>{numInt(r.precoM2Terreno)}</Text>
        </View>
      ))}
    </View>
  )
}

const C5_W = { mark: '6%', ref: '13%', end: '30%', constr: '10%', svd: '13%', total: '14%', m2c: '7%', m2t: '7%' } as const

function ComparaveisTable({ rows }: { rows: LaudoComparavelRow[] }) {
  return (
    <View style={s.table}>
      <View style={[s.tr, s.trHead]} wrap={false}>
        <Text style={[s.th, { width: C5_W.mark }]}> </Text>
        <Text style={[s.th, { width: C5_W.ref }]}>Cód./Ref.</Text>
        <Text style={[s.th, { width: C5_W.end }]}>Bairro / Rua</Text>
        <Text style={[s.th, { width: C5_W.constr, textAlign: 'right' }]}>Constr.</Text>
        <Text style={[s.th, { width: C5_W.svd }]}>S/V/D</Text>
        <Text style={[s.th, { width: C5_W.total, textAlign: 'right' }]}>Valor total</Text>
        <Text style={[s.th, { width: C5_W.m2c, textAlign: 'right' }]}>R$/m² C</Text>
        <Text style={[s.th, { width: C5_W.m2t, textAlign: 'right' }]}>R$/m² T</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <Text style={[s.tdStrong, { width: C5_W.mark, color: COLORS.dourado, fontSize: 6 }]}>{r.topMark}</Text>
          <Text style={[s.td, { width: C5_W.ref }]}>{r.codigoRef}</Text>
          <Text style={[s.td, { width: C5_W.end }]}>{r.bairroRua}</Text>
          <Text style={[s.td, { width: C5_W.constr, textAlign: 'right' }]}>{intM(r.construido)}</Text>
          <Text style={[s.td, { width: C5_W.svd }]}>{r.svd}</Text>
          <Text style={[s.tdStrong, { width: C5_W.total, textAlign: 'right' }]}>{fmt(r.valorTotal)}</Text>
          <Text style={[s.td, { width: C5_W.m2c, textAlign: 'right' }]}>{numInt(r.precoM2Construido)}</Text>
          <Text style={[s.td, { width: C5_W.m2t, textAlign: 'right' }]}>{numInt(r.precoM2Terreno)}</Text>
        </View>
      ))}
    </View>
  )
}

const CONC_W = { rua: '24%', area: '11%', prog: '15%', pedido: '17%', m2: '13%', leitura: '20%' } as const

function ConcorrenciaTable({ rows }: { rows: LaudoConcorrente[] }) {
  if (rows.length === 0) return null
  return (
    <View style={s.table}>
      <View style={[s.tr, s.trHead]} wrap={false}>
        <Text style={[s.th, { width: CONC_W.rua }]}>Rua / Oferta</Text>
        <Text style={[s.th, { width: CONC_W.area, textAlign: 'right' }]}>Área</Text>
        <Text style={[s.th, { width: CONC_W.prog }]}>Programa</Text>
        <Text style={[s.th, { width: CONC_W.pedido, textAlign: 'right' }]}>Pedido</Text>
        <Text style={[s.th, { width: CONC_W.m2, textAlign: 'right' }]}>R$/m²</Text>
        <Text style={[s.th, { width: CONC_W.leitura }]}>Leitura</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <Text style={[s.td, { width: CONC_W.rua }]}>{r.rua}</Text>
          <Text style={[s.td, { width: CONC_W.area, textAlign: 'right' }]}>{intM(r.area)}</Text>
          <Text style={[s.td, { width: CONC_W.prog }]}>{r.programa ?? DASH}</Text>
          <Text style={[s.tdStrong, { width: CONC_W.pedido, textAlign: 'right' }]}>{fmt(r.pedido)}</Text>
          <Text style={[s.td, { width: CONC_W.m2, textAlign: 'right' }]}>{numInt(r.precoM2)}</Text>
          <Text style={[s.td, { width: CONC_W.leitura, fontSize: 6.5 }]}>{r.leitura}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export function LaudoDocument({ model }: { model: LaudoModel }) {
  const h = model.header
  return (
    <Document
      title={`Laudo Técnico ACM — ${h.localizacao}`}
      author={CONSULTORA.nome}
      subject="Análise Comparativa de Mercado — Laudo Técnico"
    >
      {/* ============================ CAPA ============================ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.eyebrow}>Estudo de Viabilidade Imobiliária</Text>
            <Text style={s.title}>{h.titulo}</Text>
            <Text style={s.subtitle}>{h.subtitulo}</Text>
          </View>
          <BrandLockup />
        </View>
        <Text style={[s.emissao, { textAlign: 'right' }]}>Emissão: {h.dataEmissao}</Text>
        <View style={s.rule} />

        {/* Dados do imóvel analisado */}
        <View style={s.fichaBox}>
          <View style={s.fichaRow}>
            <View style={[s.fichaCol, { flex: 1.4 }]}>
              <Text style={s.fichaLabel}>Proprietário</Text>
              <Text style={s.fichaValue}>{h.proprietario ?? DASH}</Text>
            </View>
            <View style={[s.fichaCol, { flex: 1.4 }]}>
              <Text style={s.fichaLabel}>Localização</Text>
              <Text style={s.fichaValue}>{h.localizacao}</Text>
            </View>
            <View style={s.fichaCol}>
              <Text style={s.fichaLabel}>Bairro</Text>
              <Text style={s.fichaValue}>{h.bairro ?? DASH}</Text>
            </View>
          </View>
          <View style={s.fichaRow}>
            <View style={s.fichaCol}>
              <Text style={s.fichaLabel}>Área constr.</Text>
              <Text style={s.fichaValue}>{intM(h.programa.construido)}</Text>
            </View>
            <View style={s.fichaCol}>
              <Text style={s.fichaLabel}>Terreno</Text>
              <Text style={s.fichaValue}>{intM(h.programa.terreno)}</Text>
            </View>
            <View style={s.fichaCol}>
              <Text style={s.fichaLabel}>Dorm. / Suítes</Text>
              <Text style={s.fichaValue}>{h.programa.dormSuites ?? DASH}</Text>
            </View>
            <View style={s.fichaCol}>
              <Text style={s.fichaLabel}>Garagem</Text>
              <Text style={s.fichaValue}>{h.programa.garagem ?? DASH}</Text>
            </View>
          </View>
          <View style={s.scoreBadge}>
            <Text style={s.scoreText}>
              {h.score ? `Score ${h.score}` : 'Score —'}
              {h.classeTexto ? ` — ${h.classeTexto}` : ''}
            </Text>
          </View>
        </View>

        {/* Faixa de valores (5 cards) */}
        <View style={s.faixaRow}>
          {model.faixa.map((f, i) => {
            const hi = !!f.destaque
            const valor = f.faixa
              ? `R$ ${(f.faixa.min / 1e6).toFixed(1).replace('.', ',')}–${(f.faixa.max / 1e6)
                  .toFixed(1)
                  .replace('.', ',')}M`
              : f.valor == null
                ? DASH
                : `R$ ${(f.valor / 1e6).toFixed(1).replace('.', ',')}M`
            return (
              <View key={i} style={[s.faixaCard, ...(hi ? [s.faixaCardHi] : [])]}>
                <Text style={s.faixaLabel}>{f.rotulo}</Text>
                <Text style={[s.faixaValue, ...(hi ? [s.faixaValueHi] : [])]}>{valor}</Text>
              </View>
            )
          })}
        </View>

        {/* Sumário Executivo e Objetivos */}
        <SectionTitle>Sumário Executivo e Objetivos do Estudo</SectionTitle>
        <Text style={s.h3}>Objetivos</Text>
        <Bullets items={model.sumario.objetivos} />
        <Text style={s.h3}>Sumário Executivo</Text>
        <Paragraphs text={model.sumario.paragrafo} />
        <Text style={s.h3}>Principais conclusões</Text>
        <Bullets items={model.sumario.conclusoes} />

        <Footer />
      </Page>

      {/* ====================== SEÇÕES 1–10 (flui) ====================== */}
      <Page size="A4" style={s.page} wrap>
        {/* --- Sec. 1 --- */}
        <SectionTitle>1. Avaliação Dinâmica de Posicionamento</SectionTitle>
        <View style={s.posCard} wrap={false}>
          <Text style={s.posLabel}>Preço Pretendido pelo Proprietário</Text>
          <Text style={s.posValue}>{fmt(model.sec1.pretendido.valor)}</Text>
          {!!model.sec1.pretendido.nota && <Text style={s.posNota}>{model.sec1.pretendido.nota}</Text>}
        </View>
        <View style={s.posCard} wrap={false}>
          <Text style={s.posLabel}>Preço Pedido REAL — confirmado em anúncio publicado</Text>
          <Text style={s.posValue}>{fmt(model.sec1.pedidoReal.valor)}</Text>
          {!!model.sec1.pedidoReal.nota && <Text style={s.posNota}>{model.sec1.pedidoReal.nota}</Text>}
        </View>
        <View style={s.posCard} wrap={false}>
          <Text style={s.posLabel}>Valor de Mercado (ACM, via construção)</Text>
          <Text style={s.posValue}>
            {model.sec1.valorMercado.faixa
              ? faixaFull(model.sec1.valorMercado.faixa)
              : fmt(model.sec1.valorMercado.valor)}
          </Text>
          <Text style={s.posNota}>{model.sec1.valorMercado.nota}</Text>
        </View>
        <View style={s.posCard} wrap={false}>
          <Text style={s.posLabel}>Diferença / Ajuste de Mercado</Text>
          <Text style={s.posValue}>{pct(model.sec1.diferenca.percent)}</Text>
          <Text style={s.posNota}>{model.sec1.diferenca.nota}</Text>
        </View>
        <View style={s.parecerBox}>
          <Text style={s.parecerLabel}>Parecer Técnico de Inteligência Imobiliária</Text>
          <Text style={s.parecerText}>{model.sec1.parecerTecnico}</Text>
        </View>
        <View style={[s.posCard, s.posCardHi]} wrap={false}>
          <Text style={s.posLabel}>Valor de Fechamento Estratégico (com ajustes de liquidez e condição)</Text>
          <Text style={[s.posValue, s.posValueHi]}>{fmt(model.sec1.fechamentoEstrategico.valor)}</Text>
          <Text style={s.posNota}>{model.sec1.fechamentoEstrategico.nota}</Text>
          <Text style={s.posNota}>{model.sec1.fechamentoEstrategico.desagioNota}</Text>
        </View>

        {/* --- Sec. 2 --- */}
        <SectionTitle>2. Fatores de Ajuste de Liquidez e Condição</SectionTitle>
        <Paragraphs text={model.sec2.intro} />
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '34%' }]}>Fator técnico</Text>
            <Text style={[s.th, { width: '52%' }]}>Calibração</Text>
            <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>Ajuste</Text>
          </View>
          {model.sec2.fatores.map((f, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '34%' }]}>{f.fator}</Text>
              <Text style={[s.td, { width: '52%' }]}>{f.calibracao}</Text>
              <Text style={[s.td, s.green, { width: '14%', textAlign: 'right' }]}>
                -{Math.round(f.ajuste * 100)}%
              </Text>
            </View>
          ))}
        </View>
        <Text style={[s.paragraph, { fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro }]}>
          {model.sec2.composicaoNota}
        </Text>
        <Text style={s.h3}>Eixos de Argumentação na Captação</Text>
        <Bullets items={model.sec2.eixos} />

        {/* --- Sec. 3 --- */}
        <SectionTitle>3. Localização e Raio de Análise</SectionTitle>
        {model.sec3.mapaUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={s.mapImg} src={model.sec3.mapaUrl} />
        ) : (
          <View style={s.mapPlaceholder}>
            <Text style={s.legend}>Mapa indisponível</Text>
          </View>
        )}
        <Text style={s.legend}>{model.sec3.legenda}</Text>
        <Text style={s.h3}>Índice dos imóveis mais relevantes (numerados no mapa)</Text>
        <TopTable rows={model.sec3.indice} />
        <Paragraphs text={model.sec3.composicaoBairro} />
        {model.sec3.ofertas.length > 0 && (
          <>
            <Text style={s.h3}>Imóveis ofertados (à venda) georreferenciados dentro do raio</Text>
            <View style={s.table}>
              <View style={[s.tr, s.trHead]} wrap={false}>
                <Text style={[s.th, { width: '36%' }]}>Oferta (rua)</Text>
                <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>Área</Text>
                <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>Pedido</Text>
                <Text style={[s.th, { width: '16%', textAlign: 'right' }]}>R$/m²</Text>
                <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>Dist.</Text>
              </View>
              {model.sec3.ofertas.map((o, i) => (
                <View key={i} style={s.tr} wrap={false}>
                  <Text style={[s.td, { width: '36%' }]}>{o.rua}</Text>
                  <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>{intM(o.area)}</Text>
                  <Text style={[s.tdStrong, { width: '22%', textAlign: 'right' }]}>{fmt(o.pedido)}</Text>
                  <Text style={[s.td, { width: '16%', textAlign: 'right' }]}>{numInt(o.precoM2)}</Text>
                  <Text style={[s.td, { width: '12%', textAlign: 'right' }]}>
                    {o.distancia == null ? DASH : `${Math.round(o.distancia)} m`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
        <Text style={s.legend}>{model.sec3.notaOfertas}</Text>

        {/* --- Sec. 4 --- */}
        <SectionTitle>4. Critérios de Seleção e Comparabilidade</SectionTitle>
        <Paragraphs text={model.sec4.intro} />
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '22%' }]}>Critério</Text>
            <Text style={[s.th, { width: '34%' }]}>Parâmetro adotado</Text>
            <Text style={[s.th, { width: '44%' }]}>Justificativa técnica</Text>
          </View>
          {model.sec4.criterios.map((c, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '22%' }]}>{c.criterio}</Text>
              <Text style={[s.td, { width: '34%' }]}>{c.parametro}</Text>
              <Text style={[s.td, { width: '44%' }]}>{c.justificativa}</Text>
            </View>
          ))}
        </View>
        <Text style={s.h3}>Régua de Classificação Técnica (Score)</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '12%' }]}>Score</Text>
            <Text style={[s.th, { width: '52%' }]}>Critério</Text>
            <Text style={[s.th, { width: '36%' }]}>Leitura</Text>
          </View>
          {model.sec4.regua.map((r, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '12%', color: COLORS.azul }]}>{r.score}</Text>
              <Text style={[s.td, { width: '52%' }]}>{r.criterio}</Text>
              <Text style={[s.td, { width: '36%' }]}>{r.leitura}</Text>
            </View>
          ))}
        </View>
        <Paragraphs text={model.sec4.notaRegua} />

        {/* --- Sec. 5 --- */}
        <SectionTitle>5. Imóveis Comparáveis Utilizados no Modelo</SectionTitle>
        <Paragraphs text={model.sec5.intro} />
        <ComparaveisTable rows={model.sec5.linhas} />

        {/* --- Sec. 6 --- */}
        <SectionTitle>6. Análise de Concorrência — Alternativas do Comprador</SectionTitle>
        <Paragraphs text={model.sec6.intro} />
        {model.sec6.diretos.length > 0 && (
          <>
            <Text style={s.h3}>a) Concorrentes diretos (mesmo perfil — usado / a reposicionar)</Text>
            <ConcorrenciaTable rows={model.sec6.diretos} />
          </>
        )}
        {model.sec6.superiores.length > 0 && (
          <>
            <Text style={s.h3}>b) Referências de padrão superior (teto aspiracional)</Text>
            <ConcorrenciaTable rows={model.sec6.superiores} />
          </>
        )}
        <Paragraphs text={model.sec6.justificativa} />

        {/* --- Sec. 7 --- */}
        <SectionTitle>7. Seleção dos Comparáveis de Maior Aderência (Top 5 / Top 3)</SectionTitle>
        <Paragraphs text={model.sec7.intro} />
        <TopTable rows={model.sec7.linhas} />
        <Text style={s.h3}>Motivos de seleção (por que cada um é aderente)</Text>
        <Bullets items={model.sec7.motivos} />
        <Paragraphs text={model.sec7.notaEscala} />

        <Text style={s.h3}>7.1 Rastreabilidade e Fontes dos Comparáveis (Top 5)</Text>
        <Paragraphs text={model.sec7.rastreabilidade.intro} />
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '7%' }]}>#</Text>
            <Text style={[s.th, { width: '33%' }]}>Endereço</Text>
            <Text style={[s.th, { width: '18%' }]}>SQL (ITBI)</Text>
            <Text style={[s.th, { width: '18%' }]}>Status</Text>
            <Text style={[s.th, { width: '24%' }]}>Fonte / Anúncio</Text>
          </View>
          {model.sec7.rastreabilidade.linhas.map((r) => (
            <View key={r.rank} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '7%', color: COLORS.dourado }]}>{r.rank}</Text>
              <Text style={[s.td, { width: '33%' }]}>{r.endereco}</Text>
              <Text style={[s.td, { width: '18%' }]}>{r.sql}</Text>
              <Text style={[s.td, { width: '18%' }]}>{r.status}</Text>
              <View style={{ width: '24%' }}>
                <Text style={[s.td, { color: COLORS.corpo }]}>{r.fonte}</Text>
                {r.anuncioUrl ? (
                  <Link src={r.anuncioUrl} style={[s.td, { color: COLORS.azulMoema, fontSize: 6.5 }]}>
                    ver anúncio ↗
                  </Link>
                ) : (
                  <Text style={[s.td, { color: COLORS.cinzaClaro, fontSize: 6.5 }]}>sem link público</Text>
                )}
              </View>
            </View>
          ))}
        </View>
        <Text style={s.legend}>{model.sec7.rastreabilidade.notaSql}</Text>
        {model.sec7.rastreabilidade.desagios.length > 0 && (
          <>
            <Paragraphs text={model.sec7.rastreabilidade.desagioIntro} />
            <Bullets items={model.sec7.rastreabilidade.desagios} />
          </>
        )}
        <Paragraphs text={model.sec7.rastreabilidade.desagioConclusao} />

        {/* --- Sec. 8 --- */}
        <SectionTitle>8. Ótica do Comprador de Terreno (Reconstrução / Adaptação)</SectionTitle>
        <Paragraphs text={model.sec8.intro} />
        <Text style={s.h3}>a) Métricas de área de terreno (comparáveis vendidos no raio)</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '32%' }]}>Métrica (terreno)</Text>
            <Text style={[s.th, { width: '13%', textAlign: 'right' }]}>Mín.</Text>
            <Text style={[s.th, { width: '13%', textAlign: 'right' }]}>P25</Text>
            <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>Mediana</Text>
            <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>P75</Text>
            <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>Máx.</Text>
          </View>
          {model.sec8.metricas.map((m, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '32%' }]}>{m.metrica}</Text>
              <Text style={[s.td, { width: '13%', textAlign: 'right' }]}>{numInt(m.min)}</Text>
              <Text style={[s.td, { width: '13%', textAlign: 'right' }]}>{numInt(m.p25)}</Text>
              <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>{numInt(m.mediana)}</Text>
              <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>{numInt(m.p75)}</Text>
              <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>{numInt(m.max)}</Text>
            </View>
          ))}
        </View>
        <Text style={s.h3}>R$/m² de terreno por faixa de tamanho de lote (efeito escala)</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '40%' }]}>Faixa de lote</Text>
            <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>N</Text>
            <Text style={[s.th, { width: '26%', textAlign: 'right' }]}>R$/m² terreno mediano</Text>
            <Text style={[s.th, { width: '22%', textAlign: 'right' }]}>Ticket mediano</Text>
          </View>
          {model.sec8.escala.map((e, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '40%' }]}>{e.faixa}</Text>
              <Text style={[s.td, { width: '12%', textAlign: 'right' }]}>{e.n}</Text>
              <Text style={[s.td, { width: '26%', textAlign: 'right' }]}>{numInt(e.precoM2TerrenoMediano)}</Text>
              <Text style={[s.td, { width: '22%', textAlign: 'right' }]}>{fmt(e.ticketMediano)}</Text>
            </View>
          ))}
        </View>
        <Paragraphs text={model.sec8.notaEscala} />
        <Paragraphs text={model.sec8.coefAproveitamento} />
        <Text style={s.h3}>b) Valor do terreno por abordagens convergentes</Text>
        <Paragraphs text={model.sec8.abordagemA} />
        {model.sec8.residual.length > 0 && (
          <>
            <Text style={[s.paragraph, { fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro }]}>
              Abordagem B — viabilidade do incorporador (valor residual):
            </Text>
            <View style={s.table}>
              {model.sec8.residual.map((r, i) => (
                <View
                  key={i}
                  style={[
                    s.concRow,
                    ...(r.total ? [{ borderTopWidth: 1, borderTopColor: COLORS.corpo, borderBottomWidth: 0 }] : []),
                  ]}
                  wrap={false}
                >
                  <Text style={s.concLabel}>{r.rotulo}</Text>
                  <Text style={[s.concValue, ...(r.total ? [s.green] : r.deducao ? [{ color: COLORS.vermelho }] : [])]}>
                    {r.deducao ? '- ' : ''}
                    {fmt(r.valor)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
        <Paragraphs text={model.sec8.convergencia} />
        <Text style={s.h3}>Dois perfis de comprador — duas balizas no mesmo patamar</Text>
        <Bullets items={model.sec8.perfis} />

        {/* --- Sec. 9 --- */}
        <SectionTitle>9. Análise de Sensibilidade — Cenários de Amostragem</SectionTitle>
        <Paragraphs text={model.sec9.intro} />
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '34%' }]}>Cenário</Text>
            <Text style={[s.th, { width: '8%', textAlign: 'right' }]}>N</Text>
            <Text style={[s.th, { width: '16%', textAlign: 'right' }]}>R$/m² med.</Text>
            <Text style={[s.th, { width: '21%', textAlign: 'right' }]}>Valor mercado</Text>
            <Text style={[s.th, { width: '21%', textAlign: 'right' }]}>Fechamento</Text>
          </View>
          {model.sec9.cenarios.map((c, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.td, { width: '34%' }]}>{c.cenario}</Text>
              <Text style={[s.td, { width: '8%', textAlign: 'right' }]}>{c.n}</Text>
              <Text style={[s.td, { width: '16%', textAlign: 'right' }]}>{numInt(c.medianaPrecoM2)}</Text>
              <Text style={[s.td, { width: '21%', textAlign: 'right' }]}>{fmt(c.valorMercado)}</Text>
              <Text style={[s.td, s.green, { width: '21%', textAlign: 'right' }]}>{fmt(c.valorFechamento)}</Text>
            </View>
          ))}
        </View>
        <Paragraphs text={model.sec9.leitura} />

        {/* --- Sec. 10 --- */}
        <SectionTitle>10. Parecer Conclusivo e Recomendação Estratégica</SectionTitle>
        <Paragraphs text={model.sec10.intro} />
        <Paragraphs text={model.sec10.ponderacao} />
        <View style={[s.fichaBox, { marginTop: 4, marginBottom: 6 }]}>
          {model.sec10.tabela.map((row, i) => (
            <View
              key={i}
              style={[s.concRow, ...(i === model.sec10.tabela.length - 1 ? [{ borderBottomWidth: 0 }] : [])]}
              wrap={false}
            >
              <Text style={s.concLabel}>{row.rotulo}</Text>
              <Text style={[s.concValue, ...(row.destaque ? [s.green] : [])]}>
                {row.faixa ? faixaFull(row.faixa) : fmt(row.valor)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.h3}>Fundamentação — convergência das evidências</Text>
        <Bullets items={model.sec10.fundamentacao} />
        <Text style={s.h3}>Estratégia comercial recomendada</Text>
        <Bullets items={model.sec10.estrategia} />
        <Text style={s.h3}>Condicionantes técnicas (due diligence prévia ao anúncio)</Text>
        <Bullets items={model.sec10.condicionantes} />
        <View style={s.parecerFinalBox} wrap={false}>
          <Text style={s.parecerLabel}>Parecer final</Text>
          <Text style={s.parecerText}>{model.sec10.parecerFinal}</Text>
        </View>
        <Text style={s.assinatura}>{model.sec10.assinatura}</Text>

        <Footer />
      </Page>
    </Document>
  )
}
