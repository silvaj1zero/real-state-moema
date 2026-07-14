# Honduras 629 — Regularização de área construída: legislação vigente, caminho, passivo e assessoria (13-Jul-2026)

> **⚠️ VERSÃO HISTÓRICA — uso operacional migrou para `DOSSIE-CONSOLIDADO-HONDURAS-629-20260714.md`** (consenso pós-confronto das análises).

Pesquisa web 13-Jul-2026 (fontes ao final). Complementa `CONDICIONANTES-MATRICULA-116360-20260713.md` §6 e o PDF de cenários.

## 1. ACHADO NOVO — a janela da anistia ainda está ABERTA (e fecha em 48 dias)

- A Lei **18.375/2025** prorrogou o prazo de protocolo da **Lei 17.202/2019** (regularização/anistia) de 30/04/2026 para **30/08/2026**.
- Cobertura inalterada: edificações/acréscimos **concluídos até 31/07/2014**, mesmo em desacordo com COE/LPUOS, desde que atendam higiene/segurança/estabilidade (condicionada a obras quando necessário).
- ~~**Implicação direta no caso:** a premissa "gourmet/garagem são recentes" precisa virar FATO DATADO.~~ **DATADO em 13-Jul (mesmo dia):** o operador mediu os mesmos polígonos sobre a imagem histórica de **08/09/2013** do Google Earth (Anexo B do PDF de cenários; capturas em `anexo-satelite/b*.png`): área coberta **~689 m²** (vs ~685 m² em 2024 — mesma pegada), garagem coberta **~121 m²** já presente, terreno idêntico. **As obras são ANTERIORES a 31/07/2014 → trilho da ANISTIA CONFIRMADO.**
- Consequências em cadeia: (1) a anistia aceita a edificação **mesmo em desacordo com o zoneamento atual** — o red flag de taxa de ocupação (§2 trilho 2) deixa de bloquear; (2) tese TJSP anti-IPTU-retroativo aplicável; (3) **protocolo até 30/08/2026 = ~7 semanas** — contratar licenciador imediatamente. A prova formal de anterioridade (a captura é evidência auxiliar) é montada pelo responsável técnico no protocolo (IPTU antigo, aerofotos oficiais GeoSampa, fotos, notas).

## 2. Os dois trilhos de regularização

### Trilho 1 — Anistia (Lei 17.202/2019, protocolo até 30/08/2026)
- Para o que for **pré-31/07/2014**. Pedido 100% digital no Portal de Licenciamento (SMUL); modalidades automática/simplificada conforme área e uso; sai **Certificado de Regularização**.
- Custos: taxas + preços públicos + eventual **contrapartida financeira** (edificações maiores) + obras de adequação quando exigidas. Projeto/responsável técnico com **ART/RRT** nas modalidades não automáticas.
- **Bônus tributário relevante:** há jurisprudência do **TJSP afastando o IPTU retroativo (lançamento complementar dos 5 anos) quando a área é regularizada pela lei de anistia** — regularizar por este trilho pode blindar o passivo. (Tese a confirmar com advogado tributário para o caso concreto.)

### 2.1 Parâmetros urbanísticos do lote — CONFIRMADOS na fonte (13-Jul, GeoSampa WFS)

| Item | Valor confirmado | Fonte |
|---|---|---|
| Zona | **ZER-1** (mantida na LPUOS 16.402/2016 E na nova **Lei 18.177/2024**) | camadas `zoneamento_2016_map1` + `perimetro_zona_lei_18177_24` no ponto do alvo |
| Taxa de ocupação (TO) | **0,5** → projeção máxima **525 m²** no lote de 1.050 m² | Quadro 3 LPUOS (ZER-1) |
| Coeficiente (CA) | **1,0** → até 1.050 m² computáveis | Quadro 3 LPUOS |
| Projeção medida | ~689–736 m² → **excesso de ~165–210 m² (31–40% acima da TO)** | medições satélite (Anexos A/B) |
| Área averbada atual | 441 m² ≤ 525 → **situação documental é CONFORME** | matrícula/IPTU |
| Restrições convencionais do loteamento | Prevalecem quando MAIS restritivas que a lei (LPUOS art. 32 §, mantido na 18.177) — a matrícula cita loteamento da "Companhia de Imóveis e Construções" (padrão City: recuos maiores, ocupação menor) | matrícula 116.360 + LPUOS |
| **Tombamento** | **Lote DENTRO do perímetro tombado "JARDINS: AMÉRICA, EUROPA, PAULISTA E PAULISTANO"** — CONDEPHAAT Res. SC 02/1986 + compl. SCEC 37/2021; CONPRESP Res. 05/1991 + 07/2004 (detalhamento) | camada `patrimonio_cultural_bairro_ambiental` no ponto do alvo |

**Leitura dura:** no rito comum, os ~165–210 m² de projeção acima da TO são **inaverbáveis sem demolir/descobrir** — TO não se compra nem se compensa no licenciamento ordinário. E o tombamento dos bairros-jardins protege exatamente o padrão de ocupação/ajardinamento, então QUALQUER regularização (anistia inclusive) passa por **anuência CONDEPHAAT/CONPRESP** — a Lei 17.202 só dispensa a anuência caso a caso quando há resolução do órgão delegando a análise por parâmetros do tombamento (verificar enquadramento do lote na Res. CONPRESP 07/2004).

### Trilho 2 — Rito comum (COE Lei 16.642/2017 + Dec. 57.776/2017)
- Para o que for **pós-2014** (a hipótese-base para gourmet/garagem): **Alvará de Aprovação de projeto de regularização** (ou reforma) via Portal de Licenciamento/SLCe, com projeto + ART/RRT, atendendo a legislação ATUAL — recuos, taxa de ocupação, coeficiente (LPUOS 16.402/2016) e eventual anuência de tombamento (bairros-jardins).
- Existe a via de **emissão autodeclaratória eletrônica** (aprovação declaratória com auditoria posterior da SMUL) que acelera bastante quando o imóvel se enquadra — o responsável técnico declara conformidade e responde por ela.
- **Red flag específico do caso:** projeção coberta medida ~715-736 m² sobre lote de 1.050 m² ⇒ ocupação aparente ~0,68-0,70. Se a zona limitar TO a 0,5 (comum em zona exclusivamente residencial dos Jardins), parte da área **não regulariza por este trilho** sem descobrir/demolir. Confirmar zona + TO no GeoSampa é parte do estudo de viabilidade.
- Ao final: **Certificado de Conclusão/Regularização** → averbação da nova área na matrícula (4º RI, com CND/INSS da obra quando exigível).

### 2.2 Risco de averbação — síntese honesta (13-Jul, pós-verificação de zona e tombamento)

| Caminho | O que averba | Risco |
|---|---|---|
| Rito comum (LPUOS/COE atual) | No máx. ~525 m² de projeção (TO 0,5) — o excedente de ~165–210 m² **NÃO averba** sem demolir/descobrir | **ALTO para o excedente** (insanável) + restrições City + anuência patrimonial |
| **Anistia (Lei 17.202/2019, até 30/08/2026)** | Potencialmente o físico todo — a lei perdoa TO/recuos/CA da LPUOS | **MÉDIO**: o gate real é a **anuência patrimonial** (lote dentro do perímetro tombado dos Jardins; o tombamento protege o padrão de ocupação — o órgão pode negar ou exigir adequações). Mitigantes: obra pré-2014 consumada, Res. CONPRESP 07/2004 pode delegar análise, precedentes de regularização no bairro. Custos: taxas + eventual outorga (garagem coberta acima dos limites da lei vigente até 2014 é computável p/ contrapartida) |
| Não fazer nada | Nada — e o relógio do IPTU retroativo corre | Descoberta via aerofoto → lançamento de ofício 5 anos, sem os benefícios da anistia |

**Consequência para a comunicação com o proprietário:** NÃO prometer averbação dos ~736 m². A frase correta é: "a anistia é a única porta aberta para averbar a área extra, ela fecha em 30/08, e o deferimento depende da anuência do patrimônio — por isso o licenciador tem que ser experiente em Jardins/CONPRESP". O cenário C (12–14M) fica **condicionado à anuência patrimonial**; o piso-terreno (R$ 9,62M) e o cenário B não dependem de nada disso.

## 3. Como a Prefeitura cobra o passivo (quando ELA descobre antes)

- **Lançamento complementar retroativo de IPTU**: a SF pode cobrar a diferença dos últimos **5 exercícios** (decadência CTN) sobre a área não declarada, com atualização/juros e multa moratória — o gatilho usual é recadastramento por **aerofotogrametria** ou o próprio processo de regularização/venda.
- Ordem de grandeza no caso: ~295 m² extras em imóvel residencial de alto padrão → diferença anual relevante × até 5 anos. (Cálculo exato depende do valor venal unitário do exercício — advogado/contador tributário estima em 1h de trabalho.)
- **Assimetria que favorece agir primeiro:** quem regulariza espontaneamente (especialmente via anistia, com a jurisprudência TJSP acima) tende a pagar menos que quem espera a PMSP lançar de ofício. O risco não é estático — recadastramentos aéreos são periódicos.

## 4. Quem assessora (e o papel do jurídico da RE/MAX)

| Frente | Profissional típico | Observação |
|---|---|---|
| Projeto de regularização + protocolo SMUL | **Arquiteto/engenheiro licenciador** (com RRT/ART) — escritórios especializados em "regularização de imóveis SP" | É o dono do processo técnico; jurídico NÃO substitui (exigência legal de responsável técnico) |
| Viabilidade urbanística (zona/TO/CA/recuos/tombamento) | O mesmo licenciador, na fase de estudo (~30-60 dias) | Entregável: o que regulariza, o que não, custo e prazo por trilho |
| Passivo de IPTU + tese anti-retroativo + ônus da matrícula (fiduciária/penhora) | **Advogado imobiliário/tributário** | Também conduz baixa da fiduciária e levantamento da penhora |
| Averbação no 4º RI | Advogado imobiliário ou despachante, com o Certificado em mãos | — |
| Jurídico da RE/MAX (franquia) | **Orientação e indicação de parceiros; blindagem da intermediação** | Tipicamente NÃO executa licenciamento nem contencioso do cliente — cuida do contrato de corretagem, da conformidade do anúncio e pode manter rede de indicados. A consultora não deve assumir responsabilidade técnica (CRECI ≠ CREA/CAU) |

**Recomendação prática:** a Luciana apresenta o problema com este dossiê + PDF de cenários, e o proprietário contrata (a) licenciador para o estudo de viabilidade e (b) advogado para ônus+passivo. A RE/MAX documenta no contrato de intermediação que a área anunciada é a averbada (441 m²) até a regularização — protege a corretora e a franquia.

## 5. Sequência recomendada (atualiza os "próximos passos" do caso)

1. **HOJE (operador, custo zero):** datar gourmet/garagem no Google Earth histórico → define o trilho (anistia até 30/08 × rito comum).
2. Certidão de matrícula atualizada + termo de quitação Banco Máxima + status da penhora (advogado).
3. Estudo de viabilidade com licenciador (zona/TO/CA/recuos/tombamento) — decide C, C′ ou B do doc de cenários.
4. Se qualquer parte couber na anistia: **protocolar antes de 30/08/2026** (prazo improrrogado até 2ª ordem).
5. Advogado tributário: estimar passivo IPTU 5 anos e aplicabilidade da tese TJSP (retroativo afastado na anistia).

## 6. Canal oficial da anistia — caminho, modalidade e o que se pede (verificado 13-Jul na lei e no portal)

### 6.1 Onde e como protocolar
- **Portal de Licenciamento** — `portaldelicenciamento.prefeitura.sp.gov.br` — processo 100% digital (upload de documentos; acompanhamento pela busca do próprio portal). Página oficial de orientação: **Meu Imóvel Regular** (`meuimovelregular.prefeitura.sp.gov.br`), com 3 manuais por modalidade.
- Prazo de protocolo: **30/08/2026** (Lei 18.375/2025).

### 6.2 Modalidade aplicável ao caso (Lei 17.202/2019 + Dec. 59.164/2019)
| Modalidade | Critério | Enquadramento Honduras 629 |
|---|---|---|
| Automática | R1/R2h baixo/médio padrão isento de IPTU em 2014 | ❌ não é o caso |
| Declaratória simplificada | residencial ≤ 500 m² | ❌ (área total ~736+ m²) |
| **Declaratória** | edificação ≤ 1.500 m² concluída até 31/07/2014 | ✅ **provável enquadramento** (residencial unifamiliar) |
| Comum | > 1.500 m² ou não enquadráveis | fallback |

**Tombamento (art. 4º, I):** edificação "tombada, preservada ou contida em perímetro de área tombada, ou no raio envoltório" **pode ser regularizada MEDIANTE PRÉVIA ANUÊNCIA** do órgão competente (aqui: **CONPRESP/DPH**, e CONDEPHAAT conforme alcance pós-SCEC 37/2021). A anuência é obtida ANTES/junto ao protocolo — o FAQ simplifica dizendo "não pode": a exclusão é só do procedimento automático.

### 6.3 ⚠️ VEDAÇÃO do art. 3º — risco novo identificado na letra da lei
O art. 3º **veda** a regularização de edificações **"que desrespeitem restrições convencionais de loteamentos"** — a anistia perdoa a LPUOS, mas **NÃO perdoa restrição contratual do loteamento**. O lote 13 q.11 é de loteamento com restrições (matrícula cita "planta da Companhia Imóveis e Construções"; padrão bairros-jardins costuma limitar ocupação/recuos). **Item nº 1 do estudo de viabilidade: obter o teor das restrições convencionais do loteamento** (matrícula-mãe/loteadora/registro) e confrontar com a área extra. Se houver conflito, o licenciador precisa avaliar alcance/exigibilidade — este pode ser o gate mais duro, junto com a anuência.

### 6.4 Documentos tipicamente exigidos (art. 9º + manuais do portal)
1. Requerimento eletrônico com **declaração de responsabilidade** (proprietário + responsável técnico);
2. **Matrícula** do imóvel (temos a 116.360; usar certidão ATUALIZADA);
3. **Peças gráficas** — plantas, cortes e quadro de áreas do estado atual, assinadas por profissional habilitado com **RRT/ART**;
4. **Atestado técnico** de higiene, segurança de uso, estabilidade, habitabilidade e salubridade (art. 1º);
5. **Prova de anterioridade a 31/07/2014** — aerofotos oficiais (ortofotos GeoSampa), IPTU/lançamentos antigos, imagens históricas (nossas capturas de 08/09/2013 = evidência auxiliar);
6. Comprovantes de recolhimento: **preço público de R$ 10,00/m² a regularizar** + taxa administrativa + **ISS da obra** regularizada;
7. Quando tombado: **anuência patrimonial** (CONPRESP/DPH — dossiê próprio: levantamento fotográfico, EVT/justificativa, implantação).

### 6.5 Custos estimados para o caso (ordem de grandeza — confirmar com licenciador)
- Preço público: ~295 m² × R$ 10 = **~R$ 2.950**;
- Outorga onerosa (art. 13): incide só sobre o que exceder o **CA básico 1,0** (1.050 m² — a área total física não excede) → **tende a ZERO**, exceto **garagens computáveis** acima dos limites legais (§5º — a garagem coberta ~121 m² pode gerar contrapartida com fator Fr=1,2 sobre esse trecho);
- ISS da obra + taxa + honorários do RT/licenciador + custo do dossiê de anuência. Total provável na casa de **dezenas de milhares de reais** — ordens de magnitude abaixo dos R$ 4-5,6M de valor destravado.

### 6.6 Acompanhamento e pós-deferimento
- Tramitação e exigências ("comunique-se") pelo próprio Portal de Licenciamento;
- Deferido → **Certificado de Regularização** → averbação da área no 4º RI (com a certidão + INSS por decadência p/ obra >5 anos) → atualização do IPTU (aí com a proteção da tese TJSP contra retroativo);
- A Prefeitura pode auditar as declarações a qualquer tempo — declaração falsa anula o certificado (por isso o RT tem que medir de verdade, não usar as nossas aproximações de satélite).

## Fontes

- [Meu Imóvel Regular — FAQ oficial](https://meuimovelregular.prefeitura.sp.gov.br/faq/) · Portal de Licenciamento (`portaldelicenciamento.prefeitura.sp.gov.br`) · [Lei 17.202/2019 — texto integral](https://www.legisweb.com.br/legislacao/?id=383586) (arts. 3º/4º/9º/13 citados no §6)
- [Prefeitura/SMUL — prorrogação para 30/08/2026](https://prefeitura.sp.gov.br/w/prefeitura-de-s%C3%A3o-paulo-prorroga-prazo-para-regulariza%C3%A7%C3%A3o-de-edifica%C3%A7%C3%B5es-at%C3%A9-30-agosto-de-2026) (Lei 18.375/2025) · [Gestão Urbana — mesma notícia](https://gestaourbana.prefeitura.sp.gov.br/noticias/prefeitura-de-sao-paulo-prorroga-prazo-para-regularizacao-de-edificacoes-ate-30-agosto-de-2026/)
- [Lei 17.202/2019 — Câmara Municipal](https://www.saopaulo.sp.leg.br/regularizacaoimobiliaria/lei-no-17-202-de-16-de-outubro-de-2019/) · [Decreto 57.776/2017 (regularização COE)](https://www.saopaulo.sp.leg.br/iah/fulltext/decretos/D57776.pdf)
- [Emissão autodeclaratória eletrônica — Gestão Urbana](https://gestaourbana.prefeitura.sp.gov.br/noticias/prefeitura-regulamenta-emissao-autodeclaratoria-eletronica-para-projetos-de-edificacoes/)
- [IPTU retroativo/complementar — panorama](https://www.jusbrasil.com.br/artigos/iptu-retroativo-e-complementar-o-que-fazer-diante-da-cobranca-da-prefeitura/4525138636) · [TJSP afasta retroativo na anistia — APET](https://apet.org.br/noticia/tjsp-livra-paulistanos-da-cobranca-retroativa-de-debitos-de-iptu/) · [Harada — lançamento complementar](https://haradaadvogados.com.br/lancamento-complementar-e-retroativo-do-iptu/)
