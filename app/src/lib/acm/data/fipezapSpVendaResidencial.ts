/**
 * Série oficial FipeZap — São Paulo · venda · residencial (Número-Índice, coluna
 * "Total") — Story 9.12 (ingestão H-1 do roadmap ACM; mecanismo na Story 9.11).
 *
 * Fonte (Art. IV — No Invention):
 *   Planilha oficial de séries históricas do Índice FipeZap
 *   https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx
 *   (portal: fipezap.zapimoveis.com.br), baixada em 07-Jul-2026.
 *   Aba "São Paulo" → bloco "Imóveis residenciais / Venda / Número-Índice" →
 *   coluna "Total", linhas 202401→202606 (última competência publicada).
 *
 * Valores arredondados a 4 casas decimais (a deflação usa apenas RAZÕES entre
 * pontos — erro relativo < 3e-6, irrelevante para valores em R$).
 * NÃO editar manualmente: re-extrair da planilha oficial ao estender a série.
 */
import type { IndiceMensalPonto } from '../methodology'

/** Metadados de rastreabilidade da série (impressos nos artefatos quando útil). */
export const FIPEZAP_SP_FONTE = {
  indice: 'FipeZap',
  recorte: 'São Paulo · venda · residencial (Número-Índice Total)',
  url: 'https://downloads.fipe.org.br/indices/fipezap/fipezap-serieshistoricas.xlsx',
  aba: 'São Paulo',
  coluna: 'Venda / Número-Índice / Total',
  extraidoEm: '2026-07-07',
} as const

/** Última competência publicada na série (referência default da deflação). */
export const FIPEZAP_SP_ULTIMA_COMPETENCIA = '2026-06'

export const FIPEZAP_SP_VENDA_RESIDENCIAL: IndiceMensalPonto[] = [
  { mes: '2024-01', indice: 252.6317 },
  { mes: '2024-02', indice: 253.4876 },
  { mes: '2024-03', indice: 254.7723 },
  { mes: '2024-04', indice: 256.2862 },
  { mes: '2024-05', indice: 258.1186 },
  { mes: '2024-06', indice: 259.8976 },
  { mes: '2024-07', indice: 261.4531 },
  { mes: '2024-08', indice: 263.0754 },
  { mes: '2024-09', indice: 264.4707 },
  { mes: '2024-10', indice: 265.9037 },
  { mes: '2024-11', indice: 267.1228 },
  { mes: '2024-12', indice: 268.4653 },
  { mes: '2025-01', indice: 269.558 },
  { mes: '2025-02', indice: 270.6067 },
  { mes: '2025-03', indice: 271.1933 },
  { mes: '2025-04', indice: 271.9443 },
  { mes: '2025-05', indice: 272.6708 },
  { mes: '2025-06', indice: 273.9243 },
  { mes: '2025-07', indice: 275.2891 },
  { mes: '2025-08', indice: 276.4755 },
  { mes: '2025-09', indice: 277.8788 },
  { mes: '2025-10', indice: 279.1244 },
  { mes: '2025-11', indice: 280.2787 },
  { mes: '2025-12', indice: 280.7054 },
  { mes: '2026-01', indice: 281.1376 },
  { mes: '2026-02', indice: 281.8396 },
  { mes: '2026-03', indice: 283.0249 },
  { mes: '2026-04', indice: 283.5733 },
  { mes: '2026-05', indice: 284.2069 },
  { mes: '2026-06', indice: 284.431 },
]
