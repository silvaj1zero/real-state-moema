/**
 * ACM Lite — PDF 1–2 páginas, linguagem “modo dono” (Story 9.19).
 * Branding RE/MAX via theme; leitura com fonte ≥ 9–10 pt.
 */
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { formatBRL } from '@/lib/format'
import { COLORS, FONTS, CONSULTORA, REMAX_WORDMARK_PNG } from './theme'
import type { LiteModel } from './liteModel'

const DASH = '—'
const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.corpo,
    lineHeight: 1.45,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  headerLeft: { flex: 1 },
  eyebrow: {
    fontSize: 8,
    color: COLORS.cinzaClaro,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.azulEscuro,
    marginTop: 4,
    lineHeight: 1.2,
  },
  subtitle: { fontSize: 9, color: COLORS.cinzaClaro, marginTop: 3 },
  brandBox: { alignItems: 'flex-end', width: 120 },
  brandLogo: { width: 100, height: 24, objectFit: 'contain' },
  brandGaleria: {
    fontSize: 8,
    fontFamily: FONTS.heading,
    color: COLORS.azulEscuro,
    letterSpacing: 1,
    marginTop: 2,
  },
  consultora: { fontSize: 8, marginTop: 2, fontFamily: FONTS.bodyMedium },
  rule: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.vermelho,
    marginTop: 10,
    marginBottom: 12,
  },
  ficha: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    borderRadius: 6,
    padding: 10,
    gap: 8,
    backgroundColor: COLORS.fundoSuave,
  },
  fichaCol: { flex: 1 },
  fichaLabel: {
    fontSize: 7,
    color: COLORS.cinzaClaro,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fichaValue: {
    fontSize: 10,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.azulEscuro,
    marginTop: 2,
  },
  alertaBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: COLORS.vermelho,
  },
  alertaTitle: {
    fontFamily: FONTS.heading,
    fontSize: 10,
    color: COLORS.vermelho,
    marginBottom: 3,
  },
  alertaText: { fontSize: 9, color: COLORS.corpo },
  h2: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    color: COLORS.azulEscuro,
    marginTop: 14,
    marginBottom: 6,
  },
  faixaBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  faixaCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  faixaCardHi: {
    borderColor: COLORS.verde,
    backgroundColor: '#F0FDF4',
  },
  faixaLabel: {
    fontSize: 7,
    color: COLORS.cinzaClaro,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  faixaValue: {
    fontSize: 12,
    fontFamily: FONTS.heading,
    color: COLORS.azul,
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  badgeFrase: { fontSize: 8, color: COLORS.corpo, marginTop: 2 },
  table: { marginTop: 4 },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.cinzaBorda,
    paddingVertical: 5,
  },
  trHead: { borderBottomWidth: 1, borderBottomColor: COLORS.corpo },
  th: {
    fontSize: 7,
    color: COLORS.cinzaClaro,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  td: { fontSize: 9 },
  tdStrong: { fontSize: 9, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  secaoBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 5,
    backgroundColor: COLORS.fundoSuave,
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
  },
  secaoTitulo: {
    fontSize: 8,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.azul,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  secaoTexto: { fontSize: 9.5, color: COLORS.corpo },
  avisoRow: { flexDirection: 'row', marginBottom: 3, gap: 4 },
  avisoDot: { fontSize: 9, color: COLORS.vermelho },
  avisoText: { flex: 1, fontSize: 8.5, color: COLORS.corpo },
  disclaimer: {
    marginTop: 14,
    fontSize: 7.5,
    color: COLORS.cinzaClaro,
    lineHeight: 1.35,
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 7,
    color: COLORS.cinzaClaro,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})

function badgeStyle(tese: string) {
  if (tese === 'abaixo')
    return { backgroundColor: '#FEF3C7', borderColor: COLORS.dourado }
  if (tese === 'acima')
    return { backgroundColor: '#FEE2E2', borderColor: COLORS.vermelho }
  if (tese === 'alinhado')
    return { backgroundColor: '#ECFDF5', borderColor: COLORS.verde }
  return { backgroundColor: COLORS.fundoSuave, borderColor: COLORS.cinzaBorda }
}

const MODO_DONO_LABELS: Array<{ key: keyof LiteModel['modoDono']; titulo: string }> = [
  { key: 'oQueRegistrosMostram', titulo: 'O que o registro mostra que se vendeu perto' },
  { key: 'oQueSugere', titulo: 'O que isso sugere para o seu imóvel' },
  { key: 'oQueConfirmar', titulo: 'O que ainda precisamos confirmar' },
  { key: 'oQueRecomendamos', titulo: 'O que recomendamos anunciar / negociar' },
  { key: 'oQueNaoDizemos', titulo: 'O que não estamos dizendo' },
]

export function LiteDocument({ model }: { model: LiteModel }) {
  const faixaTxt = `${formatBRL(model.faixaMercado.min)} – ${formatBRL(model.faixaMercado.max)}`
  return (
    <Document
      title={model.header.titulo}
      author={`${CONSULTORA.nome} · RE/MAX Galeria`}
      subject="ACM Lite — leitura de mercado"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.eyebrow}>ACM Lite · RE/MAX Galeria</Text>
            <Text style={s.title}>{model.header.titulo}</Text>
            <Text style={s.subtitle}>{model.header.subtitulo}</Text>
          </View>
          <View style={s.brandBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image */}
            <Image src={REMAX_WORDMARK_PNG} style={s.brandLogo} />
            <Text style={s.brandGaleria}>GALERIA</Text>
            <Text style={s.consultora}>{CONSULTORA.nome}</Text>
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.ficha}>
          <View style={[s.fichaCol, { flex: 1.6 }]}>
            <Text style={s.fichaLabel}>Imóvel</Text>
            <Text style={s.fichaValue}>{model.header.endereco}</Text>
          </View>
          <View style={s.fichaCol}>
            <Text style={s.fichaLabel}>Programa</Text>
            <Text style={s.fichaValue}>{model.header.programa ?? DASH}</Text>
          </View>
          <View style={s.fichaCol}>
            <Text style={s.fichaLabel}>Emissão</Text>
            <Text style={s.fichaValue}>{model.header.dataEmissao}</Text>
          </View>
        </View>

        {model.alertaTipologia && (
          <View style={s.alertaBox}>
            <Text style={s.alertaTitle}>Alerta de tipologia (R5)</Text>
            <Text style={s.alertaText}>{model.alertaTipologia.mensagem}</Text>
          </View>
        )}

        <Text style={s.h2}>Faixa de mercado</Text>
        <View style={s.faixaBox}>
          <View style={[s.faixaCard, s.faixaCardHi]}>
            <Text style={s.faixaLabel}>Faixa ACM</Text>
            <Text style={s.faixaValue}>{faixaTxt}</Text>
          </View>
          <View style={s.faixaCard}>
            <Text style={s.faixaLabel}>Referência (aderente)</Text>
            <Text style={s.faixaValue}>{formatBRL(model.referenciaMercado)}</Text>
          </View>
        </View>

        {model.tese.tese !== 'indefinida' && (
          <View style={[s.badge, badgeStyle(model.tese.tese)]}>
            <Text style={s.badgeText}>
              {model.tese.label}
              {model.tese.deltaPct != null
                ? ` (${model.tese.deltaPct > 0 ? '+' : ''}${model.tese.deltaPct}%)`
                : ''}
            </Text>
            <Text style={s.badgeFrase}>{model.tese.frase}</Text>
          </View>
        )}

        {model.subprecificacao.nivel != null && (
          <View
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 5,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: COLORS.dourado,
            }}
          >
            <Text style={{ fontSize: 9, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro }}>
              Radar subprecificação · {model.subprecificacao.nivel}
              {model.subprecificacao.deltaPct != null
                ? ` (${model.subprecificacao.deltaPct}%)`
                : ''}
            </Text>
            {model.subprecificacao.acaoRecomendada && (
              <Text style={{ fontSize: 8.5, color: COLORS.corpo, marginTop: 3 }}>
                {model.subprecificacao.acaoRecomendada}
              </Text>
            )}
          </View>
        )}

        <Text style={s.h2}>3 vendas mais parecidas</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]}>
            <Text style={[s.th, { width: '8%' }]}>#</Text>
            <Text style={[s.th, { width: '40%' }]}>Endereço</Text>
            <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>m²</Text>
            <Text style={[s.th, { width: '20%', textAlign: 'right' }]}>Preço</Text>
            <Text style={[s.th, { width: '18%', textAlign: 'right' }]}>Dist.</Text>
          </View>
          {model.top3.length === 0 ? (
            <Text style={{ fontSize: 9, color: COLORS.cinzaClaro, marginTop: 4 }}>
              Nenhum comparável no ranking.
            </Text>
          ) : (
            model.top3.map((c) => (
              <View key={c.rank} style={s.tr} wrap={false}>
                <Text style={[s.tdStrong, { width: '8%' }]}>{c.rank}</Text>
                <Text style={[s.td, { width: '40%' }]}>{c.endereco}</Text>
                <Text style={[s.td, { width: '14%', textAlign: 'right' }]}>
                  {c.areaM2 != null ? Math.round(c.areaM2).toLocaleString('pt-BR') : DASH}
                </Text>
                <Text style={[s.td, { width: '20%', textAlign: 'right' }]}>
                  {c.preco != null ? formatBRL(c.preco) : DASH}
                </Text>
                <Text style={[s.td, { width: '18%', textAlign: 'right' }]}>
                  {c.distanciaM != null ? `${Math.round(c.distanciaM)} m` : DASH}
                </Text>
              </View>
            ))
          )}
        </View>

        {model.avisosCriticos.length > 0 && (
          <>
            <Text style={s.h2}>Pontos de atenção</Text>
            {model.avisosCriticos.map((a, i) => (
              <View key={i} style={s.avisoRow}>
                <Text style={s.avisoDot}>•</Text>
                <Text style={s.avisoText}>{a.mensagem}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.h2}>Para o proprietário</Text>
        {MODO_DONO_LABELS.map(({ key, titulo }) => (
          <View key={key} style={s.secaoBox} wrap={false}>
            <Text style={s.secaoTitulo}>{titulo}</Text>
            <Text style={s.secaoTexto}>{model.modoDono[key]}</Text>
          </View>
        ))}

        <Text style={s.disclaimer}>{model.disclaimer}</Text>

        <View style={s.footer} fixed>
          <Text>
            {CONSULTORA.nome} · {CONSULTORA.creci}
          </Text>
          <Text>ACM Lite · {model.header.dataEmissao}</Text>
        </View>
      </Page>
    </Document>
  )
}
