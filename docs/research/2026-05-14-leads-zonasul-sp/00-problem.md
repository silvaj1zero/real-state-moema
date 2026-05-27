# Problema — Captação de Leads Imobiliários Zona Sul SP (FISBO + Multi-fonte)

**Data:** 2026-05-14
**Solicitante:** Zero (founder / orquestrador)
**Validadora end-user:** Luciana Borba (RE/MAX Galeria Moema)
**Tipo:** Feature independente integrada ao CRM existente (não-novo-produto)
**Status:** Discovery — Fase 0 do roteiro de 10 etapas

---

## 1. Dor original

> "Quero buscar leads para imobiliárias."

## 2. Problema refinado

Leads qualificados para imobiliárias na **Zona Sul de São Paulo** (Moema, Vila Olímpia, Itaim Bibi como núcleo), com foco prioritário — **não excludente** — em **anúncios FISBO** (For Sale By Owner / vendido pelo próprio proprietário). Anúncios de terceiros (imobiliárias, construtoras) também entram no funil, mas com **segmentação clara entre tipos de lead** para tratamento diferenciado.

A feature deve **ampliar os mecanismos atuais** de captação (Epic 6 já cobre ZAP/OLX/VivaReal) explorando:

- Bases públicas (Receita Federal/CNPJ, IPTU, ITBI, cartórios)
- Portais adicionais (MercadoLivre, Facebook Marketplace, ImovelWeb, QuintoAndar, Loft, grupos públicos de WhatsApp/Telegram)
- Enriquecimento via CNPJ (identificação de PJ vs PF, holdings imobiliárias)
- Scoring automatizado por bairro/edifício

---

## 3. Contexto do projeto receptor

| Item | Estado |
|---|---|
| **Projeto** | Sistema de Mapeamento e Assessoria Imobiliária RE/MAX (PRD v2.0) |
| **Stack atual** | Next.js 15 + Supabase + Mapbox + Apify (3 actors: zap/olx/vivareal) |
| **Geografia operacional** | Epicentro Rua Alvorada (Moema) + círculos concêntricos 500m / 1km / 2km |
| **Epic vigente** | Epic 6 — Busca Inteligente de Imoveis nos Portais (FR-008 a FR-010 + FR-021 a FR-034 da família "Inteligência de Prospecção") |
| **Termo do projeto** | "FISBO" (mesma semântica de FSBO; manter grafia FISBO em todos os artefatos para coerência com PRD) |
| **Métodos** | FROG (Família/Relacionamentos/Organizações/Geografia), ACM, Funil 5 etapas |

**Esta feature será posicionada como Epic 7+** — "Inteligência de Prospecção Automatizada" ampliada, com fontes além dos 3 portais atuais.

---

## 4. Constraints

### Stack
- **Open source first** — toda a base de implementação prioritária deve ser open source ou dados públicos
- **Fontes pagas** (Receita PRO, Casafari, Serasa, Apify advanced actors) → catalogadas mas reservadas para **2ª onda de avaliação** após PRD entregue, NÃO bloqueia roadmap inicial
- Compatível com infra existente: Next.js / Supabase / Vercel

### Geografia
- Bairros-alvo: **Moema, Vila Olímpia, Itaim Bibi** (Zona Sul SP)
- Usar **área circunscrita** (círculos concêntricos já implementados no FR-001) como referência de filtragem geográfica

### LGPD
- **Documentar no research** (base legal, anonimização, opt-out, riscos de captura de PF)
- Engenharia ajusta na implementação — **NÃO bloqueia discovery**

### Tipologia de leads (a definir no research)
- FISBO (prioridade)
- Imobiliária convencional
- Construtora / lançamento
- Administradora / locação convertida em venda
- Pessoa jurídica (holding patrimonial — via CNPJ)

Cada tipo precisa de heurística de captação, scoring e abordagem distintos.

---

## 5. Stakeholders

| Papel | Pessoa / Agente |
|---|---|
| End-user primária | Luciana Borba (validadora) |
| Founder / orquestrador | Zero |
| PM | Morgan (@pm) — Fase 5 |
| Architect | Aria (@architect) — Fase 5 |
| Scrum Master | River (@sm) — Fase 5 |
| Product Owner | Pax (@po) — validação Fase 5 |

---

## 6. Out of scope (explícito)

- ❌ Captação de **locação** (foco somente venda)
- ❌ Mercados fora de São Paulo Capital nesta primeira versão
- ❌ Implementação de código nesta pesquisa (research-only — handoff para @pm/@dev na Fase 5)
- ❌ Decisão sobre fontes pagas (reservado para 2ª onda)
- ❌ CRM/funil downstream — esta feature **alimenta** o funil já existente (Epic 5), não o redesenha

---

## 7. Definition of Done (DoD) da pesquisa completa

A pesquisa estará completa quando produzir:

1. ✅ Mapa das fontes de leads imobiliários FISBO + multi-fonte em SP, open source first
2. ✅ Top 3-5 projetos open source candidatos a fundação técnica, com benchmark estruturado
3. ✅ Arquitetura de referência (LangGraph ou alternativa validada) para pipeline multi-source
4. ✅ Modelo de scoring proposto (features + abordagem ML/heurística)
5. ✅ Nota LGPD com base legal e mitigações
6. ✅ PRD Epic 7 com FRs/NFRs rastreáveis
7. ✅ Roadmap em waves/épicos com estimativas
8. ✅ Stories validadas (10-point @po) prontas para @dev executar

---

## 8. Referências do projeto

- `docs/prd.md` — PRD v2.0
- `docs/features/EPIC-6-BUSCA-PARAMETRICA.md` — Epic 6 (base que será ampliada)
- `docs/architecture/fr-story-matrix.md` — matriz FR ↔ Story
- `docs/branding/luciana-brand-guide.md` — voz/identidade do produto
