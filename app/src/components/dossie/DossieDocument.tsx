'use client'

import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import type { AcmSnapshot, PlanoMarketing, HistoricoResultados } from '@/hooks/useDossie'

// Register default font (Helvetica is built-in)
Font.register({ family: 'Helvetica', fonts: [] })

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#1f2937' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#003DA5',
  },
  headerLeft: { fontSize: 14, fontWeight: 'bold', color: '#003DA5' },
  headerRight: { fontSize: 9, color: '#666', textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#999',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Cover
  coverTitle: { fontSize: 28, fontWeight: 'bold', color: '#003DA5', marginTop: 120 },
  coverSubtitle: { fontSize: 16, color: '#4b5563', marginTop: 8 },
  coverMeta: { fontSize: 12, color: '#666', marginTop: 40 },
  // Sections
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#003DA5', marginBottom: 12 },
  sectionSubtitle: { fontSize: 12, fontWeight: 'bold', color: '#374151', marginBottom: 6 },
  paragraph: { fontSize: 11, lineHeight: 1.6, marginBottom: 8 },
  // ACM table
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 4 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#003DA5', paddingBottom: 4, marginBottom: 4 },
  tableCell: { flex: 1, fontSize: 9 },
  tableCellBold: { flex: 1, fontSize: 9, fontWeight: 'bold' },
  // Stats
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  statBox: { flex: 1, padding: 10, backgroundColor: '#f3f4f6', borderRadius: 4 },
  statLabel: { fontSize: 9, color: '#6b7280', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#003DA5' },
  // Contact
  contactBox: { padding: 16, backgroundColor: '#003DA5', borderRadius: 8, marginTop: 20 },
  contactText: { color: '#ffffff', fontSize: 12, marginBottom: 4 },
  contactBold: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
})

function formatBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

interface DossieDocumentProps {
  leadNome: string
  endereco: string
  consultantNome: string
  consultantCreci: string
  consultantTelefone: string
  consultantEmail: string
  acmSnapshot: AcmSnapshot | null
  planoMarketing: PlanoMarketing
  historico: HistoricoResultados
}

function HeaderBar() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerLeft}>RE/MAX Galeria</Text>
      <Text style={styles.headerRight}>Luciana Borba | Consultora RE/MAX Galeria</Text>
    </View>
  )
}

function FooterBar() {
  return (
    <View style={styles.footer} fixed>
      <Text>CRECI 000.000-F | (11) 99999-9999</Text>
      <Text>luciana@remax.com.br</Text>
    </View>
  )
}

export function DossieDocument({
  leadNome,
  endereco,
  acmSnapshot,
  planoMarketing,
  historico,
}: DossieDocumentProps) {
  const today = new Date().toLocaleDateString('pt-BR')

  return (
    <Document>
      {/* Page 1: Cover */}
      <Page size="A4" style={styles.page}>
        <HeaderBar />
        <Text style={styles.coverTitle}>Dossiê de Assessoria{'\n'}Imobiliária</Text>
        <Text style={styles.coverSubtitle}>{endereco}</Text>
        <Text style={styles.coverMeta}>Preparado para: {leadNome}</Text>
        <Text style={styles.coverMeta}>Data: {today}</Text>
        <FooterBar />
      </Page>

      {/* Page 2: ACM */}
      <Page size="A4" style={styles.page}>
        <HeaderBar />
        <Text style={styles.sectionTitle}>Análise Comparativa de Mercado</Text>
        {acmSnapshot ? (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Média Preço/m²</Text>
                <Text style={styles.statValue}>{formatBRL(acmSnapshot.mediaPrecoM2)}/m²</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Mediana Preço/m²</Text>
                <Text style={styles.statValue}>{formatBRL(acmSnapshot.medianaPrecoM2)}/m²</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Comparáveis</Text>
                <Text style={styles.statValue}>{acmSnapshot.totalComparaveis}</Text>
              </View>
            </View>
            {acmSnapshot.top5.length > 0 && (
              <>
                <Text style={styles.sectionSubtitle}>Top Comparáveis</Text>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableCellBold}>Endereço</Text>
                  <Text style={styles.tableCellBold}>Área m²</Text>
                  <Text style={styles.tableCellBold}>Preço</Text>
                  <Text style={styles.tableCellBold}>R$/m²</Text>
                </View>
                {acmSnapshot.top5.map((c, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{c.endereco.slice(0, 25)}</Text>
                    <Text style={styles.tableCell}>{c.area_m2.toFixed(0)}</Text>
                    <Text style={styles.tableCell}>{formatBRL(c.preco)}</Text>
                    <Text style={styles.tableCell}>{formatBRL(c.preco_m2)}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          <Text style={styles.paragraph}>
            ACM em preparação. Os dados serão compilados assim que a análise de mercado for gerada.
          </Text>
        )}
        <FooterBar />
      </Page>

      {/* Page 3: Plano de Marketing */}
      <Page size="A4" style={styles.page}>
        <HeaderBar />
        <Text style={styles.sectionTitle}>Plano de Marketing</Text>
        <Text style={styles.sectionSubtitle}>Estratégia</Text>
        <Text style={styles.paragraph}>{planoMarketing.estrategia}</Text>
        <Text style={styles.sectionSubtitle}>Canais de Divulgação</Text>
        <Text style={styles.paragraph}>{planoMarketing.canais}</Text>
        <Text style={styles.sectionSubtitle}>Timeline</Text>
        <Text style={styles.paragraph}>{planoMarketing.timeline}</Text>
        <FooterBar />
      </Page>

      {/* Page 4: Histórico */}
      <Page size="A4" style={styles.page}>
        <HeaderBar />
        <Text style={styles.sectionTitle}>Histórico de Resultados</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Vendas Realizadas</Text>
            <Text style={styles.statValue}>{historico.vendasRealizadas}+</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tempo Médio</Text>
            <Text style={styles.statValue}>{historico.tempoMedio}</Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>O que dizem nossos clientes</Text>
        <Text style={[styles.paragraph, { fontStyle: 'italic' }]}>
          &quot;{historico.depoimentos}&quot;
        </Text>
        <FooterBar />
      </Page>

      {/* Page 5: Contato */}
      <Page size="A4" style={styles.page}>
        <HeaderBar />
        <Text style={styles.sectionTitle}>Vamos Conversar?</Text>
        <Text style={styles.paragraph}>
          Estou à disposição para esclarecer qualquer dúvida e apresentar uma proposta personalizada
          para a venda do seu imóvel.
        </Text>
        <View style={styles.contactBox}>
          <Text style={styles.contactBold}>Luciana Borba</Text>
          <Text style={styles.contactText}>Consultora RE/MAX Galeria — Moema</Text>
          <Text style={styles.contactText}>CRECI 000.000-F</Text>
          <Text style={styles.contactText}>(11) 99999-9999</Text>
          <Text style={styles.contactText}>luciana@remax.com.br</Text>
        </View>
        <FooterBar />
      </Page>
    </Document>
  )
}
