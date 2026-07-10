# Business Rules — 19950512/buscacreci

## SCOPE

Regras de busca/parsing CRECI em **trancrição pseudocode TS** (consumir como referência, **NÃO copiar literais de PHP** dado o license-missing).

Citações verbatim com `path:line` são para **auditoria de comportamento**, não para uso em produção.

---

## BR-COFECI-001 — URL pattern do Conselho Nacional CRECI

**Severidade:** critical (sem essa URL não há lookup)
**Fonte:** `src/Infraestrutura/Adaptadores/PlataformasCreci/Conselho/CreciConselhoPlataformaImplementacao.php:35`

### Trecho verbatim
```php
// Conselho/CreciConselhoPlataformaImplementacao.php:35
$this->baseURL = 'https://www.creci'.mb_strtolower($this->uf).'.conselho.net.br';
```

### Regra formalizada
```
RULE BR-COFECI-001
WHEN consulta CRECI em uma UF servida pelo Conselho Nacional
THEN base URL = "https://www.creci{uf_lowercase}.conselho.net.br"
     where uf ∈ {al,am,ap,ba,ce,df,go,ma,ms,mt,pa,pb,pe,pi,pr,rj,rn,ro,rr,sc,se}
     (21 UFs cobertas)

TRACEABILITY: Conselho/CreciConselhoPlataformaImplementacao.php:35
```

### Transcription TS (Epic 7)

```typescript
// packages/scrapers/lib/creci-conselho.ts
const CONSELHO_NACIONAL_UFS = [
  'al', 'am', 'ap', 'ba', 'ce', 'df', 'go', 'ma', 'ms', 'mt',
  'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'sc', 'se',
] as const;

function getConselhoNacionalBaseUrl(uf: string): string {
  return `https://www.creci${uf.toLowerCase()}.conselho.net.br`;
}
```

---

## BR-COFECI-002 — Turnstile Sitekey (constante pública)

**Severidade:** critical
**Fonte:** `src/Infraestrutura/Adaptadores/PlataformasCreci/Conselho/CreciConselhoPlataformaImplementacao.php:25`

### Trecho verbatim
```php
// Conselho/CreciConselhoPlataformaImplementacao.php:25
// Sitekey do Cloudflare Turnstile utilizado por todos os estados do Conselho Nacional
private const TURNSTILE_SITEKEY = '0x4AAAAAAB5EssxvqmsTJ5Wx';
```

### Regra formalizada
```
RULE BR-COFECI-002
WHEN resolvendo Cloudflare Turnstile no Conselho Nacional CRECI
THEN siteKey = "0x4AAAAAAB5EssxvqmsTJ5Wx"
     pageUrl = baseURL + "/form_pesquisa_cadastro_geral_site.php"

WHY  Sitekey é embedded no HTML do form — exposto publicamente
     pelo Cloudflare. Permanece estável enquanto o site não mudar.
TRACEABILITY: Conselho/CreciConselhoPlataformaImplementacao.php:25
```

### Transcription TS

```typescript
const CONSELHO_TURNSTILE_SITEKEY = '0x4AAAAAAB5EssxvqmsTJ5Wx';
const CONSELHO_FORM_PATH = '/form_pesquisa_cadastro_geral_site.php';

async function resolveTurnstile(captchaService: TwoCaptchaClient, uf: string) {
  return captchaService.solveTurnstile({
    siteKey: CONSELHO_TURNSTILE_SITEKEY,
    pageUrl: getConselhoNacionalBaseUrl(uf) + CONSELHO_FORM_PATH,
  });
}
```

---

## BR-COFECI-003 — POST request body shape

**Severidade:** critical
**Fonte:** `Conselho/CreciConselhoPlataformaImplementacao.php:77-82`

### Trecho verbatim
```php
// Conselho/CreciConselhoPlataformaImplementacao.php:77-82
$creciConsultado = $this->consultarApiCreci('/form_pesquisa_cadastro_geral_site.php', [
    "inscricao" => $creci,
    "token" => $captchaResolvido->get(),
]);
```

### Regra formalizada
```
RULE BR-COFECI-003
WHEN POST request ao endpoint do Conselho Nacional
THEN:
  - URI: /form_pesquisa_cadastro_geral_site.php
  - Headers:
      Content-Type: application/x-www-form-urlencoded
      User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...
  - Body (form-encoded):
      inscricao={numero_creci}
      token={turnstile_token}

TRACEABILITY: Conselho/CreciConselhoPlataformaImplementacao.php:40-50, 77-82
```

### Transcription TS

```typescript
async function consultarConselho(uf: string, numeroCreci: string, turnstileToken: string) {
  const url = `${getConselhoNacionalBaseUrl(uf)}${CONSELHO_FORM_PATH}`;
  const formData = new URLSearchParams({ inscricao: numeroCreci, token: turnstileToken });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    },
    body: formData,
  });

  if (resp.status !== 200) {
    throw new Error(`CRECI lookup failed: HTTP ${resp.status}`);
  }
  return await resp.text();  // HTML
}
```

---

## BR-COFECI-004 — Regex HTML parsing (CRITICAL — transcription-ready)

**Severidade:** critical
**Fonte:** `Conselho/CreciConselhoPlataformaImplementacao.php:106-160` (método `parsearRespostaHTML`)

### Comportamento (descrito sem citar literal grandes)
A resposta do Conselho Nacional é HTML com tabela Quasar/Vue.js. Estrutura:
- Container `<tbody>...</tbody>` (ausente se sem resultado)
- Primeira linha `<tr>` contém o resultado primário
- Cada linha tem 6 colunas `<td>`:
  - `td[0]` — avatar do corretor (ignorar)
  - `td[1]` — nome completo dentro de `<div>NOME</div>`
  - `td[2]` — número da inscrição (CRECI)
  - `td[3]` — situação ("ATIVO" / "INATIVO")
  - `td[4]` — certidão de regularidade ("REGULAR" / "IRREGULAR")
  - `td[5]` — telefone (texto literal, ou "NÃO DIVULGADO")

### Regra formalizada
```
RULE BR-COFECI-004
GIVEN response HTML from Conselho Nacional POST
WHEN  parsing structured response
THEN:
  1. IF "<tbody>" NOT in HTML → return [] (zero results)
  2. Extract first <tr> inside <tbody> (first/primary result)
  3. Extract all <td>...</td> sequentially
  4. IF count(<td>) < 6 → return [] (malformed)
  5. Field mapping:
     - nomeCompleto = innerText of <div> inside td[1]
     - inscricao    = strip_tags(td[2]).trim()
     - situacao_raw = strip_tags(td[3]).trim().toUpperCase()
     - situacao     = (contains "ATIVO" AND NOT contains "INATIVO") ? "Ativo" : "Inativo"
     - telefone_raw = strip_tags(td[5]).trim()
     - telefone     = (contains "DIVULGADO") ? "" : telefone_raw
  6. IF empty(nomeCompleto) OR empty(inscricao) → return []
  7. ELSE → return { inscricao, nomeCompleto, situacao, telefone }

TRACEABILITY: Conselho/CreciConselhoPlataformaImplementacao.php:106-160
```

### Transcription TS (Cheerio-based, NOT regex — superior)

```typescript
import { load } from 'cheerio';

interface CreciResultado {
  inscricao: string;
  nomeCompleto: string;
  situacao: 'Ativo' | 'Inativo';
  telefone: string;
}

function parseConselhoResponse(html: string): CreciResultado | null {
  const $ = load(html);
  const firstRow = $('tbody tr').first();
  if (firstRow.length === 0) return null;

  const tds = firstRow.find('td');
  if (tds.length < 6) return null;

  const nomeCompleto = $(tds[1]).find('div').first().text().trim();
  const inscricao = $(tds[2]).text().trim();
  const situacaoRaw = $(tds[3]).text().trim().toUpperCase();
  const telefoneRaw = $(tds[5]).text().trim();

  if (!nomeCompleto || !inscricao) return null;

  const situacao: 'Ativo' | 'Inativo' =
    situacaoRaw.includes('ATIVO') && !situacaoRaw.includes('INATIVO') ? 'Ativo' : 'Inativo';
  const telefone = telefoneRaw.toUpperCase().includes('DIVULGADO') ? '' : telefoneRaw;

  return { inscricao, nomeCompleto, situacao, telefone };
}
```

### Alternativa regex-only (mais frágil — só se NÃO puder usar cheerio)
```typescript
function parseConselhoResponseRegex(html: string): CreciResultado | null {
  if (!html.includes('<tbody>')) return null;

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return null;

  const trMatch = tbodyMatch[1].match(/<tr>([\s\S]*?)<\/tr>/);
  if (!trMatch) return null;

  const tds = Array.from(trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map((m) => m[1]);
  if (tds.length < 6) return null;

  const nomeMatch = tds[1].match(/<div>([^<]+)<\/div>/);
  const nomeCompleto = nomeMatch ? nomeMatch[1].trim() : '';
  const inscricao = tds[2].replace(/<[^>]+>/g, '').trim();
  const situacaoRaw = tds[3].replace(/<[^>]+>/g, '').trim().toUpperCase();
  const telefoneRaw = tds[5].replace(/<[^>]+>/g, '').trim();

  if (!nomeCompleto || !inscricao) return null;

  return {
    inscricao,
    nomeCompleto,
    situacao: (situacaoRaw.includes('ATIVO') && !situacaoRaw.includes('INATIVO')) ? 'Ativo' : 'Inativo',
    telefone: telefoneRaw.toUpperCase().includes('DIVULGADO') ? '' : telefoneRaw,
  };
}
```

---

## BR-CRECISP-001 — CRECI SP utiliza reCAPTCHA Enterprise

**Severidade:** critical (Zona Sul SP é Epic 7 Wave A)
**Fonte:** `src/Infraestrutura/Adaptadores/PlataformasCreci/SP/CreciSPPlataformaImplementacao.php:30,40`

### Trechos verbatim relevantes
```php
// SP/CreciSPPlataformaImplementacao.php:30
private string $baseURL = 'https://www.crecisp.gov.br';

// SP/CreciSPPlataformaImplementacao.php:34
/** reCAPTCHA Enterprise site key (extraído da página) */
private const RECAPTCHA_SITE_KEY = '6LfUMMgqAAAAABG4tjE8VkT2wKZlqmAvV2YsId7a';

// SP/CreciSPPlataformaImplementacao.php:85-91
$captchaResolvido = $this->captcha->resolverV3(
    siteKey: self::RECAPTCHA_SITE_KEY,
    pageUrl: $searchUrl,
    isEnterprise: true,
    pageAction: 'submit_broker_search',
);
```

### Regra formalizada
```
RULE BR-CRECISP-001
WHEN consulta CRECI no estado de SP
THEN base URL = "https://www.crecisp.gov.br"
     captcha = reCAPTCHA Enterprise (v3)
     siteKey = "6LfUMMgqAAAAABG4tjE8VkT2wKZlqmAvV2YsId7a"
     pageAction = "submit_broker_search"
     endpoint_busca = "/cidadao/buscaporcorretores"

  Fluxo:
   1. GET /cidadao/buscaporcorretores → obter cookies de sessão
   2. Resolver reCAPTCHA Enterprise v3 via 2Captcha (~$2.99/1000)
   3. POST /cidadao/buscaporcorretores com:
        form_params:
          IsFinding=True, RegisterNumber={creci}, CPF=, Name=, City=,
          Area=, Language=, Avaliador=, ReCAPTCHAToken={token}
        headers:
          Referer=https://www.crecisp.gov.br/cidadao/buscaporcorretores
          Origin=https://www.crecisp.gov.br
   4. Parse response HTML, encontra link "corretordetalhes" matching creci
   5. POST para link de detalhes para extrair dados completos

NOTE Status do scraper SP em mar/2026: "temporarily disabled" devido a
     persistent reCAPTCHA Enterprise validation failures server-side.
TRACEABILITY: SP/CreciSPPlataformaImplementacao.php:30, 34, 85-91, README.md
```

### Transcription TS (Wave A — pode precisar ajuste se SP scraper ainda inativo)

```typescript
const CRECISP_BASE_URL = 'https://www.crecisp.gov.br';
const CRECISP_RECAPTCHA_SITEKEY = '6LfUMMgqAAAAABG4tjE8VkT2wKZlqmAvV2YsId7a';
const CRECISP_PAGE_ACTION = 'submit_broker_search';
const CRECISP_SEARCH_PATH = '/cidadao/buscaporcorretores';

async function consultarCRECISP(numeroCreci: string, captcha: CaptchaService) {
  // 1. Get cookies
  const cookieJar = new CookieJar();
  await fetch(CRECISP_BASE_URL + CRECISP_SEARCH_PATH, { credentials: 'include' });

  // 2. Resolve reCAPTCHA Enterprise v3
  const token = await captcha.solveRecaptchaV3({
    siteKey: CRECISP_RECAPTCHA_SITEKEY,
    pageUrl: CRECISP_BASE_URL + CRECISP_SEARCH_PATH,
    isEnterprise: true,
    pageAction: CRECISP_PAGE_ACTION,
  });

  // 3. POST search
  const formData = new URLSearchParams({
    IsFinding: 'True',
    RegisterNumber: numeroCreci,
    CPF: '', Name: '', City: '', Area: '', Language: '', Avaliador: '',
    ReCAPTCHAToken: token,
  });

  const resp = await fetch(CRECISP_BASE_URL + CRECISP_SEARCH_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': CRECISP_BASE_URL + CRECISP_SEARCH_PATH,
      'Origin': CRECISP_BASE_URL,
    },
    body: formData,
  });

  const html = await resp.text();
  if (html.includes('Validação reCAPTCHA') || html.includes('erro na validação do capatcha')) {
    throw new Error('CRECI SP: reCAPTCHA validation failed server-side (known issue mar/2026)');
  }
  // ... continue parsing (extractFromList / findDetailUrl)
}
```

---

## BR-COFECI-005 — Robots.txt compliance check (boa prática)

**Severidade:** minor
**Fonte:** `src/Infraestrutura/Adaptadores/PlataformasCreci/Robots.php:14-66`

### Regra
```
RULE BR-COFECI-005
ANTES de fazer scraping, verificar robots.txt:
  1. GET {host}/robots.txt
  2. IF inacessível → assume allowed (graceful fallback)
  3. Parse linhas, filtrando por User-agent: * OR matching userAgent
  4. Coletar Disallow paths
  5. IF requested_path matches any disallow → throw Exception
  6. ELSE → proceed

TRACEABILITY: Robots.php:14-66
```

### Transcription TS

```typescript
async function isAllowedByRobotsTxt(url: string, userAgent = '*'): Promise<boolean> {
  const u = new URL(url);
  const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
  try {
    const resp = await fetch(robotsUrl);
    if (!resp.ok) return true;
    const text = await resp.text();
    const lines = text.split('\n').map((l) => l.trim());

    let isRelevant = false;
    const disallowed: string[] = [];
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.slice('user-agent:'.length).trim();
        isRelevant = agent === '*' || agent.toLowerCase().includes(userAgent.toLowerCase());
      }
      if (isRelevant && line.toLowerCase().startsWith('disallow:')) {
        const path = line.slice('disallow:'.length).trim();
        if (path) disallowed.push(path);
      }
    }
    return !disallowed.some((d) => u.pathname.startsWith(d));
  } catch {
    return true;  // graceful fallback
  }
}
```

---

## Rate limit recomendado (NÃO codificado no repo — sugestão Epic 7)

| Plataforma | Rate limit recomendado | Justificativa |
|---|---|---|
| **Conselho Nacional (21 ufs)** | 1 req / 2s | Captcha Turnstile + servidor compartilhado |
| **CRECI SP** | 1 req / 5s | reCAPTCHA Enterprise (mais sensível), servidor frequentemente lento |
| **CRECI RS** | 1 req / 3s | Site próprio sem captcha conhecido |
| **CRECI ES** | 1 req / 3s | Site próprio sem captcha conhecido |

> Implementar via `maxTasksPerMinute` no Crawlee se for usado como executor, ou throttle manual.

## Falsos positivos / negativos conhecidos

| Cenário | Comportamento esperado | Risco |
|---|---|---|
| CRECI existe mas com "NÃO DIVULGADO" no telefone | `telefone = ""` (correto) | Telefone perdido — adicionar fallback para outros campos do site se disponível |
| CRECI cancelado/suspenso | `situacao = "Inativo"` | OK, mas perde-se a razão da inatividade |
| CRECI com formato incomum (ex: "SP12345-J" com sufixo J de jurídico) | Behavior não testado | **Adicionar suíte de teste em Epic 7 com 20+ CRECIs de variantes** |
| Múltiplos resultados para mesmo CRECI (raro) | Repo pega só o primeiro `<tr>` | OK para 99% dos casos |
| Mudança do HTML do Conselho Nacional | **Falha silenciosa** (return `[]`) | **Monitorar via Discord alert OU exception** |
| CRECI SP reCAPTCHA falhando server-side | Exception "Falha na validação do reCAPTCHA Enterprise" | **Conhecido em mar/2026** — fallback Puppeteer ou contato manual |

## Resumo de regras

| Regra | Severidade | Path |
|---|---|---|
| BR-COFECI-001 | critical | Conselho/CreciConselhoPlataformaImplementacao.php:35 |
| BR-COFECI-002 | critical | Conselho/CreciConselhoPlataformaImplementacao.php:25 |
| BR-COFECI-003 | critical | Conselho/CreciConselhoPlataformaImplementacao.php:40-50, 77-82 |
| BR-COFECI-004 | critical | Conselho/CreciConselhoPlataformaImplementacao.php:106-160 |
| BR-CRECISP-001 | critical | SP/CreciSPPlataformaImplementacao.php:30, 34, 85-91 |
| BR-COFECI-005 | minor | Robots.php:14-66 |
