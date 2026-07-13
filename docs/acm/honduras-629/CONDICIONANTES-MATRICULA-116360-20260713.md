# Honduras 629 — Condicionantes da matrícula 116.360 + cadastro fiscal (13-Jul-2026)

**Fontes (Art. IV — tudo rastreável):**
- Matrícula **116.360**, 4º Oficial de Registro de Imóveis de SP — certidão eletrônica expedida **01/02/2023**, situação jurídica até **30/01/2023** (arquivo do founder: `Downloads/Matricula - Honduras - atualizada 01.23.pdf`).
- Cadastro fiscal PMSP via **GeoSampa WFS** (13-Jul-2026): camada `geoportal:lote_cidadao`, filtro `cd_setor_fiscal='014' AND cd_quadra_fiscal='071' AND cd_lote='0030'` (SQL contribuinte **014.071.0030-0**, o mesmo da matrícula).
- Observação de VISITA do operador + medição NÃO OFICIAL via Google Maps (13-Jul-2026).
- Laudo vigente: `LAUDO-ACM-Honduras-v5-2026-07-08` (dataset congelado — NÃO regenerar).

## 1. Áreas — divergência central

| Fonte | Terreno | Área construída | Natureza |
|---|---:|---:|---|
| Matrícula 116.360 (Av.03, 31/10/1996) | **1.050 m²** (lote 13 q.11, 21×50 m) | **441,00 m²** averbados | oficial (registral) |
| Cadastro fiscal IPTU (GeoSampa, 13-Jul-2026) | **1.050 m²** | **441 m²** lançados | oficial (tributário) |
| Laudo v5 / material do anúncio | 1.000 m² | **800 m²** | declarado, sem suporte documental |
| Visita + Google Maps (operador) | — | **~736 m² cobertos** + cobertura externa de veículos | estimativa física NÃO oficial |

**Histórico registral:** a casa colonial original (508,30 m²) foi **demolida** (Av.02, 31/10/1996); a construção atual foi averbada com **441,00 m²** (Av.03, mesma data). Nenhuma averbação de ampliação até 30/01/2023.

**Leitura:** área gourmet e garagem coberta (aparentemente recentes, observadas na visita) **não constam nem na matrícula nem no lançamento do IPTU**. Há ~295 m² físicos estimados (736−441) sem regularização — nas DUAS pontas (municipal e cartorária).

## 2. Ônus e gravames (afetam a VENDA, não o valor de mercado)

1. **R.10 (15/05/2015): alienação fiduciária ao Banco Máxima S/A** — dívida R$ 414.251,71, 118 parcelas de R$ 7.121,93, vencimento final **11/04/2025** (já decorrido). Se quitada, falta **averbar o cancelamento**; se não, venda exige baixa/anuência do credor.
2. **Av.11 (07/10/2020): penhora de 50% dos direitos de fiduciante** — Execução Fiscal municipal, proc. 1534213572015, dívida R$ 85.149,08 (executados: Dennis D'Araujo Moniz Ramos e João Brasil Vita Sobrinho). Levantar antes/na escritura.
3. **Certidão com 3,5 anos** — estado atual de (1) e (2) desconhecido → **certidão atualizada é o primeiro passo**.
4. Titularidade: **Dennis D'Araujo Moniz Ramos** + **Ermantina Viscardi Moniz Ramos** (comunhão universal) — ambos outorgam. Aquisição R.08 (escritura 2006, registrada 2011) por R$ 1.000.000. Incomunicabilidade (Av.07) extinta na prática: usufruto cancelado (Av.09) e imóvel vendido a terceiro.

## 3. Impacto no ACM (laudo v5)

- Toda a **lente de construção escala com a área do alvo**. O v5 usou 800 m². Ancorada na área OFICIAL (441 m²), a lente cai proporcionalmente (×0,55): pela mediana homogeneizada de 19.061/m², a ordem de grandeza é **~R$ 8,4M** (441) vs **~R$ 14,0M** (736 físicos) vs ~R$ 15,2M (800). O preço pretendido de R$ 12M a 441 m² oficiais = 27.210/m², bem acima da régua da amostra.
- A comparação com ITBI é maçã-com-maçã pela **área IPTU** — e a área IPTU do alvo é 441 m². Os ~295 m² extras só viram valor defensável **mediante regularização** (custo + prazo + risco de parte não ser regularizável — verificar restrições ZER/bairros-jardins tombados antes de prometer regularização).
- **Política H-3 ("preferir subavaliar"):** até regularização documentada, comunicar 800/736 m² como área FÍSICA não averbada, nunca como base de valor.
- **Datasets congelados:** este achado NÃO regenera o dataset/laudo v5. Eventual **v6 com condicionantes** é decisão Luciana + founder.

## 4. Next steps

- [ ] **Certidão de matrícula atualizada** (a de 01/2023 venceu; fiduciária venceu 04/2025 — pode já estar quitada sem averbação de baixa).
- [ ] Confirmar com a proprietária: termo de quitação do Banco Máxima + situação da execução fiscal (penhora Av.11).
- [ ] Orçar **regularização** da área não averbada (~295 m²): aprovação/anistia municipal + habite-se/CCVO + averbação no 4º RI. Verificar viabilidade urbanística (recuos/TO/CA; restrições de bairro-jardim/tombamento) ANTES de assumir que regulariza.
- [ ] Decisão Luciana + founder: emitir **laudo v6** com condicionantes (área oficial 441 m² · terreno 1.050 m² · ônus a sanear) ou adendo ao v5.
- [ ] Risco fiscal a comunicar ao vendedor: IPTU complementar retroativo quando a PMSP atualizar o lançamento.

## 5. Medições por satélite (Google Earth, 13-Jul-2026 — operador)

Polígonos medidos pelo founder sobre imagem de satélite (imagem ~05/2024; **aproximações**, não medição oficial):

| Polígono | Perímetro | Área medida |
|---|---:|---:|
| Terreno | 143,47 m | **1.046,3 m²** ✅ valida a fonte (oficial: 1.050 m² — desvio 0,4%) |
| Área coberta (casa + gourmet) | ~124 m | **~685 m²** |
| Garagem coberta | ~40 m | ~20 m² |
| Cobertura de carros (telheiro externo) | 22,9 m | **30,48 m²** |
| **Total de projeção coberta** | | **~736 m²** |

**Caveats da medição por satélite (honestidade metodológica):**
- Satélite mede **projeção de telhado**, não área construída: **beirais inflam** (COE permite beiral até 1,50 m como obra menor; num perímetro de ~124 m, beirais podem representar dezenas de m² que NÃO são área construída) e **pavimentos superiores não aparecem** (a parte de 2 pavimentos soma área que o satélite não vê).
- Logo ~736 m² é a projeção coberta — a área construída pelo critério IPTU pode ser menor (beirais) ou maior (2º pavimento). O intervalo honesto hoje: **entre 441 (oficial) e ~736+2º pav. (físico)**.

## 6. Critério oficial da PMSP para área construída

**IPTU (o que a SF lança) — Lei 10.235/86, reproduzida no Decreto 58.420/2018 art. 56** ("área construída bruta", medição da situação FÁTICA):
1. Áreas **cobertas**: contornos externos das **paredes ou pilares** → área gourmet coberta e garagem coberta **CONTAM**, mesmo abertas nas laterais;
2. Áreas **pavimentadas descobertas** (terraços, sacadas, quadras): contornos externos → também entram na área bruta;
3. **Coberturas** tipo posto de serviço/telheiro: pela **projeção vertical** → a cobertura de carros (30,5 m²) **CONTA**;
4. **Piscinas**: contornos internos → contam.

**COE (Lei 16.642/2017) — para licenciamento/averbação:** área construída = soma das áreas cobertas de todos os pavimentos. Exceções relevantes: **pergolado com cobertura vazada/permeável NÃO é área construída** (com telhamento fixo, É); **beiral até 1,50 m** é elemento de menor impacto (não computa).

**Conclusão técnica:** pelo critério municipal, a área gourmet e a garagem coberta observadas na visita são **área construída** para IPTU e exigem licenciamento/averbação — a divergência 441 × físico é real e não é "área que não conta".

**Regularização — qual rito:**
- **Lei 17.202/2019** (regularização/anistia): só para obras **concluídas até 31/07/2014**; prazo de protocolo vigente até **30/04/2026**. Se a gourmet/garagem são recentes (aparência de obra nova na visita e na série histórica de satélite), **NÃO se enquadram**.
- Obras pós-2014: **rito ordinário do COE** (projeto de regularização/reforma) exigindo conformidade com o zoneamento ATUAL — recuos, taxa de ocupação, coeficiente. O lote está na região dos bairros-jardins (**verificar perímetro de tombamento CONDEPHAAT/CONPRESP e zona ZER** antes de prometer regularização): estruturas sobre recuo (garagem/telheiro frontal é o caso clássico) podem ser **não regularizáveis**.
- Risco fiscal independente da regularização: a SF pode lançar **IPTU complementar retroativo** da área não declarada quando atualizar o cadastro (aerolevantamento).

## 7. Leitura para revisão da ACM e conversa com o cliente

**Cenários de valor pela lente de construção (mediana homogeneizada 19.061/m², laudo v5):**

| Cenário | Área-base | Valor indicativo | Defensabilidade |
|---|---:|---:|---|
| A. Documental HOJE | 441 m² | **~R$ 8,4M** | máxima (matrícula + IPTU) |
| B. Físico bruto | ~736 m² proj. | ~R$ 14,0M | **zero** enquanto irregular (e 736 superestima por beirais) |
| C. Anunciado | 800 m² | ~R$ 15,2M | sem suporte em nenhuma fonte |
| D. Pós-regularização | 441 + o que for regularizável | entre A e B | condicionada a viabilidade urbanística + custo + prazo |

**Argumentos para a conversa com o cliente (vendedor):**
1. **O anúncio de 800 m² não para em pé documentalmente** — as duas fontes oficiais dizem 441 m². Comprador diligente (ou o banco dele) vai descobrir isso na primeira certidão.
2. **Financiamento trava no averbado:** avaliação bancária e crédito saem sobre 441 m² — o "excedente" físico só é pagável à vista por comprador que aceite o risco. Isso encolhe o público e alonga a venda.
3. **O incentivo econômico da regularização é brutal:** cada m² regularizado vira ~R$ 19 mil de valor defensável. Se ~200-295 m² forem regularizáveis, isso destrava **R$ 4-5,6M** a um custo de projeto/taxas/obra ordens de magnitude menor. MAS: só vale se a viabilidade urbanística confirmar (recuos/ZER/tombamento) — contratar arquiteto p/ estudo de viabilidade ANTES de prometer qualquer coisa.
4. **Riscos de não fazer nada:** IPTU complementar retroativo + multa quando a PMSP atualizar o cadastro; e na venda, renegociação/desconto na mesa quando o comprador descobrir.
5. **Ônus paralelos:** baixa da alienação fiduciária (venceu 04/2025) e levantamento da penhora de 50% são pré-requisitos de escritura — resolver em paralelo ao estudo de viabilidade.
6. **Política H-3 (preferir subavaliar):** a ACM revisada deve ancorar no cenário A (441 m²) com o cenário D como upside CONDICIONADO — nunca o contrário.

**Para a revisão da ACM (v6, decisão Luciana + founder):** manter dataset congelado; corrigir o TARGET (terreno 1.050; área construída = 441 documental), apresentar a faixa como A→D com as condicionantes explícitas, e registrar a medição de satélite como evidência física NÃO oficial (Art. IV).

> **EXECUTADO 13-Jul (autorizado pelo founder):** `LAUDO-ACM-Honduras-v6-2026-07-13.pdf` + `.computation.json` gerados por `app/scripts/acm-honduras/07-build-laudo-v6.tsx`. Base documental 441/1.050; dataset congelado (mediana homogeneizada 19.061/m² idêntica ao v5 — zero drift); **headline mercado R$ 5.989.387–7.145.136 · fechamento R$ 4.927.560–5.878.412**; âncoras comerciais do v4 (anúncio recomendado/meta) SUSPENSAS — eram função dos 800 m²; definir com a Luciana após decisão sobre a regularização. Considerações/recomendações deste doc embutidas no Sumário (conclusões), Parecer e Sec. 9 do PDF. v5 preservado no diretório.

## 8. Reprodutibilidade da consulta GeoSampa

```
GET https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/ows?service=WFS&version=1.0.0
    &request=GetFeature&typeName=geoportal:lote_cidadao&outputFormat=application/json
    &CQL_FILTER=cd_setor_fiscal='014' AND cd_quadra_fiscal='071' AND cd_lote='0030'
→ 1 feature: R HONDURAS 629 · ATIVO · Residencial · qt_area_terreno=1050 · qt_area_construida=441
```

(Mesma via serve para qualquer SQL — candidata a virar helper do pipeline ACM: lookup de área oficial do ALVO por SQL, complementando o `sql_cadastral` dos comparáveis que a Story 9.4 pôs em PROD.)
