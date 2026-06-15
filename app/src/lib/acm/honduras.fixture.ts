/**
 * Fixture de regressão — caso Rua Honduras (Jardim América/SP).
 * Extraído de `docs/reference/acm-honduras/LAUDO_ACM_Rua_Honduras_RE-MAX_v4_NOVO.pdf`
 * Sec. 5 (23 vendas ITBI) + Sec. 7 (Top 5 com terreno/distância) + Sec. 7.1 (deságio).
 *
 * Trava os números-chave da metodologia (Story 8.2 AC5). NÃO editar sem reconferir
 * contra o PDF — é a âncora de fidelidade ao método validado.
 */
import type { AcmComparable, AcmTarget, ResidualLandParams } from './methodology'

export const HONDURAS_TARGET: AcmTarget = {
  areaConstruida: 800,
  areaTerreno: 1000,
}

/** As 23 vendas reais ITBI no raio de 1.000 m. Os 5 Top têm terreno+distância. */
export const HONDURAS_COMPARAVEIS: AcmComparable[] = [
  // Top 5 (Laudo Sec. 7 — com terreno e distância)
  { endereco: 'R. Maestro Chiaffarelli, 86', areaConstruida: 466, areaTerreno: 1058, distancia: 166, preco: 6_500_000, isVendaReal: true },
  { endereco: 'R. Marechal Bitencourt, 101', areaConstruida: 969, areaTerreno: 488, distancia: 634, preco: 17_000_000, precoPedido: 19_990_000, isVendaReal: true },
  { endereco: 'R. Cons. Torres Homem, 399', areaConstruida: 532, areaTerreno: 585, distancia: 591, preco: 7_700_000, precoPedido: 8_600_000, isVendaReal: true },
  { endereco: 'R. Henrique Martins', areaConstruida: 911, areaTerreno: 585, distancia: 934, preco: 19_700_000, isVendaReal: true },
  { endereco: 'R. Canadá, 111', areaConstruida: 507, areaTerreno: 822, distancia: 716, preco: 9_260_000, isVendaReal: true },
  // Demais 18 (Laudo Sec. 5 — área construída + valor)
  { endereco: 'R. Groenlândia, 1235', areaConstruida: 550, preco: 10_000_000, isVendaReal: true },
  { endereco: 'R. Chile, 113', areaConstruida: 490, preco: 8_800_000, isVendaReal: true },
  { endereco: 'R. Cons. Torres Homem, 228', areaConstruida: 498, preco: 8_500_000, isVendaReal: true },
  { endereco: 'R. Marechal Bitencourt, 588', areaConstruida: 404, preco: 8_000_000, isVendaReal: true },
  { endereco: 'R. Holanda, 328', areaConstruida: 400, preco: 8_000_000, isVendaReal: true },
  { endereco: 'R. Marechal Bitencourt, 432', areaConstruida: 388, preco: 8_000_000, isVendaReal: true },
  { endereco: 'R. Cuba, 110', areaConstruida: 411, preco: 7_700_000, isVendaReal: true },
  { endereco: 'R. Maestro Elias Lobo, 921', areaConstruida: 396, preco: 6_850_000, isVendaReal: true },
  { endereco: 'Av. Nove de Julho, 5144', areaConstruida: 340, preco: 6_800_000, isVendaReal: true },
  { endereco: 'R. Cons. Torres Homem, 462', areaConstruida: 344, preco: 6_598_017, isVendaReal: true },
  { endereco: 'R. Marechal Bitencourt, 473', areaConstruida: 431, preco: 6_500_000, isVendaReal: true },
  { endereco: 'R. Marina Cintra, 57', areaConstruida: 310, preco: 6_400_000, isVendaReal: true },
  { endereco: 'R. Martinica, 49', areaConstruida: 386, preco: 6_300_000, isVendaReal: true },
  { endereco: 'R. Gal. Fonseca Teles, 347', areaConstruida: 290, preco: 5_300_000, isVendaReal: true },
  { endereco: 'R. Veneza, 287', areaConstruida: 441, preco: 5_280_000, isVendaReal: true },
  { endereco: 'R. Madre Teodora, 259', areaConstruida: 300, preco: 5_250_000, isVendaReal: true },
  { endereco: 'R. Antônio Bento, 332', areaConstruida: 209, preco: 5_076_000, isVendaReal: true },
  { endereco: 'R. Antônio Bento, 589', areaConstruida: 260, preco: 5_050_000, isVendaReal: true },
]

/** Fatores de liquidez/condição do laudo (Sec. 2): exposição, regularização, Capex, liquidez. */
export const HONDURAS_FATORES_LIQUIDEZ = [0.07, 0.05, 0.03, 0.04]

/** Parâmetros do valor residual do terreno (Laudo Sec. 8b). Resultado esperado: R$ 9.624.000. */
export const HONDURAS_RESIDUAL: ResidualLandParams = {
  vgvPerM2: 34_000,
  areaNova: 800,
  custoObraPerM2: 10_500,
  demolicao: 200_000,
  comercializacaoPct: 0.08,
  custoFinanceiroPct: 0.05,
  margemPct: 0.20,
}
