/**
 * Resumo Executivo ACM — documento React-PDF (Story 8.3a AC1/AC4).
 *
 * Reproduz as 3 páginas do `ACM_RESUMO_Honduras_RE-MAX.pdf` (Art. IV — rótulos e
 * estrutura fiéis à referência). Componente PURO: recebe um `ResumoModel` já
 * computado por `buildResumoModel` (zero recálculo — ADR-EPIC8-001). Branding via
 * `theme.ts`.
 */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatBRL } from '@/lib/format'
import { COLORS, FONTS, CONSULTORA, REMAX_WORDMARK_PNG } from './theme'
import type { ResumoModel } from './resumoModel'

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

const DASH = '—'
const fmt = (v: number | null | undefined) => (v == null ? DASH : formatBRL(v))
const mi = (v: number) => `R$ ${(v / 1e6).toFixed(1).replace('.', ',')}M`
const fmtCompact = (v: number | null | undefined) => (v == null ? DASH : mi(v))
const faixaCompact = (f?: { min: number; max: number } | null) =>
  f == null
    ? DASH
    : `R$ ${(f.min / 1e6).toFixed(1).replace('.', ',')}–${(f.max / 1e6).toFixed(1).replace('.', ',')}M`
const faixaFull = (f?: { min: number; max: number } | null) =>
  f == null ? DASH : `${formatBRL(f.min)} – ${formatBRL(f.max)}`
const intM = (v: number | null | undefined) =>
  v == null ? DASH : `${Math.round(v).toLocaleString('pt-BR')} m²`
const numM2 = (v: number | null | undefined) =>
  v == null ? DASH : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontFamily: FONTS.body,
    fontSize: 9,
    color: COLORS.corpo,
    lineHeight: 1.4,
  },
  // Header (pág. 1)
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontSize: 7, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontFamily: FONTS.heading, fontSize: 22, color: COLORS.azulEscuro, marginTop: 2 },
  subtitle: { fontSize: 8, color: COLORS.cinzaClaro, marginTop: 2, maxWidth: 280 },
  brandBox: { alignItems: 'flex-end' },
  brandLogo: { width: 104, height: 26, objectFit: 'contain' },
  brandGaleria: { fontSize: 8, fontFamily: FONTS.heading, color: COLORS.azulEscuro, letterSpacing: 1, marginTop: 3 },
  consultora: { fontSize: 8, color: COLORS.corpo, marginTop: 3, fontFamily: FONTS.bodyMedium },
  consultoraContato: { fontSize: 6.5, color: COLORS.cinzaClaro, marginTop: 1 },
  emissao: { fontSize: 7, color: COLORS.cinzaClaro, marginTop: 1 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: COLORS.vermelho, marginTop: 10, marginBottom: 12 },
  // Ficha
  fichaBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  fichaCol: { flex: 1, paddingHorizontal: 4 },
  fichaLabel: { fontSize: 6.5, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.4 },
  fichaValue: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, marginTop: 2 },
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
  h2: { fontFamily: FONTS.heading, fontSize: 13, color: COLORS.azulEscuro, marginTop: 18, marginBottom: 6 },
  paragraph: { fontSize: 9, color: COLORS.corpo, marginBottom: 6 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 10, fontFamily: FONTS.bodyMedium, color: COLORS.azul },
  bulletText: { flex: 1, fontSize: 8.5 },
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
  legend: { fontSize: 6.5, color: COLORS.cinzaClaro, marginBottom: 8 },
  // Tabelas
  table: { marginTop: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.cinzaBorda, paddingVertical: 4 },
  trHead: { borderBottomWidth: 1, borderBottomColor: COLORS.corpo },
  th: { fontSize: 6.5, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.3 },
  td: { fontSize: 8 },
  tdStrong: { fontSize: 8, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  green: { color: COLORS.verde, fontFamily: FONTS.bodyMedium },
  // Conclusão
  concRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.cinzaBorda,
    paddingVertical: 6,
  },
  concLabel: { fontSize: 9, fontFamily: FONTS.bodyMedium, color: COLORS.corpo, flex: 1 },
  concValue: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  parecerBox: {
    borderWidth: 1,
    borderColor: COLORS.verde,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    padding: 10,
    marginTop: 14,
  },
  parecerText: { fontSize: 8.5, color: COLORS.corpo },
  assinatura: { fontSize: 8.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, marginTop: 14 },
  notaTecnica: { fontSize: 7, color: COLORS.cinzaClaro, marginTop: 2 },
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
      <Text style={s.footerText}>{CONSULTORA.rodape}</Text>
      <Text
        style={s.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}

// Larguras das colunas do Top N
const TOP_W = { rank: '8%', end: '34%', constr: '13%', terr: '13%', m2t: '14%', fonte: '18%' } as const
// Larguras da sensibilidade
const SENS_W = { cen: '46%', n: '10%', merc: '22%', fech: '22%' } as const

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export function ResumoDocument({ model }: { model: ResumoModel }) {
  return (
    <Document
      title={`Resumo Executivo ACM — ${model.header.titulo}`}
      author={CONSULTORA.nome}
      subject="Análise Comparativa de Mercado"
    >
      {/* ============================ PÁGINA 1 ============================ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Resumo Executivo — Análise Comparativa de Mercado</Text>
            <Text style={s.title}>{model.header.titulo}</Text>
            <Text style={s.subtitle}>{model.header.subtitulo}</Text>
          </View>
          <BrandLockup />
        </View>
        <Text style={[s.emissao, { textAlign: 'right' }]}>Emissão: {model.header.dataEmissao}</Text>
        <View style={s.rule} />

        {/* Ficha do imóvel */}
        <View style={s.fichaBox}>
          <View style={[s.fichaCol, { flex: 1.6 }]}>
            <Text style={s.fichaLabel}>Imóvel</Text>
            <Text style={s.fichaValue}>{model.ficha.imovel}</Text>
          </View>
          <View style={s.fichaCol}>
            <Text style={s.fichaLabel}>Constr. / Terreno</Text>
            <Text style={s.fichaValue}>
              {intM(model.ficha.construido)} / {intM(model.ficha.terreno)}
            </Text>
          </View>
          <View style={s.fichaCol}>
            <Text style={s.fichaLabel}>Programa</Text>
            <Text style={s.fichaValue}>{model.ficha.programa ?? DASH}</Text>
          </View>
          <View style={s.fichaCol}>
            <Text style={s.fichaLabel}>Classe</Text>
            <Text style={s.fichaValue}>
              {model.ficha.score ? `Score ${model.ficha.score}` : DASH}
              {model.ficha.classeNota ? ` ${model.ficha.classeNota}` : ''}
            </Text>
          </View>
        </View>

        {/* Faixa de valores (5 cards) */}
        <View style={s.faixaRow}>
          {model.faixa.map((f, i) => {
            const hi = !!f.destaque
            const valor = f.faixa ? faixaCompact(f.faixa) : fmtCompact(f.valor)
            return (
              <View key={i} style={[s.faixaCard, ...(hi ? [s.faixaCardHi] : [])]}>
                <Text style={s.faixaLabel}>{f.rotulo}</Text>
                <Text style={[s.faixaValue, ...(hi ? [s.faixaValueHi] : [])]}>{valor}</Text>
              </View>
            )
          })}
        </View>

        {/* Síntese */}
        <Text style={s.h2}>Síntese</Text>
        <Text style={s.paragraph}>{model.sintese.paragrafo}</Text>
        {model.sintese.bullets.map((b, i) => (
          <View key={i} style={s.bullet}>
            <Text style={s.bulletDot}>•</Text>
            <Text style={s.bulletText}>{b}</Text>
          </View>
        ))}

        <Footer />
      </Page>

      {/* ============================ PÁGINA 2 ============================ */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Localização e Comparáveis de Maior Aderência</Text>

        {model.mapaUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={s.mapImg} src={model.mapaUrl} />
        ) : (
          <View style={s.mapPlaceholder}>
            <Text style={s.legend}>Mapa indisponível</Text>
          </View>
        )}
        <Text style={s.legend}>
          ● Imóvel-alvo ❶ Top 3 ❹ Top 4–5 ● Demais vendidos ■ Raio de análise
        </Text>

        {/* Tabela Top N */}
        <View style={s.table}>
          <View style={[s.tr, s.trHead]}>
            <Text style={[s.th, { width: TOP_W.rank }]}>#</Text>
            <Text style={[s.th, { width: TOP_W.end }]}>Endereço</Text>
            <Text style={[s.th, { width: TOP_W.constr, textAlign: 'right' }]}>Constr.</Text>
            <Text style={[s.th, { width: TOP_W.terr, textAlign: 'right' }]}>Terreno</Text>
            <Text style={[s.th, { width: TOP_W.m2t, textAlign: 'right' }]}>R$/m² T</Text>
            <Text style={[s.th, { width: TOP_W.fonte }]}>Fonte</Text>
          </View>
          {model.topComparaveis.map((r) => (
            <View key={r.rank} style={s.tr}>
              <Text style={[s.tdStrong, { width: TOP_W.rank, color: COLORS.dourado }]}>
                {r.estrelas} {r.rank}
              </Text>
              <Text style={[s.td, { width: TOP_W.end }]}>{r.endereco}</Text>
              <Text style={[s.td, { width: TOP_W.constr, textAlign: 'right' }]}>
                {intM(r.construido)}
              </Text>
              <Text style={[s.td, { width: TOP_W.terr, textAlign: 'right' }]}>
                {intM(r.terreno)}
              </Text>
              <Text style={[s.tdStrong, { width: TOP_W.m2t, textAlign: 'right' }]}>
                {r.precoM2Terreno == null ? DASH : numM2(r.precoM2Terreno)}
              </Text>
              <Text style={[s.td, { width: TOP_W.fonte, color: COLORS.azulMoema }]}>{r.fonte}</Text>
            </View>
          ))}
        </View>

        {/* Sensibilidade */}
        <Text style={s.h2}>Sensibilidade — 3 cenários (mesma estratégia de cálculo)</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]}>
            <Text style={[s.th, { width: SENS_W.cen }]}>Cenário</Text>
            <Text style={[s.th, { width: SENS_W.n, textAlign: 'right' }]}>N</Text>
            <Text style={[s.th, { width: SENS_W.merc, textAlign: 'right' }]}>Valor mercado</Text>
            <Text style={[s.th, { width: SENS_W.fech, textAlign: 'right' }]}>Fechamento</Text>
          </View>
          {model.sensibilidade.map((row, i) => (
            <View key={i} style={s.tr}>
              <Text style={[s.td, { width: SENS_W.cen }]}>{row.cenario}</Text>
              <Text style={[s.td, { width: SENS_W.n, textAlign: 'right' }]}>{row.n}</Text>
              <Text style={[s.td, { width: SENS_W.merc, textAlign: 'right' }]}>
                {fmt(row.valorMercado)}
              </Text>
              <Text style={[s.td, s.green, { width: SENS_W.fech, textAlign: 'right' }]}>
                {fmt(row.valorFechamento)}
              </Text>
            </View>
          ))}
        </View>

        <Footer />
      </Page>

      {/* ============================ PÁGINA 3 ============================ */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Conclusão e Recomendação</Text>

        <View style={[s.fichaBox, { flexDirection: 'column', gap: 0, padding: 4 }]}>
          {model.conclusao.map((row, i) => (
            <View key={i} style={[s.concRow, ...(i === model.conclusao.length - 1 ? [{ borderBottomWidth: 0 }] : [])]}>
              <Text style={s.concLabel}>{row.rotulo}</Text>
              <Text style={[s.concValue, ...(row.destaque ? [s.green] : [])]}>
                {row.faixa ? faixaFull(row.faixa) : fmt(row.valor)}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.parecerBox}>
          <Text style={s.parecerText}>
            <Text style={{ fontFamily: FONTS.bodyMedium }}>Parecer: </Text>
            {model.parecer}
          </Text>
        </View>

        <Text style={s.assinatura}>
          {CONSULTORA.nome} — {CONSULTORA.cargo} · {CONSULTORA.imobiliaria} · {CONSULTORA.creci}
        </Text>
        <Text style={s.notaTecnica}>
          Documento sucinto. Versão técnica completa disponível em laudo separado.
        </Text>

        <Footer />
      </Page>
    </Document>
  )
}
