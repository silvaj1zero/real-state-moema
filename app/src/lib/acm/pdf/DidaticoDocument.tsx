/**
 * Material Didático ACM — documento React-PDF em RETRATO (Story 8.4 AC2).
 *
 * Reproduz as 5 partes do `MATERIAL_DIDATICO_ACM_Honduras.pdf`. Componente PURO:
 * recebe um `DidaticoModel` já computado por `buildDidaticoModel` (zero recálculo —
 * consistência com o laudo 8.3b, AC3). Branding via `theme.ts`.
 */
import { Document, Page, View, Text, Image, Link, StyleSheet } from '@react-pdf/renderer'
import { formatBRL } from '@/lib/format'
import { COLORS, FONTS, CONSULTORA, REMAX_WORDMARK_PNG } from './theme'
import type { DidaticoModel } from './didaticoModel'

const DASH = '—'
const fmt = (v: number | null | undefined) => (v == null ? DASH : formatBRL(v))
const numInt = (v: number | null | undefined) => (v == null ? DASH : Math.round(v).toLocaleString('pt-BR'))

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 44,
    paddingHorizontal: 44,
    fontFamily: FONTS.body,
    fontSize: 9,
    color: COLORS.corpo,
    lineHeight: 1.45,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerLeft: { flex: 1, paddingRight: 8 },
  eyebrow: { fontSize: 7, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontFamily: FONTS.heading, fontSize: 15, color: COLORS.azulEscuro, marginTop: 3, lineHeight: 1.15 },
  estudo: { fontSize: 8.5, color: COLORS.cinzaClaro, marginTop: 3 },
  brandBox: { alignItems: 'flex-end', flexShrink: 0, width: 120 },
  brandLogo: { width: 96, height: 24, objectFit: 'contain' },
  brandGaleria: { fontSize: 7.5, fontFamily: FONTS.heading, color: COLORS.azulEscuro, letterSpacing: 1, marginTop: 2 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: COLORS.vermelho, marginTop: 8, marginBottom: 10 },
  objetivoBox: {
    borderWidth: 1, borderColor: COLORS.cinzaBorda, backgroundColor: COLORS.fundoSuave,
    borderRadius: 6, padding: 10, marginBottom: 6,
  },
  h1: { fontFamily: FONTS.heading, fontSize: 14, color: COLORS.azulEscuro, marginTop: 16, marginBottom: 5 },
  h2: { fontFamily: FONTS.bodyMedium, fontSize: 10.5, color: COLORS.azul, marginTop: 10, marginBottom: 3 },
  paragraph: { fontSize: 9, color: COLORS.corpo, marginBottom: 5 },
  formula: {
    fontFamily: FONTS.mono, fontSize: 9, color: COLORS.azulEscuro,
    backgroundColor: COLORS.fundoSuave, borderRadius: 4, padding: 8, marginVertical: 5,
  },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 10, fontFamily: FONTS.bodyMedium, color: COLORS.azul },
  bulletText: { flex: 1, fontSize: 8.5 },
  resultBox: {
    borderLeftWidth: 3, borderLeftColor: COLORS.verde, backgroundColor: '#F0FDF4',
    paddingHorizontal: 8, paddingVertical: 5, marginVertical: 5,
  },
  resultText: { fontSize: 8.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  table: { marginTop: 6, marginBottom: 6, borderWidth: 1, borderColor: COLORS.cinzaBorda, borderRadius: 5 },
  tr: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: COLORS.cinzaBorda },
  trAlt: { backgroundColor: COLORS.fundoSuave },
  trHead: { backgroundColor: COLORS.azulEscuro, paddingVertical: 5, paddingHorizontal: 7 },
  th: { fontSize: 6.5, color: COLORS.branco, textTransform: 'uppercase', letterSpacing: 0.3, fontFamily: FONTS.bodyMedium },
  td: { fontSize: 8 },
  tdStrong: { fontSize: 8, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  green: { color: COLORS.verde, fontFamily: FONTS.bodyMedium },
  footer: {
    position: 'absolute', bottom: 20, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: COLORS.cinzaBorda, paddingTop: 6,
  },
  footerText: { fontSize: 6.5, color: COLORS.cinzaClaro },
})

function BrandLockup() {
  return (
    <View style={s.brandBox}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={REMAX_WORDMARK_PNG} style={s.brandLogo} />
      <Text style={s.brandGaleria}>GALERIA · MOEMA</Text>
    </View>
  )
}
function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{CONSULTORA.rodape} · Material Didático ACM</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}
function H1({ children }: { children: React.ReactNode }) {
  return <Text style={s.h1} minPresenceAhead={40}>{children}</Text>
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

export function DidaticoDocument({ model }: { model: DidaticoModel }) {
  const m = model
  return (
    <Document
      title={`Material Didático ACM — ${m.header.estudo}`}
      author={CONSULTORA.nome}
      subject="Material Didático — Análise Comparativa de Mercado"
    >
      <Page size="A4" style={s.page} wrap>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.eyebrow}>Material Didático ACM</Text>
            <Text style={s.title}>{m.header.titulo}</Text>
            <Text style={s.estudo}>{m.header.estudo} · {m.header.dataEmissao}</Text>
          </View>
          <BrandLockup />
        </View>
        <View style={s.rule} />
        <View style={s.objetivoBox}>
          <Text style={s.resultText}>Objetivo</Text>
          <Text style={[s.paragraph, { marginBottom: 0, marginTop: 2 }]}>{m.header.objetivo}</Text>
        </View>

        {/* PARTE 1 */}
        <H1>Parte 1 — Os critérios de seleção</H1>
        <Text style={s.paragraph}>{m.parte1.intro}</Text>
        <Text style={s.h2}>1.1 Filtros objetivos (quem entra na amostra)</Text>
        <Text style={s.paragraph}>{m.parte1.filtros.intro}</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '20%' }]}>Critério</Text>
            <Text style={[s.th, { width: '36%' }]}>Parâmetro</Text>
            <Text style={[s.th, { width: '44%' }]}>Por que existe</Text>
          </View>
          {m.parte1.filtros.criterios.map((c, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '20%' }]}>{c.criterio}</Text>
              <Text style={[s.td, { width: '36%' }]}>{c.parametro}</Text>
              <Text style={[s.td, { width: '44%' }]}>{c.porque}</Text>
            </View>
          ))}
        </View>
        <View style={s.resultBox}>
          <Text style={s.resultText}>{m.parte1.filtros.resultado}</Text>
        </View>

        <Text style={s.h2}>1.2 O sistema de Score (a qualidade)</Text>
        <Text style={s.paragraph}>{m.parte1.score.intro}</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '14%' }]}>Score</Text>
            <Text style={[s.th, { width: '48%' }]}>Régua (R$/m² construído)</Text>
            <Text style={[s.th, { width: '38%' }]}>Significado</Text>
          </View>
          {m.parte1.score.regua.map((r, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '14%', color: COLORS.azul }]}>{r.score}</Text>
              <Text style={[s.td, { width: '48%' }]}>{r.regua}</Text>
              <Text style={[s.td, { width: '38%' }]}>{r.significado}</Text>
            </View>
          ))}
        </View>
        <Bullets items={m.parte1.score.referencias} />
        <Text style={s.paragraph}>{m.parte1.score.notaAlvo}</Text>

        <Text style={s.h2}>1.3 O índice de aderência (a ordem do Top N)</Text>
        <Text style={s.paragraph}>{m.parte1.aderencia.intro}</Text>
        <Text style={s.formula}>{m.parte1.aderencia.formula}</Text>
        <Bullets items={m.parte1.aderencia.componentes} />
        <Text style={[s.paragraph, { fontFamily: FONTS.bodyMedium, marginTop: 4 }]}>Justificativa dos pesos:</Text>
        <Bullets items={m.parte1.aderencia.pesos} />
        <View style={s.resultBox}>
          <Text style={s.resultText}>{m.parte1.aderencia.resumo}</Text>
        </View>

        {/* PARTE 2 */}
        <H1>Parte 2 — Os cálculos</H1>
        <Text style={s.h2}>2.1 R$/m² construído (lente do comprador-usuário)</Text>
        <Text style={s.paragraph}>{m.parte2.construido}</Text>
        <Text style={s.h2}>2.2 R$/m² de terreno + efeito escala (lente do comprador-terreno)</Text>
        <Text style={s.paragraph}>{m.parte2.terreno.intro}</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '55%' }]}>Faixa de lote</Text>
            <Text style={[s.th, { width: '45%', textAlign: 'right' }]}>R$/m² de terreno mediano</Text>
          </View>
          {m.parte2.terreno.faixas.map((f, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '55%' }]}>{f.faixa}</Text>
              <Text style={[s.td, { width: '45%', textAlign: 'right' }]}>{numInt(f.precoM2TerrenoMediano)}</Text>
            </View>
          ))}
        </View>
        <Text style={s.paragraph}>{m.parte2.terreno.nota}</Text>
        <Text style={s.h2}>2.3 Valor residual do terreno (conta do incorporador)</Text>
        <Text style={s.paragraph}>{m.parte2.residual}</Text>
        <Text style={s.h2}>2.4 Ajustes de liquidez e condição</Text>
        <Text style={s.paragraph}>{m.parte2.liquidez}</Text>
        <Text style={s.h2}>2.5 Análise de sensibilidade (robustez)</Text>
        <Text style={s.paragraph}>{m.parte2.sensibilidade.intro}</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '40%' }]}>Cenário</Text>
            <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>N</Text>
            <Text style={[s.th, { width: '24%', textAlign: 'right' }]}>Valor mercado</Text>
            <Text style={[s.th, { width: '24%', textAlign: 'right' }]}>Fechamento</Text>
          </View>
          {m.parte2.sensibilidade.cenarios.map((c, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.td, { width: '40%' }]}>{c.cenario}</Text>
              <Text style={[s.td, { width: '12%', textAlign: 'right' }]}>{c.n}</Text>
              <Text style={[s.td, { width: '24%', textAlign: 'right' }]}>{fmt(c.valorMercado)}</Text>
              <Text style={[s.td, s.green, { width: '24%', textAlign: 'right' }]}>{fmt(c.valorFechamento)}</Text>
            </View>
          ))}
        </View>
        <Text style={s.paragraph}>{m.parte2.sensibilidade.nota}</Text>
        {/* Story 9.25 AC3 — parágrafo leave-one-out no didático */}
        <Text style={s.h2}>2.5b Teste de robustez da tese</Text>
        <Text style={s.paragraph}>{m.parte2.sensibilidade.robustezNota}</Text>
        <Text style={s.h2}>2.6 Deságio medido (anúncio → fechamento)</Text>
        <Text style={s.paragraph}>{m.parte2.desagio}</Text>

        {/* PARTE 3 */}
        <H1>Parte 3 — Busca em anúncios e validação</H1>
        <Text style={s.paragraph}>{m.parte3.intro}</Text>
        <Text style={s.h2}>3.1 Hierarquia das fontes</Text>
        <View style={s.table}>
          {m.parte3.hierarquia.map((h, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '6%', color: COLORS.azul }]}>{h.nivel}</Text>
              <Text style={[s.tdStrong, { width: '34%' }]}>{h.fonte}</Text>
              <Text style={[s.td, { width: '60%' }]}>{h.papel}</Text>
            </View>
          ))}
        </View>
        <Text style={s.h2}>3.2 Método da busca em anúncios</Text>
        <Bullets items={m.parte3.metodoBusca} />
        <Text style={s.h2}>3.3 Limitações honestas</Text>
        <Bullets items={m.parte3.limitacoes} />
        <Text style={s.h2}>3.4 Níveis de confiança</Text>
        <View style={s.table}>
          {m.parte3.niveisConfianca.map((n, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '28%' }]}>{n.nivel}</Text>
              <Text style={[s.td, { width: '72%' }]}>{n.criterio}</Text>
            </View>
          ))}
        </View>

        {/* PARTE 4 */}
        <H1>Parte 4 — Validação dos Top (links e dados)</H1>
        <Text style={s.paragraph}>{m.parte4.intro}</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]} wrap={false}>
            <Text style={[s.th, { width: '5%' }]}>#</Text>
            <Text style={[s.th, { width: '26%' }]}>Endereço</Text>
            <Text style={[s.th, { width: '15%' }]}>SQL</Text>
            <Text style={[s.th, { width: '30%' }]}>ITBI</Text>
            <Text style={[s.th, { width: '24%' }]}>Status / fonte</Text>
          </View>
          {m.parte4.top.map((t) => (
            <View key={t.rank} style={s.tr} wrap={false}>
              <Text style={[s.tdStrong, { width: '5%', color: COLORS.dourado }]}>{t.rank}</Text>
              <Text style={[s.td, { width: '26%' }]}>{t.endereco}</Text>
              <Text style={[s.td, { width: '15%' }]}>{t.sql}</Text>
              <Text style={[s.td, { width: '30%' }]}>{t.itbi}</Text>
              <View style={{ width: '24%' }}>
                <Text style={[s.td, { color: COLORS.corpo }]}>{t.status}</Text>
                {t.anuncioUrl ? (
                  <Link src={t.anuncioUrl} style={[s.td, { color: COLORS.azulMoema, fontSize: 7 }]}>
                    {t.fonte} ↗
                  </Link>
                ) : (
                  <Text style={[s.td, { color: COLORS.cinzaClaro, fontSize: 7 }]}>{t.fonte}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
        <View style={s.resultBox}>
          <Text style={[s.resultText, { fontFamily: FONTS.body }]}>{m.parte4.sintese}</Text>
        </View>

        {/* PARTE 5 */}
        <H1>Parte 5 — Como validar / replicar</H1>
        <Text style={s.paragraph}>{m.parte5.intro}</Text>
        {m.parte5.passos.map((p, i) => (
          <View key={i} style={s.bullet} wrap={false}>
            <Text style={[s.bulletDot, { color: COLORS.azul }]}>{i + 1}</Text>
            <Text style={s.bulletText}>{p}</Text>
          </View>
        ))}
        <Text style={s.h2}>Anexos de referência</Text>
        <Bullets items={m.parte5.anexos} />
        <Text style={[s.paragraph, { fontSize: 7.5, color: COLORS.cinzaClaro, marginTop: 6 }]}>{m.parte5.fonte}</Text>

        <Footer />
      </Page>
    </Document>
  )
}
