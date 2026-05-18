# Avaliação de Legítimo Interesse (LIA) — Epic 7

**Documento:** Legitimate Interest Assessment (LIA) — captação automatizada de leads imobiliários (Zona Sul SP)
**Base Legal:** Lei nº 13.709/2018 (LGPD), Art. 7º, IX — legítimo interesse do controlador ou de terceiro
**Versão:** v0.1 DRAFT — pendente revisão e assinatura por counsel jurídico
**Status:** DRAFT (não aprovado)
**Data de elaboração:** 2026-05-18
**Elaborado por:** Morgan (Project Management) em coordenação com end-user Luciana Borba (RE/MAX Galeria Moema)
**Aprovação counsel:** [A PREENCHER — Nome, OAB, Data]
**Próxima revisão:** 12 meses após aprovação OU em caso de mudança material no processamento

> ⚠️ **Aviso:** Este documento NÃO está em vigor. Constitui minuta para revisão jurídica. Nenhum scrape de dados pessoais (PF) deve ser executado em produção antes da aprovação formal por counsel da RE/MAX Galeria Moema e assinatura desta LIA. Referência: Story 7.10 AC1 (BLOQUEADOR de deploy Wave A).

---

## 1. Identificação do Controlador

| Campo | Valor |
|---|---|
| **Razão Social / Nome** | RE/MAX Galeria Moema (franquia local) |
| **CNPJ** | `[CNPJ RE/MAX GALERIA — A PREENCHER]` |
| **Endereço** | `[ENDEREÇO COMPLETO — A PREENCHER]` |
| **Município / UF** | São Paulo / SP |
| **Atividade Econômica (CNAE)** | 6822-6/00 — Gestão e administração de propriedade imobiliária (atividade primária a confirmar com counsel) |
| **Representante legal** | `[NOME REPRESENTANTE LEGAL — A PREENCHER]` |
| **Operadora end-user (consultora)** | Luciana Borba |
| **CPF da operadora** | `[CPF LUCIANA — A PREENCHER]` |
| **CRECI** | `[NÚMERO CRECI — A PREENCHER]` |
| **Encarregado pelo Tratamento de Dados (DPO)** | `[NOME DPO — A PREENCHER]` |
| **E-mail DPO** | `[dpo@remaxgaleriamoema.com.br — A PREENCHER OU CONFIRMAR]` |
| **Telefone DPO** | `[A PREENCHER]` |
| **Canal de contato titular (opt-out)** | URL pública: `/lgpd/opt-out` (a ser publicada antes do go-live) |

**Operador (subcontratado para finalidade técnica):** infraestrutura hospedada em provedores em nuvem (Vercel Inc. — frontend; Supabase Inc. — banco de dados); proxies residenciais (provedor a definir em Story 7.4); cada operador será objeto de contrato específico de tratamento de dados conforme Art. 39 da LGPD.

---

## 2. Finalidade do Tratamento

### 2.1 Finalidade primária

Captação ativa de leads de interesse imobiliário (potenciais vendedores e/ou compradores) na Zona Sul do município de São Paulo — bairros de Moema, Vila Olímpia, Itaim Bibi e adjacências — para subsidiar a atividade comercial regular da RE/MAX Galeria Moema (intermediação imobiliária), exercida pela consultora Luciana Borba.

### 2.2 Operações de tratamento previstas

1. **Coleta** automatizada de anúncios públicos de imóveis em portais imobiliários (ZAP Imóveis, OLX, VivaReal, MercadoLivre) e bases públicas governamentais (Receita Federal — CNPJ; Prefeitura SP — IPTU GeoSampa e ITBI; COFECI/CRECI — consulta de corretores).
2. **Identificação heurística** de anunciantes pessoa-física não-corretor (FISBO — *For Sale By Owner*) por meio de sinais determinísticos: ausência de registro CRECI, telefone móvel pessoal, ausência de nomenclatura empresarial.
3. **Armazenamento estruturado** dos dados identificados (nome anunciante, telefone, endereço do imóvel anunciado, valor do anúncio, fonte) em banco de dados cifrado em repouso.
4. **Apresentação** desses leads à consultora Luciana Borba em interface de gestão (CRM interno), com possibilidade de contato comercial direto pela consultora dentro do escopo profissional regulamentado pelo COFECI/CRECI.
5. **Anonimização** automática após 90 dias para leads não convertidos em contato comercial efetivo (ver §4.3).

### 2.3 Volume estimado (Wave A)

200 a 500 leads/mês durante o período inicial (Wave A). Volumes superiores acionarão reavaliação desta LIA conforme §6.

### 2.4 Finalidades secundárias

- Análise estatística agregada para melhoria do produto (sem reidentificação).
- Conformidade regulatória (audit log obrigatório por força do Art. 37 da LGPD).

### 2.5 Finalidades vedadas (out-of-scope)

- **Não** será realizada comercialização, transferência ou redistribuição dos dados pessoais coletados a terceiros (vide §5, medida mitigatória 5).
- **Não** serão realizadas decisões automatizadas com efeitos jurídicos sobre o titular (Art. 20, LGPD).
- **Não** será realizada perfilagem comportamental sensível (preferências políticas, religiosas, étnicas, de saúde — Art. 5º, II da LGPD).
- **Não** serão coletados, em hipótese alguma, dados pessoais sensíveis ou identificadores civis (CPF, RG do titular anunciante), conforme princípio da minimização (§4.2).

---

## 3. Necessidade

### 3.1 Análise da necessidade — por que captação automatizada é necessária

O mercado de captação imobiliária em São Paulo apresenta, ao longo de 2024-2026, um processo acentuado de **comoditização dos portais tradicionais** (ZAP, OLX, VivaReal): a maior parte dos anúncios oriundos desses portais já está sob negociação ativa com múltiplos corretores no momento em que se torna visível ao mercado. Em consequência:

1. **Janela de oportunidade comercial reduzida** — leads FISBO permanecem disponíveis (sem corretor exclusivo) por janelas curtas (estimativa interna: 7-21 dias mediano) antes de serem captados por concorrência ou retirados do mercado.
2. **Impossibilidade prática de captação manual em escala** — varredura humana de 4+ portais simultâneos, cruzamento com bases públicas (CRECI, IPTU, ITBI) e priorização heurística excede capacidade individual de consultora pessoa-física exercendo atividade comercial regulamentada.
3. **Assimetria competitiva contra martechs** — operadores de tecnologia (REDX, Vulcan7 nos EUA; emergentes no Brasil) já operam essa heurística há anos. Imobiliárias boutique sem capacidade equivalente perdem competitividade estrutural.
4. **Inviabilidade de alternativas menos invasivas** — fontes pagas (Brasil Imóveis, AppFolio) cobrem dados comerciais, não capturam FISBO; redes sociais e propaganda paga não substituem identificação proativa de vendedor.

### 3.2 Conclusão sobre necessidade

A captação automatizada — limitada a dados pessoais já publicados pelo próprio titular em portais públicos para finalidade explícita de venda — é **necessária** para que a RE/MAX Galeria Moema exerça sua atividade comercial regular nas condições competitivas atuais do mercado imobiliário Zona Sul SP. A inação implicaria impossibilidade prática de operação.

> **Caveat conservador:** Esta análise pressupõe que counsel valide a tese de "necessidade" no sentido jurídico estrito do Art. 7º, IX. Se counsel entender que a finalidade pode ser atingida com tecnologia menos invasiva (ex.: apenas portais com opt-in explícito do anunciante), esta seção deverá ser revisada.

---

## 4. Adequação

### 4.1 Adequação ao titular e à finalidade

O tratamento aqui descrito é **adequado** à finalidade (§2) e proporcional aos riscos ao titular pelos seguintes fundamentos:

1. **Origem pública dos dados:** apenas dados que o próprio titular tornou públicos voluntariamente em portais de anúncios imobiliários, com finalidade declarada de venda, são coletados. A LGPD prevê regime especial para dados manifestamente tornados públicos pelo titular (Art. 7º, §3º).
2. **Compatibilidade de finalidade:** o anunciante publica seu telefone em portal imobiliário precisamente com a finalidade de ser contatado para fins de transação do imóvel. O contato comercial de consultora imobiliária regulamentada CRECI é compatível com — e antecipável a partir de — essa expressão original de finalidade.
3. **Identificação clara do operador:** todo contato comercial derivado desta captação será conduzido pela consultora Luciana Borba (CRECI identificável), em representação da RE/MAX Galeria Moema, com identificação completa no primeiro contato. Não há contato anônimo, automático ou em massa.
4. **Não há tomada de decisão automatizada** com efeitos jurídicos sobre o titular (Art. 20, LGPD).

### 4.2 Princípio da minimização — dados coletados

Em estrita observância ao princípio da minimização (Art. 6º, III, LGPD), serão coletados **apenas** os seguintes campos:

| Categoria | Campo | Coletado? | Justificativa |
|---|---|---|---|
| Identificação titular | Nome do anunciante | **Sim** | Necessário para contato comercial personalizado |
| Identificação titular | Telefone do anunciante (incluindo WhatsApp) | **Sim** | Único canal viável de contato comercial; publicado pelo próprio titular |
| Identificação titular | E-mail do anunciante (se publicado) | **Sim, condicional** | Apenas se publicamente exposto; canal secundário |
| Identificação imóvel | Endereço do imóvel anunciado | **Sim** | Necessário para qualificação geográfica (foco Zona Sul) |
| Identificação imóvel | Valor do anúncio | **Sim** | Necessário para qualificação comercial |
| Identificação imóvel | Características públicas (metragem, dormitórios) | **Sim** | Já contidas no anúncio público |
| **Identificadores civis sensíveis** | **CPF do titular** | **NÃO** | Vedado por minimização — não é necessário para contato comercial |
| **Identificadores civis sensíveis** | **RG do titular** | **NÃO** | Vedado por minimização |
| **Dados sensíveis (Art. 5º, II)** | **Estado civil, raça, religião, opinião política, saúde** | **NÃO** | Vedado |
| **Foto/texto integral do anúncio** | Imagem original | **NÃO armazenada integralmente** | Apenas metadata estruturada; texto descritivo é parseado e descartado (vide Story 7.10 AC10) |
| **Dados de geolocalização do titular** | Localização em tempo real do anunciante | **NÃO** | Vedado |
| **Dados de redes sociais** | Perfis sociais cruzados | **NÃO em Wave A** | Pode ser reavaliado em Wave futura com nova LIA |

### 4.3 Política de retenção (Art. 15 e 16, LGPD)

| Cenário | Retenção | Ação ao fim do prazo |
|---|---|---|
| Lead **não contatado** após 90 dias da coleta | 90 dias | **Anonimização automática** (nome, telefone, e-mail substituídos por NULL; mantém apenas dados estatísticos não-identificáveis) |
| Lead **contatado** mas sem evolução comercial | 12 meses do último contato | Anonimização (idem) |
| Lead **convertido** em relacionamento comercial efetivo | Durante vigência do contrato + 5 anos (prazo de conservação fiscal CRECI/Receita) | Mantido sob base legal contratual (Art. 7º, V), não mais legítimo interesse |
| Solicitação de exclusão pelo titular (opt-out) | Processamento em até 15 dias | Anonimização imediata (não DELETE — preserva audit log de compliance) |
| Audit log LGPD (registros de operação) | Indefinida durante Wave A | Reavaliada por counsel em Wave C para fixar prazo |

### 4.4 Opt-out — canal de exercício de direitos do titular

- **Endpoint público de opt-out:** `https://[dominio-a-definir]/lgpd/opt-out` — formulário web acessível sem autenticação, permitindo ao titular solicitar a exclusão de seus dados informando telefone ou e-mail (Story 7.10 AC8).
- **SLA:** processamento em até **15 dias corridos** (compatível com prazo de 15 dias para retorno ao titular previsto no Art. 19, §1º da LGPD).
- **Protocolo:** ao submeter solicitação, o titular recebe número de protocolo único para acompanhamento.
- **Comunicação:** o processamento e sua conclusão são comunicados ao titular por e-mail ou telefone informado.
- **Página de Política de Privacidade:** `https://[dominio-a-definir]/lgpd/politica-privacidade` — explicação canônica em português acessível, incluindo: identificação do controlador, finalidade, base legal, direitos do titular (Art. 18 LGPD), canais de contato, prazo de retenção, instruções de opt-out.

### 4.5 Direitos do titular garantidos (Art. 18, LGPD)

Os seguintes direitos são operacionalizados pelos canais descritos em §4.4:

- (I) confirmação da existência de tratamento;
- (II) acesso aos dados;
- (III) correção de dados incompletos, inexatos ou desatualizados;
- (IV) anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;
- (V) portabilidade dos dados (atendida sob demanda, não automatizada em Wave A);
- (VI) eliminação dos dados pessoais tratados com consentimento (não aplicável a esta base; mas opt-out via legítimo interesse opera de forma equivalente);
- (VII) informação sobre entidades públicas e privadas com as quais o controlador compartilhou dados (nenhuma — vide §5 medida 5);
- (VIII) informação sobre a possibilidade de não fornecer consentimento (não aplicável — base não é consentimento);
- (IX) revogação do consentimento (não aplicável — opt-out funcional equivalente).

---

## 5. Balanceamento (Teste de Proporcionalidade)

### 5.1 Estrutura do teste

Conforme Art. 10, §3º e Art. 7º, IX da LGPD, o tratamento com fundamento em legítimo interesse exige balanceamento entre o **interesse legítimo do controlador** e os **direitos e liberdades fundamentais do titular**, com adoção de **medidas mitigatórias** que reduzam o impacto sobre o titular.

### 5.2 Interesse legítimo do controlador

| Dimensão | Avaliação |
|---|---|
| Natureza do interesse | Comercial regulamentado (atividade imobiliária CRECI) — interesse legítimo expresso |
| Necessidade | Estrutural (vide §3) — sem captação automatizada, inviabilidade competitiva |
| Compatibilidade com expectativa razoável do titular | **Alta** — anunciante que publica telefone em portal imobiliário razoavelmente espera contato comercial de corretor para a finalidade que ele próprio declarou (venda) |

### 5.3 Direitos e liberdades fundamentais do titular potencialmente impactados

| Direito (Art. 17, LGPD) | Risco | Mitigação |
|---|---|---|
| Privacidade | Médio-baixo — dados já públicos por iniciativa do titular | Cifragem em repouso (M2); minimização (§4.2); sem perfilagem sensível (M4) |
| Autodeterminação informativa | Médio — titular pode não esperar agregação cross-portal | Opt-out público acessível (M1); página de Política de Privacidade clara |
| Não-discriminação (Art. 6º, IX) | Baixo — nenhuma decisão automatizada com efeito jurídico | Sem profiling sensível (M4); contato é humano (Luciana) |
| Liberdade de comunicação | Baixo — contato comercial regulamentado CRECI tem moldura legal própria | Identificação clara do operador no contato; respeito a opt-out comercial |

### 5.4 Medidas mitigatórias adotadas

As cinco medidas mitigatórias abaixo são **obrigatórias** para que o tratamento prossiga sob a base de legítimo interesse. Ausência de qualquer uma invalida o LIA:

| # | Medida | Implementação técnica | Story / Migration |
|---|---|---|---|
| **M1** | **Opt-out endpoint público acessível e operacional** | Endpoint `POST /api/lgpd/opt-out` + página web `/lgpd/opt-out` com formulário e captcha, sem autenticação obrigatória, processamento em até 15 dias. | Story 7.10 AC5, AC8; rota `app/src/app/lgpd/opt-out/page.tsx` |
| **M2** | **Cifragem de PII em repouso** | Campos nome, telefone, e-mail e WhatsApp cifrados em coluna no Supabase via `pgp_sym_encrypt` (pgcrypto) ou Supabase Vault; chave gerenciada em variável de ambiente `LGPD_ENCRYPTION_KEY`; rotação semestral. | Story 7.10 AC2; migration 017 |
| **M3** | **Audit log de cada acesso a PII** | Tabela `lgpd_audit` registra todo evento de coleta, revelação (decrypt), exportação, anonimização ou solicitação de opt-out, com user_id, ação, base legal, timestamp e evidência. Acesso restrito a admin via RLS. | Story 7.10 AC3, AC4; migration 017 |
| **M4** | **Vedação a perfilagem sensível** | Nenhum atributo do Art. 5º, II (raça, religião, política, saúde, etc.) é coletado, derivado ou inferido. Nenhuma decisão automatizada com efeitos jurídicos é tomada (Art. 20). Heurística FISBO é determinística e não opera sobre dados sensíveis. | Story 7.10 AC10; revisão de código |
| **M5** | **Acordo de não-redistribuição e finalidade restrita** | Termo interno firmado entre RE/MAX Galeria Moema e operadora Luciana Borba vedando comercialização, transferência ou redistribuição dos dados captados a terceiros. Operadores técnicos (Vercel, Supabase) sob contrato de tratamento conforme Art. 39 LGPD. | Cláusula contratual + DPA (Data Processing Agreement) — a redigir por counsel |

### 5.5 Veredito (sujeito à validação por counsel)

Considerando (i) a natureza pública das fontes, (ii) a compatibilidade entre finalidade originalmente declarada pelo titular e o uso pretendido, (iii) a aplicação rigorosa do princípio da minimização, (iv) a operacionalização de opt-out e direitos do titular, e (v) a adoção das cinco medidas mitigatórias (M1-M5), entende-se — **sob ressalva de validação por counsel** — que o **interesse legítimo do controlador prevalece** sobre os direitos potencialmente impactados do titular, e que o tratamento descrito é **proporcional, necessário e adequado** à finalidade declarada.

> ⚠️ **Importante:** esta conclusão é uma proposta técnica do PM; sua admissibilidade jurídica depende de revisão e assinatura por counsel.

### 5.6 Sinais de risco a monitorar

A LIA deve ser **reavaliada** se:

- A ANPD publicar **primeira sanção** contra empresa do setor imobiliário ou martech imobiliária por captação online (sinal forte de mudança regulatória — referência: CQ-005 wave 2 research).
- O volume mensal ultrapassar **10.000 leads/mês** (escala desencadeia revisão por especialista privacy).
- Surgir **nova resolução da ANPD** específica para scraping/data aggregators (MP 1.317/2025 transformou ANPD em agência regulatória; agenda 2025-2026 lista *data scraping e data aggregators* como prioridade explícita).
- For introduzido qualquer **novo tipo de dado coletado** não listado em §4.2.
- For introduzido qualquer **novo canal de captação** (ex.: redes sociais, Telegram, WhatsApp Business API).
- Verificar-se **volume anormal de opt-outs** (acima de 5% dos contactos) — indicador de incompatibilidade entre tratamento e expectativa do titular.

---

## 6. Vigência e Revisão

| Item | Valor |
|---|---|
| Data de elaboração | 2026-05-18 |
| Data prevista de aprovação por counsel | `[A PREENCHER após revisão]` |
| Vigência inicial | 12 meses a partir da aprovação |
| Próxima revisão obrigatória | 12 meses após aprovação OU em caso de gatilhos da §5.6 |
| Responsável pela revisão | Encarregado (DPO) + counsel jurídico RE/MAX Galeria Moema |

---

## 7. Aprovações

| Papel | Nome | Assinatura | Data |
|---|---|---|---|
| Controlador (representante legal) | `[A PREENCHER]` | _____________________ | __ /__ /____ |
| Encarregado (DPO) | `[A PREENCHER]` | _____________________ | __ /__ /____ |
| Counsel jurídico RE/MAX | `[A PREENCHER — Nome + OAB]` | _____________________ | __ /__ /____ |
| Operadora end-user (ciência) | Luciana Borba | _____________________ | __ /__ /____ |
| Project Manager (elaboração) | Morgan (Real State Moema — PM) | _____________________ | 2026-05-18 |

---

## 8. Anexos requeridos do counsel

Checklist de itens que **counsel deve fornecer, preencher ou validar** antes da aprovação formal:

- [ ] **A1.** Confirmação de personalidade jurídica e CNPJ ativo da RE/MAX Galeria Moema (cartão CNPJ atualizado).
- [ ] **A2.** Designação formal do Encarregado pelo Tratamento de Dados (DPO) — nome, e-mail e telefone públicos, conforme Art. 41 LGPD.
- [ ] **A3.** Parecer jurídico sobre a admissibilidade da base legal "legítimo interesse" (Art. 7º, IX) para este caso de uso específico, com manifestação expressa sobre:
  - (a) suficiência da LIA isoladamente ou necessidade complementar de DPIA (*Data Protection Impact Assessment*, Art. 38) — vide pergunta-chave (a) da cover letter;
  - (b) adequação do prazo de retenção de **90 dias** para leads não convertidos — vide pergunta-chave (b);
  - (c) existência ou não de precedente, orientação nacional RE/MAX, jurisprudência ou enforcement pela ANPD relevante para captação online no setor imobiliário — vide pergunta-chave (c).
- [ ] **A4.** Revisão e ajuste do texto da **Política de Privacidade** canônica a ser publicada em `/lgpd/politica-privacidade` (Story 7.10 AC7), incluindo Decreto 11.793/2023 e Resoluções ANPD aplicáveis.
- [ ] **A5.** Revisão e ajuste do texto do **formulário de opt-out** público (Story 7.10 AC8) — texto explicativo, declaração de prazo, captura de evidência.
- [ ] **A6.** Modelo de **Termo Interno de Confidencialidade e Não-Redistribuição** a ser firmado entre RE/MAX Galeria Moema e a operadora Luciana Borba (medida mitigatória M5).
- [ ] **A7.** Modelo de **Data Processing Agreement (DPA)** com operadores técnicos (Vercel, Supabase, provedor de proxies) — Art. 39 LGPD.
- [ ] **A8.** Avaliação da necessidade de **registro do tratamento na ANPD** (atualmente facultativo para tratamento corriqueiro, mas pode ser exigido se categoria de risco for elevada).
- [ ] **A9.** Manifestação sobre a **retenção indefinida do audit log** durante Wave A (proposta atual) — adequação ao princípio da necessidade e definição de prazo limite.
- [ ] **A10.** Assinatura formal desta LIA (rubricar todas as folhas + assinatura final em §7).

---

## 9. Histórico de versões

| Versão | Data | Autor | Notas |
|---|---|---|---|
| v0.1 DRAFT | 2026-05-18 | Morgan (PM) | Minuta inicial elaborada com base em Story 7.10 AC1; pendente revisão por counsel RE/MAX |

---

## 10. Referências

- **Lei nº 13.709/2018 (LGPD)** — em especial Arts. 5º, 6º, 7º (IX), 10, 15, 16, 17, 18, 19, 20, 37, 38, 39, 41
- **Decreto nº 11.793/2023** — regulamenta a estrutura da ANPD
- **Resolução CD/ANPD nº 4/2023** — regula o processo administrativo sancionatório
- **MP nº 1.317/2025** — transforma a ANPD em agência reguladora autônoma (set/2025)
- **Research interno:** `docs/research/2026-05-14-leads-zonasul-sp/04-validation-multi-llm.md` — CQ-005 (jurisprudência LGPD imobiliária 2025-2026)
- **Story relacionada:** `docs/stories/7.10.story.md` (LGPD Foundation — bloqueador de Wave A)
- **Cover letter para counsel:** `docs/legal/lia-epic7-cover-letter.md`
