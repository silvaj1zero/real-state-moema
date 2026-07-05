/**
 * Dataset enriquecido do caso Rua Honduras, 629 — para o documento de validação
 * do corretor. TODA linha traça à fonte (Art. IV — No Invention):
 *
 *   - Base (endereço, área constr., terreno Top5, distância Top5, preço, preço pedido):
 *     `app/src/lib/acm/honduras.fixture.ts` (extraída do laudo oficial).
 *   - S/V/D (suítes/vagas/dorm) e R$/m² de terreno por item:
 *     LAUDO_ACM_Rua_Honduras_RE-MAX_v4_NOVO.pdf, Seção 5.
 *   - SQL cadastral, status, fonte/anúncio (Top 5):
 *     LAUDO ... Seção 7.1.
 *   - Ofertas ativas (à venda): LAUDO ... Seções 3 e 5 (linhas ANUN-*).
 *
 * Valores ausentes na fonte ficam null → exibidos como "—". Nunca inventados.
 * Alvo: Rua Honduras, 629 — Jardim América/SP — 800 m² constr / 1000 m² terreno /
 * 4 dorm · 2 suítes · 10 vagas / Score B (LAUDO, capa + Seção 1).
 */

export const TARGET = {
  endereco: 'Rua Honduras, 629',
  bairro: 'Jardim América',
  cidade: 'São Paulo',
  uf: 'SP',
  areaConstruida: 800,
  areaTerreno: 1000,
  dormitorios: 4,
  suites: 2,
  vagas: 10,
  scoreAlvo: 'B',
  precoPretendido: 12_000_000,
  precoPedidoReal: 10_500_000,
  valorMercadoACM: 12_400_000,
  faixaFechamento: { min: 10_000_000, max: 10_500_000 },
  geocodeQuery: 'Rua Honduras, 629, Jardim America, Sao Paulo, SP, Brasil',
}

/**
 * Os 23 comparáveis ITBI reais (raio 1.000 m). `areaTerreno`/`dist` só nos Top 5
 * (fixture/Laudo Sec. 7); demais null. `svd` = {s:suítes, v:vagas, d:dorm} ou null.
 */
export const COMPARAVEIS = [
  { ref: 'PMSP-0046', end: 'R. Maestro Chiaffarelli, 86', bairro: 'Jardim América', areaConstruida: 466, areaTerreno: 1058, dist: 166, preco: 6_500_000, precoPedido: null, svd: { s: 3, v: 4, d: 4 }, m2c: 13_948, m2t: 6_144, sql: '1407200046', status: 'off-market', fonteRef: 'ITBImap (consulta SQL no GeoSampa)', anuncioUrl: null },
  { ref: 'PMSP-0226', end: 'R. Marechal Bitencourt, 101', bairro: 'Jardim América', areaConstruida: 969, areaTerreno: 488, dist: 634, preco: 17_000_000, precoPedido: 19_990_000, svd: { s: 4, v: 6, d: 5 }, m2c: 17_544, m2t: 34_836, sql: '1613200226', status: 'anúncio confirmado', fonteRef: 'Esquema Imóveis (ref. 6254)', anuncioUrl: null },
  { ref: 'PMSP-0314', end: 'R. Cons. Torres Homem, 399', bairro: 'Jardim América', areaConstruida: 532, areaTerreno: 585, dist: 591, preco: 7_700_000, precoPedido: 8_600_000, svd: { s: 5, v: 4, d: 4 }, m2c: 14_474, m2t: 13_162, sql: '1608500314', status: 'anúncio confirmado', fonteRef: 'Chaves na Mão (id 33434912)', anuncioUrl: null },
  { ref: 'PMSP-0431', end: 'R. Henrique Martins', bairro: 'Jardim América', areaConstruida: 911, areaTerreno: 585, dist: 934, preco: 19_700_000, precoPedido: null, svd: { s: 4, v: 6, d: 5 }, m2c: 21_625, m2t: 33_675, sql: '3609200431', status: 'off-market', fonteRef: 'Chaves na Mão (listagem da rua)', anuncioUrl: null },
  { ref: 'PMSP-0056', end: 'R. Canadá, 111', bairro: 'Jardim América', areaConstruida: 507, areaTerreno: 822, dist: 716, preco: 9_260_000, precoPedido: null, svd: { s: 3, v: 4, d: 4 }, m2c: 18_264, m2t: 11_265, sql: '1405400056', status: 'off-market', fonteRef: 'VivaReal (listagem da rua)', anuncioUrl: null },
  // Demais 18 (Laudo Sec. 5) — sem terreno/dist oficiais; S/V/D e R$/m²T do PDF.
  { ref: 'PMSP-0132', end: 'R. Groenlândia, 1235', bairro: 'Jardim América', areaConstruida: 550, areaTerreno: null, dist: null, preco: 10_000_000, precoPedido: null, svd: null, m2c: 18_182, m2t: 14_859, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0025', end: 'R. Chile, 113', bairro: 'Jardim América', areaConstruida: 490, areaTerreno: null, dist: null, preco: 8_800_000, precoPedido: null, svd: { s: 3, v: 4, d: 4 }, m2c: 17_959, m2t: 13_018, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0053', end: 'R. Cons. Torres Homem, 228', bairro: 'Jardim América', areaConstruida: 498, areaTerreno: null, dist: null, preco: 8_500_000, precoPedido: null, svd: null, m2c: 17_068, m2t: 13_889, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0044', end: 'R. Marechal Bitencourt, 588', bairro: 'Jardim América', areaConstruida: 404, areaTerreno: null, dist: null, preco: 8_000_000, precoPedido: null, svd: { s: 4, v: 4, d: 4 }, m2c: 19_802, m2t: 17_391, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0182', end: 'R. Holanda, 328', bairro: 'Jardim América', areaConstruida: 400, areaTerreno: null, dist: null, preco: 8_000_000, precoPedido: null, svd: { s: 3, v: 4, d: 4 }, m2c: 20_000, m2t: 13_008, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0046b', end: 'R. Marechal Bitencourt, 432', bairro: 'Jardim América', areaConstruida: 388, areaTerreno: null, dist: null, preco: 8_000_000, precoPedido: null, svd: null, m2c: 20_619, m2t: 20_513, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0155', end: 'R. Cuba, 110', bairro: 'Jardim América', areaConstruida: 411, areaTerreno: null, dist: null, preco: 7_700_000, precoPedido: null, svd: { s: 3, v: 4, d: 4 }, m2c: 18_735, m2t: 14_419, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0243', end: 'R. Maestro Elias Lobo, 921', bairro: 'Jardim América', areaConstruida: 396, areaTerreno: null, dist: null, preco: 6_850_000, precoPedido: null, svd: { s: 2, v: 3, d: 3 }, m2c: 17_298, m2t: 13_405, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0040', end: 'Av. Nove de Julho, 5144', bairro: 'Jardim América', areaConstruida: 340, areaTerreno: null, dist: null, preco: 6_800_000, precoPedido: null, svd: null, m2c: 20_000, m2t: 10_226, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0149', end: 'R. Cons. Torres Homem, 462', bairro: 'Jardim América', areaConstruida: 344, areaTerreno: null, dist: null, preco: 6_598_017, precoPedido: null, svd: { s: 2, v: 3, d: 3 }, m2c: 19_180, m2t: 15_380, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0238', end: 'R. Marechal Bitencourt, 473', bairro: 'Jardim América', areaConstruida: 431, areaTerreno: null, dist: null, preco: 6_500_000, precoPedido: null, svd: { s: 3, v: 4, d: 4 }, m2c: 15_081, m2t: 13_889, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0039', end: 'R. Marina Cintra, 57', bairro: 'Jardim América', areaConstruida: 310, areaTerreno: null, dist: null, preco: 6_400_000, precoPedido: null, svd: { s: 2, v: 3, d: 3 }, m2c: 20_645, m2t: 10_631, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0016', end: 'R. Martinica, 49', bairro: 'Jardim América', areaConstruida: 386, areaTerreno: null, dist: null, preco: 6_300_000, precoPedido: null, svd: { s: 2, v: 3, d: 3 }, m2c: 16_321, m2t: 11_413, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0464', end: 'R. Gal. Fonseca Teles, 347', bairro: 'Jardim América', areaConstruida: 290, areaTerreno: null, dist: null, preco: 5_300_000, precoPedido: null, svd: { s: 2, v: 3, d: 3 }, m2c: 18_276, m2t: 11_937, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0146', end: 'R. Veneza, 287', bairro: 'Jardim América', areaConstruida: 441, areaTerreno: null, dist: null, preco: 5_280_000, precoPedido: null, svd: { s: null, v: 2, d: 4 }, m2c: 11_973, m2t: 9_531, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0201', end: 'R. Madre Teodora, 259', bairro: 'Jardim América', areaConstruida: 300, areaTerreno: null, dist: null, preco: 5_250_000, precoPedido: null, svd: { s: 1, v: 2, d: 3 }, m2c: 17_500, m2t: 10_915, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0071', end: 'R. Antônio Bento, 332', bairro: 'Jardim América', areaConstruida: 209, areaTerreno: null, dist: null, preco: 5_076_000, precoPedido: null, svd: { s: 2, v: 3, d: 3 }, m2c: 24_287, m2t: 19_083, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
  { ref: 'PMSP-0213', end: 'R. Antônio Bento, 589', bairro: 'Jardim América', areaConstruida: 260, areaTerreno: null, dist: null, preco: 5_050_000, precoPedido: null, svd: null, m2c: 19_423, m2t: 14_809, sql: null, status: null, fonteRef: 'ITBImap (SQL)', anuncioUrl: null },
]

/**
 * Ofertas ATIVAS (à venda) no/junto ao raio — concorrência, NÃO vendas. Trazem o
 * valor de anúncio e a fonte/portal. `dist` só nas 5 georreferenciadas (Laudo Sec. 3).
 */
export const OFERTAS_ATIVAS = [
  { end: 'Rua Argentina, 685', bairro: 'Jardim América', areaConstruida: 865, precoPedido: 26_000_000, m2c: 30_058, dist: 485, svd: { s: 5, v: 14, d: 9 }, fonteRef: 'Anúncio (georref.)', anuncioUrl: null },
  { end: 'Rua Honduras (s/nº)', bairro: 'Jardim América', areaConstruida: 418, precoPedido: 22_500_000, m2c: 53_828, dist: 736, svd: null, fonteRef: 'Anúncio (georref.)', anuncioUrl: null },
  { end: 'Rua Estados Unidos, 691', bairro: 'Jardim América', areaConstruida: 369, precoPedido: 14_000_000, m2c: 37_940, dist: 189, svd: null, fonteRef: 'Anúncio (georref.)', anuncioUrl: null },
  { end: 'Rua Veneza, 722', bairro: 'Jardim América', areaConstruida: 415, precoPedido: 9_800_000, m2c: 23_614, dist: 684, svd: null, fonteRef: 'Anúncio (georref.)', anuncioUrl: null },
  { end: 'Rua Veneza, 731', bairro: 'Jardim América', areaConstruida: 380, precoPedido: 7_341_000, m2c: 19_318, dist: 684, svd: null, fonteRef: 'Anúncio (georref.)', anuncioUrl: null },
  { end: 'Rua México (s/nº)', bairro: 'Jardim América', areaConstruida: 900, precoPedido: 24_000_000, m2c: 26_667, dist: null, svd: { s: 4, v: null, d: null }, fonteRef: 'Anúncio (sem nº — não georref.)', anuncioUrl: null },
  { end: 'BNSir 88163', bairro: 'Jardim América', areaConstruida: 882, precoPedido: 27_000_000, m2c: 30_612, dist: null, svd: { s: 5, v: 12, d: 5 }, fonteRef: 'BNSir (ref. 88163)', anuncioUrl: null },
  { end: 'Oito CA3922', bairro: 'Jardim América', areaConstruida: 800, precoPedido: 29_000_000, m2c: 36_250, dist: null, svd: { s: 5, v: 12, d: 5 }, fonteRef: 'Oito Imóveis (CA3922)', anuncioUrl: null },
  { end: 'Jardins-co 23026', bairro: 'Jardim América', areaConstruida: 908, precoPedido: 25_000_000, m2c: 27_533, dist: null, svd: { s: 5, v: 9, d: 5 }, fonteRef: 'Jardins-co (23026)', anuncioUrl: null },
  { end: 'Rua Groenlândia (anúncio)', bairro: 'Jardim América', areaConstruida: 600, precoPedido: 8_000_000, m2c: 13_300, dist: null, svd: { s: null, v: 10, d: 3 }, fonteRef: 'Anúncio', anuncioUrl: null },
  { end: 'Rua Suécia, 526', bairro: 'Jardim Europa', areaConstruida: 700, precoPedido: 9_795_000, m2c: 13_993, dist: null, svd: { s: null, v: 4, d: 6 }, fonteRef: 'Anúncio', anuncioUrl: null },
]

/** Período global das vendas (Laudo Sec. 4 — não há data por item no laudo). */
export const PERIODO_ITBI = '2024–2026'
