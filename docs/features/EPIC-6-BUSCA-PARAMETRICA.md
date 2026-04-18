# Epic 6 — Busca Inteligente de Imoveis nos Portais

## Resumo Executivo

### Para quem

Luciana Borba — Consultora RE/MAX Galeria Moema

### O problema

Hoje a consultora precisa entrar em cada portal (ZAP, OLX, Viva Real) separadamente, fazer buscas manuais, anotar telefones e e-mails, e comparar resultados entre sites. Isso consome horas que poderiam ser usadas em captacao direta.

### A solucao

Uma nova tela no sistema ("Busca Portais") que permite buscar imoveis em 3 portais simultaneamente com filtros personalizados, extrair dados de contato dos anunciantes, e converter resultados em leads com 1 toque.

---

## Como funciona

```
1. Seleciona a area     → Raio no mapa OU condominios ja pesquisados
2. Define os filtros    → Quartos, suites, banheiros, metragem, preco, tipo
3. Sistema busca        → 3 portais de uma vez (ZAP + OLX + Viva Real)
4. Resultados aparecem  → Com dados completos + contato do anunciante
5. 1 toque              → Transforma resultado em lead no funil
```

### Fluxo visual

```
Mapa (raio/condominio)
        |
Filtros (quartos, area, preco)
        |
   [ Buscar ]
        |
   +---------+-------------------+
   |                             |
   v                             v
Resultados locais         Busca nos portais
(instantaneo, gratis)     (ZAP + OLX + VivaReal)
   |                             |
   +-------------+---------------+
                 |
                 v
   Lista de imoveis com contato
   (telefone, WhatsApp, email)
                 |
                 v
        [ Captar Lead ]
                 |
                 v
   Lead no funil → pronto para V1
```

---

## Diferenciais

| Beneficio | Detalhe |
|-----------|---------|
| **Economia de tempo** | 3 portais em 1 busca, sem alternar entre abas do navegador |
| **Busca inteligente** | Primeiro mostra o que ja esta na base (gratis e instantaneo), depois busca nos portais |
| **Dados de contato** | Telefone, WhatsApp e email do anunciante extraidos automaticamente |
| **FISBO destacado** | Proprietarios vendendo direto (sem imobiliaria) sao identificados e priorizados |
| **Historico** | Buscas ficam salvas — pode repetir, comparar e acompanhar evolucao |
| **Captacao direta** | Resultado → Lead → Funil com 1 toque, pre-preenchido |
| **Captacao em massa** | Selecionar multiplos resultados e criar leads de uma vez |
| **Prevencao de duplicatas** | Sistema avisa se lead similar ja existe no funil |
| **Conformidade LGPD** | Dados de contato tratados conforme a lei, com rastreabilidade |
| **Enriquecimento** | Validacao CRECI do corretor + endereco completo via CEP |

---

## Filtros disponiveis

| Filtro | Tipo | Exemplo |
|--------|------|---------|
| Quartos | Min / Max | 2 a 4 quartos |
| Suites | Minimo | Pelo menos 1 suite |
| Banheiros | Min / Max | 2 a 3 banheiros |
| Area m² | Min / Max | 80 a 200 m² |
| Preco R$ | Min / Max | R$ 500K a R$ 1.5M |
| Tipo transacao | Escolha | Venda ou Aluguel |
| Portais | Multi-selecao | ZAP, OLX, VivaReal |
| Apenas FISBO | Toggle | Somente proprietarios diretos |
| Area de busca | Raio ou Condominios | 2km do epicentro OU edificios selecionados |

---

## Dados retornados por anuncio

- Endereco completo
- Preco (com historico de alteracao)
- Area em m²
- Numero de quartos
- Portal de origem (ZAP, OLX, VivaReal)
- Tipo de anunciante (proprietario, corretor, imobiliaria)
- **Telefone do anunciante**
- **WhatsApp do anunciante** (link direto)
- **Email do anunciante** (link direto)
- **CRECI** (se corretor, validado)
- Tempo no mercado (dias desde publicacao)
- Distancia do epicentro
- Link direto para o anuncio no portal

---

## Investimento e custos

| Item | Valor |
|------|-------|
| Desenvolvimento | 5 stories, ~4.000 linhas de codigo |
| Custo operacional Apify | ~R$ 10/mes (estimativa para 5 buscas/dia) |
| APIs gratuitas utilizadas | ViaCEP (endereco), BuscaCRECI (validacao) |
| Infraestrutura adicional | Nenhuma (usa Vercel + Supabase existentes) |

### Limites de uso (controle de custos)

- Maximo 5 buscas por hora por consultora
- Maximo 200 resultados por portal por busca
- Custo maximo de $2.00 por busca

---

## Pesquisa tecnica: APIs dos portais

| Portal | API publica de busca? | Solucao adotada |
|--------|----------------------|-----------------|
| ZAP Imoveis | NAO (apenas publicacao) | Apify scraper |
| Viva Real | NAO (mesmo grupo ZAP/OLX) | Apify scraper |
| OLX | Parcial (so gerencia seus anuncios) | Apify scraper |

**Achado-chave:** Nenhum portal brasileiro oferece API para consultar anuncios de terceiros. A solucao viavel e Apify (ja em uso no sistema para varredura automatica diaria).

---

## Principio de design: Scraping como acelerador

O sistema foi projetado para funcionar 100% sem scraping:

1. **Busca local primeiro** — consulta a base existente (gratis, instantaneo)
2. **Apify sob demanda** — so quando a consultora pede explicitamente
3. **CSV como fallback** — se Apify falhar, importacao manual funciona
4. **ACM independente** — analise comparativa funciona com dados manuais

---

## Telas e componentes

### Tela principal: `/search`

- **Area de busca** — Raio no mapa (500m a 5km) ou selecao de condominios
- **Formulario de filtros** — Inputs mobile-first, 48px para uso com uma mao
- **Barra de progresso** — Feedback visual durante busca nos portais
- **Lista de resultados** — Cards com badges (portal, FISBO, Novo), ordenados por distancia
- **Historico** — Ultimas 10 buscas, recarrega filtros, repete busca

### Componentes de captacao

- **Captar Lead** — Botao em cada resultado, abre modal pre-preenchido
- **Captacao batch** — Checkboxes + "Captar N selecionados"
- **Deteccao de duplicatas** — Aviso se lead similar ja existe

### Enriquecimento de contato

- **Card de contato** — Telefone (mascarado), WhatsApp, email, badge CRECI
- **Botao "Revelar"** — Mostra numero completo com registro LGPD
- **Enriquecimento on-demand** — Busca dados adicionais do anunciante

### AgentDashboard

- **Nova aba "Buscas"** — Metricas: total buscas, resultados, FISBOs, custo

---

## Entrega tecnica

| Item | Quantidade |
|------|-----------|
| Stories implementadas | 5 (6.1 a 6.5) |
| Novos FRs | 7 (FR-035 a FR-041) |
| Arquivos criados | 22 |
| Arquivos modificados | 3 |
| Linhas de codigo | ~4.079 |
| Novas tabelas | 2 (portal_searches, portal_search_results) |
| Novas colunas | 7 (contato + LGPD em scraped_listings) |
| Novas RPCs PostGIS | 2 (busca parametrica, anonimizacao LGPD) |
| Novas RLS policies | 6 |
| Testes existentes | 139/139 passando |
| Erros TypeScript | 0 |

### Commit

`d3555ae` — `feat: Epic 6 — Busca parametrica on-demand com enriquecimento de contatos [5 stories]`

---

## Proximos passos

1. **Aplicar migration** — `supabase db push` para criar tabelas no banco de producao
2. **Deploy** — `git push` para Vercel (via @devops)
3. **Configurar Apify Actors** — Alugar actors ZAP e VivaReal no Apify (OLX ja configurado)
4. **Teste com dados reais** — Luciana faz primeira busca parametrica em producao
5. **Ajustes finos** — Calibrar filtros Apify por portal conforme resultados reais

---

*Epic 6 — Real State Moema | Abril 2026*
