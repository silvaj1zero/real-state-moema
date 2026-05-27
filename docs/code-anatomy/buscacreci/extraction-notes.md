# Extraction Notes — 19950512/buscacreci → Epic 7

Decisão por componente: **APROVEITAR / ADAPTAR / DESCARTAR** para o CRECI lookup do Epic 7.

## Mapa de extração

| Item | Decisão | Justificativa |
|---|---|---|
| **Código PHP literal** | **DESCARTAR (license-missing)** | Sem LICENSE no repo. All rights reserved por default. Cópia direta = risco juridico. |
| **URLs do Conselho Nacional** | **APROVEITAR (fato público)** | Pattern `https://www.creci{uf}.conselho.net.br` é informação pública do COFECI. |
| **Sitekey Turnstile** | **APROVEITAR (fato público)** | `0x4AAAAAAB5EssxvqmsTJ5Wx` é embedded no HTML do form. Público. |
| **Estrutura HTML do response (6 colunas)** | **APROVEITAR (fato observável)** | Resultado de observação do website. Não é propriedade intelectual do repo. |
| **Pattern Strategy/Factory** | **APROVEITAR (pattern geral)** | DDD/Hexagonal — pattern de domínio público. |
| **Sitekey reCAPTCHA SP** | **APROVEITAR (fato público)** | `6LfUMMgqAAAAABG4tjE8VkT2wKZlqmAvV2YsId7a` é embedded na página crecisp.gov.br. Público. |
| **pageAction "submit_broker_search"** | **APROVEITAR (fato público)** | Idem — embedded no JS da página. |
| **Lógica de parsing (sem copiar regex literal)** | **TRANSCREVER em Cheerio TS** | Reescrita em outra linguagem = transformação. Resultado: novo código autoral. |
| **`creci_sp_scraper.js` (Puppeteer)** | **AVALIAR fallback strategy** | Pode ser inspiração, mas reescrever do zero. Repos Puppeteer + Chrome são abundantes. |
| **Lógica de fila RabbitMQ** | **DESCARTAR** | Não relevante — Epic 7 usa Supabase queues OR Vercel cron. |
| **Discord notification** | **DESCARTAR** | Substituir por logging Supabase + alertas Vercel. |
| **Robots.txt check** | **APROVEITAR (pattern simples)** | Implementar em TS — código curto, padrão. |
| **2Captcha integration** | **ADAPTAR** | Reescrever em TS com `2captcha-ts` (npm package, MIT). Não copiar do repo. |

## Sugestões de hardening específicas para Epic 7

### 1. Wrapper class `CreciValidator` (interface TS + 4 implementações)

```typescript
// packages/scrapers/lib/creci/creci-validator.ts
export interface CreciResultado {
  inscricao: string;
  nomeCompleto: string;
  situacao: 'Ativo' | 'Inativo';
  telefone: string;
  uf: string;
  fonte: 'conselho-nacional' | 'crecisp' | 'crecirs' | 'creci-es';
  consultadoEm: Date;
}

export interface CreciValidator {
  consultar(creci: string, tipoCreci: string): Promise<CreciResultado | null>;
}

// packages/scrapers/lib/creci/factory.ts
const CONSELHO_NACIONAL_UFS = new Set([
  'al', 'am', 'ap', 'ba', 'ce', 'df', 'go', 'ma', 'ms', 'mt',
  'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'sc', 'se',
]);

export function getCreciValidator(uf: string, captcha: TwoCaptchaClient): CreciValidator {
  const u = uf.toLowerCase();
  if (u === 'sp') return new CreciSPValidator(captcha);
  if (u === 'rs') return new CreciRSValidator(captcha);
  if (u === 'es') return new CreciESValidator(captcha);
  if (CONSELHO_NACIONAL_UFS.has(u)) return new ConselhoNacionalValidator(u, captcha);
  throw new Error(`CRECI lookup not supported for UF: ${uf}`);
}
```

### 2. Cache layer obrigatório (Redis ou Supabase table)

CRECI **raramente muda**. Cache 30 dias TTL:

```typescript
// packages/scrapers/lib/creci/cached-validator.ts
import { supabase } from '@shared/supabase';

export class CachedCreciValidator implements CreciValidator {
  constructor(private inner: CreciValidator, private cacheTTLDays = 30) {}

  async consultar(creci: string, tipo: string): Promise<CreciResultado | null> {
    const key = `${tipo}-${creci}`;

    // Lookup cache
    const { data: cached } = await supabase
      .from('creci_cache')
      .select('*')
      .eq('cache_key', key)
      .gte('consultado_em', new Date(Date.now() - this.cacheTTLDays * 86400000).toISOString())
      .single();

    if (cached) return cached as CreciResultado;

    // Fresh lookup
    const fresh = await this.inner.consultar(creci, tipo);
    if (fresh) {
      await supabase.from('creci_cache').upsert({ cache_key: key, ...fresh });
    }
    return fresh;
  }
}
```

Schema sugerido:

```sql
CREATE TABLE creci_cache (
  cache_key TEXT PRIMARY KEY,
  inscricao TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  situacao TEXT NOT NULL CHECK (situacao IN ('Ativo', 'Inativo')),
  telefone TEXT,
  uf TEXT NOT NULL,
  fonte TEXT NOT NULL,
  consultado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_creci_cache_consultado_em ON creci_cache(consultado_em);
```

### 3. Rate limiting via fila / throttle

Para Epic 7 enrichment phase (running over 10k+ candidates), throttle obrigatório:

```typescript
import { AutoscaledPool } from 'crawlee';

const pool = new AutoscaledPool({
  minConcurrency: 1,
  maxConcurrency: 5,                    // máx 5 paralelo
  maxTasksPerMinute: 30,                // 1 req / 2s = 30 / min
  taskTimeoutSecs: 60,
  async runTaskFunction() {
    const candidate = await getNextCandidate();
    if (!candidate) return;
    const result = await creciValidator.consultar(candidate.creci, candidate.tipo);
    await persistCreciValidation(candidate.id, result);
  },
  async isTaskReadyFunction() { return (await getNextCandidate()) !== null; },
  async isFinishedFunction() { return (await countPendingCandidates()) === 0; },
});
await pool.run();
```

### 4. Fallback strategy para CRECI SP (estado inativo em mar/2026)

Conforme commit `ddd5d66c`, **CRECI SP scraper foi temporariamente desabilitado**. Estratégias:

**Estratégia A:** Fallback para `creci_sp_scraper.js` (Puppeteer + Chrome headless)
- ✓ reCAPTCHA Enterprise resolvido nativamente (no sub via 2Captcha)
- ✗ Latência maior (~10-15s vs 3-5s do HTTP)
- ✗ Recursos maiores (Chrome instance)
- ✗ Mais frágil a mudanças do site

**Estratégia B:** Aguardar reativação do scraper HTTP
- Acompanhar issues do repo upstream
- Validar reCAPTCHA Enterprise em sandbox 2Captcha

**Estratégia C (RECOMENDADO Epic 7):** Híbrido com priorização

```typescript
class CreciSPHybridValidator implements CreciValidator {
  async consultar(creci, tipo) {
    // Try 1: HTTP + 2Captcha (cheap, fast)
    try {
      return await this.httpStrategy.consultar(creci, tipo);
    } catch (e) {
      if (!e.message.includes('reCAPTCHA validation failed')) throw e;
      // Try 2: Puppeteer fallback (expensive)
      return await this.puppeteerStrategy.consultar(creci, tipo);
    }
  }
}
```

### 5. Observability obrigatória

CRECI lookup failure rates devem ser SLO:

```typescript
// Track via Supabase table
await supabase.from('creci_lookup_logs').insert({
  uf: candidate.uf,
  creci: candidate.creci,
  fonte: validator.fonte,
  resultado: result ? 'found' : 'not_found',
  duration_ms: durationMs,
  cost_2captcha_usd: 0.003,  // approximated
  consultado_em: new Date(),
});
```

Alertas Vercel/Grafana:
- Failure rate > 10% por UF em janela 24h → investigation
- 2Captcha cost > $100/mês → review volume + cache hit rate
- HTML structure change detected (returns 0 fields onde expected ≥4) → alerta crítico

## Risco — comunidade

| Vetor | Probabilidade | Mitigação |
|---|---|---|
| **License missing impede uso comercial** | **CERTO** | Não copiar código. Transcrever apenas conceitos públicos. Considerar contato direto com Matheus para autorização explícita. |
| **Maintainer abandona o repo** | **Médio** (15⭐, 1 autor) | Nossa transcrição TS é independente — sem dependência runtime. |
| **Conselho Nacional muda HTML** | **Médio** (já mudou em mar/2026: JSON→HTML) | Monitor estrutura via testes E2E semanais. Discord/Supabase alert. |
| **CRECI SP muda reCAPTCHA** | **Alto** (já houve breakage em mar/2026) | Híbrido HTTP→Puppeteer fallback. Aceitar latência maior. |
| **2Captcha quebra/cancela serviço** | **Baixo** (vendor maduro, 10+ anos) | Alternativa: Anti-Captcha, CapMonster Cloud. Adicionar interface CaptchaService abstrata. |
| **Custo 2Captcha cresce** | **Médio** | Cache 30d + dedup por CRECI já visto. Estimativa: ~$30-100/mês em escala Wave A. |

## Alternativas avaliadas pré-Wave 2

| Alternativa | Por que NÃO escolhida |
|---|---|
| **API oficial do COFECI** | Não existe — esse é o gap que `buscacreci` preenche |
| **Scraping próprio do zero** | Reinventar roda; padrão já dominado por buscacreci. Transcrever conceitos > reescrever do zero. |
| **Brasil API** | Não tem endpoint para CRECI |
| **Datasets públicos de corretores** | Existem (Receita Federal CNPJ + CNAE 6822500), mas **não validam status ATIVO/INATIVO** em tempo real |
| **Receita Federal CNAE 6822500** | Já temos no Epic 7 (rictom CNPJ), mas é **complementar**, não substituto |

## Recomendação final

**TRANSCREVER PATTERN em TypeScript autoral, NÃO copiar código PHP.** Justificativa:

1. **License-missing = risco juridico** ✗ — não podemos copiar literais
2. **URLs, sitekeys, HTML structure são fatos públicos** ✓ — observáveis no website
3. **Lógica de domínio é simples** ✓ — 4 classes + 1 interface + 1 cache layer
4. **Comunidade resolveu o problema; vamos consumir o conhecimento, não o código** ✓
5. **Custo de transcription < 1 sprint** ✓ — ~3-5 dias com testes

**Adicionar à Phase 5:** story Epic 7 "CRECI Validator unified (4 platforms)" com responsável `@dev`, custo estimado **0.5-1 sprint (3-5 dias)** — 4 classes + 1 interface + 1 cache layer + 1 Supabase migration + testes E2E com 20+ CRECIs.

**Adicionar à Phase 5 (separado):** story Epic 7 "CRECI SP fallback Puppeteer" com responsável `@dev`, custo estimado **0.5 sprint (2-3 dias)** se reCAPTCHA Enterprise HTTP path não recuperar — adiar até primeira evidência de falha em produção.

**Contato sugerido:** abrir issue ou contato direto com `mattmaydana@gmail.com` solicitando autorização MIT/Apache 2.0 OU declaração explícita de license. Pode acelerar adoção segura.
