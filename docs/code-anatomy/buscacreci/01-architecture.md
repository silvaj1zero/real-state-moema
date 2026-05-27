# Architecture — 19950512/buscacreci (quick)

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | PHP 8+ (com auxiliar Node.js para SP) |
| HTTP client | Guzzle HTTP 7 |
| Parser HTML | Symfony DOM Crawler + regex preg_match |
| Container DI | PHP-DI 7 |
| Captcha service | 2Captcha (via implementation interface `Captcha`) |
| Cache | Predis (Redis) |
| Queue | RabbitMQ (`php-amqplib`) |
| JWT | firebase/php-jwt |
| Build/Deploy | docker-compose (Nginx + php-fpm + Postgres + Redis) |
| Tests | Pest v3 |
| **License** | ❌ **NENHUMA — flag crítico** |

## Arquitetura — Clean Architecture / Hexagonal (DDD)

```
src/
├── Aplicacao/                           ← USE CASES + ports
│   ├── CasosDeUso/
│   │   ├── ConsultarCreci.php           ← interface use case
│   │   ├── ConsultarCreciImplementacao.php  ← orquestrador (chama PlataformaCreci adequado)
│   │   ├── PlataformaCreci.php          ← INTERFACE — "consultar CRECI em uma plataforma"
│   │   └── Enums/CreciImplementado.php  ← UF enum
│   └── Compartilhado/
│       ├── Captcha/Captcha.php          ← interface (resolverV3 + resolverTurnstile)
│       ├── Discord/Discord.php          ← notificação
│       └── Mensageria/                  ← interface filas
│
├── Dominio/                              ← ENTITIES + VALUE OBJECTS
│   ├── Entidades/
│   │   ├── AgenteImobiliario.php
│   │   ├── CorretorEntidade.php
│   │   ├── CreciEntidade.php
│   │   └── ConselhoNacionalCRECI/       ← MembroDoConselho.php
│   └── ObjetoValor/                     ← Creci, CPF, CNPJ, Email, ... (DDD primitives)
│
├── Infraestrutura/                       ← ADAPTERS + INFRASTRUCTURE
│   ├── Adaptadores/
│   │   └── PlataformasCreci/             ← implementações concretas de PlataformaCreci
│   │       ├── Conselho/
│   │       │   └── CreciConselhoPlataformaImplementacao.php  ← cobre 22 UFs
│   │       ├── SP/
│   │       │   ├── CreciSPPlataformaImplementacao.php  ← reCAPTCHA Enterprise via 2Captcha
│   │       │   └── creci_sp_scraper.js                  ← fallback Puppeteer (Node.js)
│   │       ├── RS/CreciRSPlataformaImplementacao.php
│   │       ├── ES/CreciESPlataformaImplementacao.php
│   │       └── Robots.php                ← compliance robots.txt
│   ├── APIs/BuscaCorretor/Controladores/Creci/CreciController.php
│   ├── Repositorios/CreciRepositorioImplementacao.php
│   └── Workers/ConsultaCreci/index.php   ← consumer da fila RabbitMQ
```

## Diagrama do fluxo principal

```
┌─────────────────────────────────────────────────────────────┐
│ HTTP Client (browser, n8n, integração)                       │
└───────────────────────────────┬─────────────────────────────┘
                                │ GET /?creci=SP12335F
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ CreciController                                              │
│   - valida formato CRECI                                     │
│   - gera codigo_solicitacao (UUID)                           │
│   - publica mensagem na fila RabbitMQ "consulta_creci"       │
│   - retorna 202 com codigo_solicitacao                       │
└───────────────────────────────┬─────────────────────────────┘
                                │ fila
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ Worker — Infraestrutura/Workers/ConsultaCreci/index.php      │
│   - consome mensagem                                          │
│   - resolve UF via Creci enum                                 │
│   - injeta PlataformaCreci adequada via DI Container         │
│   - chama plataforma.consultarCreci(numero, tipo)            │
└───────────────────────────────┬─────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
        CRECI SP            CRECI RS/ES         Conselho Nacional
        (reCAPTCHA           (sites próprios)   22 UFs
        Enterprise)                              (Turnstile)
            │                   │                   │
            ▼                   ▼                   ▼
        2Captcha            Guzzle POST          2Captcha
        + Guzzle POST                            Turnstile
        + DomCrawler                             + Guzzle POST
                                                  + regex preg_match
            │                   │                   │
            └───────────────────┼───────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ SaidaConsultarCreciPlataforma (DTO)                          │
│   - inscricao, nomeCompleto, fantasia, situacao,             │
│     cidade, estado, numeroDocumento, telefone                │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ CreciRepositorio                                             │
│   - salva resultado em Postgres + cache Redis                │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
                       Discord notification
                       (CanalTexto::CONSULTAS / WORKERS)
```

## Pattern dominante: Strategy + Factory

`PlataformaCreci` é a interface; cada UF (Conselho ou dedicado) é uma **estratégia injetada via DI Container** (`php-di/php-di`). O orquestrador `ConsultarCreciImplementacao` resolve a estratégia certa pelo UF:

```php
// Pseudocódigo — orquestrador
match($uf) {
  'SP' => $container->get(CreciSPPlataformaImplementacao::class),
  'RS' => $container->get(CreciRSPlataformaImplementacao::class),
  'ES' => $container->get(CreciESPlataformaImplementacao::class),
  default => $container->get(CreciConselhoPlataformaImplementacao::class),  // 22 ufs
}
```

> Para Epic 7, o equivalente TS seria 1 interface + 4 implementações:
>
> ```ts
> interface CreciValidator {
>   consultarCreci(numero: string, tipoCreci: string): Promise<CreciResultado>
> }
> class CreciConselhoValidator implements CreciValidator { ... }  // 22 ufs
> class CreciSPValidator implements CreciValidator { ... }
> class CreciRSValidator implements CreciValidator { ... }
> class CreciESValidator implements CreciValidator { ... }
> ```

## Detalhe importante: 22 UFs com 1 implementação

`CreciConselhoPlataformaImplementacao` recebe `$uf` como parâmetro de construtor e constrói a URL base dinamicamente:

```php
// Conselho/CreciConselhoPlataformaImplementacao.php:35
$this->baseURL = 'https://www.creci' . mb_strtolower($this->uf) . '.conselho.net.br';
```

→ Mesma implementação serve para AL, AM, AP, BA, CE, DF, GO, MA, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, SC, SE — 21 UFs (TO falta no Conselho).

## Camada de resiliência

| Mecanismo | Local | Função |
|---|---|---|
| **Fila RabbitMQ** | `Mensageria` | Desacopla HTTP request da consulta lenta (~3-5s por captcha) |
| **Cache Redis** | `Cache` interface | Resultado já consultado — TTL não documentado |
| **Discord notification** | `Discord/Discord.php` | Alerta sucessos/falhas em canais `CONSULTAS` e `WORKERS` |
| **Robots.txt check** | `Robots.php` | Verifica `disallow` antes de cada scraping (compliance) |
| **Timeout HTTP** | `Conselho: 99s, SP: 60s` | Margem ampla para captcha resolution |

## Subsistemas externos

| Sistema | Função | Cost basis |
|---|---|---|
| **2Captcha** | Cloudflare Turnstile (Conselho) + reCAPTCHA Enterprise (SP) | ~$1-3/1000 captchas |
| **Conselho Nacional CRECI** | https://www.creci{uf}.conselho.net.br/form_pesquisa_cadastro_geral_site.php | Free — só captcha gateway |
| **CRECI SP** | https://www.crecisp.gov.br/cidadao/buscaporcorretores | Free — reCAPTCHA Enterprise (mais caro) |
| **CRECI RS** | https://www.crecirs.gov.br (site próprio) | Free |
| **CRECI ES** | https://www.creci-es.gov.br (site próprio) | Free |
| **Discord** | Notificação operacional | Free (webhook) |
| **RabbitMQ** | Mensageria interna | Self-hosted |
| **PostgreSQL** | Persistência | Self-hosted |
| **Redis** | Cache | Self-hosted |

## Operação (Docker)

`docker-compose.yml` levanta: php-fpm + nginx + postgres + redis. Worker `ConsultaCreci` roda como processo separado consumindo fila RabbitMQ. Captcha-service externo (2Captcha) integrado via HTTP API.

## Coverage observation

| Estado | Path | Status |
|---|---|---|
| **SP** | Scraper dedicado (reCAPTCHA Enterprise) | ⚠️ "Temporarily disables" no commit `ddd5d66c` (mar/2026) por reCAPTCHA validation failures |
| **RS, ES** | Scrapers dedicados | ✓ Ativos |
| **21 UFs (AL, AM, AP, BA, CE, DF, GO, MA, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, SC, SE)** | Conselho Nacional | ✓ Ativo (refactored mar/2026) |
| **MG, TO** | — | ❌ Sem suporte |

> **Crítico para Epic 7 — Moema/SP:** o scraper de SP foi **temporariamente desabilitado** em mar/2026 por failures de validação reCAPTCHA Enterprise. **Esse é o estado mais relevante para nosso Wave A** (Zona Sul SP). Precisaremos provavelmente da **estratégia alternativa Puppeteer** (`creci_sp_scraper.js`) ou alternativa via Conselho Nacional (mas SP não está no Conselho Nacional).

## Pontos fracos / Risk surface (Epic 7)

- **SP scraper inativo** — major blocker para Zona Sul SP
- **License missing** — risco juridico de cópia
- **Maintainer único** — projeto não corporativo, abandono possível
- **2Captcha vendor lock-in** — única implementação Captcha tem `2Captcha` no código. Alternativas (Anti-Captcha, CapMonster) seriam reimplementadas.
- **Sem rate-limiting explícito** — risco de blockada IP em consultas massivas. Em Epic 7 enriquecimento, processar em fila com throttle.
- **Sem retry com backoff** — falha de captcha = falha de request. Em Epic 7, wrapper TS deve adicionar retry 3x.

## Pontos fortes para Epic 7

- ✓ **URL pattern do Conselho Nacional é deterministic** — `https://www.creci{uf}.conselho.net.br`
- ✓ **Sitekey Turnstile constante** — `0x4AAAAAAB5EssxvqmsTJ5Wx` (publicado, válido em mar/2026)
- ✓ **Estrutura HTML conhecida** — tabela Quasar/Vue.js com 6 colunas (avatar, nome, inscrição, situação, certidão, telefone)
- ✓ **Endpoint POST simples** — `form_pesquisa_cadastro_geral_site.php` com `inscricao` + `token`
- ✓ **22 UFs com 1 código** — escalabilidade comprovada
