# Sistema de Mapeamento e Assessoria Imobiliária RE/MAX — Product Requirements Document (PRD)

**Versão:** 2.0 (Consolidada com auditorias Pedro Valério)
**Status:** Ready for Architect
**Data:** 2026-03-18
**Autora:** Luciana Borba (RE/MAX Galeria Moema) — validadora e end-user primária
**PM:** Morgan (AIOX)
**Auditor:** Pedro Valério

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-17 | 0.1 | Brief inicial com lógica de expansão por raio | Usuário |
| 2026-03-17 | 1.0 | PRD formal — Goals & Background com metodologia RE/MAX | Morgan (PM) |
| 2026-03-17 | 1.1 | Posicionamento: sistema da Luciana Borba, parcerias ganha/ganha | Morgan (PM) |
| 2026-03-18 | 2.0 | PRD consolidado — 4 épicos, 33 stories, 4 auditorias PV, checklist aprovado | Morgan (PM) + Pedro Valério |

---

## 1. Goals and Background Context

### Goals

- **Digitalizar a Metodologia RE/MAX de Alta Performance para a Luciana Borba** — transformar o funil de vendas (Contato → V1 → V2 → Exclusividade → Venda) em um workflow sistêmico, substituindo ferramentas dispersas por uma plataforma única
- **Implementar o Método FROG georreferenciado** — mapear Família, Relacionamentos, Organizações e Geografia como fontes de leads com rastreamento territorial centrado na micro-região da Luciana
- **Dominar a micro-região em detalhes** — conhecer cada edifício, proprietário, oportunidade FISBO, perfil de condomínio e status de varredura no raio de atuação (epicentro: Rua Alvorada, Moema)
- **Acelerar as 3 Fases de Posicionamento** — dados para "Conhecer" (ACM automatizada), ferramentas para "Ser Conhecida" (presença territorial) e métricas para "Ser Reconhecida" (autoridade e queda do CAC)
- **Habilitar parcerias ganha/ganha entre consultores** — permitir que a Luciana indique clientes que buscam regiões de colegas e receba indicações de colegas cujos clientes buscam sua região (rede de referrals cruzados)
- **Criar um Mini CRM de campo** — pipeline V1→V2→Exclusividade com scripts de objeção, agendamento e acompanhamento por proprietário

### Background Context

Luciana Borba é consultora da RE/MAX Galeria, franquia com sede em Moema (São Paulo/SP). Ela está iniciando o domínio da sua micro-região e segue a metodologia RE/MAX de Alta Performance: o consultor não "vende casas" — **gere um negócio baseado em processos, dados e autoridade**. O funil de 5 etapas é o sistema operacional desse negócio, e sem volume no topo (prospecção), o resto morre.

O mercado de Moema, Vila Olímpia e Itaim Bibi concentra proprietários FISBO (For Sale By Owner). Hoje a Luciana opera com ferramentas dispersas (planilhas, Captei, ligações manuais) sem integração territorial. O sistema proposto unifica prospecção FISBO com mapeamento geográfico FROG, criando micro-territórios que ela domina progressivamente — partindo da Rua Alvorada e expandindo em raios de 500m. Após validação pela Luciana, o sistema poderá expandir para outros consultores da RE/MAX Galeria e eventualmente de outras franquias, incluindo a rede de referrals cruzados (consultor A indica cliente para região do consultor B e vice-versa).

### Referências Metodológicas

- Alta Performance Imobiliária (Luciana Borba, RE/MAX Moema, 09/02/2026)
- Guia de Procedimento: Dominando o Funil de Conversão V1 e V2 (Luciana Borba, 09/02/2026)
- Guia de Prospecção: O Caminho para a Alta Performance Imobiliária (Luciana Borba, 09/02/2026)
- O Modelo RE/MAX e a Expansão da Unidade Galeria (13/02/2026)
- Plano de Posicionamento: Da Iniciação à Autoridade Regional (Luciana Borba, 09/02/2026)
- Guia de Fundamentos: O Ecossistema RE/MAX e a Lógica do Sucesso (13/02/2026)

---

## 2. Requirements

### Functional Requirements (FR)

**Núcleo Territorial (Mapa + Expansão):**

- **FR-001:** Mapa interativo com posição do consultor e edifícios cadastrados, usando círculos concêntricos (500m, 1km, 2km) a partir do epicentro
- **FR-002:** Definição e alteração do epicentro (latitude/longitude)
- **FR-003:** Status de varredura por edifício: `Não Visitado`, `Mapeado`, `Em Prospecção`, `Concluído`
- **FR-004:** Expansão progressiva — ao atingir 80% de cobertura no raio atual, desbloqueia o próximo
- **FR-005:** Sugestão de próxima rua/bloco com base em similaridade de m², perfil e FISBOs não abordados

**Cadastro e Qualificação de Edifícios:**

- **FR-006:** Cadastro rápido mobile (<30s) com GPS automático, tipologia e padrão
- **FR-007:** Registro de "Abertura a Corretores" e contador de oportunidades por edifício

**Gestão de Leads (Proprietários FISBO):**

- **FR-008:** Cadastro de proprietários com origem, perfil psicográfico, o que valoriza, **campos V1 estruturados** (motivação real, prazo urgência, fotos V1)
- **FR-009:** Cruzamento com bases de proprietários para trazer leads digitais do raio
- **FR-010:** Identificação e destaque de FISBOs como prioridade de prospecção

**Funil de Vendas RE/MAX:**

- **FR-011:** Funil de 5 etapas: Contato → V1 → V2 → Representação (Exclusividade) → Venda
- **FR-012:** Diagnóstico de gargalos do funil com ação corretiva sugerida
- **FR-013:** Biblioteca de scripts de contorno de objeções

**Método FROG:**

- **FR-014:** Mapeamento de fontes de leads por FROG (Família, Relacionamentos, Organizações, Geografia) com analytics de conversão

**ACM (Análise Comparativa de Mercado):**

- **FR-015:** ACM semi-automatizada com dados de mercado, funcional em modo manual-only (sem dependência de scraping)
- **FR-016:** Recálculo automático de m² ao expandir para novos raios

**Parcerias Ganha/Ganha:**

- **FR-017:** Sistema de referrals entre consultores (indicações cruzadas)
- **FR-018:** Tracking de indicações com status e métricas de reciprocidade

**Dashboard e KPIs:**

- **FR-019:** Dashboard com densidade de carteira, velocidade de varredura, taxa de domínio, conversão do funil, meta diária
- **FR-020:** Agendamento V1/V2 com notificações de follow-up

**Inteligência de Prospecção Automatizada:**

- **FR-021:** Agente de varredura de portais FISBO (ZAP, OLX, VivaReal)
- **FR-022:** Pré-mapeamento geográfico (seed data básico no Epic 1, avançado no Epic 3)
- **FR-023:** Integração com Captei (CSV + API se disponível)
- **FR-024:** Cross-referencing entre portais (duplicatas, ex-imobiliária→FISBO, tempo de mercado)
- **FR-025:** Monitoramento contínuo com alertas de novos FISBOs e mudanças de preço
- **FR-026:** Integração com sistemas RE/MAX (My RE/MAX — export/import)
- **FR-027:** Enriquecimento automático de leads sob demanda

**Gestão de Influenciadores:**

- **FR-028:** Cadastro de informantes (zeladores, porteiros) vinculados a edifícios
- **FR-029:** Tracking de indicações por informante com cálculo 5% comissão (Regra de Ouro)
- **FR-030:** Registro de Marketing de Gentileza com histórico e lembretes

**Dossiê e Preparação:**

- **FR-031:** Geração de Dossiê/Showcase para V2 (PDF profissional)
- **FR-032:** Checklist de Home Staging compartilhável

**Diagnóstico e Progressão:**

- **FR-033:** Matriz de diagnóstico de gargalos automática com ação sugerida
- **FR-034:** Dashboard de progressão nos Clubes RE/MAX (VGV/VGH)

### Non-Functional Requirements (NFR)

- **NFR-001:** Mobile-first (PWA) — uso primário em campo, uma mão, tela de celular
- **NFR-002:** Suporte offline com sincronização automática (Service Workers + IndexedDB)
- **NFR-003:** Conformidade LGPD — criptografia via pgcrypto, termos de uso, direito ao esquecimento
- **NFR-004:** Performance de mapa — clustering de pins, <2s para operações de campo
- **NFR-005:** Arquitetura multi-tenant ready — schema com separação `edificios` (base) vs `edificios_qualificacoes` (privada por consultor)
- **NFR-006:** Tempo de resposta <2s para cadastro rápido, busca, transição de funil
- **NFR-007:** Dados de ACM com refresh periódico (mínimo semanal quando scraping ativo)

---

## 3. User Interface Design Goals

### Overall UX Vision

Interface como "cockpit de campo" — tudo a um toque. Mapa como tela principal com layers ativáveis. Cadastro de edifício em <30 segundos.

### Key Interaction Paradigms

- **Map-first navigation** — mapa é ponto de entrada, tocar em edifício abre card
- **Quick-action floating buttons** — cadastro rápido, registro de contato, transição de funil
- **Tabs/swipe funnel** — funil por tabs verticais em mobile (não Kanban horizontal), Kanban em desktop
- **Contextual scripts** — scripts de objeção como cards consultáveis no card do lead
- **Feed de inteligência** — alertas dos agentes de varredura

### Core Screens

1. Mapa Principal (epicentro, raios, pins por status, GPS)
2. Card do Edifício (dados, leads, informantes, oportunidades)
3. Funil de Vendas (tabs mobile / Kanban desktop)
4. Cadastro Rápido de Campo
5. Dashboard de KPIs
6. ACM Generator
7. Central de Referrals
8. Feed de Inteligência

### Accessibility

WCAG AA — contraste para uso externo, tamanhos de toque, fontes escaláveis.

### Branding

RE/MAX (azul, vermelho, branco) + marca pessoal Luciana Borba. Profissionalismo e autoridade.

### Target Platforms

Mobile-first PWA. Responsivo para desktop/tablet no escritório.

---

## 4. Technical Assumptions

### Repository Structure: Monorepo

### Service Architecture: Serverless com BaaS

| Camada | Tecnologia |
|--------|-----------|
| Frontend/PWA | Next.js 16+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui |
| State | Zustand + React Query (TanStack) |
| Backend/API | Next.js API Routes + Supabase Edge Functions |
| Database | PostgreSQL via Supabase + PostGIS |
| Auth | Supabase Auth |
| Maps | Mapbox GL JS (react-map-gl) |
| Offline/PWA | Service Workers + IndexedDB (Workbox) |
| Storage | Supabase Storage |
| PDF Generation | React-PDF (client-side) |
| Scraping | Apify Actors (ZAP first) + Supabase Edge Functions cron |
| Hosting | Vercel |
| CI/CD | GitHub Actions → Vercel |
| Monitoring | Vercel Analytics + Sentry |

### Decisões Chave

- **Supabase > Firebase:** PostGIS para geoespacial, RLS para multi-tenant, open-source
- **Mapbox > Google Maps:** Customização visual, clustering nativo, pricing previsível
- **PWA > React Native:** Iteração rápida, sem app store, offline via SW, migrável depois
- **React-PDF client-side > server-side:** Funciona offline, sem timeout de serverless

### Testing

| Nível | Ferramenta |
|-------|-----------|
| Unit | Vitest + Testing Library |
| Integration | Vitest + Supabase local (Docker) |
| E2E | Playwright |

### ALERTA Arquitetural (Pedro Valério)

Schema do Epic 1 DEVE separar:
- `edificios` (id, nome, endereço, coordenadas, raio_zona) → base, futuramente pública
- `edificios_qualificacoes` (edificio_id, consultant_id, padrão, tipologia, abertura, status, notas) → privada por consultor

Isso facilita multi-tenant no Epic 4 sem migração.

---

## 5. Epic List

| Epic | Título | Stories | Goal |
|------|--------|---------|------|
| 1 | Foundation, Mapa & Registro de Campo | 7 | Luciana abre app, vê mapa populado, cadastra/qualifica edifícios em campo — online ou offline |
| 2 | Leads, Funil de Vendas & Metodologia RE/MAX | 11 | Metodologia RE/MAX digitalizada: FISBO, informantes, funil V1→V2→Exclusividade→Venda, diagnóstico, scripts, expansão |
| 3 | Inteligência, ACM & Agentes de Automação | 8 | Sistema trabalha para ela: ACM automatizada, Dossiê PDF, agentes de varredura, feed de inteligência |
| 4 | Parcerias Ganha/Ganha & Escala | 8 | Rede de referrals, comissões, clubes RE/MAX, integrações, multi-tenant |

---

## 6. Epic Details

### Epic 1: Foundation, Mapa & Registro de Campo

**Goal:** Estabelecer infraestrutura (Next.js, Supabase+PostGIS, Mapbox, PWA) e entregar o caso de uso primário: andar e registrar. Mapa populado no dia 1 via seed data.

#### Story 1.1: Setup do Projeto e Infraestrutura Base
Como consultora RE/MAX, quero que o sistema esteja configurado e deployado, para que eu possa acessar o app via URL no meu celular.

**AC:**
1. Projeto Next.js 16+ com TypeScript, Tailwind CSS e shadcn/ui inicializado
2. Supabase configurado com PostgreSQL e PostGIS habilitado
3. Auth por email/senha via Supabase Auth
4. PWA com manifest.json, service worker base (Workbox) e ícone RE/MAX
5. App instalável no celular via "Adicionar à tela inicial"
6. Deploy na Vercel com CI/CD via GitHub Actions
7. Tela de login responsiva mobile

#### Story 1.2: Mapa Interativo com Epicentro e Raios Concêntricos
Como consultora RE/MAX, quero ver mapa centrado na minha região com círculos de raio, para visualizar meu território.

**AC:**
1. Mapa Mapbox GL em tela cheia como view principal
2. Epicentro padrão na Rua Alvorada (CEP 04550-000)
3. Três círculos concêntricos: 500m (verde), 1km (amarelo), 2km (vermelho)
4. Raios ativáveis/desativáveis via toggle
5. Geolocalização com pin "Você está aqui" em tempo real
6. Mapa responsivo e performático em mobile
7. Epicentro editável (long press)

#### Story 1.3: Cadastro Rápido de Edifícios em Campo
Como consultora RE/MAX, quero cadastrar edifício em <30s enquanto caminho, para mapear minha região eficientemente.

**AC:**
1. Botão flutuante "+" abre formulário rápido
2. GPS preenche coordenadas automaticamente
3. Endereço sugerido via reverse geocoding (Mapbox)
4. Campos obrigatórios: nome, endereço (pré-preenchido)
5. Campos opcionais: tipologia, padrão
6. Máximo 3 taps + teclado para nome
7. Pin aparece no mapa imediatamente
8. Dados em `edificios` com `geography(Point, 4326)`. Schema separado: `edificios` (base) + `edificios_qualificacoes` (privada)

#### Story 1.4: Qualificação e Card do Edifício
Como consultora RE/MAX, quero tocar em edifício e ver detalhes, para ter informações completas sobre cada condomínio.

**AC:**
1. Tap em pin abre card/bottom sheet
2. Exibe: nome, endereço, padrão, tipologia, status, coordenadas, data cadastro
3. "Abertura a Corretores" editável (Zelador amigável / Rígido / Exige autorização)
4. Contador de oportunidades (placas vs. anúncios)
5. Notas livres
6. Botão "Editar"
7. Bottom sheet com swipe-up em mobile

#### Story 1.5: Status de Varredura e Visualização por Cores
Como consultora RE/MAX, quero ver pela cor do pin o status de cada edifício, para saber onde já passei.

**AC:**
1. Pins: Cinza=Não Visitado, Azul=Mapeado, Amarelo=Em Prospecção, Verde=Concluído
2. Status alterável via card
3. Legenda com contagem por status
4. Clustering automático em zoom-out
5. Filtro rápido por status
6. Percentual de cobertura do raio no topo do mapa

#### Story 1.6: Suporte Offline e Sincronização
Como consultora RE/MAX, quero cadastrar edifícios sem internet, para não perder dados em áreas de sinal fraco.

**AC:**
1. Service Worker cacheia assets e tiles da região
2. Cadastro offline salvo em IndexedDB
3. Indicador visual "Offline"
4. Sync automático ao reconectar
5. Edifícios offline com indicador "pendente sync"
6. Last-write-wins (MVP single-user)
7. Mapa navegável offline na área pré-cacheada

#### Story 1.7: Seed Data — Pré-carga de Edifícios (VETO PV #1)
Como consultora RE/MAX, quero que o mapa já mostre edifícios ao abrir pela primeira vez, para focar em qualificar, não cadastrar do zero.

**AC:**
1. Ao configurar epicentro, consulta API pública (Google Places / OSM Overpass) e carrega edifícios no raio de 2km
2. Pré-carregados entram como "Não Visitado" (cinza) com dados básicos
3. Luciana pode confirmar, editar ou descartar cada um
4. Badge visual "auto" vs "verificado"
5. Seed roda na configuração inicial + re-executável sob demanda

---

### Epic 2: Leads, Funil de Vendas & Metodologia RE/MAX

**Goal:** Digitalizar a metodologia RE/MAX completa: FISBO, informantes, funil V1→V2→Exclusividade→Venda, diagnóstico de gargalos, scripts, expansão territorial.

**Sequência:** 2.1→2.2→2.10→2.3→2.7→2.6→2.6b→2.5→2.8→2.9→2.4

#### Story 2.1: Cadastro de Leads (Proprietários FISBO)
**AC:** Campos obrigatórios (nome, unidade, origem), perfil psicográfico, o que valoriza, **campos V1 estruturados** (motivação real, prazo urgência, fotos V1), telefone/email criptografados (pgcrypto), vinculado ao edifício.

#### Story 2.2: Funil de Vendas RE/MAX (5 Etapas)
**AC:** Kanban com 5 colunas (Contato→V1→V2→Exclusividade→Venda), tabs em mobile, swipe/botão para transição, registro obrigatório (data+observação), timeline, filtros, contadores. **Retrocesso com 3 guardrails:** justificativa obrigatória, alerta visual permanente, contabilizado no diagnóstico.

#### Story 2.3: Gestão de Informantes e Marketing de Gentileza
**AC:** Informante vinculado a um ou mais edifícios (multi-select), ações de gentileza com histórico, tracking de leads originados, cálculo 5% comissão, lembretes de contato. **Implementação incremental:** Fase A (cadastro+gentileza), Fase B (5%+lembretes), Fase C (dashboard).

#### Story 2.4: Método FROG
**AC:** Campo "Fonte FROG" por lead, embaixadores FROG, dashboard por categoria com conversão, filtro de mapa, sugestões de ação.

#### Story 2.5: Biblioteca de Scripts de Objeção
**AC:** Scripts pré-carregados (min 5, baseados nos PDFs RE/MAX), busca, acessível no card do lead, scripts personalizáveis.

#### Story 2.6: Agendamento V1/V2 e Follow-up
**AC:** Agendamento com "Técnica de Duas Opções", agenda cronológica, push notification 1h antes, follow-up se lead parado >3 dias, prompt V2 após V1 com intervalo sugerido.

#### Story 2.6b: Checklist de Preparação V1→V2 (VETO PV #2)
**AC:** Checklist ao agendar V2 (ACM, Dossiê, Home Staging, Matrícula, Plano Marketing), Home Staging compartilhável via WhatsApp, progresso visual, notificação 24h antes.

#### Story 2.7: Lógica de Expansão por Raio (80%)
**AC:** Cobertura calculada automaticamente, notificação ao atingir 80%, próximo raio desbloqueado com seed data, sugestão de próximo bloco, dashboard de progresso por raio.

#### Story 2.8: Diagnóstico de Gargalos do Funil
**AC:** Conversão entre etapas, matriz de diagnóstico RE/MAX (Contatos→V1 falha script, V1→V2 falha rapport, V2→Excl falha fechamento), ação corretiva com link para script, funil visual, filtro de período. Contabiliza retrocessos.

#### Story 2.9: Dashboard de KPIs
**AC:** KPIs territoriais + funil + informantes + FROG + meta diária "5 V1s/dia" (configurável), período filtrável, responsivo. Empty states com mensagens motivacionais quando poucos dados.

#### Story 2.10: Marcação Manual de FISBOs
**AC:** Flag "FISBO detectado", badge no mapa, filtro rápido, contagem por raio, atalho para criar lead.

---

### Epic 3: Inteligência, ACM & Agentes de Automação

**Goal:** Sistema trabalha para Luciana: ACM com dados reais, Dossiê PDF automatizado, agentes de varredura FISBO, feed de inteligência.

**Sequência:** 3.1→3.4→3.2→3.7→3.3→3.6→3.8→3.5

**Princípio: ACM funcional com dados manuais no dia 1. Scraping é acelerador, não dependência.**

#### Story 3.1: ACM Semi-Automatizada
**AC:** Busca comparáveis no raio 500m, tabela com dados, cálculos automáticos (média, mediana, tendência), diferenciação "preço anúncio" vs "preço venda real", alimentada por scraping + input manual, exportável, recálculo por bairro. **AC8 (VETO PV #3): ACM funciona em modo manual-only — consultora cadastra comparáveis manualmente. Scraping enriquece quando disponível, mas ACM NUNCA depende dele.**

#### Story 3.2: Dossiê/Showcase V2 (PDF)
**AC:** Botão "Gerar Dossiê" no card do lead, compila ACM + Plano Marketing + histórico + branding, PDF via React-PDF (client-side), editável, salvo no Storage, compartilhável, atualiza checklist 2.6b. Inclui seção de Estratégia de Parceria (Could).

#### Story 3.3: Home Staging Automatizado
**AC:** Template com 3 regras de ouro, personalizável por tipologia, compartilhável WhatsApp + PDF com branding, atualiza checklist 2.6b.

#### Story 3.4: Agente de Varredura de Portais FISBO
**AC:** Varre ZAP (principal), OLX e VivaReal (Should) filtrando proprietário direto, match com edifícios via PostGIS ST_DWithin (50m) + geocoding para endereços texto, cron diário/semanal, Apify Actors, fallback CSV. **Sub-task 3.4d inclui geocoding (Mapbox Geocoding API) para normalização de endereço.**

#### Story 3.5: Pré-Mapeamento Geográfico Avançado
**AC:** Complementa seed data com dados ricos (Google Places, OSM), auto ao desbloquear raio, dados nunca sobrescrevem input manual.

#### Story 3.6: Cross-Referencing entre Portais
**AC:** Duplicatas consolidadas, detecção "ex-imobiliária→FISBO", tempo de mercado, mudança de preço, alimenta ACM.

#### Story 3.7: Feed de Inteligência e Alertas
**AC:** Feed cronológico + pins de alerta no mapa, tipos de evento (FISBO, preço, ex-imobiliária, raio, lead parado), acionável, push para alta prioridade, filtros, badge no app, resumo matinal.

#### Story 3.8: Enriquecimento de Leads
**AC:** Sob demanda only no MVP (botão "Buscar inteligência"), busca anúncios e dados de mercado, estimativa valor m², indicador "Potencial FISBO".

---

### Epic 4: Parcerias Ganha/Ganha & Escala

**Goal:** Sistema individual vira rede. Referrals, comissões, clubes RE/MAX, integrações, multi-tenant.

**Sequência:** 4.1→4.2→4.3→4.8→4.7→4.4→4.6→4.5

**Princípio: Referrals funcionam unilateral (Luciana gerencia parceiros manualmente). Integrações têm fallback CSV.**

#### Story 4.1: Sistema de Referrals
**AC:** Cadastro de parceiros, criar/receber referral com perfil do cliente, status rastreável (Enviada→Aceita→Em Andamento→Convertida→Comissão Paga), lead auto-criado ao aceitar, histórico, métricas de reciprocidade. Funciona unilateral — parceiros são contatos, não necessariamente usuários.

#### Story 4.2: Tracking de Comissões
**AC:** Registro ao fechar venda (valor, % comissão), splits automáticos sugeridos (consultora + franquia + informante 5% + referral + **Cláusula de Relacionamento 3-4% configurável**), confirmação manual obrigatória, alerta ao receber comissão, dashboard financeiro, exportável CSV/PDF. **Nunca auto-pagar.**

#### Story 4.3: Progressão nos Clubes RE/MAX
**AC:** Barra de progresso (Executive→100%→Platinum→Chairman's→Titan→Diamond→Pinnacle), clube atual + distância para próximo, histórico mensal, projeção como Should com caveat sazonalidade, meta pessoal configurável.

#### Story 4.4: Integração Captei
**AC:** Upload CSV, mapeamento de colunas, match com edifícios, preview, detecção duplicatas, leads com origem "Digital (Captei)". API REST como Should.

#### Story 4.5: Integração My RE/MAX
**AC:** Investigar API (bloqueante). Se disponível: sync bidirecional. Se indisponível (provável): export CSV/PDF para upload manual. Log de sincronizações.

#### Story 4.6: Preparação Multi-Tenant
**AC:** RLS por consultor, exceção para edifícios seed (públicos) vs qualificações (privadas), referrals visíveis entre participantes, convite por email, dashboard admin (schema only — Could), migração zero-downtime. **Testes E2E de isolamento obrigatórios.**

#### Story 4.7: Safari/Open House
**AC:** Evento vinculado a imóvel exclusivo, convite a parceiros + link compartilhável, RSVP tracking, checklist preparação, pós-evento (feedback, propostas), histórico, integração Dossiê.

#### Story 4.8: Plano de Marketing Ativo por Imóvel
**AC:** Checklist auto-criado ao fechar exclusividade (portais, redes, Safari, fotos, tour, placa), itens checkáveis com evidência, progresso visual, lembretes, template customizável, alimenta Dossiê.

---

## 7. Checklist Results

**Status:** READY FOR ARCHITECT (94% completude)

| Category | Status |
|----------|--------|
| Problem Definition & Context | PASS (95%) |
| MVP Scope Definition | PASS (95%) |
| User Experience Requirements | PASS (92%) |
| Functional Requirements | PASS (96%) |
| Non-Functional Requirements | PASS (90%) |
| Epic & Story Structure | PASS (97%) |
| Technical Guidance | PASS (93%) |
| Cross-Functional Requirements | PARTIAL (85%) |
| Clarity & Communication | PASS (93%) |

**Itens para fase de arquitetura:** ERD formal, glossário RE/MAX, API contracts.

---

## 8. Next Steps

### UX Expert Prompt

> @ux-design-expert — Com base neste PRD, projete a experiência mobile-first para a consultora Luciana Borba. Foco: mapa como tela principal (Mapbox), cadastro rápido (<30s), funil por tabs em mobile, feed de inteligência, branding RE/MAX. Persona: consultora caminhando pelo bairro de Moema/SP.

### Architect Prompt

> @architect — Com base neste PRD, projete a arquitetura. Stack: Next.js 16+, Supabase+PostGIS, Mapbox GL JS, PWA/Workbox, Apify. Prioridades: (1) ERD com separação edificios/qualificações, (2) PostGIS queries de raio e clustering, (3) offline-first com sync, (4) pipeline scraping desacoplado.

---

## Audit Trail

### Princípios Pedro Valério aplicados (consistentes nos 4 épicos):

1. **Funciona sozinho antes de depender de externo** — Seed data, ACM manual-first, referrals unilateral, CSV fallbacks
2. **Impossibilitar o caminho errado** — Mapa populado dia 1, checklist V1→V2, retrocesso com guardrails, comissão com confirmação manual
3. **Automação sugere, humano decide** — Especialmente com dinheiro (comissões) e dados (ACM)

### Contagem Final

- 34 FRs + 7 NFRs
- 4 épicos, 34 stories (7+11+8+8)
- 42 itens rastreados (FRs + gaps PDFs), 40 cobertos, 2 Won't aceitos (Matrícula, FIC)
- 3 VETOs PV resolvidos, 1 ALERTA arquitetural, múltiplos ajustes

---

*PRD v2.0 — Morgan (PM) + Pedro Valério (Auditor) — Synkra AIOX*
