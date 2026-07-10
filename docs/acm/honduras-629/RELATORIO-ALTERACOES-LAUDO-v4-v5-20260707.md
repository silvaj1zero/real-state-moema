# Relatório de Alterações — Laudo ACM Rua Honduras, 629 · v4 → v5

**Data:** 07/07/2026 · **Caso:** Clarisia Ramos (captação) · **Consultora:** Luciana Borba (RE/MAX Galeria, CRECI 045063-J)
**Artefato novo:** `LAUDO-ACM-Honduras-v5-2026-07-08.pdf` (+ `*.computation.json` com os números de revisão). Sec. 3 com mapa embutido — raio de 1.000 m e os 23 pins geocodificados com CEP verificado (coordenadas auditáveis em `app/scripts/acm-honduras/06-geocode-cache.json`).
**Stories:** 9.10, 9.11 (mecanismos) · 9.12 (ingestão H-1) · 9.13 (geração v5 / H-2)

---

## 1. Resumo executivo

O v5 não muda a metodologia do v4 — ele a torna **defensável em contraditório**. Três
mecanismos novos foram ativados sobre os mesmos 23 comparáveis, agora com dados reais
e rastreáveis (data de venda, SQL e bairro verificado por CEP de cada um):

| Indicador | v4 | v5 |
|---|---|---|
| Valor de mercado (headline) | **R$ 12.400.000** (ponto único) | **R$ 10.922.944 – R$ 12.961.698** (faixa; referência = Top 3 aderente) |
| Mediana R$/m² (23 vendas) | 18.264 (nominal, moedas de 2024–2026 misturadas) | **19.061** (todas em valor presente jun/2026, índice FipeZap) |
| Bairro da amostra | "Jardim América" (23×) | **Jardim Paulista 16 · Jardim América 5 · Jardim Europa 2** (CEP verificado) |
| Deságio medido (anúncio→fechado) | −10% a −15% | **−12,7%** — invariante à atualização temporal (por construção) |
| Rastreabilidade por comparável | SQL só nos Top 5 | **SQL da guia ITBI + data de venda + CEP nos 23** |

## 2. O que mudou e por quê

1. **Headline em FAIXA (não mais ponto único).** O v4 reportava R$ 12,4M — o cenário
   de MAIOR valor (todos os 23) apresentado como ponto. O v5 reporta a faixa entre os
   cenários de sensibilidade, com o recorte **aderente** (Top 3, casas realmente
   parecidas com o alvo) como referência e o recorte amplo como teto. Auditoria
   03-Jul §3.1 / decisão do founder 06-Jul.
2. **Atualização temporal (homogeneização FipeZap).** As 23 vendas ocorreram entre
   abr/2024 e mar/2026 — o v4 misturava moedas de épocas diferentes na mesma mediana.
   No v5 cada preço é trazido a valor presente (jun/2026) pelo índice FipeZap São
   Paulo · venda · residencial (fatores 1,005 a 1,110). 23 de 23 ajustados.
3. **Bairro real verificado por CEP.** O v4 rotulava os 23 como "Jardim América"; a
   verificação por CEP (ViaCEP/Correios, corroborada pelo CEP das próprias guias ITBI)
   mostra 16 em Jardim Paulista, 5 em Jardim América e 2 em Jardim Europa. O laudo
   agora expõe a composição com a mediana de R$/m² por bairro — a amostra continua a
   mesma; o que muda é a honestidade do rótulo.
4. **Guard-rail anti-auto-referência ativo.** O alvo entra com endereço, vagas e preço
   pretendido, e o pipeline rejeita automaticamente qualquer "comparável" que seja o
   próprio imóvel anunciado (incidente do headline R$ 12,4M contaminado). Resultado no
   v5: 0 exclusões — os 23 são vendas ITBI legítimas.
5. **Data de venda e SQL reais nos 23.** O v4 tinha SQL apenas nos Top 5 e nenhuma
   data por item. As guias de ITBI pagas (dados abertos da Fazenda/PMSP) devolveram a
   guia exata de cada comparável — valor, data, SQL, áreas e CEP conferidos um a um.

## 3. Fontes dos dados ingeridos

| Dado | Fonte oficial | Verificação |
|---|---|---|
| Índice FipeZap (2024-01→2026-06) | Planilha oficial de séries históricas — downloads.fipe.org.br/indices/fipezap | Aba "São Paulo", venda residencial, Número-Índice Total |
| Data de venda + SQL dos 23 | "Dados das Transações Imobiliárias com recolhimento de ITBI" — Fazenda/PMSP (arquivos anuais 2024/2025/2026) | Casamento por logradouro+número+valor+áreas; SQL do laudo confere 5/5 nos Top 5 |
| CEP / bairro real | ViaCEP (base Correios), por logradouro e faixa de numeração | Corroborado pelo campo CEP da própria guia ITBI (23/23) |
| Conferência pública dos SQLs | GeoSampa (geosampa.prefeitura.sp.gov.br) — balcão oficial do cadastro municipal | Qualquer SQL da tabela abaixo é verificável por terceiros; agregadores como ITBImap/Atlas exibem as mesmas guias em mapa |

### As 23 vendas com data e bairro verificados

| # | Endereço | SQL (guia ITBI) | Venda | Bairro real (CEP) |
|---|---|---|---|---|
| 1 | R. Maestro Chiaffarelli, 86 | 1407200046 | 09/08/2024 | Jardim Paulista (01432-030) |
| 2 | R. Marechal Bitencourt, 101 | 1613200226 | 17/07/2024 | Jardim Paulista (01432-020) |
| 3 | R. Cons. Torres Homem, 399 | 1608500314 | 24/04/2024 | Jardim Paulista (01432-010) |
| 4 | R. Henrique Martins | 3609200431 | 07/06/2024 | Jardim Paulista (01435-010) |
| 5 | R. Canadá, 111 | 1405400056 | 01/10/2025 | Jardim América (01436-000) |
| 6 | R. Groenlândia, 1235 | 1601100132 | 03/03/2026 | Jardim América (01434-100) |
| 7 | R. Chile, 113 | 1602200025 | 22/11/2025 | Jardim América (01436-050) |
| 8 | R. Cons. Torres Homem, 228 | 1611300053 | 19/02/2026 | Jardim Paulista (01432-010) |
| 9 | R. Marechal Bitencourt, 588 | 1607300044 | 06/02/2025 | Jardim Paulista (01432-020) |
| 10 | R. Holanda, 328 | 1602000182 | 12/09/2024 | Jardim Europa (01446-030) |
| 11 | R. Marechal Bitencourt, 432 | 1608700046 | 26/11/2025 | Jardim Paulista (01432-020) |
| 12 | R. Cuba, 110 | 1602600155 | 04/12/2024 | Jardim América (01436-020) |
| 13 | R. Maestro Elias Lobo, 921 | 1606700243 | 06/05/2024 | Jardim Paulista (01433-000) |
| 14 | Av. Nove de Julho, 5144 | 1603100040 | 22/09/2025 | Jardim Paulista (01406-200) |
| 15 | R. Cons. Torres Homem, 462 | 1608600149 | 19/07/2024 | Jardim Paulista (01432-010) |
| 16 | R. Marechal Bitencourt, 473 | 1608600238 | 04/12/2024 | Jardim Paulista (01432-020) |
| 17 | R. Marina Cintra, 57 | 1615900039 | 06/09/2024 | Jardim Europa (01446-060) |
| 18 | R. Martinica, 49 | 1602400016 | 05/07/2024 | Jardim América (01436-030) |
| 19 | R. Gal. Fonseca Teles, 347 | 1606700464 | 05/08/2025 | Jardim Paulista (01433-020) |
| 20 | R. Veneza, 287 | 1409100146 | 14/01/2026 | Jardim Paulista (01429-010) |
| 21 | R. Madre Teodora, 259 | 1409300201 | 25/09/2025 | Jardim Paulista (01428-010) |
| 22 | R. Antônio Bento, 332 | 1608500071 | 14/06/2024 | Jardim Paulista (01432-000) |
| 23 | R. Antônio Bento, 589 | 1606800213 | 27/06/2024 | Jardim Paulista (01432-000) |

## 4. Inconsistências do v4 que a ingestão expôs

- **O próprio alvo é Jardim Paulista pelo CEP** (Rua Honduras, 629 → 01428-000). O v4
  afirmava "Jardim América" na capa; o v5 usa o rótulo honesto "Jardim América /
  Jardim Paulista (fronteira)". A nota do v4 sobre a fronteira já admitia isso.
- **A contagem "16/6/2" do v4 somava 24** — ela incluía o alvo na composição. A
  composição correta dos 23 comparáveis é 16/5/2.
- **R. Chile, 113 tem DUAS guias em nov/2025** (R$ 6,25M em 06/11 e R$ 8,8M em 22/11).
  O laudo adota a mais recente — decisão já documentada no material didático.
- **R. Martinica, 49 também tem duas vendas em 2024** (R$ 6,3M em 05/07, adotada; e
  R$ 4,6M em 20/11). Aqui o laudo adotou a mais ANTIGA (critério oposto ao do Chile) —
  registrado para revisão metodológica com a consultora.
- **Av. Nove de Julho, 5144:** o cadastro IPTU rotula "Itaim Bibi", mas o CEP oficial
  da faixa (01406-200) é Jardim Paulista — mantido o critério CEP, divergência anotada.

## 5. O que NÃO mudou (de propósito)

- **Âncoras comerciais do v4:** preço de anúncio recomendado (R$ 11,5M) e meta de
  fechamento (R$ 10,0–10,5M). São decisão comercial da consultora — a faixa
  computada no v5 (fechamento R$ 8,99–10,66M) serve de subsídio para essa conversa.
- **Os 23 comparáveis, os fatores de liquidez e o valor residual do terreno
  (co-âncora ≈ R$ 9,62M)** — o caso Honduras é o gabarito congelado de regressão.

## 6. Decisões pendentes (reunião H-3, com a Luciana)

1. Labels e texto do headline em faixa (referência aderente × teto amplo).
2. Meta de fechamento: manter R$ 10,0–10,5M ou reancorar com a mediana homogeneizada.
3. Como apresentar a composição por bairro na conversa com a proprietária (o v4
   invocava o prestígio "Jardim América"; a amostra majoritária é Jardim Paulista).
4. Critério único para lotes com dupla guia (Chile × Martinica).

## 7. Validação técnica

- Suíte de regressão: **17 arquivos / 195 testes verdes** (inclui 10 novos da ingestão).
- `npm run typecheck` e `npm run lint` → exit 0.
- Auditoria de texto do PDF v5: composição por bairro, critério "Atualização
  temporal — FipeZap ref. 2026-06 (23 de 23 ajustados)" e headline em faixa presentes.
- Revisão de layout (07-Jul, noite): fontes da marca (Montserrat/Inter) embutidas na
  geração offline, mapa da Sec. 3 com pins em camadas (Top 3/4-5 sempre visíveis),
  sinais de subtração e legendas em caracteres seguros, colunas da Sec. 6 com respiro.
- Commits (branch `fix/epic7-v-crawl-health`, sem push — push é do @devops):
  `9ab93c6` (mecanismos 9.10/9.11) · `b42a14d` (ingestão 9.12) · `4251347` (laudo v5) ·
  `abbd69d` (mapa Sec. 3) · `87dc91d` (layout/fontes) — Story 9.13.
