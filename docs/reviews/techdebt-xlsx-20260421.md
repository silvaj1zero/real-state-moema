# Techdebt: xlsx package — 2 high-severity vulnerabilities sem fix público

**Data:** 2026-04-21
**Origem:** `npm audit` pós-limpeza (task P5 #9)

## Situação

Após remover `next-pwa` + `workbox-*` (não usados) e aceitar os fixes seguros do `npm audit fix`,
restam **2 vulnerabilidades high-severity** no pacote `xlsx`:

- [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) — Prototype Pollution
- [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) — Regular Expression DoS (ReDoS)

O mantenedor do SheetJS não disponibiliza patches no registry npm — apenas via CDN própria
(`https://cdn.sheetjs.com/`). Por isso o `npm audit fix --force` não oferece correção.

## Uso atual no projeto

Apenas em `app/src/hooks/useCapteiImport.ts`:

```ts
import * as XLSX from 'xlsx'
// ...
const wb = XLSX.read(e.target?.result, { type: 'array' })
const json = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' })
```

Contexto: importar export Captei em `.xlsx` ou `.xls`. CSV já é processado por `papaparse`
(sem vulnerabilidade).

## Avaliação de risco real

- **Prototype Pollution:** explorável apenas se carregarmos arquivo `.xlsx` adversarial, que
  pelo fluxo atual só vem do upload da consultora Luciana. Risco: baixo (single-tenant,
  usuária identificada). Não há outros consumidores.
- **ReDoS:** mesma condição acima — precisa input adversarial.

Ambos exigem um atacante com acesso ao upload. Em produção atual (consultora única RE/MAX),
ataque requer a própria usuária intencionalmente subir arquivo malicioso — exposição mínima.

## 3 caminhos de remediação

### Opção A — Migrar para `exceljs` (recomendado se PR fizer sentido)
- `exceljs` é fork mantido com zero advisories
- Requer refactor do `useCapteiImport.ts` (~20 LOC)
- API diferente mas cobre caso de uso (`.xlsx` read → JSON)
- **Esforço:** 1-2h, 1 commit

### Opção B — Migrar para CDN do SheetJS
- Instalar via `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- Versão patched (Prototype Pollution corrigido)
- Sem mudança de código
- **Desvantagem:** dependência fora do npm registry → build em CI precisa internet
- **Esforço:** 5 min

### Opção C — Remover suporte a `.xlsx`
- Aceitar apenas CSV no Captei import
- Papaparse já processa → elimina dep vulnerável
- **Desvantagem:** degrada UX se Captei só exportar Excel
- **Esforço:** 15 min (remover branch `ext === 'xlsx'` em `useCapteiImport.ts:114-122`)

## Recomendação

**Opção B** como quick win (5 min, sem refactor), **opção A** como fix definitivo no próximo
sprint de manutenção. Opção C só se a Luciana confirmar que sempre exporta em CSV.

## Estado após as mudanças desta sessão

```
npm audit:
  Antes : 4 moderate + 11 high = 15 total
  Depois: 2 high (ambos xlsx)
```

Removidos dos deps:
- `next-pwa` — não usado (`next.config.ts` não importa)
- `workbox-precaching`, `workbox-routing`, `workbox-strategies` — não usados em `src/`
