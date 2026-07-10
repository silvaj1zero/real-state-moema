# Pesquisa — Incrementar captação: FISBO + ingestão de inventário

**Data:** 2026-06-15 · **Método:** deep-research (5 ângulos · 22 fontes · 88 claims · 25 verificadas → 15 confirmadas / 10 refutadas, verificação adversarial 3-votos).
**Contexto:** RE/MAX Galeria Moema (Luciana Borba), alto padrão Zona Sul SP. Ancorar em Epic 6 (busca paramétrica multi-portal) e Epic 7 (prospecção multi-fonte + classificação FISBO).

---

## TL;DR

A maior alavanca **já está ao alcance do stack**: os scrapers de ZAP/VivaReal **expõem um campo nativo `publisherType` (OWNER/AGENCY/DEVELOPER) + CRECI**, que permite **detecção FISBO determinística na ingestão** — substituindo a heurística DDD/PF/sem-CRECI do Epic 7 por um sinal direto. O 403 dos portais se resolve com **proxy residencial BR** no `ProxyConfiguration` do **Crawlee** (que já faz fingerprint + session pool). Conversão de FISBO é **multi-toque (4º–6º contato)**, não 1ª ligação. LGPD: legítimo interesse é possível, mas a **expectativa do titular é frágil** (o dono publicou para anunciar, não para ser abordado) — exige propósito declarado + opt-out imediato.

---

## Recomendações priorizadas (esforço × impacto)

### 🟢 Ganhos rápidos (baixo esforço, alto impacto)

1. **Detecção FISBO determinística via `publisherType`** — na ingestão dos crawlers Epic 7, ler o campo nativo `OWNER/AGENCY/DEVELOPER` + presença de CRECI dos scrapers ZAP/VivaReal (Apify: `haketa/zapimoveis-scraper`, `jungle_synthesizer/brazil-vivareal-zap-imoveis-scraper`). Determinístico supera a heurística atual. *Encaixe:* refina a classificação A=FISBO do Epic 7 (5 categorias).
2. **Proxy residencial BR no Crawlee** — setar `ProxyConfiguration` com grupo RESIDENTIAL/`apifyProxyCountry=BR`. O Crawlee já aplica headers/fingerprints realistas e `SessionPool` por padrão; o que falta é o IP residencial (datacenter é bloqueado por reputação de ASN no edge Cloudflare). Destrava cobertura/403.
3. **Cadência multi-toque no funil** — instrumentar 4–6 follow-ups (telefone + WhatsApp) ao longo de ~30–45 dias antes de descartar um FISBO; lembrete na UI de funil. Conversão acontece na persistência, não na 1ª ligação.

### 🟠 Estruturais (esforço médio-alto)

4. **Enriquecimento de contato do proprietário** — padrão tipo Captei: a partir de endereço/anúncio, obter nome + telefones + WhatsApp validado (agrega Zap/VivaReal/Chaves na Mão/Imovelweb). **Condicionado a LIA + opt-out** (ver LGPD). Pode ser integração (Captei já é citado no projeto) ou capability própria.
5. **Matching/dedupe cross-portal próprio** — **NÃO** existe ID unificado entre ZAP/VivaReal out-of-the-box (refutado). Construir matching por **geocode + área + fuzzy address** (o projeto já tem geocode/PostGIS). Evita lead duplicado entre portais.
6. **Discagem assistida (power dialing) + telefones backup** — modelo REDX: telefone central + números backup contra gatekeepers; organizar a fila de ligação. Médio esforço.

### ⚖️ Transversal — LGPD (apenas sinalizado)

- Legítimo interesse (Art. 7º IX / 10) cobre dados **não sensíveis** com **propósito concreto + minimização + transparência** (Guia ANPD, 02/02/2024).
- **Expectativa razoável é o ponto frágil:** sem relação prévia e com finalidade original "anunciar" (não "ser abordado"), a base estreita. Outreach deve **declarar fonte e finalidade no 1º contato** e oferecer **opt-out imediato** (Art. 18 §2º).
- Coerente com o waiver MVP-local do projeto: manter local até endereçar LIA antes de prod/multi-user.

---

## Achados confirmados (15 → 9 após síntese)

| # | Achado | Conf. | Voto |
|---|--------|-------|------|
| F1 | `publisherType` (OWNER/AGENCY/DEVELOPER) + CRECI → FISBO determinístico; 40+ campos com nome/telefone/email do publisher | alta | 3-0 |
| F2 | Contato do dono enriquecível via Captei (por endereço ou anúncio): nome, idade, telefones, emails, WhatsApp validado | média | 2-1 |
| F3 | Conversão FISBO no 4º–6º contato (corrob.: 5–7 toques/30–45 dias; 44% desistem após 1) | média | 3-0 |
| F4 | Prospecção telefônica é o canal central (REDX): telefones backup vs. gatekeeper, power dialing | alta | 3-0 |
| F5 | Contornar 403 ZAP/VivaReal = proxy residencial BR + bypass Cloudflare (datacenter bloqueado por ASN) | média | 2-1 |
| F6 | Crawlee aplica fingerprints/headers realistas + rotação + SessionPool por padrão (fingerprint completo só em browser crawlers; proxies = você fornece) | alta | 3-0 |
| F7 | Mercado consolida dados+leads+discagem (PropStream comprou BatchLeads+BatchDialer, jul/2025) → valida arquitetura Epic 6/7 | alta | 3-0 |
| F8 | LGPD: legítimo interesse viável p/ dados não sensíveis c/ propósito concreto (Art. 7º IX/10) | alta | 3-0 |
| F9 | LGPD: exige expectativa razoável do titular + opt-out efetivo obrigatório | alta | 3-0 |

## ⛔ Hipóteses REFUTADAS (não usar como base)

- Retries agressivos derrotam 403 mesmo a baixa taxa de sucesso — **falso** (0-3).
- Um único actor faz **dedup cross-portal** ZAP+VivaReal via ID unificado out-of-the-box — **falso** (0-3). *(Precisa de matching próprio.)*
- O scraper `haketa` **exclui** PII do vendedor — **falso** (0-3).
- 403 é **primariamente** por browser-fingerprinting — **falso** (0-3) (é mais reputação de IP/ASN).
- Rotação de proxy **sozinha** derrota 403 — **falso** (0-3).
- Datacenter "imediatamente flagged", residencial "obrigatório" (como afirmado) — **refutado** (0-3).
- Estatísticas FSBO US não confirmadas: 88% usam corretor; gap de US$65k; janela 8–10h; voicemail 50% callback — **todas refutadas/sem suporte**.

## Caveats

Boa parte das evidências de capacidade vem de **marketing de vendor** (Captei, actors Apify, REDX, PropStream) — descreve capacidade anunciada, não taxa medida. **A taxa real de obter o telefone do PROPRIETÁRIO** (vs. o do anunciante) em anúncios FISBO **não está quantificada** — portais mascaram o contato do dono atrás de formulário; campo no schema ≠ campo preenchido. Bypass de Cloudflare é **alvo móvel**. **Ponto LGPD crítico:** o próprio ReclameAqui da Captei (donos reclamando de captura sem consentimento) é, ao mesmo tempo, prova de que funciona e sinal de alerta jurídico.

## Fontes principais

- Apify: `haketa/zapimoveis-scraper`, `jungle_synthesizer/brazil-vivareal-zap-imoveis-scraper`, `apify.com/anti-blocking`, blog 403-errors
- REDX: blog FSBO scripts / 6-steps-convert-fsbo
- Captei: `captei.com.br/captacao-ativa`
- LGPD: `dataprivacybr.org/guia-do-legitimo-interesse-orientacoes-da-anpd`
- PropStream: anúncio aquisição BatchLeads/BatchDialer (jul/2025)
- Dedupe/geocode: geocod.io, smarty fuzzy address matching
