/**
 * Honduras 629 — PDF de CENÁRIOS E ESTRATÉGIA (13-Jul-2026), no DS RE/MAX dos
 * entregáveis ACM (theme.ts: paleta/fontes/lockup/rodapé — padrão ResumoDocument).
 *
 * Conteúdo = docs/acm/honduras-629/CENARIOS-ESTRATEGIA-PROPRIETARIO-20260713.md
 * Números = LAUDO-ACM-Honduras-v6-2026-07-13.computation.json (Art. IV — nada novo).
 *
 * USO: material de apresentação ao PROPRIETÁRIO, condicionado à validação da
 * supervisão RE/MAX (Luciana Borba) — banner e caixa de validação no documento.
 *
 * Rodar de `app/`:  npx -y tsx scripts/acm-honduras/08-build-cenarios-pdf.tsx
 * Saída: docs/acm/honduras-629/CENARIOS-ESTRATEGIA-Honduras629-REMAX-<data>.pdf
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import {
  COLORS,
  CONSULTORA,
  FONTS,
  REMAX_WORDMARK_PNG,
  registerBrandFonts,
} from '@/lib/acm/pdf/theme'

// ---------------------------------------------------------------------------
// Números do computation v6 (fonte única; ver .computation.json)
// ---------------------------------------------------------------------------
// Cadeia de redutores DECLARADA (auditoria 14-Jul, item B2): mediana homogeneizada
// (ref 15.978 → teto 19.061 R$/m²) × redutor de estado −15% = headline "mercado" do
// laudo; o fechamento aplica ainda o deságio. Regularizado usa a MESMA base ×0,85.
const V6 = {
  construcaoDocumental: { min: 5_989_387, max: 7_145_136 }, // 441 × régua × 0,85
  construcaoDocumentalBruta: { min: 7_046_338, max: 8_406_042 }, // 441 × régua (s/ redutor)
  terrenoResidual: 9_624_000, // residual INDICATIVO — cenário único, recalibrar (item B4)
  regularizadoAreaMin: { min: 9_715_000, max: 11_590_000 }, // 715,33 m² × régua × 0,85
  regularizadoAreaMax: { min: 11_096_000, max: 13_237_000 }, // 816,97 m² × régua × 0,85
  pretendido: 12_000_000,
  desagioMedidoPct: -12.7, // N=2 pares (−14,96% / −10,47%) — indicativo, não estatística
  areaAverbada: 441,
  areaTerreno: 1050,
  projecaoMin: 715, // 715,33 se garagem contida no polígono da área coberta
  projecaoMax: 817, // 816,97 se polígonos disjuntos — medição do RT decide
}

const mi = (v: number) => `R$ ${(v / 1e6).toFixed(2).replace('.', ',')}M`
const faixaMi = (f: { min: number; max: number }) =>
  `R$ ${(f.min / 1e6).toFixed(1).replace('.', ',')}–${(f.max / 1e6).toFixed(1).replace('.', ',')}M`

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const fontsDir = path.join(scriptDir, '..', '..', 'public', 'fonts')
registerBrandFonts({
  montserratBold: path.join(fontsDir, 'Montserrat-Bold.ttf'),
  montserratSemiBold: path.join(fontsDir, 'Montserrat-SemiBold.ttf'),
  interRegular: path.join(fontsDir, 'Inter-Regular.ttf'),
  interMedium: path.join(fontsDir, 'Inter-Medium.ttf'),
})

// Anexo A — capturas das medições por satélite (operador, Google Earth 13-Jul).
// Evidência versionada em docs/acm/honduras-629/anexo-satelite/.
const anexoDir = path.resolve(scriptDir, '..', '..', '..', 'docs', 'acm', 'honduras-629', 'anexo-satelite')
const ANEXOS_A: ReadonlyArray<{ file: string; caption: string }> = [
  { file: 'a1-terreno-1046m2.png', caption: 'A.1 — Terreno: perímetro 143,47 m · área medida 1.046,3 m² (oficial: 1.050 m² — desvio 0,4%, valida a medição)' },
  { file: 'a2-terreno-vista2.png', caption: 'A.2 — Terreno (segunda vista, mesmo polígono de 1.046,3 m²)' },
  { file: 'a3-area-coberta-685m2.png', caption: 'A.3 — Área coberta principal (casa + gourmet): ~685 m² de projeção' },
  { file: 'a4-area-da-casa.png', caption: 'A.4 — Polígono da casa principal (perímetro ~104 m)' },
  { file: 'a5-garagem-coberta.png', caption: 'A.5 — Garagem coberta' },
  { file: 'a6-cobertura-carros-30m2.png', caption: 'A.6 — Cobertura externa de veículos: 30,48 m² (conta como área construída pela projeção — Dec. 58.420/18)' },
]
// Anexo B — série HISTÓRICA (imagem Google Earth de 08/09/2013): a mesma projeção
// coberta de hoje já existia → obras concluídas ANTES de 31/07/2014 → elegíveis à
// anistia (Lei 17.202/2019, protocolo até 30/08/2026 — Lei 18.375/2025).
const ANEXOS_B: ReadonlyArray<{ file: string; caption: string }> = [
  { file: 'b1-2013-terreno.png', caption: 'B.1 — Imagem de 08/09/2013 — terreno: mesmo polígono (~1.050 m²)' },
  { file: 'b2-2013-terreno-vista2.png', caption: 'B.2 — Imagem de 08/09/2013 — terreno (segunda vista)' },
  { file: 'b3-2013-area-coberta.png', caption: 'B.3 — Imagem de 08/09/2013 — área coberta: ~689 m² de projeção JÁ EXISTENTE (vs ~685 m² em 2024 — mesma pegada)' },
  { file: 'b4-2013-area-coberta-vista2.png', caption: 'B.4 — Imagem de 08/09/2013 — área coberta (segunda vista)' },
  { file: 'b5-2013-garagem-coberta.png', caption: 'B.5 — Imagem de 08/09/2013 — garagem coberta (~121 m² de projeção) já presente' },
]

// registerBrandFonts roda ACIMA, antes deste StyleSheet.create — que captura
// FONTS por valor (lição H-2: sem isso o PDF sai em Helvetica sem −/≥/●).
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerLeft: { flex: 1, paddingRight: 8 },
  eyebrow: { fontSize: 7, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontFamily: FONTS.heading, fontSize: 20, color: COLORS.azulEscuro, marginTop: 3, lineHeight: 1.15 },
  subtitle: { fontSize: 8, color: COLORS.cinzaClaro, marginTop: 3 },
  brandBox: { alignItems: 'flex-end', flexShrink: 0, width: 132 },
  brandLogo: { width: 104, height: 26, objectFit: 'contain' },
  brandGaleria: { fontSize: 8, fontFamily: FONTS.heading, color: COLORS.azulEscuro, letterSpacing: 1, marginTop: 3 },
  consultora: { fontSize: 8, color: COLORS.corpo, marginTop: 3, fontFamily: FONTS.bodyMedium },
  consultoraContato: { fontSize: 6.5, color: COLORS.cinzaClaro, marginTop: 1 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: COLORS.vermelho, marginTop: 10, marginBottom: 12 },
  // Banner de validação (material interno)
  banner: {
    borderWidth: 1,
    borderColor: COLORS.vermelho,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  bannerText: { fontSize: 8, color: COLORS.vermelho, fontFamily: FONTS.bodyMedium, textAlign: 'center' },
  h2: { fontFamily: FONTS.heading, fontSize: 13, color: COLORS.azulEscuro, marginTop: 14, marginBottom: 6 },
  h3: { fontFamily: FONTS.headingSemi, fontSize: 10, color: COLORS.azul, marginTop: 8, marginBottom: 3 },
  paragraph: { fontSize: 9, color: COLORS.corpo, marginBottom: 6 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 12, fontFamily: FONTS.bodyMedium, color: COLORS.azul },
  bulletText: { flex: 1, fontSize: 8.5 },
  // Cards dos 3 números
  cardRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  card: { flex: 1, borderWidth: 1, borderColor: COLORS.cinzaBorda, borderRadius: 6, padding: 9, alignItems: 'center' },
  cardHi: { borderColor: COLORS.verde, backgroundColor: '#F0FDF4' },
  cardWarn: { borderColor: COLORS.cinzaBorda, backgroundColor: COLORS.fundoSuave },
  cardLabel: { fontSize: 6, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  cardValue: { fontSize: 12, fontFamily: FONTS.heading, color: COLORS.azul, marginTop: 4, textAlign: 'center' },
  cardValueHi: { color: COLORS.verde },
  cardNota: { fontSize: 6, color: COLORS.cinzaClaro, marginTop: 3, textAlign: 'center' },
  // Insight box
  insightBox: { borderWidth: 1, borderColor: COLORS.dourado, backgroundColor: '#FFFBEB', borderRadius: 6, padding: 10, marginTop: 10 },
  insightText: { fontSize: 8.5, color: COLORS.corpo },
  strong: { fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  // Ficha documental
  fichaBox: { borderWidth: 1, borderColor: COLORS.cinzaBorda, borderRadius: 6, padding: 10, marginTop: 4 },
  fichaRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: COLORS.cinzaBorda, paddingVertical: 4 },
  fichaLabel: { fontSize: 8, color: COLORS.corpo, flex: 1.6 },
  fichaValue: { fontSize: 8.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, flex: 1, textAlign: 'right' },
  // Cenário cards
  cenarioBox: { borderWidth: 1, borderColor: COLORS.cinzaBorda, borderRadius: 6, padding: 9, marginBottom: 7 },
  cenarioBoxHi: { borderColor: COLORS.verde, backgroundColor: '#F0FDF4' },
  cenarioBoxNo: { borderColor: COLORS.vermelho, backgroundColor: '#FEF2F2' },
  cenarioHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  cenarioTitle: { fontSize: 9.5, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  cenarioAncora: { fontSize: 9.5, fontFamily: FONTS.heading, color: COLORS.azul },
  cenarioText: { fontSize: 8, color: COLORS.corpo },
  // Tabelas
  table: { marginTop: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: COLORS.cinzaBorda, paddingVertical: 4 },
  trHead: { borderBottomWidth: 1, borderBottomColor: COLORS.corpo },
  th: { fontSize: 6.5, color: COLORS.cinzaClaro, textTransform: 'uppercase', letterSpacing: 0.3 },
  td: { fontSize: 8 },
  tdStrong: { fontSize: 8, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro },
  green: { color: COLORS.verde, fontFamily: FONTS.bodyMedium },
  // Caixa de validação da supervisão
  validacaoBox: { borderWidth: 1, borderColor: COLORS.azul, borderRadius: 6, padding: 12, marginTop: 16 },
  validacaoTitle: { fontSize: 9, fontFamily: FONTS.bodyMedium, color: COLORS.azulEscuro, marginBottom: 8 },
  validacaoLinha: { fontSize: 8.5, color: COLORS.corpo, marginBottom: 10 },
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
  // Anexo A — capturas de satélite
  anexoImg: {
    width: '100%',
    height: 188,
    objectFit: 'contain',
    borderWidth: 1,
    borderColor: COLORS.cinzaBorda,
    borderRadius: 4,
    backgroundColor: '#0B0F14',
  },
  anexoCaption: { fontSize: 7, color: COLORS.cinzaClaro, marginTop: 3, marginBottom: 10 },
})

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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.bullet}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  )
}

const POS_W = { cen: '14%', man: '38%', area: '18%', anuncio: '15%', fech: '15%' } as const

function CenariosDocument({ dataEmissao }: { dataEmissao: string }) {
  return (
    <Document
      title="Cenários e Estratégia — Rua Honduras, 629"
      author={CONSULTORA.nome}
      subject="Análise de cenários para decisão do proprietário"
    >
      {/* ============================ PÁGINA 1 ============================ */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.eyebrow}>Estratégia de Posicionamento — Análise de Cenários</Text>
            <Text style={s.title}>Rua Honduras, 629</Text>
            <Text style={s.subtitle}>
              Jardim América / Jardim Paulista · Terreno 1.050 m² (21 m de frente) · Matrícula 116.360 (4º RI-SP) · Emissão: {dataEmissao}
            </Text>
          </View>
          <BrandLockup />
        </View>
        <View style={s.rule} />

        <View style={s.banner}>
          <Text style={s.bannerText}>
            MATERIAL INTERNO — apresentar ao proprietário somente após validação da supervisão RE/MAX (Luciana Borba)
          </Text>
        </View>

        <Text style={s.h2}>1. O que os documentos revelaram</Text>
        <View style={s.fichaBox}>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Área construída AVERBADA (matrícula Av.03/1996 = cadastro IPTU)</Text>
            <Text style={s.fichaValue}>{V6.areaAverbada} m²</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Área física observada (visita + satélite — projeção coberta, NÃO oficial; medição do RT decide)</Text>
            <Text style={s.fichaValue}>~{V6.projecaoMin}–{V6.projecaoMax} m²</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Área anunciada anteriormente (sem suporte em nenhuma fonte oficial)</Text>
            <Text style={s.fichaValue}>800 m²</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Terreno oficial (matrícula = IPTU = medição por satélite)</Text>
            <Text style={s.fichaValue}>{V6.areaTerreno} m²</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Zona / projeção máxima permitida hoje (ZER-1, TO 0,5 — LPUOS e Lei 18.177/24)</Text>
            <Text style={s.fichaValue}>525 m² (medido ~{V6.projecaoMin}–{V6.projecaoMax})</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Patrimônio: lote DENTRO do perímetro tombado dos Jardins (CONDEPHAAT/CONPRESP)</Text>
            <Text style={s.fichaValue}>anuência obrigatória</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Titularidade: Dennis + Ermantina (falecida ~2018 — inventário SEM averbação) · interlocutora: Clarisia Ramos (herdeira)</Text>
            <Text style={s.fichaValue}>sucessão a sanear</Text>
          </View>
          <View style={[s.fichaRow, { borderBottomWidth: 0 }]}>
            <Text style={s.fichaLabel}>Ônus a sanear antes de qualquer escritura</Text>
            <Text style={s.fichaValue}>Fiduciária + penhora 50% + inventário</Text>
          </View>
        </View>
        <Text style={[s.paragraph, { fontSize: 7.5, color: COLORS.cinzaClaro, marginTop: 4 }]}>
          A área gourmet e a garagem coberta contam como área construída pelo critério municipal (Lei 10.235/86 / Dec. 58.420/18), mas não estão averbadas nem lançadas — exigem regularização municipal e cartorária. Certidão analisada: 01/2023 (pedir atualizada).
        </Text>

        <Text style={s.h2}>2. As três lentes de valor (cadeia de cálculo declarada)</Text>
        <Text style={[s.paragraph, { fontSize: 7, color: COLORS.cinzaClaro, marginBottom: 2 }]}>
          Base de todos os valores: mediana homogeneizada ITBI/FipeZap (R$ 15.978–19.061/m²) × redutor de estado −15% (padrão do laudo v6.1). Sem o redutor, a lente documental seria {faixaMi(V6.construcaoDocumentalBruta)}.
        </Text>
        <View style={s.cardRow}>
          <View style={[s.card, s.cardWarn]}>
            <Text style={s.cardLabel}>Casa documental (441 m²)</Text>
            <Text style={s.cardValue}>{faixaMi(V6.construcaoDocumental)}</Text>
            <Text style={s.cardNota}>única base defensável hoje como casa · inclui redutor −15%</Text>
          </View>
          <View style={[s.card, s.cardHi]}>
            <Text style={s.cardLabel}>Terreno — residual INDICATIVO</Text>
            <Text style={[s.cardValue, s.cardValueHi]}>{mi(V6.terrenoResidual)}</Text>
            <Text style={s.cardNota}>cenário único (recalibrar c/ licenciador) — âncora de referência p/ reconstrução; independe de averbação</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Casa regularizada ({V6.projecaoMin}–{V6.projecaoMax} m², RT decide)</Text>
            <Text style={s.cardValue}>{faixaMi(V6.regularizadoAreaMin)}</Text>
            <Text style={s.cardNota}>área mínima, mesma base do laudo; até {mi(V6.regularizadoAreaMax.max)} se o RT confirmar a área máxima · só existe com anistia DEFERIDA</Text>
          </View>
        </View>

        <View style={s.insightBox}>
          <Text style={s.insightText}>
            <Text style={s.strong}>A lente do terreno resgata o valor que a matrícula derrubou. </Text>
            A referência econômica do imóvel não é só a casa documental — o terreno de 1.050 m² tem residual indicativo de {mi(V6.terrenoResidual)} para quem reconstrói (não depende de averbação; valor de cenário único, a recalibrar com o licenciador). O imóvel se reposiciona de {'"'}casa de 800 m²{'"'} (insustentável em documento) para <Text style={s.strong}>terreno premium nos Jardins com casa aproveitável</Text>. Os {mi(V6.pretendido)} pretendidos ficam entre a âncora-terreno e o topo do cenário regularizado: são a tese de regularização precificada — alcançáveis, mas condicionados (anistia deferida + área confirmada pelo RT).
          </Text>
        </View>

        <View style={[s.insightBox, { borderColor: COLORS.verde, backgroundColor: '#F0FDF4', marginTop: 8 }]}>
          <Text style={s.insightText}>
            <Text style={[s.strong, { color: COLORS.verde }]}>ATUALIZAÇÃO 13-Jul — forte indício de que a anistia se aplica (a confirmar pelo RT). </Text>
            A série histórica de satélite (Anexo B, imagem de <Text style={s.strong}>08/09/2013</Text>) mostra pegada coberta equivalente à de hoje — <Text style={s.strong}>INDÍCIO VISUAL FORTE de conclusão anterior a 31/07/2014</Text>, o corte da Lei 17.202/2019; a prova formal de anterioridade é montada pelo responsável técnico (aerofotos oficiais, IPTU antigo). Consequências: (1) a regularização tende ao trilho da ANISTIA, que perdoa o zoneamento — a projeção medida ({V6.projecaoMin}–{V6.projecaoMax} m²) excede o limite da ZER-1 (525 m²), tornando a anistia a ÚNICA porta de averbação do excedente (no rito comum exigiria demolir/descobrir); (2) lote no perímetro TOMBADO dos Jardins → deferimento depende de <Text style={s.strong}>anuência CONDEPHAAT/CONPRESP</Text> — licenciador com experiência no bairro; (3) há tese com respaldo no TJSP para afastar o IPTU retroativo de quem regulariza pela anistia — <Text style={s.strong}>a confirmar pelo advogado no caso concreto</Text>; (4) <Text style={[s.strong, { color: COLORS.vermelho }]}>o protocolo precisa sair até 30/08/2026</Text> (prorrogação vigente; instrumento exato — Lei 18.375/2025 / Dec. 65.148/2026 — a confirmar com o licenciador).
          </Text>
        </View>

        <Footer />
      </Page>

      {/* ============================ PÁGINA 2 ============================ */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>3. Cenários de caminho</Text>

        <View style={[s.cenarioBox, s.cenarioBoxNo]}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>E0 — Manter anúncio de R$ 12M como {'"'}800 m²{'"'}</Text>
            <Text style={[s.cenarioAncora, { color: COLORS.vermelho }]}>ELIMINAR</Text>
          </View>
          <Text style={s.cenarioText}>
            Preço de cenário regularizado sem a regularização. Desmonta na primeira certidão: banco avalia por 441 m², comprador renegocia na mesa, e o risco de IPTU retroativo corre no relógio.
          </Text>
        </View>

        <View style={s.cenarioBox}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>B — Vender como está, ancorado no TERRENO</Text>
            <Text style={s.cenarioAncora}>{mi(V6.terrenoResidual)}+</Text>
          </View>
          <Text style={s.cenarioText}>
            Público: quem constrói casa nova (família/incorporador) — averbação irrelevante para quem demole. Prazo curto, custo de regularização zero. Pré-requisito: ônus limpos. Captura ~80% do valor pretendido sem esperar.
          </Text>
        </View>

        <View style={[s.cenarioBox, s.cenarioBoxHi]}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>C — Regularizar VIA ANISTIA e vender como CASA (recomendado)</Text>
            <Text style={[s.cenarioAncora, { color: COLORS.verde }]}>{faixaMi(V6.regularizadoAreaMin)} — até {mi(V6.regularizadoAreaMax.max)}</Text>
          </View>
          <Text style={s.cenarioText}>
            Captura máxima (valores na MESMA base do laudo, com redutor −15%; faixa menor = área mínima 715 m², teto se o RT confirmar ~817 m²). Indício visual forte de anterioridade a 2014 (Anexo B; prova formal pelo RT) → potencialmente elegível à Lei 17.202/2019, que perdoa TO/recuos/CA — a ÚNICA porta p/ averbar os ~190–292 m² acima da projeção permitida. Na régua do laudo, cada m² regularizado ≈ R$ 13,6–16,2 mil. TRÊS CONDIÇÕES DURAS: (1) protocolo até 30/08/2026 (~6 semanas) — licenciador (ART/RRT) com experiência Jardins/CONPRESP JÁ; (2) ANUÊNCIA PATRIMONIAL (perímetro tombado — o órgão pode negar/exigir adequações); (3) art. 3º: restrições convencionais do loteamento a levantar. Tese TJSP contra IPTU retroativo: a confirmar pelo advogado. Custos: taxas + eventual contrapartida (garagem computável) + projeto.
          </Text>
        </View>

        <View style={s.cenarioBox}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>C′ — Regularização parcial</Text>
            <Text style={s.cenarioAncora}>entre B e C</Text>
          </View>
          <Text style={s.cenarioText}>
            Fallback se a anistia indeferir algum trecho (ex.: item sem prova de anterioridade a 2014). Averba o que passar. Referência: o valor de conversa do ativo segue o maior entre a lente da casa e o residual indicativo do terreno ({mi(V6.terrenoResidual)}).
          </Text>
        </View>

        <View style={s.cenarioBox}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>D — Ponte comercial (em paralelo ao C)</Text>
            <Text style={s.cenarioAncora}>R$ 10,5–11M já · 12–14M depois</Text>
          </View>
          <Text style={s.cenarioText}>
            Se o proprietário quiser anunciar antes do Certificado de Regularização sair: âncora no terreno (residual indicativo {mi(V6.terrenoResidual)} + prêmio da casa aproveitável), reposicionando para casa regularizada ({faixaMi(V6.regularizadoAreaMin)}, até {mi(V6.regularizadoAreaMax.max)} conforme área do RT) quando a averbação concluir. Nunca expõe número indefensável.
          </Text>
        </View>

        <Text style={s.h2}>4. Árvore de decisão (rev. 14-Jul — pós-auditorias)</Text>
        <Bullet>1. IMEDIATO (~6 semanas p/ o prazo): contratar licenciador (ART/RRT) com experiência Jardins/CONPRESP → medição REAL do imóvel, teor das restrições do loteamento (art. 3º) e PROTOCOLO da Lei 17.202/2019 até 30/08/2026 (série de satélite do Anexo B = indício de anterioridade; prova formal é do RT).</Bullet>
        <Bullet>2. EM PARALELO: certidão atualizada → definição da representação (Dennis + 3 herdeiros / inventariante) e ABERTURA DO INVENTÁRIO de Ermantina → quitação/baixa da fiduciária → levantamento da penhora. Sem isso, nenhuma escritura sai em nenhum cenário.</Bullet>
        <Bullet>3. Anúncio: Cenário D (ponte, R$ 10,5–11M ancorado no terreno) enquanto o Certificado não sai; ao averbar → reposicionar para a faixa do Cenário C conforme a área confirmada.</Bullet>
        <Bullet>4. Se a anistia indeferir algum trecho → C′ (parcial); se o proprietário desistir de esperar → B (terreno, {mi(V6.terrenoResidual)}+).</Bullet>
        <Bullet>5. Invariantes: nunca ANUNCIAR nem ancorar negociação abaixo do residual indicativo ({mi(V6.terrenoResidual)}) enquanto a lente terreno não for recalibrada; nunca anunciar área construída acima de 441 m² sem averbação. (Expectativa de FECHAMENTO pós-deságio pode ficar abaixo da âncora — explicar a diferença ao cliente.)</Bullet>

        <Footer />
      </Page>

      {/* ============================ PÁGINA 3 ============================ */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>5. Posicionamento de anúncio por cenário</Text>
        <View style={s.table}>
          <View style={[s.tr, s.trHead]}>
            <Text style={[s.th, { width: POS_W.cen }]}>Cenário</Text>
            <Text style={[s.th, { width: POS_W.man }]}>Manchete do anúncio</Text>
            <Text style={[s.th, { width: POS_W.area }]}>Área citada</Text>
            <Text style={[s.th, { width: POS_W.anuncio, textAlign: 'right' }]}>Anúncio</Text>
            <Text style={[s.th, { width: POS_W.fech, textAlign: 'right' }]}>Fechamento esp.*</Text>
          </View>
          <View style={s.tr}>
            <Text style={[s.tdStrong, { width: POS_W.cen }]}>B / D</Text>
            <Text style={[s.td, { width: POS_W.man }]}>Terreno 1.050 m² nos Jardins, 21 m de frente — casa ampla aproveitável</Text>
            <Text style={[s.td, { width: POS_W.area }]}>441 m² averbados + terreno</Text>
            <Text style={[s.td, { width: POS_W.anuncio, textAlign: 'right' }]}>R$ 10,5–11M</Text>
            <Text style={[s.td, s.green, { width: POS_W.fech, textAlign: 'right' }]}>~R$ 9,2–9,6M</Text>
          </View>
          <View style={s.tr}>
            <Text style={[s.tdStrong, { width: POS_W.cen }]}>C</Text>
            <Text style={[s.td, { width: POS_W.man }]}>Casa regularizada em terreno de 1.050 m² (área conforme medição do RT)</Text>
            <Text style={[s.td, { width: POS_W.area }]}>nova área averbada</Text>
            <Text style={[s.td, { width: POS_W.anuncio, textAlign: 'right' }]}>R$ 11,6–13,2M**</Text>
            <Text style={[s.td, s.green, { width: POS_W.fech, textAlign: 'right' }]}>~R$ 10,1–11,6M</Text>
          </View>
        </View>
        <Text style={[s.paragraph, { fontSize: 7, color: COLORS.cinzaClaro, marginTop: 3 }]}>
          * Fechamento esperado aplica o deságio medido da amostra ({V6.desagioMedidoPct}% entre pedido e fechado) — ATENÇÃO: deriva de apenas N=2 pares anúncio↔venda (−14,96% e −10,47%), indicativo e não estatística. Política adotada: o residual indicativo (R$ 9,62M) é âncora mínima de ANÚNCIO/negociação; a expectativa de fechamento pode ficar abaixo dela.
          {'\n'}** Anúncio C = topo da faixa de mercado da área correspondente (área mín. 715 m² → teto se RT confirmar ~817 m²), na MESMA base do laudo (redutor −15% declarado). Valores são leitura estratégica — a âncora comercial oficial é decisão da consultora com a supervisão (H-3; âncoras do v4 suspensas).
        </Text>

        <Text style={s.h2}>6. Roteiro da conversa com o proprietário</Text>
        <Bullet>{'"'}Sua casa anunciada por 800 m² não para em pé no cartório — o documento diz 441 m², e isso derruba o valor defensável da casa para ~R$ 6–7M na régua do laudo.{'"'}</Bullet>
        <Bullet>{'"'}MAS o seu terreno tem uma referência de ~R$ 9,6M para quem constrói (estimativa de incorporação a refinar com o especialista) — é a nossa âncora mínima de anúncio e negociação.{'"'}</Bullet>
        <Bullet>{'"'}A boa notícia: imagens de satélite de 2013 indicam FORTEMENTE que a área extra já existia antes de 2014 — ela tende a caber na LEI DE ANISTIA, a única porta para averbar (a projeção está bem acima do que a lei atual permite). Quem confirma é o arquiteto responsável, e há três condições: protocolo até 30 de agosto, anuência do patrimônio (bairro tombado) e as regras do loteamento. Há ainda uma tese no TJSP que pode afastar o IPTU retroativo — nosso advogado confirma.{'"'}</Bullet>
        <Bullet>{'"'}O plano: contratamos o arquiteto e protocolamos a anistia JÁ; em paralelo, resolvemos o inventário da sua mãe e a baixa do banco (sem isso não há escritura de venda); anunciamos ancorado no terreno (~R$ 10,5–11M) e, averbada a área, reposicionamos para a faixa da casa regularizada.{'"'}</Bullet>

        <Text style={s.h2}>7. Próximos passos (ordem de urgência)</Text>
        <Bullet>URGENTE (~6 semanas): contratar arquiteto/licenciador COM EXPERIÊNCIA EM JARDINS/CONPRESP → medição real do imóvel + teor das restrições convencionais do loteamento (art. 3º) + prova formal de anterioridade (aerofotos oficiais, IPTU antigo; Anexo B = indício) + PROTOCOLO da Lei 17.202/2019 até 30/08/2026. Verificar Res. CONPRESP 07/2004 (possível delegação) e o instrumento vigente da prorrogação do prazo.</Bullet>
        <Bullet>Representação e sucessão: definir quem assina (Dennis + 3 herdeiros / inventariante / procurações) e abrir o inventário de Ermantina — pré-requisito de escritura em qualquer cenário.</Bullet>
        <Bullet>Certidão de matrícula atualizada (a analisada é de 01/2023; fiduciária venceu 04/2025 — pode já estar quitada sem baixa averbada).</Bullet>
        <Bullet>Termo de quitação do Banco Máxima + situação da execução fiscal (penhora de 50%).</Bullet>
        <Bullet>Advogado tributário: tese TJSP (anistia × IPTU retroativo) + ITCMD/multa do inventário.</Bullet>
        <Bullet>Definição da âncora comercial oficial com a supervisão (este material) e posicionamento do anúncio-ponte.</Bullet>

        <View style={s.validacaoBox}>
          <Text style={s.validacaoTitle}>Validação — Supervisão RE/MAX Galeria</Text>
          <Text style={s.validacaoLinha}>Estratégia aprovada (cenário): ______________________________  Âncora de anúncio: ______________________</Text>
          <Text style={s.validacaoLinha}>Assinatura ({CONSULTORA.nome}): ______________________________  Data: ______ / ______ / ________</Text>
          <Text style={[s.paragraph, { fontSize: 7, color: COLORS.cinzaClaro, marginBottom: 0 }]}>
            Base técnica: LAUDO-ACM-Honduras-v6.1 (dataset ITBI congelado; mediana homogeneizada FipeZap; redutor de estado −15% declarado) · matrícula 116.360 (4º RI-SP) · cadastro fiscal PMSP/GeoSampa (SQL 014.071.0030-0) · dossiê consolidado 14-Jul + 3 auditorias adversariais. Medições por satélite são aproximações não oficiais (faixa 715–817 m²; medição do RT decide).
          </Text>
        </View>

        <Footer />
      </Page>

      {/* ============ ANEXO A (atual) + ANEXO B (histórico 2013) — 4 páginas ============ */}
      {[
        { titulo: 'Anexo A — Medições por satélite (imagem ~05/2024)', grupo: ANEXOS_A.slice(0, 3), intro: 'Medições realizadas pelo operador sobre imagem de satélite atual. São APROXIMAÇÕES não oficiais: o satélite mede projeção de telhado — beirais inflam a medida e pavimentos superiores não aparecem. Servem como evidência física da divergência com a área averbada (441 m²), nunca como base de valor.' },
        { titulo: 'Anexo A — continuação', grupo: ANEXOS_A.slice(3), intro: null },
        { titulo: 'Anexo B — Série histórica: imagem de 08/09/2013', grupo: ANEXOS_B.slice(0, 3), intro: 'Mesmos polígonos medidos sobre a imagem HISTÓRICA de 08/09/2013 (Google Earth): pegada coberta equivalente à atual — INDÍCIO VISUAL FORTE de conclusão anterior a 31/07/2014, o corte da Lei 17.202/2019 (anistia; protocolo até 30/08/2026). A imagem não prova identidade das estruturas (reconstruções no mesmo footprint são possíveis); a prova formal de anterioridade é montada pelo responsável técnico no protocolo (aerofotos oficiais, IPTU antigo).' },
        { titulo: 'Anexo B — continuação', grupo: ANEXOS_B.slice(3), intro: null },
      ].map((pagina, pg) => (
        <Page key={pg} size="A4" style={s.page}>
          <Text style={s.h2}>{pagina.titulo}</Text>
          {pagina.intro ? (
            <Text style={[s.paragraph, { fontSize: 7.5, color: COLORS.cinzaClaro }]}>{pagina.intro}</Text>
          ) : null}
          {pagina.grupo.map((a) => (
            <View key={a.file} wrap={false}>
              {/* data URL: em node, src string vira fetch (falha em path local) — lição do mapa */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image
                src={`data:image/png;base64,${readFileSync(path.join(anexoDir, a.file)).toString('base64')}`}
                style={s.anexoImg}
              />
              <Text style={s.anexoCaption}>{a.caption}</Text>
            </View>
          ))}
          <Footer />
        </Page>
      ))}

      {/* ============ ANEXO C — CANAL OFICIAL DA ANISTIA (1 página) ============ */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Anexo C — Canal oficial da regularização (Lei 17.202/2019)</Text>
        <Text style={[s.paragraph, { fontSize: 7.5, color: COLORS.cinzaClaro }]}>
          Verificado em 13-Jul-2026 na letra da lei (arts. 3º/4º/9º/13) e no canal oficial (Portal de Licenciamento + Meu Imóvel Regular). Detalhamento completo: docs/acm/honduras-629/REGULARIZACAO-CAMINHO-E-PASSIVO-20260713.md §6.
        </Text>

        <View style={s.fichaBox}>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Onde protocolar (100% digital; acompanhamento no próprio sistema)</Text>
            <Text style={s.fichaValue}>portaldelicenciamento.prefeitura.sp.gov.br</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Orientação oficial e manuais por modalidade</Text>
            <Text style={s.fichaValue}>meuimovelregular.prefeitura.sp.gov.br</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Prazo final de protocolo (Lei 18.375/2025)</Text>
            <Text style={[s.fichaValue, { color: COLORS.vermelho }]}>30/08/2026</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Modalidade provável do caso (residencial ≤ 1.500 m² concluída até 31/07/2014)</Text>
            <Text style={s.fichaValue}>DECLARATÓRIA</Text>
          </View>
          <View style={[s.fichaRow, { borderBottomWidth: 0 }]}>
            <Text style={s.fichaLabel}>Imóvel em perímetro tombado (art. 4º, I)</Text>
            <Text style={s.fichaValue}>regularizável COM anuência prévia</Text>
          </View>
        </View>

        <Text style={s.h3}>Documentos tipicamente exigidos no protocolo (art. 9º + manuais)</Text>
        <Bullet>Requerimento eletrônico com declaração de responsabilidade (proprietário + responsável técnico).</Bullet>
        <Bullet>Matrícula do imóvel — usar certidão ATUALIZADA (a analisada é de 01/2023).</Bullet>
        <Bullet>Peças gráficas do estado atual (plantas, cortes, quadro de áreas) com RRT/ART — medição REAL pelo responsável técnico (declaração falsa anula o certificado; as medições por satélite deste dossiê são apenas evidência auxiliar).</Bullet>
        <Bullet>Atestado técnico de higiene, segurança de uso, estabilidade, habitabilidade e salubridade (art. 1º).</Bullet>
        <Bullet>Prova de anterioridade a 31/07/2014: aerofotos oficiais (ortofotos GeoSampa), IPTU/lançamentos antigos, fotos — Anexo B como apoio.</Bullet>
        <Bullet>Recolhimentos: preço público de R$ 10,00/m² a regularizar + taxa administrativa + ISS da obra.</Bullet>
        <Bullet>Anuência patrimonial (CONPRESP/DPH): dossiê próprio — levantamento fotográfico, estudo/justificativa técnica, implantação.</Bullet>

        <Text style={s.h3}>Custos estimados (ordem de grandeza — licenciador confirma)</Text>
        <Bullet>Preço público: ~274–376 m² a regularizar (conforme medição do RT) × R$ 10 ≈ R$ 2,7–3,8 mil. Outorga onerosa tende a ZERO (CA 1,0 × 1.050 m² tem folga); exceção: garagem computável acima dos limites legais pode gerar contrapartida (fator 1,2 sobre o trecho).</Bullet>
        <Bullet>ISS da obra + taxas + honorários do RT/licenciador + dossiê de anuência — total provável em dezenas de milhares de reais, contra R$ 4–5,6M de valor destravado.</Bullet>

        <View style={[s.cenarioBox, s.cenarioBoxNo, { marginTop: 8 }]}>
          <Text style={[s.cenarioTitle, { color: COLORS.vermelho, marginBottom: 3 }]}>Dois alertas da letra da lei (não confiar no FAQ)</Text>
          <Text style={s.cenarioText}>
            1) O FAQ oficial sugere que área tombada {'"'}não pode{'"'} — a LEI diz o contrário: o art. 4º, I admite a regularização MEDIANTE anuência prévia do órgão de patrimônio (a exclusão é só da modalidade automática). 2) O art. 3º VEDA a regularização de edificação que desrespeite RESTRIÇÕES CONVENCIONAIS DE LOTEAMENTO — a anistia perdoa o zoneamento, não o contrato do loteamento. Como o lote é de loteamento com restrições ({'"'}Companhia Imóveis e Construções{'"'} na matrícula), obter o teor dessas restrições é o item nº 1 do estudo de viabilidade.
          </Text>
        </View>

        <Text style={[s.paragraph, { fontSize: 7, color: COLORS.cinzaClaro, marginTop: 6 }]}>
          Pós-deferimento: Certificado de Regularização → averbação no 4º RI (INSS por decadência p/ obra &gt;5 anos) → atualização do IPTU com a proteção da jurisprudência TJSP contra cobrança retroativa na anistia.
        </Text>

        <Footer />
      </Page>
    </Document>
  )
}

/** Grava o arquivo; se estiver aberto no visualizador (EBUSY), usa sufixo -revN. */
function escreverComFallback(destino: string, dados: Buffer): string {
  for (let rev = 0; ; rev++) {
    const alvo = rev === 0 ? destino : destino.replace(/(\.pdf)$/i, `-rev${rev + 1}$1`)
    try {
      writeFileSync(alvo, dados)
      return alvo
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EBUSY' || rev >= 9) throw err
    }
  }
}

const repoRoot = path.resolve(scriptDir, '..', '..', '..')
const outDir = path.join(repoRoot, 'docs', 'acm', 'honduras-629')
mkdirSync(outDir, { recursive: true })
const hoje = new Date().toISOString().slice(0, 10)

async function main(): Promise<void> {
  const buf = await renderToBuffer(
    <CenariosDocument dataEmissao={new Date().toLocaleDateString('pt-BR')} />,
  )
  const pdfPath = escreverComFallback(
    path.join(outDir, `CENARIOS-ESTRATEGIA-Honduras629-REMAX-${hoje}.pdf`),
    buf,
  )
  console.log(`PDF: ${pdfPath} (${(buf.length / 1024).toFixed(0)} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
