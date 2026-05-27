# 03 — Recommendations (Wave 1)

**Pipeline:** tech-research v3.2
**Wave:** 1 (Discovery)
**Data:** 2026-05-14
**Status:** Recomendações priorizadas — sem código de produção

> Priorização:
> - **P0** — Fundação obrigatória para Epic 7 funcionar
> - **P1** — Diferencial competitivo / aceleração
> - **P2** — Maturidade / 2ª onda
>
> Cada recomendação inclui: **trade-offs explícitos**, **risco**, **next step concreto**.

---

## SQ-1 — Tipologia de leads

### REC-1.1 [P0] — Adotar taxonomia de 5 categorias (A-E) no schema do CRM

Categorias A=FISBO, B=Imobiliária, C=Construtora, D=Administradora, E=PJ/Holding (ver 02 §SQ-1).

- **Trade-off:** Granularidade vs simplicidade. 5 categorias é o mínimo defensável; menos perde o ângulo FISBO; mais (subdividir construtora por porte) é overengineering.
- **Risco:** Classificação errada vira approach errado → atrito com lead. Mitigação: heurística é hipótese, status só "confirma" após primeira conversa.
- **Next step:** @data-engineer adicionar `lead_type ENUM('FISBO','IMOB','CONSTR','ADM','PJ_HOLD')` em `leads.classification` durante Wave 2.

### REC-1.2 [P0] — Heurística determinística antes de ML

Detector inicial regra-baseada (telefone DDD móvel + ausência CRECI + nome PF + único anúncio mesmo contato → FISBO). Validar com Luciana em batch de 100 anúncios.

- **Trade-off:** Recall menor que ML, mas explicabilidade total e zero custo de dados anotados.
- **Risco:** Falsos positivos em corretores autônomos (CPF + telefone pessoal). Mitigação: confidence-score baseado em quantos sinais convergem; tela manual review para confidence < 70%.
- **Next step:** @architect desenhar `lead_classifier_v1` como tarefa SQL/Python pura, sem LLM.

### REC-1.3 [P1] — NLP do anúncio só após baseline

Classificador NLP (urgência, motivação) só faz sentido após heurística estabilizar e Luciana validar 200+ leads anotados.

- **Trade-off:** Tempo até valor adicional vs sofisticação prematura.
- **Next step:** Backlog Wave 2 do Epic 7.

---

## SQ-2 — Bases públicas

### REC-2.1 [P0] — Ingest RFB CNPJ via `rictom/cnpj-sqlite`

Base mensal completa → SQLite local → ETL para Supabase (tabela `cnpj_enrichment`). Atualização cron mensal.

- **Trade-off:** Volume (~20GB dump completo). Recomendação: filtrar CNAEs imobiliários (CNAE 68.xx — atividades imobiliárias) durante ETL. Reduz para ~500MB.
- **Risco:** Dependência de schema que a RFB pode mudar (mudou em jan/2026). Mitigação: tests de schema no pipeline.
- **Next step:** @data-engineer prototipa ingestion filtrada por CNAE 68 e CNAEs adjacentes (administradoras, holdings).

### REC-2.2 [P0] — Ingest GeoSampa IPTU para Zona Sul

Download anual + filtragem por código de bairro (Moema 5710, Vila Olímpia 5728, Itaim Bibi 5728 também) → tabela `iptu_imovel`.

- **Trade-off:** IPTU cadastral **não tem CPF/CNPJ do proprietário** no dump aberto (privacidade). Tem matrícula, lote, m² construído, valor venal. Útil como **denominador geográfico** e cruzamento por endereço.
- **Risco:** Atualização anual pode atrasar. Mitigação: WFS API GeoSampa pode permitir pull incremental.
- **Next step:** @analyst valida exatamente quais campos o dump 2026 contém para Moema (ver Wave 2 curiosity).

### REC-2.3 [P0] — Ingest ITBI dataset SP

ITBI tem o **valor real de transação + CPF/CNPJ do adquirente** (a confirmar campos no dataset 2026). Backbone para o feature L3 "Δ vs preço médio ITBI".

- **Trade-off:** Janela temporal — ITBI sai com 1-2 meses de atraso. Para "motivado a vender agora" não ajuda diretamente; ajuda em **avaliação** (preço justo do bairro) e **densidade transacional**.
- **Risco:** Mudança de política de transparência → dataset pode ser pulled. Snapshot mensal para histórico.
- **Next step:** @analyst confirma campos disponíveis no dataset oficial PMSP/Fazenda.

### REC-2.4 [P1] — Sócios Brasil (turicas) para grafo PJ

Para categoria E (holding). Cruza CNPJ encontrado em anúncio → sócios PF → eventualmente outras holdings.

- **Trade-off:** LGPL-3.0 — copyleft. Usar como **CLI externo**, não importar como lib. Mitiga propagação de licença.
- **Risco:** LGPD — dados de sócios PF. Aplicar mesmas regras de PF.
- **Next step:** Wave 2.

### REC-2.5 [P2] — Cartório ONR só sob demanda

API ONR (RI Digital) exige CRECI do solicitante. Caro por consulta. Não é base de ingest; é **verificação spot** antes de abordar lead de alto valor.

- **Trade-off:** Custo R$/consulta vs garantia jurídica de titularidade.
- **Next step:** Avaliar na 2ª onda (fontes pagas).

---

## SQ-3 — Scraping ético + anti-bot

### REC-3.1 [P0] — Manter Apify para ZAP/OLX/VivaReal

Epic 6 já cobre. Não reinventar. Custo Apify por actor é baixo para volumes Zona Sul.

- **Trade-off:** Lock-in Apify vs velocidade. Aceito.

### REC-3.2 [P0] — Expandir com Crawlee self-hosted para ImovelWeb + MercadoLivre

Crawlee TS (já que stack é Next.js) ou Crawlee Python. Roda em Vercel cron + Supabase Edge Functions, ou worker dedicado.

- **Trade-off:** Operação (infra, proxy) vs custo Apify. Para portais com anti-bot leve, Crawlee custa menos a partir de ~10k crawls/mês.
- **Risco:** ImovelWeb DataDome quebra Crawlee vanilla. Mitigação: começar pelo MercadoLivre (mais fácil), adiar ImovelWeb.
- **Next step:** @architect avalia Crawlee TS vs Python no Wave 2 (decisão por linguagem do squad).

### REC-3.3 [P1] — Telegram via API oficial

Canais públicos imobiliários BR (poucos, mas existem). Usar Telethon ou Pyrogram. API oficial, fluxo limpo.

- **Trade-off:** Cobertura pequena vs custo zero de implementação.
- **Risco:** LGPD — mensagens em canais públicos com PF. Tratar como qualquer outro PF.
- **Next step:** Backlog Epic 7 Wave 2.

### REC-3.4 [P2] — Facebook Marketplace fora de escopo Wave 1

ToS Meta + complexidade técnica + LGPD alto risco. Não compensa para volume Zona Sul.

- **Decisão:** Não fazer agora. Reavaliar em 6 meses se houver demanda Luciana.

### REC-3.5 [P0] — Política `robots.txt` + `ai.txt` aware

Toda crawler nova respeita robots.txt e ai.txt (novo padrão 2026). Header User-Agent identifica corretamente. Rate limit ≤ 1 req/s default.

- **Trade-off:** Velocidade vs ética + risco bloqueio.
- **Next step:** @architect codifica em "Scraping Policy" do Epic 7.

---

## SQ-4 — OSS candidates

### REC-4.1 [P0] — Top 3 candidatos para Phase 3 (bench-analyst)

| Rank | Projeto | Por quê |
|---|---|---|
| 1 | **apify/crawlee** | Fundação técnica do scraping ampliado. Maturidade incontestável (23k⭐ Apache 2.0). |
| 2 | **rictom/cnpj-sqlite** | Materializa imediatamente o enriquecimento CNPJ. Ativo, MIT, escopo limpo. |
| 3 | **Bunsly/HomeHarvest** | **Não para uso direto** (US-only), mas para **engenharia reversa de arquitetura** (code-anatomy Fase 4) — ele resolveu o problema isomorfo no mercado US. |

- **Trade-off:** HomeHarvest não é fit BR direto, mas seus padrões de design (anti-bot, schema MLS-like, async paginated extraction) são **referência canônica** que poupará tempo de design.
- **Next step:** Spy-bench-analyst (Fase 3) compara:
  - `apify/crawlee` vs raw Playwright
  - `rictom/cnpj-sqlite` vs `aphonsoar/Receita_Federal_CNPJ` (estagnado)
  - `Bunsly/HomeHarvest` (engenharia reversa, Fase 4 code-anatomist)

### REC-4.2 [P1] — Considerar `xBooster` para scoring explicável

Quando o squad chegar em ML de scoring (após heurística baseline), xBooster oferece XGBoost+scorecard explicável out-of-the-box. Lib pequena (57⭐, MIT, ativo).

- **Trade-off:** Lib jovem (poucos contributors) → fork risk. Aceitar e ter plano B (sklearn-only scorecard).

### REC-4.3 [P2] — `etewiah/awesome-real-estate` como referência discovery

Curadoria útil para descobrir projetos adicionais. Não tem código, só links.

---

## SQ-5 — Arquitetura

### REC-5.1 [P0] — Stack híbrida ETL + Agentic

```
Camada 1 — DURABILIDADE/ETL:  Prefect ou cron-Supabase Edge Functions (start simple)
Camada 2 — DECISÃO LLM:        LangGraph (apenas onde há decisão LLM)
```

- **Trade-off:** Duas camadas vs uma. A separação é vital — usar LangGraph para tudo é caro (token cost) e mais lento. Usar Prefect para tudo perde flexibilidade de decisão agentic.
- **Risco:** Squad pequeno aprender dois frameworks. Mitigação: começar **só com cron-Supabase** para Wave 1 do Epic 7. LangGraph entra **só** quando classificador NLP for adicionado (Wave 2-3 do Epic).
- **Next step:** @architect bate o martelo após bench Fase 3 LangGraph vs CrewAI (recomendamos LangGraph pelo padrão emergente enterprise 2026 — 34% citações).

### REC-5.2 [P1] — Não adotar Temporal agora

Temporal é overkill para volume Zona Sul (~milhares de leads/mês). Reavaliar quando volume passar 100k/mês ou houver workflows > 1h de duração.

- **Trade-off:** Sofisticação vs operação. Aceito.

### REC-5.3 [P2] — Não adotar AutoGen

Microsoft pivotou para Agent Framework. AutoGen entrou em modo manutenção. Não vale adotar agora.

---

## SQ-6 — Lead Scoring

### REC-6.1 [P0] — Scorecard heurístico v1 (sem ML)

Implementar em SQL/Python puro. Features L1 + L2 + L3 selecionadas (não todas, ~8 features). Pesos definidos com Luciana em workshop.

- **Trade-off:** Não captura interações não-lineares. Aceito como baseline.
- **Risco:** Pesos viesados pela intuição Luciana. Mitigação: tracking de outcome ("este lead virou venda?") para refinar.
- **Next step:** @analyst + Luciana definem pesos em workshop de 2h.

### REC-6.2 [P1] — XGBoost calibrado após 200+ leads anotados

Após 200 leads com label binário "vale abordar" (Luciana classifica), treinar XGBoost + calibração Platt. Score 0-100 fica probabilidade.

- **Trade-off:** Necessita pipeline de labels (interface CRM para Luciana marcar). Custo de UX.
- **Next step:** Backlog Epic 7 Wave 2 — story "interface de label scoring".

### REC-6.3 [P2] — Uplift modeling

Só faz sentido após ter dados de **campanha A/B** (abordagem X vs Y). Estágio maduro do produto. Reservado.

### REC-6.4 [P0] — Features cross-base são o diferencial

A heurística do nº 1.2 + ML do 1.3 só fica forte com **features cross-base**:
- Δ vs preço médio ITBI bairro (vem do SQ-2)
- CNPJ holding com várias unidades (vem do SQ-2)
- Tempo no portal + Δ preço (vem do SQ-3)

Sem o ETL público funcionando (REC-2.1, REC-2.2, REC-2.3), scoring será pobre.

---

## SQ-7 — LGPD

### REC-7.1 [P0] — LIA antes de qualquer ingestão

Legitimate Interest Assessment escrita por advogado (Luciana já tem RE/MAX legal?) **antes** de o primeiro scraper rodar contra contato pessoal.

- **Trade-off:** Atraso ~2 semanas vs lastro jurídico.
- **Risco:** Não fazer = ANPD precedent contra. Sanção até 2% receita ou R$ 50M/infração.
- **Next step:** @pm coordena LIA com counsel. Bloqueia entrega Epic 7 P0 se não pronta.

### REC-7.2 [P0] — Política privacidade + canal opt-out

Página pública + endpoint `/api/lgpd/opt-out` no Next.js + processo manual (email/WhatsApp) acessível.

- **Trade-off:** UX overhead vs compliance.
- **Next step:** @ux-design-expert + @architect na Wave 5 (stories).

### REC-7.3 [P0] — Minimização: não armazenar foto + texto integral

Snapshot da listagem em "hash + metadata extraída" não em conteúdo bruto. Foto referenciada via URL portal (não rehosted).

- **Trade-off:** Se portal removeu anúncio, perdemos a evidência. Aceito.
- **Risco:** Republicação inadvertida (foto+texto) = autoral. Mitigação: política técnica de "extract only".

### REC-7.4 [P0] — Cifragem em repouso de contatos PF

Supabase Vault ou pgcrypto. Telefones/emails encriptados na coluna; decifrar só no momento da exibição ao consultor com permissão.

- **Trade-off:** Performance leve, complexidade média.

### REC-7.5 [P0] — Audit log de extração

Tabela `lgpd_audit` com (`user_id`, `lead_id`, `action`, `legal_basis`, `timestamp`). Permite responder a request LGPD em SLA legal (15 dias).

### REC-7.6 [P1] — WhatsApp/Telegram grupos privados FORA DE ESCOPO

Risco-recompensa não compensa Wave 1. Reavaliar pós-produção.

### REC-7.7 [P2] — Compartilhamento entre consultores (FR-017)

Exige contrato específico de compartilhamento + termo consultor → Wave 2 do Epic 7 stories.

---

## Roadmap proposto — Resumo executivo

### Wave A (Epic 7.1 — 2-3 sprints)

P0 obrigatórios: REC-1.1, REC-1.2, REC-2.1 (CNPJ), REC-2.2 (IPTU), REC-2.3 (ITBI), REC-3.1, REC-3.2 (MercadoLivre apenas), REC-3.5, REC-5.1 (sem LangGraph ainda), REC-6.1, REC-6.4, REC-7.1, REC-7.2, REC-7.3, REC-7.4, REC-7.5.

### Wave B (Epic 7.2 — 2-3 sprints)

P1: REC-1.3 (NLP), REC-2.4 (sócios), REC-3.2 (ImovelWeb), REC-3.3 (Telegram), REC-4.2 (xBooster), REC-5.1 LangGraph entra, REC-6.2 (XGBoost).

### Wave C (Epic 7.3 — futuro)

P2: REC-2.5 (Cartório pago), REC-6.3 (uplift), REC-7.7 (compartilhamento consultores), 2ª onda fontes pagas.

---

**Próximo artefato:** `wave-1-summary.md` (compressão executiva ≤ 1500 palavras).
