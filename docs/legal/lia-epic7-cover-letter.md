# Cover Letter — Envio LIA Epic 7 para Revisão Jurídica

**Para:** `[NOME DO COUNSEL — A PREENCHER]` (`[e-mail@counsel — A PREENCHER]`)
**Cc:** Luciana Borba (operadora end-user, RE/MAX Galeria Moema); `[NOME REPRESENTANTE LEGAL — A PREENCHER]`
**De:** Morgan — Project Management, Real State Moema
**Assunto:** Revisão e parecer jurídico — LIA (Legitimate Interest Assessment) para captação automatizada de leads imobiliários — Epic 7
**Data:** 2026-05-18
**Prioridade:** Alta — bloqueador de deploy de Wave A
**Anexo principal:** `lia-epic7.md` (v0.1 DRAFT)

---

Prezado(a) `[NOME COUNSEL]`,

Encaminho para sua avaliação e parecer jurídico o documento **LIA (Legitimate Interest Assessment) v0.1 DRAFT** referente ao Epic 7 — captação automatizada de leads imobiliários para a Zona Sul de São Paulo (bairros de Moema, Vila Olímpia e Itaim Bibi), a ser operada pela consultora **Luciana Borba** em representação da **RE/MAX Galeria Moema**.

## Contexto resumido

A RE/MAX Galeria Moema, por meio da consultora Luciana Borba, está implementando um sistema interno de captação automatizada de leads de potenciais vendedores de imóveis publicados em portais públicos (ZAP Imóveis, OLX, VivaReal, MercadoLivre) e bases públicas (Receita Federal — CNPJ; Prefeitura SP — IPTU GeoSampa e ITBI; COFECI/CRECI). O sistema identifica anunciantes pessoa-física não-corretor (FISBO) por heurística determinística, armazena os dados em base cifrada e os apresenta à consultora para contato comercial regulamentado dentro do escopo CRECI.

A base legal proposta para o tratamento é o **legítimo interesse do controlador** (LGPD, Art. 7º, IX). A LIA anexa documenta, na estrutura recomendada pela ANPD:

1. Identificação do controlador e DPO (§1);
2. Finalidade do tratamento (§2);
3. Necessidade — análise da comoditização dos portais e impossibilidade competitiva sem captação automatizada (§3);
4. Adequação — origem pública dos dados, princípio da minimização aplicado, retenção de 90 dias para leads não convertidos, opt-out operacional (§4);
5. Balanceamento entre interesse legítimo e direitos do titular, com cinco medidas mitigatórias técnicas e contratuais (§5).

O **volume estimado para Wave A** é de **200 a 500 leads/mês**. Não há transferência ou comercialização dos dados a terceiros. Não há perfilagem sensível nem decisão automatizada com efeitos jurídicos sobre o titular.

## Por que envio agora

O Epic 7 está em fase de desenvolvimento (Sprint 1) e a Story 7.10 — LGPD Foundation — é **bloqueador formal de deploy** (nenhum scraper de pessoa física pode entrar em produção antes de a LIA estar aprovada e assinada). A urgência decorre da observação de que **a ANPD intensificou fiscalização em 2025** (27 processos abertos vs. soma 2020-2024 inferior) e a **MP 1.317/2025** transformou a agência em órgão regulatório autônomo, com a agenda 2025-2026 listando explicitamente *data scraping* e *data aggregators* como prioridade de fiscalização (referência: pesquisa interna `docs/research/2026-05-14-leads-zonasul-sp/04-validation-multi-llm.md`, item CQ-005). Embora **não tenhamos identificado sanção pública contra imobiliária ou martech imobiliária até a data deste documento**, o risco regulatório é classificado como **médio-baixo, em escalada**, e a precaução formal (LIA robusta + opt-out funcional + audit log ativo) é mitigação proporcional.

## Três perguntas-chave para o parecer

Solicito que o parecer responda, em particular, às seguintes questões:

### (a) Necessitamos apenas de LIA formal ou também de DPIA (Relatório de Impacto à Proteção de Dados Pessoais)?

A LGPD (Art. 38) prevê que a ANPD pode determinar a elaboração de DPIA "quando o tratamento for fundamentado em legítimo interesse". A literatura especializada (Mattos Filho, 2026; orientações ANPD 2024-2025) sugere que tratamentos automatizados de dados pessoais oriundos de scraping podem justificar DPIA mesmo sem determinação expressa. **Pergunta:** counsel entende que (i) a LIA é suficiente neste momento, (ii) DPIA deve ser elaborada complementarmente como precaução, ou (iii) DPIA é estritamente exigível para este caso de uso?

### (b) A retenção de 90 dias para leads não convertidos é adequada?

Propomos retenção de 90 dias com anonimização automática após esse prazo para leads que não evoluíram para contato comercial efetivo (vide §4.3 da LIA). **Pergunta:** counsel entende que (i) 90 dias é prazo razoável e proporcional, (ii) prazo menor (ex.: 30 ou 60 dias) seria mais aderente ao princípio da necessidade, ou (iii) prazo maior seria justificável dado o ciclo natural de decisão de venda imobiliária (estimado em meses)?

### (c) Há precedente ou orientação nacional RE/MAX para captação online de leads imobiliários?

Não foi possível identificar publicamente sanção, jurisprudência ou orientação ANPD específica para captação online no setor imobiliário até a data deste documento. **Pergunta:** counsel tem conhecimento de (i) orientação interna da rede RE/MAX (nacional ou internacional) que regulamente captação automatizada, (ii) precedente jurisprudencial ou administrativo relevante no setor imobiliário brasileiro, ou (iii) recomendação específica de boas práticas ou postura conservadora que devamos adotar adicionalmente às medidas listadas na §5.4 da LIA?

## Outros itens em revisão (vide §8 da LIA, "Anexos requeridos do counsel")

Além das três perguntas-chave, o §8 da LIA lista dez itens (A1-A10) cuja revisão / preenchimento por counsel é necessária para a finalização do documento, incluindo a designação formal do DPO, o texto da Política de Privacidade canônica, o modelo de Termo Interno de Confidencialidade entre RE/MAX e a operadora, e os DPAs com operadores técnicos (Vercel, Supabase). Solicito orientação sobre quais desses itens podem ser tratados na mesma janela de revisão e quais demandam reuniões separadas.

## Prazo solicitado

Solicito retorno do parecer e desta LIA assinada (ou comentada para revisão) no **prazo de até 15 dias úteis** a partir do recebimento desta cover letter. Estamos à disposição para uma reunião de alinhamento conforme conveniência, presencial ou por videoconferência.

Caso necessite de qualquer informação técnica adicional sobre a arquitetura de cifragem, audit log, opt-out ou retenção, posso fornecer documentação técnica detalhada ou organizar reunião com o time técnico.

Agradeço desde já a atenção e permaneço à disposição.

Cordialmente,

**Morgan**
Project Manager — Real State Moema (RE/MAX Galeria Moema — projeto interno)
`[CONTATO E-MAIL — A PREENCHER]`
`[CONTATO TELEFONE — A PREENCHER]`

---

**Anexos enviados juntamente:**

1. `lia-epic7.md` (v0.1 DRAFT) — documento principal de Avaliação de Legítimo Interesse, 10 seções
2. `docs/stories/7.10.story.md` (referência — Story que materializa as obrigações técnicas)
3. `docs/research/2026-05-14-leads-zonasul-sp/04-validation-multi-llm.md` (referência — pesquisa de baseline regulatório CQ-005)

---

*Documento gerado pelo Project Management em 2026-05-18 para envio ao counsel RE/MAX Galeria Moema. Preencher placeholders `[A PREENCHER]` antes do envio formal.*
