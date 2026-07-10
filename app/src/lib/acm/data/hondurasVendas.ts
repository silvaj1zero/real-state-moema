/**
 * Dados reais de venda + bairro verificado dos 23 comparáveis do caso Honduras —
 * Story 9.12 (ingestão H-1; ativa o mecanismo de homogeneização da Story 9.11).
 *
 * Fontes (Art. IV — No Invention), consultadas em 07-Jul-2026:
 *   - `dataTransacao`/`sql`: dados abertos SF/PMSP "Dados das Transações
 *     Imobiliárias com recolhimento de ITBI" (guias pagas, arquivos anuais
 *     2024/2025/2026 — prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501).
 *     Cada registro casa logradouro+número+valor+área constr./terreno com a guia
 *     de natureza "1.Compra e venda"; nos Top 5 o SQL do laudo confere 5/5.
 *   - `cep`/`bairroReal`: ViaCEP (base Correios), por logradouro e faixa de
 *     numeração; corroborado pelo campo CEP da própria guia ITBI (23/23).
 *
 * O rótulo do laudo v4 ("Jardim América" para todos) estava incorreto em 18/23 —
 * composição real: 16× Jardim Paulista, 5× Jardim América, 2× Jardim Europa.
 * O próprio ALVO (Rua Honduras, 629 → CEP 01428-000) é Jardim Paulista.
 */
import type { AcmComparable, HomogeneizacaoOptions } from '../methodology'
import { HONDURAS_COMPARAVEIS } from '../honduras.fixture'
import {
  FIPEZAP_SP_FONTE,
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
  FIPEZAP_SP_VENDA_RESIDENCIAL,
} from './fipezapSpVendaResidencial'

export interface HondurasVendaRegistro {
  /** Chave de merge — idêntico ao `endereco` do fixture (`honduras.fixture.ts`). */
  endereco: string
  /** SQL (Setor/Quadra/Lote) da guia ITBI — consultável no GeoSampa. */
  sql: string
  /** Data de Transação da guia ITBI (YYYY-MM-DD). */
  dataTransacao: string
  /** Competência 'YYYY-MM' — formato consumido por `deflacionarComparaveis`. */
  dataVenda: string
  /** CEP oficial do logradouro (faixa de numeração quando aplicável). */
  cep: string
  /** Bairro real via CEP (ViaCEP/Correios). */
  bairroReal: 'Jardim Paulista' | 'Jardim América' | 'Jardim Europa'
  /** Divergências e achados da ingestão (dupla guia, rótulos IPTU, etc.). */
  observacao?: string
}

export const HONDURAS_VENDAS: HondurasVendaRegistro[] = [
  // Top 5 (SQL já constava no laudo Sec. 7.1 — conferido contra a guia ITBI)
  {
    endereco: 'R. Maestro Chiaffarelli, 86',
    sql: '1407200046',
    dataTransacao: '2024-08-09',
    dataVenda: '2024-08',
    cep: '01432-030',
    bairroReal: 'Jardim Paulista',
    observacao: 'Grafia ITBI: "R MAEST CHIAFFARELLI". Áreas 466/1.058 m² batem com o laudo.',
  },
  {
    endereco: 'R. Marechal Bitencourt, 101',
    sql: '1613200226',
    dataTransacao: '2024-07-17',
    dataVenda: '2024-07',
    cep: '01432-020',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Cons. Torres Homem, 399',
    sql: '1608500314',
    dataTransacao: '2024-04-24',
    dataVenda: '2024-04',
    cep: '01432-010',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Henrique Martins',
    sql: '3609200431',
    dataTransacao: '2024-06-07',
    dataVenda: '2024-06',
    cep: '01435-010',
    bairroReal: 'Jardim Paulista',
    observacao: 'Guia sem número oficial (99999, complemento "nº 394"); 911/585 m² batem.',
  },
  {
    endereco: 'R. Canadá, 111',
    sql: '1405400056',
    dataTransacao: '2025-10-01',
    dataVenda: '2025-10',
    cep: '01436-000',
    bairroReal: 'Jardim América',
  },
  // Demais 18 — SQL e data recuperados da guia ITBI nesta ingestão
  {
    endereco: 'R. Groenlândia, 1235',
    sql: '1601100132',
    dataTransacao: '2026-03-03',
    dataVenda: '2026-03',
    cep: '01434-100',
    bairroReal: 'Jardim América',
    observacao: 'CEP da faixa 951/952 ao fim. Guia publicada na aba FEV-2026 com data 03/03/2026.',
  },
  {
    endereco: 'R. Chile, 113',
    sql: '1602200025',
    dataTransacao: '2025-11-22',
    dataVenda: '2025-11',
    cep: '01436-050',
    bairroReal: 'Jardim América',
    observacao:
      'Duas guias de compra e venda em nov/2025 (R$ 6.250.000 em 06/11 e R$ 8.800.000 em 22/11); o laudo adota a mais recente — mesma decisão do material didático (Parte 4, #9).',
  },
  {
    endereco: 'R. Cons. Torres Homem, 228',
    sql: '1611300053',
    dataTransacao: '2026-02-19',
    dataVenda: '2026-02',
    cep: '01432-010',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Marechal Bitencourt, 588',
    sql: '1607300044',
    dataTransacao: '2025-02-06',
    dataVenda: '2025-02',
    cep: '01432-020',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Holanda, 328',
    sql: '1602000182',
    dataTransacao: '2024-09-12',
    dataVenda: '2024-09',
    cep: '01446-030',
    bairroReal: 'Jardim Europa',
    observacao: 'Há cessão parcial (50%) anterior em mar/2024; a compra e venda integral é a de set/2024.',
  },
  {
    endereco: 'R. Marechal Bitencourt, 432',
    sql: '1608700046',
    dataTransacao: '2025-11-26',
    dataVenda: '2025-11',
    cep: '01432-020',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Cuba, 110',
    sql: '1602600155',
    dataTransacao: '2024-12-04',
    dataVenda: '2024-12',
    cep: '01436-020',
    bairroReal: 'Jardim América',
  },
  {
    endereco: 'R. Maestro Elias Lobo, 921',
    sql: '1606700243',
    dataTransacao: '2024-05-06',
    dataVenda: '2024-05',
    cep: '01433-000',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'Av. Nove de Julho, 5144',
    sql: '1603100040',
    dataTransacao: '2025-09-22',
    dataVenda: '2025-09',
    cep: '01406-200',
    bairroReal: 'Jardim Paulista',
    observacao:
      'Cadastro IPTU rotula "Itaim Bibi"; o CEP oficial 01406-200 (faixa 4700+ lado par) é Jardim Paulista — mantido o critério CEP.',
  },
  {
    endereco: 'R. Cons. Torres Homem, 462',
    sql: '1608600149',
    dataTransacao: '2024-07-19',
    dataVenda: '2024-07',
    cep: '01432-010',
    bairroReal: 'Jardim Paulista',
    observacao: 'Há integralização de capital anterior (mar/2024, R$ 660.920); a compra e venda é a de jul/2024.',
  },
  {
    endereco: 'R. Marechal Bitencourt, 473',
    sql: '1608600238',
    dataTransacao: '2024-12-04',
    dataVenda: '2024-12',
    cep: '01432-020',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Marina Cintra, 57',
    sql: '1615900039',
    dataTransacao: '2024-09-06',
    dataVenda: '2024-09',
    cep: '01446-060',
    bairroReal: 'Jardim Europa',
  },
  {
    endereco: 'R. Martinica, 49',
    sql: '1602400016',
    dataTransacao: '2024-07-05',
    dataVenda: '2024-07',
    cep: '01436-030',
    bairroReal: 'Jardim América',
    observacao:
      'Mesmo SQL tem segunda compra e venda em 20/11/2024 por R$ 4.607.116; o laudo adota a de jul/2024 (R$ 6,3M). Registrado para revisão metodológica.',
  },
  {
    endereco: 'R. Gal. Fonseca Teles, 347',
    sql: '1606700464',
    dataTransacao: '2025-08-05',
    dataVenda: '2025-08',
    cep: '01433-020',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Veneza, 287',
    sql: '1409100146',
    dataTransacao: '2026-01-14',
    dataVenda: '2026-01',
    cep: '01429-010',
    bairroReal: 'Jardim Paulista',
    observacao: 'CEP da faixa até 499/500. A Rua Veneza inteira é Jardim Paulista (não Jardim América).',
  },
  {
    endereco: 'R. Madre Teodora, 259',
    sql: '1409300201',
    dataTransacao: '2025-09-25',
    dataVenda: '2025-09',
    cep: '01428-010',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Antônio Bento, 332',
    sql: '1608500071',
    dataTransacao: '2024-06-14',
    dataVenda: '2024-06',
    cep: '01432-000',
    bairroReal: 'Jardim Paulista',
  },
  {
    endereco: 'R. Antônio Bento, 589',
    sql: '1606800213',
    dataTransacao: '2024-06-27',
    dataVenda: '2024-06',
    cep: '01432-000',
    bairroReal: 'Jardim Paulista',
  },
]

/**
 * Bairro real do ALVO (Rua Honduras, 629): CEP 01428-000 (faixa até 1039/1040) =
 * Jardim Paulista — coerente com a nota do laudo Sec. 3 sobre a fronteira
 * JA/JP, mas contradiz o rótulo "Jardim América" da capa.
 */
export const HONDURAS_ALVO_CEP = {
  endereco: 'Rua Honduras, 629',
  cep: '01428-000',
  bairroReal: 'Jardim Paulista',
} as const

/**
 * Opções de homogeneização prontas para o caso Honduras (Story 9.11):
 * índice FipeZap SP venda residencial, referência = última competência publicada.
 */
export const HONDURAS_HOMOGENEIZACAO: HomogeneizacaoOptions = {
  indice: `${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte}`,
  serie: FIPEZAP_SP_VENDA_RESIDENCIAL,
  dataReferencia: FIPEZAP_SP_ULTIMA_COMPETENCIA,
}

/**
 * Comparáveis do fixture enriquecidos com `dataVenda` e `bairroReal` reais.
 * Merge estrito por `endereco`: registro sem par no fixture (ou vice-versa) é
 * erro de configuração — os dois arquivos devem cobrir exatamente os 23.
 */
export function hondurasComparaveisHomogeneizados(): AcmComparable[] {
  const porEndereco = new Map(HONDURAS_VENDAS.map((v) => [v.endereco, v]))
  if (porEndereco.size !== HONDURAS_COMPARAVEIS.length) {
    throw new Error(
      `HONDURAS_VENDAS (${porEndereco.size}) não cobre 1:1 os comparáveis do fixture (${HONDURAS_COMPARAVEIS.length})`,
    )
  }
  return HONDURAS_COMPARAVEIS.map((c) => {
    const venda = porEndereco.get(c.endereco)
    if (!venda) throw new Error(`Sem registro de venda para o comparável "${c.endereco}"`)
    return { ...c, dataVenda: venda.dataVenda, bairroReal: venda.bairroReal }
  })
}
