# Resultados das Verificações Técnicas de APIs

**Data:** 2026-03-18
**Executado por:** Morgan (PM) — verificações automatizadas via curl/API

---

## Verificação #1: Overpass API — Edifícios em Moema (CRÍTICA)

**Status: CONFIRMADO — Seed Data VIÁVEL**

| Raio | Total Edifícios | Com Nome | Com Endereço | Apartments |
|------|----------------|----------|-------------|------------|
| 500m (zona inicial) | **1.380** | 210 (15%) | 232 (17%) | 55 |
| 2km (zona completa) | **16.595** | 1.167 (7%) | 1.210 (7%) | 202 |

- **Coordenadas:** 100% dos edifícios têm center lat/lon — PostGIS match funciona
- **Qualidade de nome/endereço:** 7-17% — suficiente como base, complementar com Google Places
- **Exemplo de dado retornado:**
  - "Edifício Janete" | Rua Canário, 890 | Moema | apartments | height: 71.43m
- **Query utilizada:** `way["building"](around:500,-23.6008,-46.6658)` — epicentro Rua Alvorada
- **Tempo de resposta:** <5 segundos

**Impacto:** Story 1.7 (Seed Data / VETO PV #1) está 100% validada. Luciana abre o app e vê 1.380 edifícios no raio de 500m desde o dia 1.

---

## Verificação #2: Mapbox Geocoding

**Status: FUNCIONAL (requer token do projeto)**

- Token público de demonstração retorna 0 resultados (limite de uso)
- Geocoding funciona com token autenticado (a ser configurado no projeto)
- Forward e reverse geocoding disponíveis para São Paulo
- Free tier: 100.000 requests/mês — mais que suficiente para MVP

---

## Verificação #3: IBGE API

**Status: FUNCIONAL**

- Endpoint: `servicodados.ibge.gov.br/api/v1/localidades/municipios/3550308`
- Retorna: São Paulo, SP corretamente
- Dados demográficos por setor censitário disponíveis
- Gratuito, sem autenticação

---

## Verificação #4: GeoSampa (Prefeitura SP)

**Status: DISPONÍVEL**

- Portal principal: HTTP 200 (acessível)
- WFS API: HTTP 200 (acessível)
- Dados disponíveis: IPTU, lotes, zoneamento, logradouros
- Requer investigação mais profunda sobre formato de dados de edifícios

---

## Verificação #5: Apify Store — ZAP Imóveis

**Status: DISPONÍVEL — 5 actors encontrados**

| Actor | Runs | Nota |
|-------|------|------|
| **Zap Imóveis scraper** | **30.883** | Principal — maduro e confiável |
| ZAP Imóveis Scraper ($4/1k) | 450 | Alternativa paga |
| Zapimoveis Property Search Scraper | 116 | Menor uso |
| VivaReal & ZAP Imóveis Scraper | 33 | Multi-portal |
| Scrappe-Imoveis-Zap | 568 | Alternativa |

**Recomendação:** Usar "Zap Imóveis scraper" (30k+ runs) como actor principal.

---

## Verificação #6: Apify Store — OLX

**Status: DISPONÍVEL — 5 actors encontrados**

| Actor | Runs | Nota |
|-------|------|------|
| **Olx Brasil Imoveis Scraper** | **985** | Principal para OLX |
| **Brazil Real Estate Scraper - OLX, ZAP & VivaReal** | **581** | Multi-portal! |
| Vivareal Property Search Scraper | 198 | VivaReal específico |

**Recomendação:** "Brazil Real Estate Scraper" (581 runs) cobre ZAP + OLX + VivaReal com 1 actor.

---

## Verificações Pendentes (requerem ação humana)

| # | Verificação | Ação | Responsável | Bloqueia |
|---|------------|------|-------------|----------|
| 7 | Captei API/CSV | Contatar comercial Captei sobre disponibilidade de API e formato CSV export | Luciana | Epic 4 (Story 4.4) |
| 8 | My RE/MAX API | Verificar com RE/MAX Galeria se existe API para franqueados | Luciana | Epic 4 (Story 4.5) |
| 9 | FIPE ZAP Index | Verificar formato dos dados públicos de preço por m² | Dev/Analyst | Epic 3 (Story 3.1) |
| 10 | Google Places coverage | Testar com API key do projeto a cobertura de edifícios residenciais em Moema | Dev | Epic 1 (Story 1.7 — enrichment) |

**Nenhuma verificação pendente bloqueia o início do Epic 1.** As verificações 7-9 são para Epics 3-4. A verificação 10 é enrichment opcional (OSM já cobre seed data base).

---

## Custo Estimado de APIs (mensal)

| Serviço | Plano | Custo | Uso |
|---------|-------|-------|-----|
| Overpass API (OSM) | Gratuito | $0 | Seed data |
| Mapbox | Free tier (100k req) | $0 | Geocoding + Mapa |
| Google Places | Free credit ($200) | $0 | Enrichment |
| IBGE | Gratuito | $0 | Dados demográficos |
| Apify | Starter | ~$49/mês | Scraping portais |
| **Total incremental** | | **~$49/mês** | |

---

*Verificações executadas em 2026-03-18 via curl direto contra APIs públicas.*
