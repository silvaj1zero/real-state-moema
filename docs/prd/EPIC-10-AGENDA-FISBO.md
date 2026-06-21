# Epic 10 — Agenda de Prospecção FISBO (call list + roteiro de visitas)

**Versão:** 1.0
**Status:** Draft — Ready for PO Validation
**Data:** 2026-06-21
**Author:** Morgan (@pm)
**End-user validadora:** Luciana Borba (RE/MAX Galeria Moema)
**Escopo:** ENXUTO (lean) — camada de produtividade sobre o que o Epic 7 (FISBO) e o Epic 2 (funil/agendamentos) já entregam.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-21 | 1.0 | Esboço enxuto a partir do inventário FISBO→agenda (sessão 2026-06-21): is_fisbo + contato enriquecido + agendamentos + mapa já existem; faltam call list priorizada com status de tentativa e roteiro por proximidade | Morgan (@pm) |

---

## 1. Goals and Background Context

### Goals
- **Transformar o levantamento FISBO em ação:** dar à Luciana uma **call list priorizada** de anúncios de particular (FISBO) e um **roteiro de visitas por proximidade**, sem reinventar o pipeline.
- **Reusar o que já existe** (Constituição Art. IV): `is_fisbo`, contato enriquecido (`telefone_anunciante`/`whatsapp_anunciante` + links `tel:`/`wa.me`), `coordinates`/`bairro`, `etapa_funil`, tabela `agendamentos` + `AgendaList` + `FollowUpAlert`, `MapView` com raios.
- **Fechar 2 gaps de produtividade:** (1) **status de tentativa de contato** (hoje só há `etapa_funil`, sem granularidade de "ligou/não atendeu/retornar"); (2) **ordenação/agrupamento por proximidade** para a sequência de visitas.

### Background Context
O inventário desta sessão confirmou que o sistema captura FISBO (classificação determinística `classify-advertiser.ts` + `publisherType=owner` do ZAP/VivaReal) e enriquece contato (Story 6.4), com telefone/WhatsApp clicáveis no `ContactDataCard`. Há funil (`etapa_funil`) e agendamentos (`agendamentos` + `AgendaList`). **O que falta** para virar uma "agenda" operacional é uma **lista acionável** que ordene os FISBO por prioridade e registre o **resultado de cada tentativa de contato**, e uma forma simples de **sequenciar visitas por proximidade** (já há `coordinates` e raios no mapa). Os demais itens (discador VoIP, calendário grid, TSP avançado, dedup por telefone, métricas de conversão) ficam **fora do escopo** deste épico enxuto.

### Decisão de arquitetura
Reusar o stack atual (Next.js + Supabase + Mapbox). Sem novas dependências externas. A persistência do status de tentativa deve reusar/estender as tabelas existentes (`leads`/`scraped_listings`/`agendamentos`) em vez de criar um CRM paralelo.

### Referências
- Inventário FISBO→agenda (sessão 2026-06-21).
- `app/src/lib/scrapers/classify-advertiser.ts`, `app/src/lib/contact-enrichment.ts`, `app/src/components/search/ContactDataCard.tsx`.
- `app/src/hooks/useAgendamentos.ts`, `app/src/components/scheduling/{AgendaList,FollowUpAlert}.tsx`.
- `app/src/components/map/MapView.tsx`, `app/src/hooks/useRadiusExpansion.ts`.
- Schema: `supabase/migrations/...epic2_methodology.sql` (leads/agendamentos), `scraped_listings`.

---

## 2. Relação com outros épicos
- **Epic 7 (FISBO/prospecção)** — fornece os anúncios de particular + contato enriquecido (insumo da call list).
- **Epic 2 (funil/agendamentos)** — fornece `etapa_funil` e `agendamentos`/`AgendaList` (base da agenda).
- **Epic 5 (raio/mapa)** — fornece `coordinates` + raios (base do roteiro por proximidade).

---

## 3. Stories (Story Map — enxuto)

| Story | Título | Camada | Prioridade | Depende | Executor |
|-------|--------|--------|------------|---------|----------|
| 10.1 | Call list FISBO priorizada + status de tentativa de contato | Dados + UI | Must | Epic 7 contato, Epic 2 funil | @dev (+ @data-engineer p/ coluna de status) |
| 10.2 | Roteiro de visitas por proximidade (ordenar/agrupar por raio/bairro) | UI | Should | 10.1, Epic 5 mapa | @dev |

> **Sequência:** 10.1 → 10.2. 10.1 entrega a lista acionável; 10.2 sequencia as visitas no campo.
> Stories detalhadas por @sm em `docs/stories/10.1.story.md` e `10.2.story.md` após validação @po.

---

## 4. Out of Scope (Epic 10)
- Discador VoIP/Twilio, gravação/duração de chamada.
- Calendário visual em grade (semana/mês) — segue a `AgendaList` cronológica.
- Otimização de rota TSP/VRP avançada — aqui só ordenação simples por distância/bairro.
- Dedup de anunciante por telefone (CRM por pessoa) — épico futuro.
- Lembretes push/e-mail e métricas de conversão (taxa de atendimento/agendamento).
- Export iCal.

---

## 5. Risks & Assumptions
- **Risco (dado de contato):** parte dos FISBO pode não ter telefone/WhatsApp recuperado — a call list deve degradar graciosamente (mostrar "sem contato" e permitir enriquecer).
- **Risco (LGPD):** telefone de anúncio público — manter o tratamento atual (`lgpd_consent_origin='portal_publico'`, repositório privado).
- **Assumption:** `coordinates` dos FISBO/edifícios estão preenchidas o suficiente para ordenar por proximidade (confirmar cobertura; degradar para ordenação por bairro quando faltar).
- **Assumption:** estender status de tentativa nas tabelas existentes é suficiente (não exige CRM novo).

---

## 6. Success Metrics
- Luciana abre uma **lista priorizada de FISBO** e registra o resultado de cada tentativa (atendeu/não atendeu/retornar/agendado) sem sair da tela.
- A partir dos agendados, consegue uma **sequência de visitas ordenada por proximidade** (ou bairro).
- Zero regressão no funil/agendamentos existentes.
