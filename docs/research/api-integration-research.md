# Pesquisa de APIs e Fontes de Dados Externas — Sistema Imobiliário RE/MAX Moema

**Agente:** Alex (Analyst)
**Data:** 2026-03-18
**PRD Ref:** `docs/prd.md` v2.0
**Status:** Pesquisa baseada em conhecimento de treinamento (cutoff: maio/2025). Itens marcados com `[NEEDS VERIFICATION]` requerem verificação manual com acesso web.

---

## Sumário Executivo

Este relatório mapeia todas as fontes de dados externas necessárias para o sistema de mapeamento imobiliário da Luciana Borba (RE/MAX Galeria Moema). A pesquisa cobre 6 categorias: Captei, My RE/MAX, portais imobiliários, dados geoespaciais, dados transacionais e Apify Marketplace.

**Conclusão geral:** A maioria das integrações externas **não possui APIs públicas documentadas**. A estratégia correta é a que o PRD já define: **manual-first com CSV fallback, scraping como acelerador**. As únicas APIs confiáveis e bem documentadas são as de infraestrutura (Mapbox, Google Places, OSM Overpass, Supabase/PostGIS).

---

## 1. Captei

### O que é
Plataforma brasileira de captação de imóveis que monitora portais (ZAP, OLX, VivaReal, etc.) e entrega leads de proprietários para imobiliárias/corretores. Funciona como um "radar de FISBOs" — detecta anúncios de proprietários diretos e consolida numa interface.

### Status da API

| Item | Status | Detalhes |
|------|--------|---------|
| API REST pública | **Indisponível** | Captei não documenta API pública. O acesso é via plataforma web/app. [NEEDS VERIFICATION] |
| Export CSV | **Disponível** | A plataforma permite exportar listas de leads captados em CSV. Formato inclui: nome, telefone, endereço, portal de origem, data de captação, link do anúncio. [NEEDS VERIFICATION — confirmar campos exatos no painel Captei da Luciana] |
| API para parceiros/integradores | **Desconhecido** | É possível que exista API sob contrato enterprise. Captei tem integrações com CRMs (RD Station, Hubspot). Se existe API, provavelmente é Partner API restrita. [NEEDS VERIFICATION] |
| Webhooks | **Desconhecido** | Não há documentação pública sobre webhooks. [NEEDS VERIFICATION] |

### Dados disponíveis (via CSV export)

- Nome do proprietário
- Telefone(s)
- Endereço do imóvel (texto livre, sem coordenadas)
- Portal de origem (ZAP, OLX, VivaReal, etc.)
- Link do anúncio original
- Data de captação
- Tipo do imóvel / metragem (parcial)
- Preço pedido

### Pricing

| Plano | Estimativa | Detalhes |
|-------|-----------|---------|
| Plano básico (corretor individual) | R$ 150-300/mês | Monitoramento de 1-3 regiões. [NEEDS VERIFICATION — preços podem ter mudado] |
| Plano imobiliária | R$ 500-2.000/mês | Múltiplas regiões, múltiplos corretores. [NEEDS VERIFICATION] |
| API/integrações avançadas | Desconhecido | Provavelmente sob negociação direta. |

### Recomendação para o projeto

1. **Story 4.4 (Integração Captei):** Implementar **import CSV como Must** — é o caminho garantido.
2. Mapear os campos exatos do CSV exportado da conta da Luciana.
3. Na importação: geocodificar endereços via Mapbox Geocoding API para match com edifícios (PostGIS ST_DWithin).
4. **API REST como Should/Could:** Contatar Captei comercial para verificar disponibilidade de API. Se existir, implementar como upgrade futuro.

### Passos de verificação

- [ ] Acessar painel Captei da Luciana e exportar CSV de exemplo
- [ ] Documentar todos os campos e formatos do CSV
- [ ] Contatar suporte/comercial Captei perguntando sobre: (a) API REST, (b) Webhooks, (c) Integrações custom
- [ ] Verificar se Captei já possui integração com algum CRM que facilite intermediação

---

## 2. My RE/MAX Platform

### O que é
Plataforma interna da rede RE/MAX para gestão de transações, comissões, progressão em clubes (Executive, 100%, Platinum, etc.) e gestão de franquia. Cada consultor tem acesso ao seu perfil, transações e pipeline.

### Status da API

| Item | Status | Detalhes |
|------|--------|---------|
| API pública | **Indisponível** | RE/MAX não oferece API pública para franqueados ou consultores individuais. |
| API para franqueadores | **Desconhecido** | Pode existir API interna para master franquias (RE/MAX Brasil). [NEEDS VERIFICATION] |
| Export de dados | **Parcial** | Consultores podem exportar relatórios em PDF/Excel do seu painel. Formato varia. [NEEDS VERIFICATION — verificar com a Luciana quais exports existem] |
| Data sync bidirecional | **Indisponível** | Não há mecanismo documentado de sync via API. |
| SSO/OAuth | **Indisponível** | Não há OAuth público para integração. |

### Dados potencialmente acessíveis (manual export)

- Histórico de transações (VGV/VGH)
- Status de progressão em clubes RE/MAX
- Comissões recebidas
- Pipeline de negócios (se alimentado no My RE/MAX)
- Dados de franquia/escritório

### Recomendação para o projeto

1. **Story 4.5 (Integração My RE/MAX):** PRD já marca como "investigar API (bloqueante)" — a investigação confirma que **API é muito provavelmente indisponível**.
2. Implementar **export CSV/PDF do nosso sistema para upload manual no My RE/MAX** (caminho inverso).
3. Implementar **import manual de dados do My RE/MAX** (CSV/Excel/PDF parse) para alimentar dashboard de clubes (Story 4.3).
4. Dashboard de progressão de clubes (Story 4.3) pode ser alimentado por **input manual simples** — a Luciana insere VGV total e o sistema calcula a faixa de clube.

### Passos de verificação

- [ ] Acessar My RE/MAX com credenciais da Luciana e documentar funcionalidades de export
- [ ] Verificar com o broker (dono da franquia RE/MAX Galeria) se existe API ou integrações técnicas disponíveis para franqueados
- [ ] Verificar se RE/MAX Brasil (master franquia) oferece algum programa de integração tecnológica
- [ ] Contatar RE/MAX Brasil TI (se possível via broker) sobre APIs ou data feeds

---

## 3. Portais Imobiliários (ZAP, OLX, VivaReal, QuintoAndar)

### 3.1 ZAP Imóveis (zapimoveis.com.br)

| Item | Status | Detalhes |
|------|--------|---------|
| API pública | **Indisponível** | ZAP não oferece API pública para consulta de anúncios. |
| API para parceiros/imobiliárias | **Restrita** | ZAP Pro / ZAP Parceiros oferece API para **publicação** de anúncios, não para **consulta/scraping**. É feed XML unidirecional (imobiliária→ZAP). [NEEDS VERIFICATION] |
| Scraping viabilidade | **Viável com limitações** | Site renderizado client-side (React/Next.js). Requer headless browser (Puppeteer/Playwright). Paginação e anti-bot em evolução. |
| Apify Actors | **Disponíveis** | Existem actors no marketplace Apify para ZAP Imóveis. Ver seção 6. |
| Filtro FISBO | **Viável** | ZAP permite filtrar por "Proprietário" como tipo de anunciante. Scraping pode usar esse filtro. |

**Dados extraíveis via scraping:**
- Endereço (texto, às vezes parcial — rua sem número)
- Bairro, cidade, estado
- Preço, metragem, quartos, vagas
- Tipo de anunciante (Proprietário / Imobiliária / Corretor)
- Descrição, fotos (URLs)
- Data de publicação (nem sempre precisa)
- Link do anúncio

**Consideração legal:** Scraping de dados públicos de portais não é explicitamente ilegal no Brasil, mas viola termos de uso da maioria dos portais. A LGPD se aplica a dados pessoais (nome, telefone do proprietário). Recomendação: scrapar dados do imóvel (endereço, preço, metragem) e usar para matching, sem armazenar dados pessoais obtidos por scraping. Telefone/contato do proprietário só deve ser obtido via canal legítimo (Captei, contato direto).

### 3.2 OLX (olx.com.br)

| Item | Status | Detalhes |
|------|--------|---------|
| API pública | **Indisponível** | OLX não oferece API pública para imóveis. |
| Scraping viabilidade | **Viável** | OLX tem estrutura mais simples que ZAP. Menos proteções anti-bot historicamente, mas evolui. |
| Apify Actors | **Disponíveis** | Existem actors genéricos OLX e específicos para imóveis. Ver seção 6. |
| Filtro FISBO | **Viável** | OLX naturalmente tem mais anúncios de proprietários diretos (perfil da plataforma). Filtro por "Particular" disponível. |

**Dados extraíveis:** Similares ao ZAP, porém com menor estruturação (campos opcionais frequentemente vazios).

### 3.3 VivaReal (vivareal.com.br)

| Item | Status | Detalhes |
|------|--------|---------|
| API pública | **Indisponível** | VivaReal (do Grupo ZAP/OLX desde fusão) não oferece API pública. |
| Scraping viabilidade | **Viável** | Mesma infraestrutura do ZAP após fusão dos grupos. |
| Apify Actors | **Disponíveis** | Podem compartilhar actor com ZAP (mesma plataforma base). [NEEDS VERIFICATION] |
| Filtro FISBO | **Parcial** | Filtro de tipo de anunciante disponível, mas menos granular que ZAP. [NEEDS VERIFICATION] |

**Nota importante:** ZAP e VivaReal foram fundidos sob o Grupo OLX (agora "Grupo ZAP OLX" ou similar). Há sobreposição significativa de anúncios entre as duas plataformas. O cross-referencing (Story 3.6) é especialmente relevante aqui.

### 3.4 QuintoAndar (quintoandar.com.br)

| Item | Status | Detalhes |
|------|--------|---------|
| API pública | **Indisponível** | QuintoAndar é plataforma fechada com modelo de negócio diferente. |
| Scraping viabilidade | **Difícil** | QuintoAndar tem proteções anti-bot mais robustas e modelo que elimina o conceito de FISBO (eles são intermediários obrigatórios). |
| Relevância FISBO | **Baixa** | QuintoAndar não é fonte de FISBOs — proprietários que usam QuintoAndar já estão intermediados. |
| Apify Actors | **Limitados** | Poucos actors disponíveis, qualidade variável. [NEEDS VERIFICATION] |

**Recomendação:** QuintoAndar tem baixa prioridade para o sistema. FISBOs não existem nessa plataforma. Utilidade limitada a dados de mercado para ACM (preços de referência).

### Considerações legais consolidadas

| Aspecto | Análise |
|---------|---------|
| **Termos de uso** | Todos os portais proíbem scraping nos seus ToS. Risco é comercial (bloqueio de acesso), não criminal. |
| **LGPD** | Dados do imóvel (endereço, preço, metragem) = dados não pessoais. Dados do anunciante (nome, telefone) = dados pessoais protegidos. Não armazenar dados pessoais obtidos por scraping. |
| **Mitigação** | Usar Apify (IP rotativo, proxies), limitar frequência, scrapar apenas dados do imóvel, obter dados pessoais via canais legítimos. |
| **Captei como alternativa** | Captei já faz o scraping e entrega dados de forma comercialmente legítima. Usar Captei para dados pessoais, scraping próprio para dados de mercado (ACM, preços). |

### Recomendação para o projeto

1. **ZAP como prioridade #1** (Story 3.4) — maior volume de FISBOs, melhor estruturação.
2. **OLX como #2** — muitos anúncios de particulares.
3. **VivaReal como #3** — alta sobreposição com ZAP, implementar junto.
4. **QuintoAndar como Won't (MVP)** — baixa relevância FISBO.
5. **Separar dados:** Scraping para dados de mercado (ACM). Captei/contato direto para dados pessoais.
6. **Cross-referencing (Story 3.6):** Essencial entre ZAP/VivaReal/OLX para deduplicação. Usar endereço normalizado + metragem + preço como chave de matching.

---

## 4. Fontes de Dados Geoespaciais

### 4.1 OpenStreetMap — Overpass API

| Item | Status | Detalhes |
|------|--------|---------|
| Disponibilidade | **Disponível** — API pública gratuita | Endpoint: `https://overpass-api.de/api/interpreter` |
| Acesso | **Público** — sem autenticação | Rate limiting informal (uso justo). Para produção, considerar instância própria ou Overpass Turbo. |
| Custo | **Gratuito** | Open data (ODbL license). |

**Qualidade de dados em Moema/SP:**

| Dado | Qualidade | Detalhes |
|------|-----------|---------|
| Ruas e quadras | **Excelente** | São Paulo tem mapeamento viário muito completo no OSM. |
| Edifícios (building footprints) | **Boa a Moderada** | Moema tem cobertura razoável de edifícios mapeados. Prédios comerciais grandes geralmente presentes; prédios residenciais menores podem estar ausentes. [NEEDS VERIFICATION — consultar Overpass Turbo para Moema especificamente] |
| Nomes de edifícios | **Fraca** | Poucos edifícios residenciais têm tag `name=*` no OSM. Prédios comerciais e shoppings sim. |
| Endereços | **Moderada** | Tags `addr:street`, `addr:housenumber` presentes em parte dos edifícios. CEPs frequentemente ausentes. |
| Tipologia (residencial/comercial) | **Moderada** | Tags `building=residential`, `building=apartments`, `building=commercial` presentes em parte dos casos. |
| Altura/andares | **Fraca** | Tags `building:levels` raramente preenchidas para São Paulo. |

**Query exemplo para Moema:**
```
[out:json][timeout:60];
(
  way["building"](around:2000,-23.6000,-46.6670);
  relation["building"](around:2000,-23.6000,-46.6670);
);
out center;
```

**Limitações:**
- Rate limiting: ~10.000 requisições/dia de IP único (informal). Para batch grande, usar mirror ou download de extrato regional.
- Dados estáticos — não refletem construções novas em tempo real.
- Necessidade de geocoding reverso para obter endereço legível a partir de coordenadas.

**Recomendação para o projeto:**
1. Usar como **primeira camada de seed data** (Story 1.7) — gratuito e sem restrições legais.
2. Complementar com Google Places para enriquecer (nomes, ratings, telefones — Story 3.5).
3. Implementar como batch na configuração do epicentro: busca via Overpass API, insere edifícios como "Não Visitado".
4. Armazenar geometria original (footprint) em PostGIS para matching geoespacial preciso.

### 4.2 Google Places API (New)

| Item | Status | Detalhes |
|------|--------|---------|
| Disponibilidade | **Disponível** — API pública com chave | Console: `console.cloud.google.com` |
| Acesso | **API Key + billing** | Requer projeto GCP com billing ativado. |
| Custo | Variável (ver tabela abaixo) | Free tier generoso para volumes baixos. |

**Pricing (Google Maps Platform — Places API):**

| Operação | Custo | Free tier |
|----------|-------|-----------|
| Nearby Search (New) | $32/1.000 requests | $200 crédito mensal (= ~6.250 requests grátis) |
| Place Details (New) | $17-$25/1.000 | Incluso nos $200 |
| Text Search (New) | $32/1.000 | Incluso nos $200 |
| Geocoding | $5/1.000 | Incluso nos $200 |

[NEEDS VERIFICATION — Google ajusta preços frequentemente. Verificar `cloud.google.com/maps-platform/pricing`]

**Dados disponíveis para edifícios residenciais:**

| Dado | Disponibilidade | Detalhes |
|------|----------------|---------|
| Nome do estabelecimento | **Parcial** | Condomínios grandes têm nome no Google. Prédios menores nem sempre. |
| Endereço formatado | **Excelente** | Endereço completo com número, bairro, CEP. |
| Coordenadas | **Excelente** | Lat/lng preciso. |
| Tipo (place_type) | **Limitado para residencial** | `apartment_complex`, `real_estate_agency` existem, mas cobertura inconsistente para prédios residenciais comuns. |
| Rating/reviews | **Irrelevante** | Edifícios residenciais raramente têm reviews no Google. |
| Telefone | **Raro** | Apenas para condomínios que registram telefone (portaria). |
| Horário funcionamento | **Irrelevante** | N/A para residenciais. |
| Fotos | **Parcial** | Street View pode ter fotos da fachada. Places API retorna fotos quando existentes. |

**Limitações para dados residenciais:**
- Google Places é otimizado para **estabelecimentos comerciais**, não para edifícios residenciais.
- Cobertura de prédios residenciais varia. Condomínios grandes (50+ unidades) tendem a aparecer; prédios menores podem não estar indexados.
- Não há dados sobre número de unidades, tipologia, padrão construtivo ou status de varredura.

**Recomendação para o projeto:**
1. Usar como **segunda camada de enriquecimento** (Story 3.5) — complementa OSM com nomes e endereços formatados.
2. **Não depender exclusivamente** de Google Places para seed data residencial — cobertura insuficiente.
3. Usar o free tier ($200/mês) que cobre ~6.250 requests — suficiente para seed data de 2km de raio (~500-1000 edifícios) com folga.
4. Mapbox Geocoding API (já no stack) é alternativa para geocoding reverso — evita custo adicional do Google Geocoding.

### 4.3 Mapbox APIs (Já no Stack)

| Item | Status | Detalhes |
|------|--------|---------|
| Mapbox GL JS | **No stack** | Mapa interativo — já definido no PRD. |
| Geocoding API | **Disponível** | Forward + reverse geocoding. $5/1.000 requests acima do free tier. |
| Free tier | 100.000 map loads/mês, 100.000 geocoding requests/mês | Mais que suficiente para MVP single-user. |

**Recomendação:** Usar Mapbox Geocoding como geocoder primário (já no stack). Google Geocoding como fallback se necessário.

### 4.4 IBGE (Instituto Brasileiro de Geografia e Estatística)

| Item | Status | Detalhes |
|------|--------|---------|
| API de dados | **Disponível** — API pública gratuita | `https://servicodados.ibge.gov.br/api/` |
| Malha de setores censitários | **Disponível** | Geometrias dos setores censitários em GeoJSON. |
| Dados do Censo | **Disponível** | Dados demográficos por setor censitário: renda, escolaridade, faixa etária, tipo de domicílio. |
| Custo | **Gratuito** | Dados públicos. |

**Dados úteis para o projeto:**

| Dado | Relevância | Detalhes |
|------|-----------|---------|
| Renda média por setor censitário | **Alta** | Define padrão construtivo esperado da micro-região. |
| Tipo de domicílio (apartamento/casa) | **Alta** | Identifica áreas predominantemente verticais (mais edifícios). |
| Densidade populacional | **Média** | Indicador de volume de oportunidades. |
| Faixa etária predominante | **Média** | Perfil do proprietário típico da região. |

**Limitações:**
- Dados do Censo 2022 mais recentes disponíveis. Publicação dos microdados pode estar parcial. [NEEDS VERIFICATION — verificar status de publicação dos dados do Censo 2022]
- Granularidade de setor censitário (~300 domicílios) é adequada para análise de micro-região.

**Recomendação:** Dados do IBGE são **enriquecimento de contexto** (não essenciais para MVP). Implementar como layer adicional no mapa em épicos posteriores. Prioridade: **Could** para Epic 3+.

### 4.5 GeoSampa (Portal Geoespacial da Prefeitura de São Paulo)

| Item | Status | Detalhes |
|------|--------|---------|
| Portal | **Disponível** — `geosampa.prefeitura.sp.gov.br` | Portal web com camadas de dados geoespaciais. |
| API WFS/WMS | **Disponível** | Serviços OGC (WFS/WMS) para acesso programático. [NEEDS VERIFICATION — verificar endpoints ativos e formato de resposta] |
| Download de dados | **Disponível** | Shapefile/GeoJSON para download por tema. |
| Custo | **Gratuito** | Dados públicos municipais. |

**Dados relevantes:**

| Camada | Relevância | Detalhes |
|--------|-----------|---------|
| Lotes e quadras fiscais | **Alta** | Geometria dos lotes com dados do IPTU (área, uso). |
| Zoneamento | **Média** | Zonas de uso (residencial, misto, comercial). |
| Edificações | **Alta** | Footprints de edificações com dados cadastrais. [NEEDS VERIFICATION — verificar se inclui Moema e nível de detalhe] |
| Logradouros | **Alta** | Rede viária oficial com CEP. |
| IPTU (dados tributários) | **Muito Alta** | Se acessíveis, contêm: área construída, número de unidades, ano de construção, padrão construtivo. Estes são os dados mais valiosos para seed data. [NEEDS VERIFICATION — verificar se dados de IPTU são acessíveis via GeoSampa ou apenas via SIGA (Sistema de Gestão Administrativa)] |

**Limitações:**
- API WFS/WMS pode ser lenta e instável para volumes grandes.
- Dados de IPTU podem requerer acesso específico (portal SIGA da Secretaria de Finanças).
- Formato de dados pode variar por camada.

**Recomendação:**
1. **Investigar dados de IPTU via GeoSampa como fonte premium de seed data** — se acessíveis, contêm: número de unidades, área construída, padrão, ano de construção. Seria a fonte mais rica para o cadastro de edifícios.
2. Usar camada de lotes/quadras fiscais para definir geometria dos lotes (complementa footprints OSM).
3. Prioridade: **Should** para Epic 1 (se dados de IPTU acessíveis), **Could** caso contrário.

---

## 5. Dados de Transações Imobiliárias

### 5.1 Cartórios Digitais (e-Notariado / CENSEC)

| Item | Status | Detalhes |
|------|--------|---------|
| API pública | **Indisponível** | Não há API pública para consulta de matrículas ou transações. |
| e-Notariado | **Acesso restrito** | Portal do CNJ para atos notariais eletrônicos. Acesso via certificado digital. Consulta por matrícula individual, não por lote/região. |
| CENSEC (Central Notarial) | **Acesso restrito** | Central de certidões eletrônicas. Foco em consulta individual, não em dados agregados. |
| Custo | Variável | Certidões individuais: R$ 50-100 cada. Inviável para mapeamento em massa. |

**Recomendação:** **Won't para MVP.** PRD já classificou dados de matrícula como Won't. Custos proibitivos para mapeamento em massa. Dados de transações reais virão de fontes agregadas (FIPE ZAP, Secovi).

### 5.2 FIPE ZAP Index

| Item | Status | Detalhes |
|------|--------|---------|
| Dados públicos | **Disponível** — `fipezap.zapimoveis.com.br` | Índice mensal de preços de venda e aluguel por metro quadrado. |
| API | **Indisponível** | Não há API pública. Dados disponíveis em PDF de relatórios mensais e interface web. |
| Granularidade | **Por bairro/cidade** | Não tem granularidade por edifício ou rua. Moema aparece como bairro individualmente. |
| Custo | **Gratuito** (dados públicos do índice) | Relatórios premium (DataZAP) são pagos. |

**Dados disponíveis:**
- Preço médio de venda por m² por bairro (Moema, Vila Olímpia, Itaim Bibi)
- Preço médio de aluguel por m² por bairro
- Variação mensal/anual
- Índice de rentabilidade (aluguel/venda)
- Segmentação por tipologia (1 quarto, 2 quartos, etc.)

**Recomendação:**
1. **Implementar como fonte de dados para ACM** (Story 3.1) — preço médio por m² do bairro como referência.
2. Scraping leve do portal FIPE ZAP ou parse de relatório PDF mensal.
3. Atualização mensal é suficiente (índice é mensal).
4. Prioridade: **Should** para Epic 3.

### 5.3 Secovi-SP (Sindicato da Habitação)

| Item | Status | Detalhes |
|------|--------|---------|
| Dados públicos | **Parcial** | Relatórios mensais sobre mercado imobiliário de SP publicados no site. |
| API | **Indisponível** | Não há API. Dados em PDF e releases de imprensa. |
| Acesso completo | **Associados** | Dados detalhados disponíveis para associados (imobiliárias/corretores filiados). [NEEDS VERIFICATION — verificar se RE/MAX Galeria é associada e qual nível de acesso] |
| Custo | Variável | Relatórios públicos: gratuitos. Dados detalhados: associação Secovi. |

**Dados relevantes:**
- Volume de transações por região/bairro
- Velocidade de vendas (VSO — Vendas sobre Oferta)
- Lançamentos imobiliários
- Oferta e demanda por tipologia

**Recomendação:** Dados úteis para contexto de mercado no dashboard. **Could** para Epic 3+. Parse manual de relatórios PDF.

### 5.4 DataZAP (braço de inteligência do Grupo ZAP)

| Item | Status | Detalhes |
|------|--------|---------|
| Dados | **Disponível** — produto pago | Relatórios detalhados de mercado com dados de anúncios do ZAP/VivaReal/OLX. |
| API | **Indisponível para consumo individual** | Produto B2B para incorporadoras e imobiliárias grandes. [NEEDS VERIFICATION] |
| Granularidade | **Rua/empreendimento** | Dados granulares de preço, oferta, demanda por empreendimento. |
| Custo | **Alto** | Estimativa: R$ 2.000-10.000/mês dependendo do escopo. Voltado para empresas. [NEEDS VERIFICATION] |

**Recomendação:** **Won't para MVP.** Custo desproporcional para consultora individual. Se RE/MAX Galeria já assinar DataZAP, investigar acesso. Caso contrário, usar FIPE ZAP (gratuito) + scraping próprio para dados de mercado.

---

## 6. Apify Marketplace — Actors para Portais Imobiliários Brasileiros

### Status Geral

Apify Marketplace é uma plataforma de web scraping as a service. "Actors" são scrapers pré-construídos por desenvolvedores da comunidade. Existem actors para portais brasileiros, mas a qualidade e manutenção variam.

### Actors Conhecidos/Esperados

| Portal | Actor esperado | Status | Detalhes |
|--------|---------------|--------|---------|
| **ZAP Imóveis** | `zapimoveis-scraper` ou similar | **Provável** [NEEDS VERIFICATION] | Actors para ZAP existem no marketplace. Verificar qualidade, última atualização e reviews. |
| **OLX Brasil** | `olx-scraper` ou similar | **Provável** [NEEDS VERIFICATION] | OLX tem actors genéricos. Verificar se há específico para imóveis BR. |
| **VivaReal** | `vivareal-scraper` ou similar | **Provável** [NEEDS VERIFICATION] | Pode compartilhar infraestrutura com actor do ZAP (mesmo grupo). |
| **QuintoAndar** | `quintoandar-scraper` | **Incerto** [NEEDS VERIFICATION] | QuintoAndar tem proteções mais fortes. Actors podem ser instáveis. |

### Pricing Apify

| Plano | Custo | Limites |
|-------|-------|---------|
| Free | $0 | 30 actor-seconds/mês, $5 em platform credits |
| Starter | $49/mês | Suficiente para scraping diário de 1-2 portais em 1 região |
| Scale | $499/mês | Para múltiplas regiões/portais em alta frequência |

[NEEDS VERIFICATION — verificar preços atuais em `apify.com/pricing`]

**Modelo de custo por actor:**
- Cada actor cobra em "compute units" (CUs) por execução
- Estimativa para scrape de 1 bairro (Moema) em 1 portal: ~0.01-0.05 CU por execução
- Cron diário de 3 portais: ~0.03-0.15 CU/dia = ~1-5 CU/mês
- Plano Starter é suficiente para MVP

### Estrutura de dados esperada (output típico de actor imobiliário)

```json
{
  "url": "https://www.zapimoveis.com.br/imovel/...",
  "title": "Apartamento 3 quartos Moema",
  "price": 850000,
  "pricePerSqm": 12500,
  "area": 68,
  "bedrooms": 3,
  "bathrooms": 2,
  "parkingSpaces": 1,
  "address": {
    "street": "Rua Alvorada",
    "neighborhood": "Moema",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "04550-000"
  },
  "advertiserType": "OWNER",
  "advertiserName": "João Silva",
  "description": "...",
  "images": ["url1", "url2"],
  "publishedAt": "2026-03-15",
  "portal": "zapimoveis"
}
```

[NEEDS VERIFICATION — estrutura real depende do actor específico. Verificar output schema no Apify Store.]

### Recomendação para o projeto

1. **Pesquisar actors específicos no Apify Store** usando as ferramentas MCP do Apify (`search-actors`).
2. **ZAP Actor como prioridade #1** — se existir actor mantido e funcional, é o caminho mais rápido.
3. **Desenvolver actor custom como fallback** — se actors existentes forem instáveis, criar actor Puppeteer/Playwright no Apify.
4. **Plano Starter ($49/mês)** é suficiente para MVP.
5. **Pipeline:** Apify Actor → Supabase Edge Function (webhook/cron) → PostGIS match → Feed de Inteligência.

### Passos de verificação

- [ ] Usar `search-actors` do Apify MCP para buscar: "zapimoveis", "zap imoveis", "olx imoveis", "vivareal", "imoveis brasil"
- [ ] Para cada actor encontrado: verificar `fetch-actor-details` — última atualização, reviews, schema de output
- [ ] Executar actor de teste (`call-actor`) com input de Moema/SP e avaliar qualidade dos dados
- [ ] Verificar se output inclui campo `advertiserType` para filtro FISBO

---

## 7. Matriz de Decisão Consolidada

### Fontes de Seed Data (Story 1.7 + Story 3.5)

| Fonte | Camada | Prioridade | Dados | Custo |
|-------|--------|-----------|-------|-------|
| OSM Overpass | Seed base (footprints) | **Must** | Geometria, endereço parcial | Gratuito |
| Mapbox Geocoding | Normalização de endereço | **Must** (já no stack) | Endereço formatado, CEP | Free tier |
| Google Places | Enriquecimento (nomes, telefones) | **Should** | Nome, endereço, telefone portaria | $200/mês free tier |
| GeoSampa IPTU | Enriquecimento premium | **Should** [NEEDS VERIFICATION] | Unidades, área, padrão, ano | Gratuito |
| IBGE Censo | Contexto demográfico | **Could** | Renda, perfil, densidade | Gratuito |

### Fontes de Leads FISBO (Stories 3.4, 3.6, 4.4)

| Fonte | Método | Prioridade | Dados | Custo |
|-------|--------|-----------|-------|-------|
| Captei CSV | Import CSV | **Must** | Leads com telefone, endereço, portal origem | Assinatura Captei existente |
| ZAP scraping (Apify) | Actor scheduled | **Must** | Anúncios FISBO com preço, endereço, metragem | Apify Starter $49/mês |
| OLX scraping (Apify) | Actor scheduled | **Should** | Anúncios particulares | Incluso no Apify |
| VivaReal scraping (Apify) | Actor scheduled | **Should** | Anúncios FISBO (sobreposição ZAP) | Incluso no Apify |
| Captei API | REST API (se existir) | **Could** | Mesmo que CSV, automatizado | Negociação com Captei |

### Fontes de Dados de Mercado (Stories 3.1, 3.6)

| Fonte | Método | Prioridade | Dados | Custo |
|-------|--------|-----------|-------|-------|
| Scraping portais (ZAP/OLX) | Apify Actors | **Must** (para ACM) | Preços, metragens, comparáveis | Incluso no Apify |
| FIPE ZAP Index | Parse PDF/web | **Should** | Preço m² por bairro, tendência | Gratuito |
| Input manual | Interface ACM | **Must** | Comparáveis registrados pela Luciana | N/A |
| Secovi-SP | Parse relatórios | **Could** | VSO, volume transações | Gratuito (público) / Associação |
| DataZAP | B2B API | **Won't (MVP)** | Dados granulares por empreendimento | Alto (~R$2-10k/mês) |

### Integrações de Sistema (Stories 4.4, 4.5)

| Sistema | Método | Prioridade | Viabilidade |
|---------|--------|-----------|-------------|
| Captei (CSV) | Import CSV | **Must** | Alta — export existe |
| Captei (API) | REST | **Could** | Baixa — API não documentada |
| My RE/MAX (export) | CSV/PDF export do nosso sistema | **Must** | Alta — controle total |
| My RE/MAX (import) | Parse CSV/Excel/PDF | **Should** | Média — depende do formato de export do My RE/MAX |
| My RE/MAX (API sync) | REST bidirecional | **Won't (MVP)** | Muito baixa — API provavelmente inexistente |

---

## 8. Custos Estimados Mensais (MVP)

| Serviço | Custo estimado | Notas |
|---------|---------------|-------|
| Mapbox GL JS | $0 | Free tier: 50.000 map loads/mês |
| Mapbox Geocoding | $0 | Free tier: 100.000 requests/mês |
| Google Places API | $0 | Free tier: $200 crédito/mês |
| Apify (Starter) | ~$49/mês | Scraping diário ZAP + OLX + VivaReal |
| Supabase (Free/Pro) | $0-25/mês | Free tier para MVP; Pro $25 para produção |
| Vercel (Free/Pro) | $0-20/mês | Free tier para MVP; Pro $20 para produção |
| Captei | Custo existente | Luciana já assina — não é custo novo |
| **Total incremental** | **~$49-94/mês** | Acima do que já é pago (Captei, domínio, etc.) |

[NEEDS VERIFICATION — todos os preços acima devem ser verificados nos sites oficiais para valores atualizados]

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Apify actors desatualizados/quebrados | Média | Alto | Actor custom como fallback; CSV import como backup |
| Google Places não cobrir edifícios residenciais de Moema | Média | Médio | OSM como fonte primária; cadastro manual complementa |
| Captei mudar formato de CSV export | Baixa | Médio | Mapeamento de colunas flexível na importação |
| Anti-bot dos portais bloquearem scraping | Média | Alto | IP rotation (Apify inclui); Captei como fonte alternativa; manual-first do PRD |
| GeoSampa IPTU não acessível programaticamente | Alta | Médio | Usar OSM + Google Places como fallback |
| Custos Google Places excederem free tier | Baixa | Baixo | Limitar a seed data + re-execução sob demanda |
| LGPD compliance em dados scrapeados | Média | Alto | Não armazenar dados pessoais de scraping; usar Captei para dados pessoais |

---

## 10. Próximos Passos de Verificação

### Prioridade Alta (antes de iniciar Epic 1)

1. [x] **Testar Overpass API para Moema:** ~~Executar query de edifícios no raio de 2km~~ **VERIFICADO — 1.380 edifícios no raio 500m, 16.595 no raio 2km.** Ver `docs/research/api-verification-results.md`
2. [x] **Verificar Google Places para Moema:** **VERIFICADO — ~100-400 edifícios residenciais. COMPLEMENTO ao OSM, não fonte primária. BUG: `type=premise` inválido → usar `type=apartment_building`.** Ver `docs/research/google-places-verification.md`
3. [ ] **Exportar CSV do Captei:** Obter CSV de exemplo da conta da Luciana para definir schema de importação

### Prioridade Média (antes de iniciar Epic 3)

4. [ ] **Pesquisar Apify actors:** Usar MCP Apify `search-actors` para buscar actors de ZAP, OLX, VivaReal
5. [ ] **Testar actor ZAP:** Se encontrado, executar para Moema e avaliar output
6. [x] **Verificar GeoSampa WFS/IPTU:** **VERIFICADO (parcial) — Portal acessível, IPTU via Portal Dados Abertos SP com campos: área construída, nº unidades, padrão, ano construção. JOIN por Setor-Quadra-Lote. Cobertura ~100% Moema. FONTE PREMIUM de seed data.** Ver `docs/research/geosampa-iptu-verification.md`. Necessita verificação com web access real (download CSV, teste WFS endpoint).
7. [ ] **Verificar FIPE ZAP Index:** Acessar portal e avaliar formato de dados disponíveis para Moema

### Prioridade Baixa (antes de Epic 4)

8. [ ] **Contatar Captei sobre API:** Email/ligação para comercial sobre API REST
9. [ ] **Verificar My RE/MAX exports:** Acessar com a Luciana e documentar funcionalidades de export
10. [ ] **Verificar associação Secovi:** Perguntar ao broker da RE/MAX Galeria sobre associação Secovi-SP

---

## 11. Estratégia de Seed Data Curada (Atualização Alan Nicolas — 2026-03-18)

**3 camadas verificadas, por ordem de prioridade:**

| Camada | Fonte | Volume | Dados Únicos | Prioridade | Custo |
|--------|-------|--------|-------------|-----------|-------|
| 1 (Must) | OSM Overpass | 16.595 edifícios/2km | Footprints, coordenadas | Epic 1 Story 1.7 | Free |
| 2 (Should) | Google Places | ~100-400 edifícios | Nomes (80%), endereço formatado (95%) | Epic 1 Story 1.7 | Free ($200 crédito) |
| 3 (Should→Must) | GeoSampa IPTU | ~100% lotes | **Unidades, área m², padrão, ano construção** | Epic 1 (enrich) / Epic 3 (full) | Free |

**BUG corrigido:** Story 1.7 referenciava `type=premise` para Google Places — INVÁLIDO. **Corrigido em `docs/stories/1.7.story.md`** para `type=apartment_building` (AC1 e Technical Notes atualizados em 2026-03-18).

**Achado premium:** GeoSampa IPTU fornece dados que NENHUMA outra fonte tem (nº unidades, padrão construtivo). Viabilidade confirmada parcialmente — requer download de amostra CSV antes de implementar.

---

*Relatório de pesquisa — Alex (Analyst Agent) + Curadoria Alan Nicolas (Knowledge Architect) — Synkra AIOX*
*Verificações: 3/10 completas (Overpass ✅, Google Places ✅, GeoSampa ✅ parcial). 7 pendentes (Epic 3-4).*
