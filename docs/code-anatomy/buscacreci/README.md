# Code Anatomy — 19950512/buscacreci

**Priority:** P2 (análise quick — repo pequeno, valor instrumental: replicar pattern de CRECI lookup em TS)
**Mission scope:** Como o repo consulta CRECI nos 27 estados (Conselho Nacional + scrapers dedicados de SP/RS/ES) — extrair URL, regex de parsing, e estratégia de captcha.

## TL;DR

`buscacreci` é uma **API PHP de validação de CRECI** que oferece consulta unificada para os 27 estados brasileiros via 3 caminhos:

1. **22 estados via Conselho Nacional CRECI** (`https://www.creci{uf}.conselho.net.br`) — POST em `form_pesquisa_cadastro_geral_site.php` com Cloudflare Turnstile resolvido via 2Captcha. Parser **regex em HTML Quasar/Vue.js**.
2. **SP, RS, ES via scrapers dedicados** — sites próprios. SP usa reCAPTCHA Enterprise (Google) — opção A: 2Captcha + HTTP POST (PHP); opção B: Puppeteer + Chrome headless (Node.js).
3. **MG e TO não suportados** — sem Conselho Nacional e sem scraper dedicado.

**Aprendizado dominante para Epic 7:** o pattern de **CRECI lookup é determinístico** (sitekey conhecido + endpoint conhecido + parser HTML conhecido). **TRANSCRIÇÃO DIRETA EM TS é viável** com complexidade O(1) por consulta. Cap operacional: **custo do 2Captcha** (~ $1/1000 captchas) — assumir como CAPEX operacional do Epic 7 enrichment phase.

## Identidade do repo

| Métrica | Valor |
|---|---|
| Repo | https://github.com/19950512/buscacreci |
| Estrelas | 15 |
| Forks | 10 |
| Linguagem | PHP 100% (com `creci_sp_scraper.js` Node.js auxiliar) |
| Default branch | `main` |
| Último push | 2026-03-02 |
| Último commit | `ddd5d66c` (CRECI Conselho Nacional refactor: HTML parsing + 2Captcha Turnstile) |
| **License** | **❌ NENHUMA** — campo `license` vazio na API GitHub, sem arquivo LICENSE no root |
| Maintainer | Matheus Maydana (`mattmaydana@gmail.com`) — autor único |
| Maintenance risk | **Médio** — commit em mar/2026 (~2 meses antes da análise), 22 estados ativos via Conselho |

## ⚠️ ALERTA — license

**Este repo NÃO TEM license definido.** Implicações:

- Default copyright: **all rights reserved** (proprietário)
- **NÃO PODEMOS** copiar código diretamente (`composer.json` autor: `Matheus Maydana <mattmaydana@gmail.com>`)
- **PODEMOS** usar como **referência conceitual** (URLs públicas, sitekeys públicos, observação da estrutura HTML do COFECI são fatos do mundo, não código)
- **PODEMOS** transcrever a **lógica de parsing** (regex de HTML, estrutura de campos) sem copiar literais
- **Recomendação Phase 5:** consultar `@architect` + ideal contato proativo com Matheus solicitando autorização (MIT/Apache 2.0) — favor recíproco potencial.

## Por que P2 (não P0 nem P1)

1. **Funcionalidade isolada e pequena** — 22 estados via mesma rotina + 3 scrapers dedicados. Stack pattern é "boilerplate transcribable".
2. **Para Epic 7, CRECI lookup é uma feature de enrichment**, não core — usado em pós-processo (já temos imóveis listados, validamos o agente depois).
3. **Pattern já dominado em comunidade** — Conselho Nacional retorna HTML simples; SP retorna sob reCAPTCHA Enterprise (~$2.99/1000 captchas no 2Captcha).
4. **License missing forces transcrição vs cópia** — só ler para entender, reescrever para usar.

## Mapa de artefatos nesta pasta

- `01-architecture.md` — arquitetura quick (Conselho → 22 ufs, SP/RS/ES dedicados)
- `07-business-rules.md` — **CRITICO** — URL, sitekey, regex HTML parsing — transcription-ready
- `extraction-notes.md` — decisão para Epic 7: transcrever em TS sem copiar código
- `provenance.json` — repo URL, commit SHA, **license: null (flagged)**

## Decisões para o handoff de Phase 5

- **NÃO copiar código PHP.** License-missing = juridicamente arriscado.
- **TRANSCRIVER pattern em TypeScript** — URLs, sitekeys, estrutura HTML são fatos públicos.
- **Adotar Conselho Nacional como primary path** — 22 ufs com 1 implementação.
- **Para SP (Moema/Zona Sul), reCAPTCHA Enterprise via 2Captcha** — $2.99/1000 captchas (~$30/10k consultas).
- **Rate limit recomendado:** 1 req/2s no Conselho (evitar bloqueio); 1 req/5s no CRECI SP (estado mais sensível).
- **Cache local Redis 30 dias** — CRECI raramente muda. TTL de 30 dias amortiza ~95% das consultas (assumindo skew Pareto).
- **MG e TO: gap aceito** — Zona Sul SP é o escopo Wave A; MG/TO não relevantes nessa wave.
