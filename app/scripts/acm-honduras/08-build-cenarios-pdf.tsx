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
const V6 = {
  construcaoDocumental: { min: 5_989_387, max: 7_145_136 },
  terrenoResidual: 9_624_000,
  regularizado: { min: 11_800_000, max: 14_000_000 }, // 736 × (15.978 → 19.061)
  pretendido: 12_000_000,
  desagioMedidoPct: -12.7,
  areaAverbada: 441,
  areaTerreno: 1050,
  projecaoFisica: 736,
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
const ANEXOS: ReadonlyArray<{ file: string; caption: string }> = [
  { file: 'a1-terreno-1046m2.png', caption: 'A.1 — Terreno: perímetro 143,47 m · área medida 1.046,3 m² (oficial: 1.050 m² — desvio 0,4%, valida a medição)' },
  { file: 'a2-terreno-vista2.png', caption: 'A.2 — Terreno (segunda vista, mesmo polígono de 1.046,3 m²)' },
  { file: 'a3-area-coberta-685m2.png', caption: 'A.3 — Área coberta principal (casa + gourmet): ~685 m² de projeção' },
  { file: 'a4-area-da-casa.png', caption: 'A.4 — Polígono da casa principal (perímetro ~104 m)' },
  { file: 'a5-garagem-coberta.png', caption: 'A.5 — Garagem coberta (estrutura aparentemente recente)' },
  { file: 'a6-cobertura-carros-30m2.png', caption: 'A.6 — Cobertura externa de veículos: 30,48 m² (conta como área construída pela projeção — Dec. 58.420/18)' },
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
            <Text style={s.fichaLabel}>Área física observada (visita + satélite — projeção coberta, NÃO oficial)</Text>
            <Text style={s.fichaValue}>~{V6.projecaoFisica} m²</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Área anunciada anteriormente (sem suporte em nenhuma fonte oficial)</Text>
            <Text style={s.fichaValue}>800 m²</Text>
          </View>
          <View style={s.fichaRow}>
            <Text style={s.fichaLabel}>Terreno oficial (matrícula = IPTU = medição por satélite)</Text>
            <Text style={s.fichaValue}>{V6.areaTerreno} m²</Text>
          </View>
          <View style={[s.fichaRow, { borderBottomWidth: 0 }]}>
            <Text style={s.fichaLabel}>Ônus a sanear antes de qualquer escritura</Text>
            <Text style={s.fichaValue}>Alienação fiduciária + penhora 50%</Text>
          </View>
        </View>
        <Text style={[s.paragraph, { fontSize: 7.5, color: COLORS.cinzaClaro, marginTop: 4 }]}>
          A área gourmet e a garagem coberta contam como área construída pelo critério municipal (Lei 10.235/86 / Dec. 58.420/18), mas não estão averbadas nem lançadas — exigem regularização municipal e cartorária. Certidão analisada: 01/2023 (pedir atualizada).
        </Text>

        <Text style={s.h2}>2. As três lentes de valor</Text>
        <View style={s.cardRow}>
          <View style={[s.card, s.cardWarn]}>
            <Text style={s.cardLabel}>Casa documental (441 m²)</Text>
            <Text style={s.cardValue}>{faixaMi(V6.construcaoDocumental)}</Text>
            <Text style={s.cardNota}>única base defensável hoje como casa</Text>
          </View>
          <View style={[s.card, s.cardHi]}>
            <Text style={s.cardLabel}>Terreno (piso real do ativo)</Text>
            <Text style={[s.cardValue, s.cardValueHi]}>{mi(V6.terrenoResidual)}</Text>
            <Text style={s.cardNota}>residual p/ reconstrução — independe de averbação</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Casa regularizada (~736 m²)</Text>
            <Text style={s.cardValue}>{faixaMi(V6.regularizado)}</Text>
            <Text style={s.cardNota}>só existe após regularização viável</Text>
          </View>
        </View>

        <View style={s.insightBox}>
          <Text style={s.insightText}>
            <Text style={s.strong}>A lente do terreno resgata o valor que a matrícula derrubou. </Text>
            O piso econômico do imóvel não é a casa documental — é o terreno de 1.050 m², porque o comprador que reconstrói paga pelo chão e não depende da averbação. O imóvel se reposiciona de {'"'}casa de 800 m²{'"'} (insustentável em documento) para <Text style={s.strong}>terreno premium nos Jardins com casa aproveitável</Text>. Os {mi(V6.pretendido)} pretendidos ficam entre o piso-terreno e o cenário regularizado: são a tese de regularização precificada — alcançáveis, mas só por um caminho.
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

        <View style={s.cenarioBox}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>C — Regularizar a área e vender como CASA</Text>
            <Text style={s.cenarioAncora}>{faixaMi(V6.regularizado)}</Text>
          </View>
          <Text style={s.cenarioText}>
            Captura máxima — envolve o valor pretendido. Cada m² regularizado ≈ R$ 19 mil de valor defensável, custo ordens de magnitude menor. Prazo 6–18 meses. Riscos: obras recentes ficam fora da anistia (Lei 17.202/2019 cobre só até 07/2014) → rito ordinário, e recuos/tombamento dos bairros-jardins podem derrubar parte. Exige estudo de viabilidade ANTES de prometer.
          </Text>
        </View>

        <View style={s.cenarioBox}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>C′ — Regularização parcial</Text>
            <Text style={s.cenarioAncora}>entre B e C</Text>
          </View>
          <Text style={s.cenarioText}>
            Averba o que passar na viabilidade (ex.: gourmet sim, garagem em recuo não). Regra invariante: o valor mínimo do ativo continua sendo o maior entre a lente da casa e o terreno ({mi(V6.terrenoResidual)}).
          </Text>
        </View>

        <View style={[s.cenarioBox, s.cenarioBoxHi]}>
          <View style={s.cenarioHead}>
            <Text style={s.cenarioTitle}>D — Híbrido (recomendado)</Text>
            <Text style={[s.cenarioAncora, { color: COLORS.verde }]}>R$ 10,5–11M já · 12–14M depois</Text>
          </View>
          <Text style={s.cenarioText}>
            Anunciar JÁ ancorado no terreno (piso {mi(V6.terrenoResidual)} + prêmio da casa aproveitável), com o estudo de viabilidade rodando em paralelo. Se a regularização confirmar, reposicionar o anúncio para casa de ~7xx m² na faixa 12–14M. Não perde tempo de mercado, não trava no risco, nunca expõe número indefensável.
          </Text>
        </View>

        <Text style={s.h2}>4. Árvore de decisão</Text>
        <Bullet>1. SEMPRE (qualquer cenário): certidão atualizada → quitação/baixa da alienação fiduciária → levantamento da penhora de 50%. Sem isso, nenhuma escritura sai.</Bullet>
        <Bullet>2. Estudo de viabilidade urbanística (arquiteto, ~30–60 dias): regulariza ≥ ~700 m² com custo/prazo aceitáveis e o proprietário pode esperar → Cenário C (alvo 12–14M). Regularização parcial → C′. Inviável ou pressa → Cenário B (terreno, venda rápida).</Bullet>
        <Bullet>3. Enquanto o estudo roda → Cenário D: anúncio ancorado no terreno (R$ 10,5–11M).</Bullet>
        <Bullet>4. Invariantes: nunca conversar abaixo de R$ 9,62M (piso terreno); nunca anunciar área construída acima de 441 m² sem averbação.</Bullet>

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
            <Text style={[s.td, { width: POS_W.man }]}>Casa ~7xx m² em terreno de 1.050 m² (área regularizada)</Text>
            <Text style={[s.td, { width: POS_W.area }]}>nova área averbada</Text>
            <Text style={[s.td, { width: POS_W.anuncio, textAlign: 'right' }]}>R$ 12,9–14M</Text>
            <Text style={[s.td, s.green, { width: POS_W.fech, textAlign: 'right' }]}>~R$ 11,3–12,2M</Text>
          </View>
        </View>
        <Text style={[s.paragraph, { fontSize: 7, color: COLORS.cinzaClaro, marginTop: 3 }]}>
          * Fechamento esperado aplica o deságio medido da amostra ({V6.desagioMedidoPct}% entre pedido e fechado). Valores de anúncio são leitura estratégica das lentes do laudo v6 — a âncora comercial oficial é decisão da consultora com a supervisão (política H-3; âncoras do laudo v4 suspensas no v6).
        </Text>

        <Text style={s.h2}>6. Roteiro da conversa com o proprietário</Text>
        <Bullet>{'"'}Sua casa anunciada por 800 m² não para em pé no cartório — o documento diz 441 m², e isso derruba o valor defensável da casa para ~R$ 6–7M.{'"'}</Bullet>
        <Bullet>{'"'}MAS o seu terreno sozinho vale ~R$ 9,6M para quem constrói — esse é o seu piso real, e ninguém deve conversar abaixo disso.{'"'}</Bullet>
        <Bullet>{'"'}Os R$ 12M que você quer existem num único caminho: regularizar a área construída. Precisamos de um estudo de viabilidade antes de prometer.{'"'}</Bullet>
        <Bullet>{'"'}Enquanto isso: anunciamos ancorado no terreno (~R$ 10,5–11M), saneamos a matrícula, e se a regularização passar, reposicionamos para 12–14M.{'"'}</Bullet>

        <Text style={s.h2}>7. Próximos passos</Text>
        <Bullet>Certidão de matrícula atualizada (a analisada é de 01/2023; fiduciária venceu 04/2025 — pode já estar quitada sem baixa averbada).</Bullet>
        <Bullet>Termo de quitação do Banco Máxima + situação da execução fiscal (penhora de 50%).</Bullet>
        <Bullet>Estudo de viabilidade de regularização com arquiteto (recuos/TO/CA + tombamento bairros-jardins).</Bullet>
        <Bullet>Definição da âncora comercial oficial com a supervisão (este material) e reposicionamento do anúncio.</Bullet>

        <View style={s.validacaoBox}>
          <Text style={s.validacaoTitle}>Validação — Supervisão RE/MAX Galeria</Text>
          <Text style={s.validacaoLinha}>Estratégia aprovada (cenário): ______________________________  Âncora de anúncio: ______________________</Text>
          <Text style={s.validacaoLinha}>Assinatura ({CONSULTORA.nome}): ______________________________  Data: ______ / ______ / ________</Text>
          <Text style={[s.paragraph, { fontSize: 7, color: COLORS.cinzaClaro, marginBottom: 0 }]}>
            Base técnica: LAUDO-ACM-Honduras-v6-2026-07-13 (dataset ITBI congelado, mediana homogeneizada FipeZap) · matrícula 116.360 (4º RI-SP) · cadastro fiscal PMSP/GeoSampa (SQL 014.071.0030-0). Medições por satélite são aproximações não oficiais.
          </Text>
        </View>

        <Footer />
      </Page>

      {/* ==================== ANEXO A — SATÉLITE (2 páginas) ==================== */}
      {[ANEXOS.slice(0, 3), ANEXOS.slice(3)].map((grupo, pg) => (
        <Page key={pg} size="A4" style={s.page}>
          <Text style={s.h2}>
            Anexo A — Medições por satélite (Google Earth, 13-Jul-2026){pg === 1 ? ' — continuação' : ''}
          </Text>
          {pg === 0 ? (
            <Text style={[s.paragraph, { fontSize: 7.5, color: COLORS.cinzaClaro }]}>
              Medições realizadas pelo operador sobre imagem de satélite (~05/2024). São APROXIMAÇÕES não oficiais:
              o satélite mede projeção de telhado — beirais inflam a medida e pavimentos superiores não aparecem.
              Servem como evidência física da divergência com a área averbada (441 m²), nunca como base de valor.
            </Text>
          ) : null}
          {grupo.map((a) => (
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
