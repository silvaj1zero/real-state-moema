# Arquitetura do Sistema — Mapeamento e Assessoria Imobiliária RE/MAX

**Versão:** 1.0
**Status:** Draft
**Data:** 2026-03-18
**Autor:** Aria (Architect Agent — AIOX)
**Referência:** `docs/prd.md` v2.0

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Diagrama de Arquitetura de Alto Nível](#2-diagrama-de-arquitetura-de-alto-nível)
3. [ERD — Entity-Relationship Diagram](#3-erd--entity-relationship-diagram)
4. [Estratégia PostGIS](#4-estratégia-postgis)
5. [Arquitetura Offline-First](#5-arquitetura-offline-first)
6. [Pipeline de Scraping](#6-pipeline-de-scraping)
7. [Decisões Arquiteturais (ADRs)](#7-decisões-arquiteturais-adrs)
8. [Considerações de Segurança](#8-considerações-de-segurança)
9. [Glossário Técnico](#9-glossário-técnico)

---

## 1. Visão Geral da Arquitetura

### Princípios Arquiteturais

| # | Princípio | Justificativa |
|---|-----------|---------------|
| P1 | **Funciona sozinho antes de depender de externo** | ACM manual-first, referrals unilateral, CSV fallbacks (Auditoria PV) |
| P2 | **Mobile-first, offline-capable** | Consultora em campo, sinal instável em Moema (NFR-001, NFR-002) |
| P3 | **Separação base pública / qualificação privada** | Multi-tenant ready desde o Epic 1 (Alerta PV) |
| P4 | **Scraping como acelerador, não dependência** | ACM e sistema funcionam 100% sem scraping (Veto PV #3) |
| P5 | **Serverless-first** | Custo zero em idle, escala automática, sem DevOps de infra |
| P6 | **Geoespacial nativo** | PostGIS para queries de raio, matching, clustering — não calculado no client |

### Stack Tecnológico

| Camada | Tecnologia | Versão Mínima |
|--------|-----------|---------------|
| Frontend / PWA | Next.js (App Router) | 16+ |
| UI Components | shadcn/ui + Tailwind CSS | Latest |
| State Management | Zustand + TanStack Query | 5.x / 5.x |
| Maps | Mapbox GL JS (react-map-gl) | 3.x |
| Backend / BaaS | Supabase | Latest |
| Database | PostgreSQL + PostGIS | 16+ / 3.4+ |
| Auth | Supabase Auth | — |
| Storage | Supabase Storage | — |
| Edge Functions | Supabase Edge Functions (Deno) | — |
| Offline / PWA | Workbox (Service Workers + IndexedDB) | 7.x |
| PDF | React-PDF (@react-pdf/renderer) | 4.x |
| Scraping | Apify Actors | — |
| Hosting | Vercel | — |
| CI/CD | GitHub Actions → Vercel | — |
| Monitoring | Vercel Analytics + Sentry | — |
| Testing | Vitest + Testing Library + Playwright | — |

---

## 2. Diagrama de Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (PWA)                                │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Next.js  │  │ Mapbox   │  │ React-PDF│  │  Service Worker   │  │
│  │ App      │  │ GL JS    │  │ (client) │  │  (Workbox)        │  │
│  │ Router   │  │          │  │          │  │  ┌─────────────┐  │  │
│  └────┬─────┘  └────┬─────┘  └──────────┘  │  │ IndexedDB   │  │  │
│       │              │                       │  │ (idb-keyval)│  │  │
│       │              │                       │  └─────────────┘  │  │
│       │              │                       └───────┬───────────┘  │
│  ┌────┴──────────────┴───────────────────────────────┴───────────┐  │
│  │                    Zustand + TanStack Query                   │  │
│  │              (cache, optimistic updates, sync)                │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         VERCEL                                       │
│  ┌───────────────────┐  ┌──────────────────────────────────────┐    │
│  │ Static Assets     │  │ Next.js API Routes                   │    │
│  │ (CDN Edge)        │  │ (Serverless Functions)               │    │
│  │ - HTML/JS/CSS     │  │ - Proxy para Supabase                │    │
│  │ - Map tiles cache │  │ - Webhook handlers                   │    │
│  └───────────────────┘  │ - Geocoding proxy (Mapbox)           │    │
│                          └────────────────┬─────────────────────┘    │
└───────────────────────────────────────────┼─────────────────────────┘
                                            │
                    ┌───────────────────────┬┴────────────────────────┐
                    ▼                       ▼                         ▼
┌──────────────────────────┐ ┌──────────────────────┐ ┌──────────────────┐
│      SUPABASE            │ │  MAPBOX               │ │    APIFY          │
│                          │ │                        │ │                   │
│ ┌──────────────────────┐ │ │ - GL JS Tiles         │ │ - ZAP Actor       │
│ │ Auth                 │ │ │ - Geocoding API       │ │ - OLX Actor       │
│ │ (email/senha)        │ │ │ - Reverse Geocoding   │ │ - VivaReal Actor  │
│ ├──────────────────────┤ │ │ - Static Images       │ │                   │
│ │ PostgreSQL + PostGIS │ │ └──────────────────────┘ │ Webhook/Poll ──┐  │
│ │ (todas as tabelas)   │ │                          └───────────┬────┘  │
│ ├──────────────────────┤ │                                      │       │
│ │ Edge Functions       │◀┼──────────────────────────────────────┘       │
│ │ (Deno)               │ │  cron: scraping ingest                       │
│ │ - scraping-ingest    │ │                                              │
│ │ - seed-data          │ │                                              │
│ │ - matching-engine    │ │                                              │
│ │ - expansion-calc     │ │                                              │
│ ├──────────────────────┤ │                                              │
│ │ Storage              │ │                                              │
│ │ - fotos V1           │ │                                              │
│ │ - dossiês PDF        │ │                                              │
│ │ - avatars            │ │                                              │
│ ├──────────────────────┤ │                                              │
│ │ Realtime             │ │                                              │
│ │ - sync events        │ │                                              │
│ │ - notifications      │ │                                              │
│ └──────────────────────┘ │                                              │
└──────────────────────────┘                                              │
                                                                          │
┌─────────────────────────────────────────────────────────────────────────┘
│  APIs Externas (read-only, fallback CSV)
│  - Google Places API (seed data)
│  - OSM Overpass API (seed data complementar)
│  - Captei (CSV import, API se disponível)
│  - My RE/MAX (export CSV/PDF — API improvável)
└─────────────────────────────────────────────
```

### Fluxo de Dados Principal

```
Consultora em Campo
       │
       ├─ ONLINE ──► Supabase (write direto via client SDK)
       │              ├─► PostGIS (coordenadas)
       │              ├─► Storage (fotos)
       │              └─► Realtime (push para outros devices)
       │
       └─ OFFLINE ──► IndexedDB (write local)
                       │
                       └─ RECONEXÃO ──► Background Sync
                                         └─► Supabase (replay mutations)
```

---

## 3. ERD — Entity-Relationship Diagram

### Diagrama Textual

```
┌─────────────────────────────────────────────────────────────────┐
│                        NÚCLEO TERRITORIAL                        │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐          ┌──────────────────────────┐
  │    consultores    │          │       epicentros          │
  │──────────────────│          │──────────────────────────│
  │ id (PK, uuid)   │──┐       │ id (PK, uuid)            │
  │ email            │  │       │ consultant_id (FK) ──────┤─── consultores.id
  │ nome             │  │       │ label                     │
  │ telefone (enc)   │  │       │ coordinates (geography)   │
  │ franquia         │  │       │ raio_ativo_m (int)        │
  │ regiao_foco      │  │       │ is_active (bool)          │
  │ avatar_url       │  │       │ created_at                │
  │ created_at       │  │       └──────────────────────────┘
  │ updated_at       │  │
  └──────────────────┘  │
           │             │
           │ 1:N         │ 1:N
           ▼             ▼
  ┌─────────────────────────────────┐
  │          edificios               │
  │  (BASE — futuramente pública)   │
  │─────────────────────────────────│
  │ id (PK, uuid)                   │
  │ nome                            │
  │ endereco                        │
  │ endereco_normalizado            │
  │ coordinates (geography Point)   │
  │ bairro                          │
  │ cep                             │
  │ cidade                          │
  │ estado                          │
  │ origem ('manual','seed','api')  │
  │ seed_source (text nullable)     │
  │ verificado (bool, default false)│
  │ created_by (FK) → consultores   │
  │ created_at                      │
  │ updated_at                      │
  └──────────┬──────────────────────┘
             │
             │ 1:N (por consultant_id)
             ▼
  ┌──────────────────────────────────────┐
  │     edificios_qualificacoes           │
  │  (PRIVADA — por consultor)            │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ edificio_id (FK) → edificios         │
  │ consultant_id (FK) → consultores     │
  │ tipologia (enum)                     │
  │ padrao (enum)                        │
  │ status_varredura (enum)              │
  │ abertura_corretores (enum)           │
  │ oportunidades_count (int)            │
  │ notas (text)                         │
  │ is_fisbo_detected (bool)             │
  │ created_at                           │
  │ updated_at                           │
  │                                      │
  │ UNIQUE(edificio_id, consultant_id)   │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     GESTÃO DE LEADS & FUNIL                      │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │              leads                    │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ edificio_id (FK) → edificios         │
  │ nome                                 │
  │ telefone_encrypted (bytea, pgcrypto) │
  │ email_encrypted (bytea, pgcrypto)    │
  │ unidade (text)                       │
  │ origem (enum)                        │
  │ is_fisbo (bool)                      │
  │ perfil_psicografico (text)           │
  │ o_que_valoriza (text[])              │
  │ motivacao_real (text)                │
  │ prazo_urgencia (enum)                │
  │ fotos_v1_urls (text[])              │
  │ fonte_frog (enum)                    │
  │ etapa_funil (enum)                   │
  │ etapa_funil_updated_at (timestamptz) │
  │ informante_id (FK nullable)          │
  │ notas (text)                         │
  │ lgpd_consent_at (timestamptz)        │
  │ created_at                           │
  │ updated_at                           │
  └──────────┬───────────────────────────┘
             │
             │ 1:N
             ▼
  ┌──────────────────────────────────────┐
  │       funnel_transitions             │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ lead_id (FK) → leads                 │
  │ consultant_id (FK) → consultores     │
  │ from_stage (enum)                    │
  │ to_stage (enum)                      │
  │ is_regression (bool)                 │
  │ justificativa (text nullable)        │
  │ observacao (text)                    │
  │ transitioned_at (timestamptz)        │
  │ created_at                           │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │          agendamentos                 │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ lead_id (FK) → leads                 │
  │ consultant_id (FK) → consultores     │
  │ tipo (enum: 'V1','V2','follow_up')   │
  │ data_hora (timestamptz)              │
  │ opcao_2_data_hora (timestamptz null) │
  │ status (enum: 'agendado','confirmado'│
  │         ,'realizado','cancelado')     │
  │ notas (text)                         │
  │ notificacao_enviada (bool)           │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        INFORMANTES                               │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │          informantes                  │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ nome                                 │
  │ funcao (enum: 'zelador','porteiro',  │
  │         'sindico','morador','outro')  │
  │ telefone_encrypted (bytea)           │
  │ notas (text)                         │
  │ created_at                           │
  │ updated_at                           │
  └──────────┬───────────────────────────┘
             │
             │ N:M
             ▼
  ┌──────────────────────────────────────┐
  │    informantes_edificios              │
  │──────────────────────────────────────│
  │ informante_id (FK) → informantes     │
  │ edificio_id (FK) → edificios         │
  │ PRIMARY KEY (informante_id,          │
  │              edificio_id)            │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │        acoes_gentileza                │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ informante_id (FK) → informantes     │
  │ consultant_id (FK) → consultores     │
  │ tipo (text)                          │
  │ descricao (text)                     │
  │ data_acao (date)                     │
  │ proximo_lembrete (date nullable)     │
  │ created_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     SCRIPTS DE OBJEÇÃO                           │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │            scripts                    │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK nullable)          │
  │ titulo                               │
  │ categoria (enum)                     │
  │ etapa_funil (enum nullable)          │
  │ objecao (text)                       │
  │ resposta (text)                      │
  │ is_default (bool)                    │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   FROG CONTACTS                                  │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │         frog_contacts                 │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ nome                                 │
  │ categoria (enum: 'familia',          │
  │   'relacionamentos','organizacoes',  │
  │   'geografia')                       │
  │ is_embaixador (bool)                 │
  │ telefone_encrypted (bytea nullable)  │
  │ notas (text)                         │
  │ leads_gerados_count (int, default 0) │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  REFERRALS & COMISSÕES                            │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │           referrals                   │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ parceiro_nome (text)                 │
  │ parceiro_telefone_encrypted (bytea)  │
  │ parceiro_email (text nullable)       │
  │ parceiro_regiao (text)               │
  │ direcao (enum: 'enviada','recebida') │
  │ perfil_cliente (jsonb)               │
  │ lead_id (FK nullable) → leads        │
  │ status (enum: 'enviada','aceita',    │
  │   'em_andamento','convertida',       │
  │   'comissao_paga','cancelada')       │
  │ notas (text)                         │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │           comissoes                   │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ lead_id (FK) → leads                 │
  │ valor_venda (numeric)                │
  │ percentual_comissao (numeric)        │
  │ valor_comissao_total (numeric)       │
  │ split_consultora (numeric)           │
  │ split_franquia (numeric)             │
  │ split_informante (numeric nullable)  │
  │ split_referral (numeric nullable)    │
  │ split_relacionamento (numeric null)  │
  │ percentual_relacionamento (numeric   │
  │   default 3.5)                       │
  │ confirmado (bool, default false)     │
  │ data_fechamento (date)               │
  │ notas (text)                         │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               SCRAPING & INTELIGÊNCIA                            │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │        scraped_listings               │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ portal (enum: 'zap','olx',           │
  │         'vivareal','outro')          │
  │ external_id (text)                   │
  │ url (text)                           │
  │ titulo (text)                        │
  │ endereco_raw (text)                  │
  │ endereco_normalizado (text nullable) │
  │ coordinates (geography Point null)   │
  │ geocoding_status (enum: 'pending',   │
  │   'matched','geocoded','failed')     │
  │ preco (numeric nullable)             │
  │ area_m2 (numeric nullable)           │
  │ preco_m2 (numeric nullable)          │
  │ quartos (int nullable)               │
  │ tipo_anunciante (enum: 'proprietario'│
  │   ,'imobiliaria','corretor','desc')  │
  │ is_fisbo (bool)                      │
  │ edificio_matched_id (FK nullable)    │
  │ match_method (enum nullable:         │
  │   'postgis','geocoding','manual')    │
  │ data_anuncio (date nullable)         │
  │ data_scraped (timestamptz)           │
  │ preco_historico (jsonb)              │
  │ raw_data (jsonb)                     │
  │ is_active (bool, default true)       │
  │ duplicate_of_id (FK nullable → self) │
  │ created_at                           │
  │ updated_at                           │
  │                                      │
  │ UNIQUE(portal, external_id)          │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │       acm_comparaveis                 │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ lead_id (FK nullable) → leads        │
  │ edificio_id (FK nullable) → edificios│
  │ endereco (text)                      │
  │ coordinates (geography Point null)   │
  │ area_m2 (numeric)                    │
  │ preco_anuncio (numeric nullable)     │
  │ preco_venda_real (numeric nullable)  │
  │ preco_m2 (numeric nullable)          │
  │ quartos (int nullable)               │
  │ fonte (enum: 'manual','scraping',    │
  │        'captei')                     │
  │ scraped_listing_id (FK nullable)     │
  │ data_referencia (date)               │
  │ notas (text)                         │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  FEED & EVENTOS                                  │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │         safari_events                 │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ lead_id (FK nullable) → leads        │
  │ titulo (text)                        │
  │ descricao (text)                     │
  │ data_evento (timestamptz)            │
  │ link_compartilhavel (text nullable)  │
  │ checklist (jsonb)                    │
  │ feedback_pos_evento (jsonb nullable) │
  │ status (enum: 'planejado','ativo',   │
  │   'concluido','cancelado')           │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │      safari_event_rsvps               │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ event_id (FK) → safari_events        │
  │ parceiro_nome (text)                 │
  │ parceiro_email (text nullable)       │
  │ status (enum: 'convidado','confirmado│
  │   ','presente','ausente')            │
  │ created_at                           │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │       intelligence_feed               │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ tipo (enum: 'novo_fisbo',            │
  │   'mudanca_preco','ex_imobiliaria',  │
  │   'raio_desbloqueado',              │
  │   'lead_parado','novo_anuncio',     │
  │   'duplicata_detectada','sistema')   │
  │ titulo (text)                        │
  │ descricao (text)                     │
  │ prioridade (enum: 'alta','media',    │
  │             'baixa')                 │
  │ entity_type (text nullable)          │
  │ entity_id (uuid nullable)            │
  │ coordinates (geography Point null)   │
  │ is_read (bool, default false)        │
  │ is_push_sent (bool, default false)   │
  │ created_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 MARKETING & DOSSIÊ                               │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │        marketing_plans                │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ lead_id (FK) → leads                 │
  │ checklist (jsonb)                    │
  │ progresso_percentual (int)           │
  │ template_id (text nullable)          │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │        dossies                        │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ lead_id (FK) → leads                 │
  │ storage_path (text)                  │
  │ versao (int, default 1)              │
  │ dados_snapshot (jsonb)               │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │     checklists_preparacao             │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK) → consultores     │
  │ lead_id (FK) → leads                 │
  │ tipo (enum: 'v1_para_v2',            │
  │       'home_staging','safari')       │
  │ itens (jsonb)                        │
  │ progresso_percentual (int)           │
  │ notificacao_24h_enviada (bool)       │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               CONFIGURAÇÕES & METAS                              │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │    consultant_settings                │
  │──────────────────────────────────────│
  │ id (PK, uuid)                        │
  │ consultant_id (FK, UNIQUE)           │
  │ meta_v1_diaria (int, default 5)      │
  │ clube_remax_atual (enum)             │
  │ vgv_acumulado (numeric, default 0)   │
  │ meta_vgv_anual (numeric nullable)    │
  │ percentual_relacionamento_default    │
  │   (numeric, default 3.5)             │
  │ notificacoes_push (bool, default true│)
  │ tema (text, default 'remax')         │
  │ created_at                           │
  │ updated_at                           │
  └──────────────────────────────────────┘
```

### Enums

```sql
-- Status de varredura do edifício (por qualificação)
CREATE TYPE status_varredura AS ENUM (
  'nao_visitado',    -- Cinza
  'mapeado',         -- Azul
  'em_prospeccao',   -- Amarelo
  'concluido'        -- Verde
);

-- Tipologia do edifício
CREATE TYPE tipologia_edificio AS ENUM (
  'residencial_vertical',
  'residencial_horizontal',
  'comercial',
  'misto',
  'outro'
);

-- Padrão do edifício
CREATE TYPE padrao_edificio AS ENUM (
  'popular',
  'medio',
  'medio_alto',
  'alto',
  'luxo'
);

-- Abertura a corretores
CREATE TYPE abertura_corretores AS ENUM (
  'zelador_amigavel',
  'rigido',
  'exige_autorizacao',
  'desconhecido'
);

-- Etapas do funil RE/MAX
CREATE TYPE etapa_funil AS ENUM (
  'contato',
  'v1',
  'v2',
  'exclusividade',
  'venda'
);

-- Origem do lead
CREATE TYPE origem_lead AS ENUM (
  'campo',
  'indicacao_informante',
  'fisbo_portal',
  'captei',
  'referral',
  'frog',
  'digital',
  'outro'
);

-- Prazo de urgência
CREATE TYPE prazo_urgencia AS ENUM (
  'imediato',       -- < 1 mês
  'curto',          -- 1-3 meses
  'medio',          -- 3-6 meses
  'longo',          -- > 6 meses
  'indefinido'
);

-- Fonte FROG
CREATE TYPE fonte_frog AS ENUM (
  'familia',
  'relacionamentos',
  'organizacoes',
  'geografia'
);

-- Portal de scraping
CREATE TYPE portal_scraping AS ENUM (
  'zap',
  'olx',
  'vivareal',
  'outro'
);

-- Tipo de anunciante
CREATE TYPE tipo_anunciante AS ENUM (
  'proprietario',
  'imobiliaria',
  'corretor',
  'desconhecido'
);

-- Geocoding status
CREATE TYPE geocoding_status AS ENUM (
  'pending',
  'matched',
  'geocoded',
  'failed'
);

-- Match method (scraping → edifício)
CREATE TYPE match_method AS ENUM (
  'postgis',
  'geocoding',
  'manual'
);

-- Fonte de comparável (ACM)
CREATE TYPE fonte_comparavel AS ENUM (
  'manual',
  'scraping',
  'captei'
);

-- Status de referral
CREATE TYPE status_referral AS ENUM (
  'enviada',
  'aceita',
  'em_andamento',
  'convertida',
  'comissao_paga',
  'cancelada'
);

-- Clubes RE/MAX
CREATE TYPE clube_remax AS ENUM (
  'executive',
  '100_percent',
  'platinum',
  'chairmans',
  'titan',
  'diamond',
  'pinnacle'
);

-- Prioridade de feed
CREATE TYPE prioridade_feed AS ENUM (
  'alta',
  'media',
  'baixa'
);

-- Tipo de evento de feed
CREATE TYPE tipo_feed AS ENUM (
  'novo_fisbo',
  'mudanca_preco',
  'ex_imobiliaria',
  'raio_desbloqueado',
  'lead_parado',
  'novo_anuncio',
  'duplicata_detectada',
  'sistema'
);

-- Origem do edifício
CREATE TYPE origem_edificio AS ENUM (
  'manual',
  'seed',
  'api'
);
```

### Relacionamentos-Chave

```
consultores 1──N epicentros
consultores 1──N edificios_qualificacoes
consultores 1──N leads
consultores 1──N informantes
consultores 1──N referrals
consultores 1──N comissoes
consultores 1──1 consultant_settings

edificios   1──N edificios_qualificacoes
edificios   1──N leads (via edificio_id)
edificios   N──M informantes (via informantes_edificios)
edificios   1──N scraped_listings (via edificio_matched_id)
edificios   1──N acm_comparaveis

leads       1──N funnel_transitions
leads       1──N agendamentos
leads       1──N comissoes
leads       0──1 referrals (lead_id nullable)
leads       1──N marketing_plans
leads       1──N dossies
leads       1──N checklists_preparacao
leads       0──1 informantes (informante_id nullable)

informantes N──M edificios (via informantes_edificios)
informantes 1──N acoes_gentileza

scraped_listings 0──1 edificios (edificio_matched_id)
scraped_listings 0──1 scraped_listings (duplicate_of_id — self-ref)
scraped_listings 0──N acm_comparaveis (scraped_listing_id)

safari_events 1──N safari_event_rsvps
```

### Indexes Estratégicos

```sql
-- Geoespacial (GIST para PostGIS)
CREATE INDEX idx_edificios_coordinates ON edificios USING GIST (coordinates);
CREATE INDEX idx_scraped_listings_coordinates ON scraped_listings USING GIST (coordinates);
CREATE INDEX idx_acm_comparaveis_coordinates ON acm_comparaveis USING GIST (coordinates);
CREATE INDEX idx_epicentros_coordinates ON epicentros USING GIST (coordinates);
CREATE INDEX idx_intelligence_feed_coordinates ON intelligence_feed USING GIST (coordinates);

-- Lookup por consultor (RLS + queries frequentes)
CREATE INDEX idx_edificios_qual_consultant ON edificios_qualificacoes (consultant_id);
CREATE INDEX idx_edificios_qual_edificio ON edificios_qualificacoes (edificio_id);
CREATE INDEX idx_edificios_qual_status ON edificios_qualificacoes (consultant_id, status_varredura);
CREATE INDEX idx_leads_consultant ON leads (consultant_id);
CREATE INDEX idx_leads_etapa ON leads (consultant_id, etapa_funil);
CREATE INDEX idx_leads_edificio ON leads (edificio_id);
CREATE INDEX idx_funnel_transitions_lead ON funnel_transitions (lead_id);
CREATE INDEX idx_informantes_consultant ON informantes (consultant_id);
CREATE INDEX idx_scraped_listings_portal ON scraped_listings (portal, external_id);
CREATE INDEX idx_scraped_listings_fisbo ON scraped_listings (is_fisbo) WHERE is_fisbo = true;
CREATE INDEX idx_scraped_listings_active ON scraped_listings (is_active) WHERE is_active = true;
CREATE INDEX idx_intelligence_feed_unread ON intelligence_feed (consultant_id, is_read) WHERE is_read = false;
CREATE INDEX idx_intelligence_feed_created ON intelligence_feed (consultant_id, created_at DESC);
CREATE INDEX idx_agendamentos_consultant ON agendamentos (consultant_id, data_hora);
CREATE INDEX idx_referrals_consultant ON referrals (consultant_id, status);
```

---

## 4. Estratégia PostGIS

### 4.1 Habilitação

```sql
-- Habilitar extensão PostGIS no Supabase
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- para LGPD
```

### 4.2 Tipo de Coluna: geography vs geometry

Usamos `geography(Point, 4326)` (não `geometry`) para todas as coordenadas. Justificativa:

| Aspecto | geography | geometry |
|---------|-----------|----------|
| Unidade de distância | Metros (nativo) | Graus (precisa converter) |
| Precisão em raios pequenos (500m-2km) | Excelente | Precisa de ST_Transform |
| Performance | Levemente mais lento | Mais rápido |
| Adequação para Moema/SP | Perfeita para raios <10km | Overkill |

Para a escala deste projeto (micro-região, raios de 500m a 2km), `geography` é a escolha correta — retorna distâncias em metros sem conversão.

### 4.3 Queries Geoespaciais Principais

#### Q1: Edifícios dentro de um raio (FR-001, FR-004)

```sql
-- Buscar edifícios dentro de 500m do epicentro
SELECT e.*, eq.status_varredura, eq.padrao, eq.tipologia
FROM edificios e
LEFT JOIN edificios_qualificacoes eq
  ON eq.edificio_id = e.id
  AND eq.consultant_id = :consultant_id
WHERE ST_DWithin(
  e.coordinates,
  (SELECT coordinates FROM epicentros WHERE consultant_id = :consultant_id AND is_active = true),
  :raio_metros  -- 500, 1000, ou 2000
);
```

#### Q2: Cálculo de cobertura por raio (FR-004 — lógica de expansão)

```sql
-- Percentual de cobertura: edifícios qualificados / total no raio
WITH raio AS (
  SELECT coordinates FROM epicentros
  WHERE consultant_id = :consultant_id AND is_active = true
),
edificios_no_raio AS (
  SELECT e.id
  FROM edificios e, raio r
  WHERE ST_DWithin(e.coordinates, r.coordinates, :raio_metros)
),
qualificados AS (
  SELECT eq.edificio_id
  FROM edificios_qualificacoes eq
  JOIN edificios_no_raio enr ON enr.id = eq.edificio_id
  WHERE eq.consultant_id = :consultant_id
    AND eq.status_varredura != 'nao_visitado'
)
SELECT
  (SELECT COUNT(*) FROM edificios_no_raio) AS total,
  (SELECT COUNT(*) FROM qualificados) AS visitados,
  CASE
    WHEN (SELECT COUNT(*) FROM edificios_no_raio) = 0 THEN 0
    ELSE ROUND(
      (SELECT COUNT(*) FROM qualificados)::numeric /
      (SELECT COUNT(*) FROM edificios_no_raio)::numeric * 100, 1
    )
  END AS percentual_cobertura;
```

#### Q3: Matching de scraped listings com edifícios (FR-021, Story 3.4)

```sql
-- Matching em 2 passos:
-- Passo 1: Match por proximidade PostGIS (50m)
UPDATE scraped_listings sl
SET
  edificio_matched_id = (
    SELECT e.id FROM edificios e
    WHERE ST_DWithin(e.coordinates, sl.coordinates, 50)
    ORDER BY ST_Distance(e.coordinates, sl.coordinates)
    LIMIT 1
  ),
  match_method = 'postgis',
  geocoding_status = 'matched'
WHERE sl.coordinates IS NOT NULL
  AND sl.edificio_matched_id IS NULL;

-- Passo 2: Para listings sem coordenadas, geocodificar via Edge Function
-- (ver seção Pipeline de Scraping)
```

#### Q4: Comparáveis para ACM em raio (FR-015)

```sql
-- Buscar comparáveis dentro de 500m de um edifício
SELECT ac.*
FROM acm_comparaveis ac
WHERE ac.consultant_id = :consultant_id
  AND ST_DWithin(
    ac.coordinates,
    (SELECT coordinates FROM edificios WHERE id = :edificio_id),
    500  -- raio em metros
  )
  AND ac.data_referencia >= NOW() - INTERVAL '6 months'
ORDER BY ac.data_referencia DESC;
```

#### Q5: Sugestão de próximo bloco (FR-005)

```sql
-- Edifícios não visitados mais próximos do epicentro, agrupados por rua
SELECT
  e.endereco,
  COUNT(*) AS edificios_nao_visitados,
  MIN(ST_Distance(
    e.coordinates,
    (SELECT coordinates FROM epicentros WHERE consultant_id = :consultant_id AND is_active = true)
  )) AS distancia_minima
FROM edificios e
LEFT JOIN edificios_qualificacoes eq
  ON eq.edificio_id = e.id AND eq.consultant_id = :consultant_id
WHERE eq.id IS NULL  -- sem qualificação = não visitado
  AND ST_DWithin(
    e.coordinates,
    (SELECT coordinates FROM epicentros WHERE consultant_id = :consultant_id AND is_active = true),
    :raio_ativo_metros
  )
GROUP BY e.endereco
ORDER BY edificios_nao_visitados DESC, distancia_minima ASC
LIMIT 5;
```

### 4.4 Clustering para Performance do Mapa (NFR-004)

O clustering é feito **no client** via Mapbox GL JS usando o módulo `supercluster` embutido. Não usamos clustering server-side porque:

1. Mapbox GL JS possui clustering nativo via `GeoJSON source` com `cluster: true`
2. O volume esperado (edifícios em Moema, ~500-2000 pins) é gerenciável no client
3. Clustering server-side adicionaria complexidade sem ganho nesta escala

```typescript
// Configuração do source Mapbox com clustering
const edificiosSource: SourceProps = {
  type: 'geojson',
  data: edificiosGeoJSON,
  cluster: true,
  clusterMaxZoom: 14,    // Desclusteriza no zoom 15+
  clusterRadius: 50,     // Raio de agrupamento em pixels
  clusterProperties: {   // Propriedades agregadas no cluster
    nao_visitado: ['+', ['case', ['==', ['get', 'status'], 'nao_visitado'], 1, 0]],
    mapeado: ['+', ['case', ['==', ['get', 'status'], 'mapeado'], 1, 0]],
    em_prospeccao: ['+', ['case', ['==', ['get', 'status'], 'em_prospeccao'], 1, 0]],
    concluido: ['+', ['case', ['==', ['get', 'status'], 'concluido'], 1, 0]],
  },
};
```

Regras de clustering:

| Zoom | Comportamento |
|------|---------------|
| < 13 | Clusters grandes, contagem total |
| 13-14 | Clusters menores, contagem por status |
| >= 15 | Pins individuais com cor por status |

### 4.5 Raios Concêntricos (Rendering Client-Side)

Os círculos de raio (500m, 1km, 2km) são renderizados como layers GeoJSON no Mapbox, **não** como queries PostGIS. PostGIS é usado apenas para filtrar dados; a visualização é puramente frontend.

```typescript
// Gerar GeoJSON circle a partir do epicentro
import circle from '@turf/circle';

const raios = [
  { metros: 500, cor: '#22c55e', label: '500m' },   // verde
  { metros: 1000, cor: '#eab308', label: '1km' },    // amarelo
  { metros: 2000, cor: '#ef4444', label: '2km' },    // vermelho
];

const circleFeatures = raios.map(r =>
  circle([epicentro.lng, epicentro.lat], r.metros / 1000, {
    units: 'kilometers',
    properties: { cor: r.cor, label: r.label },
  })
);
```

---

## 5. Arquitetura Offline-First

### 5.1 Visão Geral

A arquitetura offline-first garante que a consultora pode operar em campo mesmo sem conectividade. Usamos uma abordagem de **cache-first com background sync**.

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Worker (Workbox)                   │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Precache    │  │ Runtime     │  │ Background Sync     │  │
│  │ Strategy    │  │ Cache       │  │ Queue               │  │
│  │             │  │             │  │                     │  │
│  │ - App Shell │  │ - API resp  │  │ - POST/PUT/DELETE   │  │
│  │ - JS/CSS   │  │ - Map tiles │  │ - Retry on connect  │  │
│  │ - Fonts    │  │ - Images    │  │ - FIFO order        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    IndexedDB                             │  │
│  │                                                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │edificios │ │leads     │ │mutations │ │settings   │  │  │
│  │  │(cache)   │ │(cache)   │ │(queue)   │ │(persisted)│  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Estratégia de Cache por Recurso

| Recurso | Estratégia Workbox | Cache Name | TTL | Tamanho Estimado |
|---------|-------------------|------------|-----|------------------|
| App Shell (HTML, JS, CSS) | `precacheAndRoute` | `workbox-precache` | Build-based | ~2 MB |
| Fontes (Google Fonts) | `CacheFirst` | `fonts-cache` | 1 ano | ~500 KB |
| Imagens estáticas (ícones, logos) | `CacheFirst` | `images-cache` | 30 dias | ~1 MB |
| Map tiles (Mapbox) | `CacheFirst` | `map-tiles-cache` | 7 dias | ~20-50 MB |
| API responses (edifícios, leads) | `StaleWhileRevalidate` | `api-cache` | Session | ~500 KB |
| Fotos V1 (Supabase Storage) | `CacheFirst` | `photos-cache` | 30 dias | Variável |

### 5.3 Map Tiles Offline

Para garantir mapa navegável offline na área de atuação:

```typescript
// Pre-cache de tiles na região do epicentro
// Mapbox permite download de tiles em bounding box
// Usamos o plugin mapbox-gl-offline

const precacheTiles = async (epicentro: { lat: number; lng: number }) => {
  // Bounding box: epicentro + 2.5km em cada direção
  const bounds = getBoundsFromCenter(epicentro, 2500);

  // Zoom levels 12-17 (overview a street level)
  for (let zoom = 12; zoom <= 17; zoom++) {
    const tileUrls = getTileUrlsInBounds(bounds, zoom);
    // Cache via Service Worker
    const cache = await caches.open('map-tiles-cache');
    await Promise.all(
      tileUrls.map(url => cache.add(url))
    );
  }
};
```

**Estimativa de armazenamento para tiles:**

| Zoom | Tiles (~5km area) | Tamanho por tile | Total |
|------|-------------------|------------------|-------|
| 12 | ~4 | 20 KB | 80 KB |
| 13 | ~9 | 20 KB | 180 KB |
| 14 | ~25 | 25 KB | 625 KB |
| 15 | ~81 | 30 KB | 2.4 MB |
| 16 | ~289 | 35 KB | 10.1 MB |
| 17 | ~1024 | 40 KB | 41 MB |
| **Total** | | | **~55 MB** |

### 5.4 IndexedDB — Schema Local

Usamos `idb-keyval` para operacoes simples e `idb` (wrapper) para stores estruturadas.

```typescript
// Stores no IndexedDB
interface OfflineStores {
  // Cache de dados do servidor (read-only local)
  'edificios-cache': {
    key: string;      // edificio.id
    value: Edificio;  // dados completos
    indexes: ['coordinates']; // para queries locais
  };

  'leads-cache': {
    key: string;
    value: Lead;
    indexes: ['edificio_id', 'etapa_funil'];
  };

  'qualificacoes-cache': {
    key: string;
    value: EdificioQualificacao;
    indexes: ['edificio_id'];
  };

  // Fila de mutações (write queue)
  'mutation-queue': {
    key: number;       // auto-increment
    value: {
      id: string;      // UUID gerado no client
      table: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE';
      payload: Record<string, unknown>;
      created_at: string;
      retry_count: number;
      status: 'pending' | 'syncing' | 'failed';
    };
  };

  // Configurações persistidas
  'settings': {
    key: string;
    value: unknown;
  };
}
```

### 5.5 Protocolo de Sincronização

#### Fluxo de Write (Mutation)

```
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│ User Action  │────>│ Zustand Store  │────>│ TanStack Query   │
│ (cadastrar   │     │ (optimistic    │     │ (mutationFn)     │
│  edifício)   │     │  update)       │     │                  │
└──────────────┘     └────────────────┘     └────────┬─────────┘
                                                      │
                                            ┌─────────┴─────────┐
                                            │ Online?           │
                                            ├────YES────┐       │
                                            │           ▼       │
                                            │  Supabase API     │
                                            │  (write direto)   │
                                            │           │       │
                                            │           ▼       │
                                            │  Confirm + sync   │
                                            │  IndexedDB cache  │
                                            │                   │
                                            ├────NO─────┐       │
                                            │           ▼       │
                                            │  IndexedDB        │
                                            │  mutation-queue    │
                                            │           │       │
                                            │           ▼       │
                                            │  Background Sync  │
                                            │  (when online)    │
                                            └───────────────────┘
```

#### Conflict Resolution: Last-Write-Wins (LWW)

Para o MVP (single-user), adotamos **last-write-wins** baseado em `updated_at`:

```typescript
// Sync: replay mutations na ordem FIFO
const syncMutations = async () => {
  const mutations = await getAllFromStore('mutation-queue');
  const sorted = mutations.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const mutation of sorted) {
    try {
      await replayMutation(mutation);
      await deleteFromStore('mutation-queue', mutation.key);
    } catch (error) {
      if (isConflict(error)) {
        // LWW: server version wins — update local cache
        const serverData = await fetchFromServer(mutation.table, mutation.payload.id);
        await updateLocalCache(mutation.table, serverData);
        await deleteFromStore('mutation-queue', mutation.key);
      } else {
        // Network error: increment retry, keep in queue
        mutation.retry_count++;
        if (mutation.retry_count >= 5) {
          mutation.status = 'failed';
          // Notificar usuário
        }
        await putInStore('mutation-queue', mutation);
      }
    }
  }
};
```

#### Background Sync Registration

```typescript
// Service Worker: registrar sync
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  }
});

// App: solicitar sync quando online
navigator.serviceWorker.ready.then((registration) => {
  return registration.sync.register('sync-mutations');
});

// Fallback: polling a cada 30s se Background Sync API indisponível
if (!('SyncManager' in window)) {
  setInterval(async () => {
    if (navigator.onLine) {
      await syncMutations();
    }
  }, 30000);
}
```

### 5.6 Capacidades Offline por Feature

| Feature | Offline Read | Offline Write | Sync Strategy |
|---------|-------------|--------------|---------------|
| Ver mapa (pré-cached area) | SIM | — | Tiles em CacheFirst |
| Ver edifícios no mapa | SIM | — | Cache em IndexedDB |
| Cadastrar edifício | SIM | SIM | Mutation queue + BG Sync |
| Qualificar edifício | SIM | SIM | Mutation queue + BG Sync |
| Ver card do edifício | SIM | — | IndexedDB cache |
| Criar lead | SIM | SIM | Mutation queue + BG Sync |
| Transição de funil | SIM | SIM | Mutation queue + BG Sync |
| Ver funil | SIM | — | Cache local |
| Ver scripts | SIM | — | Precached no install |
| Gerar PDF (Dossiê) | SIM | SIM | React-PDF client-side |
| Ver feed de inteligência | SIM (cached) | — | StaleWhileRevalidate |
| ACM | SIM (cached) | SIM (manual input) | Mutation queue |
| Dashboard KPIs | SIM (stale) | — | StaleWhileRevalidate |
| Upload fotos V1 | NAO | SIM (queued) | BG Sync quando online |
| Seed data | NAO | — | Requer conexão |

### 5.7 Indicadores Visuais de Estado

```typescript
// Componente de status de conexão
type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

// Badge no header do app
// - Verde: online, sync completo
// - Amarelo: online, sync em andamento (N pendentes)
// - Cinza: offline
// - Vermelho: erro de sync (N falharam)

// Badge em itens individuais
// - Sem badge: sincronizado
// - Ícone nuvem com seta: pendente de sync
// - Ícone erro: sync falhou
```

---

## 6. Pipeline de Scraping

### 6.1 Visão Geral

O pipeline de scraping é **desacoplado do sistema principal**. Ele alimenta dados que enriquecem a experiência, mas o sistema funciona 100% sem ele (Princípio P4, Veto PV #3).

```
┌────────────────────────────────────────────────────────────────┐
│                    PIPELINE DE SCRAPING                         │
│                    (desacoplado, async)                         │
└────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Apify      │     │ Supabase Edge    │     │ scraped_listings │
│  Actors     │     │ Function         │     │ (tabela)         │
│             │     │ (cron trigger)   │     │                  │
│ ┌─────────┐ │     │                  │     │                  │
│ │ZAP Actor│─┼────>│ scraping-ingest  │────>│  INSERT/UPSERT   │
│ └─────────┘ │     │                  │     │                  │
│ ┌─────────┐ │     │ - Valida dados   │     └────────┬─────────┘
│ │OLX Actor│─┼────>│ - Normaliza      │              │
│ └─────────┘ │     │ - Deduplica      │              ▼
│ ┌─────────┐ │     │ - Insere         │     ┌──────────────────┐
│ │VivaReal │─┼────>│                  │     │ Matching Engine  │
│ │Actor    │ │     └──────────────────┘     │ (Edge Function)  │
│ └─────────┘ │                              │                  │
└─────────────┘                              │ 1. ST_DWithin    │
                                             │    (50m)         │
                                             │ 2. Geocoding     │
                                             │    (Mapbox API)  │
                                             │ 3. Update match  │
                                             └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │ Feed Generator   │
                                             │ (DB trigger)     │
                                             │                  │
                                             │ - novo_fisbo     │
                                             │ - mudanca_preco  │
                                             │ - ex_imobiliaria │
                                             └──────────────────┘
```

### 6.2 Apify Actors

Cada portal tem um Actor dedicado no Apify. Os Actors são configurados para:

| Actor | Portal | Filtros | Output |
|-------|--------|---------|--------|
| `remax-zap-scraper` | ZAP Imóveis | Bairros: Moema, Vila Olímpia, Itaim Bibi; Tipo: Venda; Proprietário direto | JSON padronizado |
| `remax-olx-scraper` | OLX | Mesmos bairros; Categoria: Imóveis | JSON padronizado |
| `remax-vivareal-scraper` | VivaReal | Mesmos bairros | JSON padronizado |

**Schema de output padronizado (todos os Actors):**

```typescript
interface ScrapedItem {
  portal: 'zap' | 'olx' | 'vivareal';
  external_id: string;           // ID no portal
  url: string;
  titulo: string;
  endereco_raw: string;          // Endereço como aparece no portal
  preco: number | null;
  area_m2: number | null;
  quartos: number | null;
  tipo_anunciante: 'proprietario' | 'imobiliaria' | 'corretor' | 'desconhecido';
  latitude: number | null;       // Se disponível no portal
  longitude: number | null;
  data_anuncio: string | null;
  raw_data: Record<string, unknown>;  // Payload original completo
}
```

### 6.3 Edge Function: scraping-ingest

Trigger: Cron (diário para ZAP, semanal para OLX/VivaReal) ou webhook do Apify.

```typescript
// supabase/functions/scraping-ingest/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  const { items, portal } = await req.json() as {
    items: ScrapedItem[];
    portal: string;
  };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const results = { inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (const item of items) {
    try {
      // 1. Normalizar endereço
      const endereco_normalizado = normalizeAddress(item.endereco_raw);

      // 2. Converter coordenadas se disponíveis
      const coordinates = item.latitude && item.longitude
        ? `POINT(${item.longitude} ${item.latitude})`
        : null;

      // 3. Upsert (portal + external_id é UNIQUE)
      const { data, error } = await supabase
        .from('scraped_listings')
        .upsert({
          portal: item.portal,
          external_id: item.external_id,
          url: item.url,
          titulo: item.titulo,
          endereco_raw: item.endereco_raw,
          endereco_normalizado,
          coordinates,
          preco: item.preco,
          area_m2: item.area_m2,
          preco_m2: item.preco && item.area_m2
            ? item.preco / item.area_m2
            : null,
          quartos: item.quartos,
          tipo_anunciante: item.tipo_anunciante,
          is_fisbo: item.tipo_anunciante === 'proprietario',
          data_anuncio: item.data_anuncio,
          data_scraped: new Date().toISOString(),
          raw_data: item.raw_data,
          is_active: true,
        }, {
          onConflict: 'portal,external_id',
        });

      if (error) {
        results.errors++;
      } else {
        // Detectar mudança de preço
        await detectPriceChange(supabase, item);
        results.inserted++;
      }
    } catch (e) {
      results.errors++;
    }
  }

  // 4. Trigger matching engine
  await supabase.functions.invoke('matching-engine', {
    body: { portal, batch_id: crypto.randomUUID() },
  });

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 6.4 Edge Function: matching-engine

Matching em 3 etapas para vincular scraped listings a edifícios cadastrados:

```
┌────────────────────────────┐
│ scraped_listings            │
│ (sem edificio_matched_id)  │
└─────────────┬──────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Etapa 1: PostGIS Match      │
│ ST_DWithin(coordinates, 50m)│
│ Requer: listing.coordinates │
│         IS NOT NULL          │
└─────────────┬───────────────┘
              │ Não matched?
              ▼
┌─────────────────────────────┐
│ Etapa 2: Geocoding          │
│ Mapbox Geocoding API        │
│ endereco_raw → coordinates  │
│ Depois: retry PostGIS match │
└─────────────┬───────────────┘
              │ Não matched?
              ▼
┌─────────────────────────────┐
│ Etapa 3: Marca como         │
│ geocoding_status = 'failed' │
│ Para review manual futuro   │
└─────────────────────────────┘
```

```typescript
// supabase/functions/matching-engine/index.ts

// Etapa 1: PostGIS direct match
const { data: matched } = await supabase.rpc('match_listings_postgis', {
  distance_meters: 50,
});

// Etapa 2: Geocode + retry
const unmatched = await supabase
  .from('scraped_listings')
  .select('id, endereco_raw')
  .is('coordinates', null)
  .is('edificio_matched_id', null)
  .eq('geocoding_status', 'pending');

for (const listing of unmatched.data ?? []) {
  const coords = await geocodeAddress(listing.endereco_raw);
  if (coords) {
    await supabase
      .from('scraped_listings')
      .update({
        coordinates: `POINT(${coords.lng} ${coords.lat})`,
        geocoding_status: 'geocoded',
      })
      .eq('id', listing.id);

    // Retry PostGIS match com as novas coordenadas
    await supabase.rpc('match_single_listing_postgis', {
      listing_id: listing.id,
      distance_meters: 50,
    });
  } else {
    await supabase
      .from('scraped_listings')
      .update({ geocoding_status: 'failed' })
      .eq('id', listing.id);
  }
}
```

### 6.5 Cron Schedule

| Job | Frequência | Edge Function | Actor |
|-----|-----------|---------------|-------|
| ZAP scrape | Diário (03:00 BRT) | `scraping-ingest` | `remax-zap-scraper` |
| OLX scrape | Semanal (dom 04:00) | `scraping-ingest` | `remax-olx-scraper` |
| VivaReal scrape | Semanal (dom 05:00) | `scraping-ingest` | `remax-vivareal-scraper` |
| Matching retry | Diário (06:00 BRT) | `matching-engine` | — |
| Deactivate old | Semanal | `cleanup-listings` | — |

### 6.6 Cross-Referencing (Story 3.6)

```sql
-- Detectar duplicatas entre portais
-- Usa endereco_normalizado + area_m2 + preco (com tolerância)
WITH potential_dupes AS (
  SELECT
    a.id AS listing_a,
    b.id AS listing_b,
    a.portal AS portal_a,
    b.portal AS portal_b
  FROM scraped_listings a
  JOIN scraped_listings b ON a.id < b.id  -- evita self-join duplicado
  WHERE a.portal != b.portal
    AND a.is_active = true
    AND b.is_active = true
    AND (
      -- Mesmo endereço normalizado
      a.endereco_normalizado = b.endereco_normalizado
      -- OU coordenadas muito próximas (30m)
      OR (a.coordinates IS NOT NULL AND b.coordinates IS NOT NULL
          AND ST_DWithin(a.coordinates, b.coordinates, 30))
    )
    AND (
      -- Área similar (10% tolerância)
      ABS(COALESCE(a.area_m2,0) - COALESCE(b.area_m2,0)) <
        GREATEST(a.area_m2, b.area_m2) * 0.10
    )
)
SELECT * FROM potential_dupes;

-- Detectar "ex-imobiliária → FISBO"
-- Listing anteriormente de imobiliária, agora de proprietário
SELECT sl_new.*
FROM scraped_listings sl_new
JOIN scraped_listings sl_old
  ON sl_new.endereco_normalizado = sl_old.endereco_normalizado
WHERE sl_new.tipo_anunciante = 'proprietario'
  AND sl_old.tipo_anunciante = 'imobiliaria'
  AND sl_old.is_active = false
  AND sl_new.is_active = true;
```

### 6.7 Graceful Degradation

Se o scraping falhar em qualquer ponto, o sistema degrada graciosamente:

| Ponto de falha | Impacto | Degradação |
|---------------|---------|------------|
| Apify Actor indisponível | Sem novos listings | ACM funciona com dados manuais + cache existente |
| Edge Function falha | Listings não ingeridos | Retry automático no próximo cron. Dados manuais intactos |
| Geocoding API indisponível | Listings sem coordenadas | Listings ficam com `geocoding_status: 'pending'`, retry no próximo ciclo |
| Matching falha | Listings não vinculados | Feed mostra listings sem vínculo, consultora pode vincular manualmente |
| Portal muda HTML | Actor quebra | Alert via Sentry. Fallback CSV: consultora exporta do portal e importa |

**Fallback CSV:**

```typescript
// Importação CSV como alternativa ao scraping automatizado
interface CSVImportConfig {
  portal: string;
  columnMapping: Record<string, string>;  // CSV header → ScrapedItem field
  previewRows: number;  // 5 rows para preview antes de importar
  deduplication: boolean;
}
```

### 6.8 Feed de Inteligência (Story 3.7)

Eventos são gerados via **database triggers** e **Edge Functions**:

```sql
-- Trigger: novo FISBO detectado
CREATE OR REPLACE FUNCTION fn_notify_new_fisbo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_fisbo = true AND (OLD IS NULL OR OLD.is_fisbo = false) THEN
    INSERT INTO intelligence_feed (
      consultant_id,
      tipo,
      titulo,
      descricao,
      prioridade,
      entity_type,
      entity_id,
      coordinates,
      is_read,
      is_push_sent
    )
    SELECT
      c.id,
      'novo_fisbo',
      'Novo FISBO detectado: ' || NEW.titulo,
      'Anúncio de proprietário em ' || NEW.endereco_raw || ' no ' || NEW.portal,
      'alta',
      'scraped_listing',
      NEW.id,
      NEW.coordinates,
      false,
      false
    FROM consultores c
    WHERE ST_DWithin(
      NEW.coordinates,
      (SELECT ep.coordinates FROM epicentros ep WHERE ep.consultant_id = c.id AND ep.is_active = true),
      (SELECT ep.raio_ativo_m FROM epicentros ep WHERE ep.consultant_id = c.id AND ep.is_active = true)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_new_fisbo
AFTER INSERT OR UPDATE ON scraped_listings
FOR EACH ROW EXECUTE FUNCTION fn_notify_new_fisbo();

-- Trigger: mudança de preço
CREATE OR REPLACE FUNCTION fn_notify_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.preco IS NOT NULL AND NEW.preco IS NOT NULL
     AND OLD.preco != NEW.preco THEN
    -- Append ao histórico de preço
    NEW.preco_historico = COALESCE(OLD.preco_historico, '[]'::jsonb) ||
      jsonb_build_object('preco', OLD.preco, 'data', NOW());

    -- Inserir no feed
    INSERT INTO intelligence_feed (
      consultant_id, tipo, titulo, descricao, prioridade,
      entity_type, entity_id, coordinates
    )
    SELECT
      c.id,
      'mudanca_preco',
      'Preço alterado: ' || NEW.titulo,
      'De R$ ' || OLD.preco || ' para R$ ' || NEW.preco ||
        ' (' || ROUND(((NEW.preco - OLD.preco) / OLD.preco * 100)::numeric, 1) || '%)',
      CASE WHEN NEW.preco < OLD.preco THEN 'alta' ELSE 'media' END,
      'scraped_listing',
      NEW.id,
      NEW.coordinates
    FROM consultores c
    WHERE ST_DWithin(
      NEW.coordinates,
      (SELECT ep.coordinates FROM epicentros ep WHERE ep.consultant_id = c.id AND ep.is_active = true),
      2000  -- Notifica para todos dentro de 2km
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_price_change
BEFORE UPDATE ON scraped_listings
FOR EACH ROW EXECUTE FUNCTION fn_notify_price_change();
```

---

## 7. Decisões Arquiteturais (ADRs)

### ADR-001: Separação edificios / edificios_qualificacoes

**Contexto:** O PRD exige multi-tenant readiness (NFR-005) e o Alerta PV reforça a separação.

**Decisão:** Duas tabelas separadas desde o dia 1:
- `edificios`: dados base, imutáveis por natureza (endereço, coordenadas, nome). Futuramente pública/compartilhada entre consultores.
- `edificios_qualificacoes`: qualificação privada por consultor (status, padrão, tipologia, notas). Protegida por RLS.

**Consequências:**
- (+) Zero migração ao habilitar multi-tenant no Epic 4
- (+) Seed data pode popular `edificios` sem criar `qualificacoes`
- (+) Dois consultores podem qualificar o mesmo edifício independentemente
- (-) JOIN necessário para visualizações completas (mitigado por view materializada ou query otimizada)

### ADR-002: geography(Point, 4326) para coordenadas

**Contexto:** PostGIS oferece `geometry` e `geography`. A área de atuação é micro-regional (Moema/SP).

**Decisão:** Usar `geography(Point, 4326)` em todas as tabelas com coordenadas.

**Consequências:**
- (+) Distâncias retornadas diretamente em metros
- (+) ST_DWithin funciona nativamente com metros
- (+) Sem necessidade de ST_Transform ou conversões de projeção
- (-) ~10% mais lento que geometry para queries pesadas (irrelevante nesta escala)

### ADR-003: Clustering client-side via Mapbox GL JS

**Contexto:** Pins no mapa precisam de clustering para performance (NFR-004).

**Decisão:** Clustering nativo do Mapbox GL JS (supercluster), sem clustering server-side.

**Consequências:**
- (+) Zero latência de rede para reagrupamento ao fazer zoom
- (+) Animação suave de cluster → pins individuais
- (+) Funciona offline (dados já no client)
- (-) Limite prático de ~50.000 features (amplamente suficiente para Moema)

### ADR-004: Last-Write-Wins para conflitos offline

**Contexto:** A consultora é single-user no MVP. Conflitos offline são raros mas possíveis (edita no celular offline, depois edita no desktop online).

**Decisão:** Last-Write-Wins baseado em timestamp `updated_at`. Server version ganha em caso de conflito.

**Consequências:**
- (+) Simplicidade de implementação
- (+) Adequado para single-user
- (-) Pode perder edição offline se conflitar com edição online mais recente
- (!) Para multi-tenant (Epic 4), reavaliar com CRDT ou merge strategy

### ADR-005: React-PDF client-side para Dossiê

**Contexto:** Dossiê/Showcase precisa ser gerado como PDF (Story 3.2). Serverless functions têm timeout curto.

**Decisão:** `@react-pdf/renderer` executado no browser do cliente.

**Consequências:**
- (+) Funciona offline
- (+) Sem timeout de serverless
- (+) Sem custo de servidor para renderização
- (-) Performance depende do device (mitigado: celulares modernos lidam bem)

### ADR-006: Apify como provider de scraping

**Contexto:** Scraping de portais imobiliários requer infraestrutura dedicada e manutenção de Actors.

**Decisão:** Apify como plataforma de scraping, com Actors customizados por portal.

**Consequências:**
- (+) Infraestrutura gerenciada (proxies, browser pool, retries)
- (+) Pricing por uso (pay-per-run)
- (+) Monitoramento e logs built-in
- (-) Dependência de terceiro (mitigado por fallback CSV)
- (-) Custo mensal recorrente (~$50-100/mês estimado)

### ADR-007: Supabase Realtime para notificações

**Contexto:** Feed de inteligência e sync entre devices precisam de push.

**Decisão:** Supabase Realtime (PostgreSQL LISTEN/NOTIFY via websocket) para notificações in-app. Push notifications via Web Push API para quando app está fechado.

**Consequências:**
- (+) Integração nativa com Supabase, sem infraestrutura adicional
- (+) Subscrição por tabela/filtro (ex: `intelligence_feed` WHERE `consultant_id = X`)
- (-) Websocket connection necessária (não funciona offline — adequado, pois notificações são online-only)

---

## 8. Considerações de Segurança

### 8.1 LGPD (NFR-003)

| Dado Sensível | Proteção | Implementação |
|---------------|----------|---------------|
| Telefone de leads | Criptografia at-rest | `pgcrypto: pgp_sym_encrypt()` |
| Email de leads | Criptografia at-rest | `pgcrypto: pgp_sym_encrypt()` |
| Telefone de informantes | Criptografia at-rest | `pgcrypto: pgp_sym_encrypt()` |
| Dados em trânsito | TLS 1.3 | Supabase + Vercel (HTTPS forçado) |
| Termos de uso | Consent tracking | `leads.lgpd_consent_at` |
| Direito ao esquecimento | Soft delete + purge | Edge Function dedicada |

```sql
-- Exemplo: inserir lead com telefone criptografado
INSERT INTO leads (nome, telefone_encrypted, consultant_id)
VALUES (
  'João Silva',
  pgp_sym_encrypt('11999998888', current_setting('app.encryption_key')),
  :consultant_id
);

-- Ler telefone descriptografado
SELECT nome,
  pgp_sym_decrypt(telefone_encrypted, current_setting('app.encryption_key')) AS telefone
FROM leads
WHERE id = :lead_id;
```

### 8.2 Row Level Security (RLS)

```sql
-- Policy: consultores só veem seus próprios dados
ALTER TABLE edificios_qualificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultores veem apenas suas qualificacoes"
ON edificios_qualificacoes FOR ALL
USING (consultant_id = auth.uid());

-- Policy: edifícios são visíveis para todos (futuramente públicos)
ALTER TABLE edificios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Edificios visiveis para todos os autenticados"
ON edificios FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Edificios criados pelo consultor ou seed"
ON edificios FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (created_by = auth.uid() OR origem = 'seed')
);

-- Policy: leads privados por consultor
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads privados por consultor"
ON leads FOR ALL
USING (consultant_id = auth.uid());

-- Policy: referrals visíveis para participantes
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals visiveis para consultor"
ON referrals FOR ALL
USING (consultant_id = auth.uid());
```

### 8.3 Supabase Storage Policies

```sql
-- Bucket: fotos-v1 (privado por consultor)
CREATE POLICY "Fotos V1 privadas"
ON storage.objects FOR ALL
USING (
  bucket_id = 'fotos-v1'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Bucket: dossies (privado por consultor)
CREATE POLICY "Dossies privados"
ON storage.objects FOR ALL
USING (
  bucket_id = 'dossies'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 9. Glossário Técnico

| Termo | Definição |
|-------|-----------|
| **ACM** | Análise Comparativa de Mercado — relatório de preços de imóveis similares na região |
| **Dossiê/Showcase** | PDF profissional compilado para apresentação V2 ao proprietário |
| **Epicentro** | Ponto central do território da consultora (default: Rua Alvorada, Moema) |
| **Etapa V1** | Primeira visita ao imóvel — apresentação e avaliação inicial |
| **Etapa V2** | Segunda visita — apresentação do Dossiê/Showcase, proposta de exclusividade |
| **FISBO** | For Sale By Owner — proprietário vendendo sem corretor |
| **FROG** | Método de prospecção: Família, Relacionamentos, Organizações, Geografia |
| **Home Staging** | Preparação visual do imóvel para venda |
| **Informante** | Zelador, porteiro ou contato que fornece leads em edifícios |
| **LWW** | Last-Write-Wins — estratégia de resolução de conflitos onde a escrita mais recente prevalece |
| **Marketing de Gentileza** | Ações de relacionamento com informantes (presentes, visitas) |
| **Multi-tenant** | Arquitetura que suporta múltiplos consultores com isolamento de dados |
| **Referral** | Indicação cruzada entre consultores de regiões diferentes |
| **RLS** | Row Level Security — políticas de segurança por linha no PostgreSQL |
| **Seed Data** | Dados pré-carregados de APIs públicas para popular mapa inicial |
| **Varredura** | Processo de percorrer e mapear edifícios em um raio |
| **VGV** | Valor Geral de Vendas — métrica de volume de negócios RE/MAX |

---

## Referências

- PRD: `docs/prd.md` v2.0
- PostGIS Documentation: https://postgis.net/docs/
- Mapbox GL JS: https://docs.mapbox.com/mapbox-gl-js/
- Workbox (Google): https://developer.chrome.com/docs/workbox
- Supabase: https://supabase.com/docs
- Apify: https://docs.apify.com
- React-PDF: https://react-pdf.org

---

*System Architecture v1.0 — Aria (Architect Agent) — Synkra AIOX*
