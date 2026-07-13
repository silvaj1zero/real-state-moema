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

## 5. Reprodutibilidade da consulta GeoSampa

```
GET https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/ows?service=WFS&version=1.0.0
    &request=GetFeature&typeName=geoportal:lote_cidadao&outputFormat=application/json
    &CQL_FILTER=cd_setor_fiscal='014' AND cd_quadra_fiscal='071' AND cd_lote='0030'
→ 1 feature: R HONDURAS 629 · ATIVO · Residencial · qt_area_terreno=1050 · qt_area_construida=441
```

(Mesma via serve para qualquer SQL — candidata a virar helper do pipeline ACM: lookup de área oficial do ALVO por SQL, complementando o `sql_cadastral` dos comparáveis que a Story 9.4 pôs em PROD.)
