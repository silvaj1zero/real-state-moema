# Smoke Test — 23 Abr 2026

Roteiro rápido (~15 min) para validar tudo que foi entregue nas sessões 20-23 Abr:
destravamento do Epic 6, fixes de segurança do P5, e débitos do backlog.

**URL:** https://real-state-moema.vercel.app
**Pré-requisito:** estar logado com a conta da Luciana (ou usuário de teste).

---

## Parte 1 — Infra & Health (2 min)

### Passo 1. Health check da infra (terminal)

```bash
CRON_SECRET=$(grep "^CRON_SECRET=" "C:/Users/Zero/Desktop/Real State - Moema/app/.env.local" | cut -d= -f2-)
curl -sH "Authorization: Bearer $CRON_SECRET" \
  https://real-state-moema.vercel.app/api/health/db | jq
```

**Esperado:** `"status": "ok"` e `"ok": true` nos 5 checks:
- `consultores`, `scraped_listings`, `scraped_listings_contact_cols`, `portal_searches`, `fn_scraped_listings_parametric`

**Se falhar:** o cache do PostgREST voltou a travar. Rodar `docs/UNBLOCK-POSTGREST.sql` no SQL Editor.

---

## Parte 2 — App base (ainda funciona? 3 min)

### Passo 2. Login

Abrir https://real-state-moema.vercel.app → fazer login.
**Esperado:** cai no mapa (home) sem erro.

### Passo 3. Mapa & filtros

- [ ] Mapa de Moema carrega (Mapbox)
- [ ] Marcadores de edifícios aparecem
- [ ] Clicar em um marcador abre o `BuildingCard`
- [ ] Não há banner vermelho de erro no topo

**Se banner vermelho:** provavelmente voltou o problema de `portal_searches not found`. Volte ao Passo 1.

---

## Parte 3 — Epic 6 (busca paramétrica — 5 min)

### Passo 4. Busca Local (no mapa existente)

1. No mapa, clicar no botão azul **"Buscar aqui"** (FAB)
2. Tela `/search` abre com lat/lng/raio preenchidos
3. Filtros: tipologia = "Apto", preço max = "1.500.000"
4. Clicar **"Buscar localmente"** (não o "Buscar nos Portais")

**Esperado:**
- [ ] Retorna lista de resultados (pode estar vazia se banco tem pouco dado scraped)
- [ ] Sem erro de "schema cache" ou "function not found"

### Passo 5. Histórico de Buscas

1. Na tela `/search`, aba "Histórico"

**Esperado:** carrega (vazio ou com buscas antigas), sem erro 404/500.

### Passo 6. Buscar nos Portais (cria portal_searches)

1. Ainda em `/search`, com filtros preenchidos
2. Clicar **"Buscar nos Portais"** → selecionar ZAP
3. Modal mostra: estimativa de custo + confirmar

**Esperado:**
- [ ] INSERT em `portal_searches` funciona (status "pending")
- [ ] Progress bar aparece
- [ ] Em ~60-120s termina com status "completed" ou "failed"

**Se der 500 na criação:** provavelmente `CRON_SECRET` ou `APIFY_TOKEN` ausente em Vercel. Não é bug das últimas sessões — é configuração.

### Passo 7. Rate Limit (esperado: bloquear)

Repetir o Passo 6 seis vezes seguidas (em 1 hora).
**Esperado:** 6ª tentativa retorna 429 "Rate limit exceeded. Max 5 searches per hour."

---

## Parte 4 — Security fixes do P5 (2 min)

### Passo 8. Zod validation — input inválido deve rejeitar

No terminal, com sessão de consultora autenticada OU via `/api/health/db` como proxy de saúde:

```bash
# Testar via DevTools Console do navegador (já logado):
fetch('/api/search/history?consultant_id=nao-eh-uuid', {method:'GET'}).then(r=>r.json()).then(console.log)
```

**Esperado:** `{ "error": "Invalid input", "details": { fieldErrors: { consultant_id: [...] } } }` com status **400** (não 500, não silencioso).

```bash
# Outro teste: lat fora de range
fetch('/api/search/local', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({p_lat:999, p_lng:0})}).then(r=>r.json()).then(console.log)
```

**Esperado:** `{ "error": "Invalid input", ... }` com status 400.

---

## Parte 5 — Débitos aplicados localmente (2 min)

### Passo 9. Rodar tests e coverage

```bash
cd "C:/Users/Zero/Desktop/Real State - Moema/app"
npm test -- --run
```

**Esperado:** `Test Files  26 passed (26)` e `Tests  139 passed (139)`.

```bash
npm test -- --run --coverage
```

**Esperado:** termina sem `Coverage threshold violated`. Estatísticas ≥ 40% lines.

---

## Parte 6 — Ações pendentes do usuário (1 min — só marcar)

### Passo 10. SQL hardening

Aplicar `docs/HARDEN-FUNCTION-SEARCH-PATH.sql` no SQL Editor.
**Esperado:** `Success. No rows returned` + a query SELECT no final mostra `proconfig` com `search_path=public, pg_temp` nas 2 funções.

### Passo 11. Outros a fazer quando puder

- [ ] Enviar email Captei (`docs/outreach/captei-api-inquiry-email.md`)
- [ ] Decidir sobre xlsx (`docs/reviews/techdebt-xlsx-20260421.md`) — 3 opções
- [ ] Pedir implementação das stories 6.6/6.7 (precisa `INFOSIMPLES_TOKEN`)

---

## Resumo Visual

| Passo | O que valida | Se falhar → |
|---|---|---|
| 1 | Schema cache OK | Rodar UNBLOCK-POSTGREST.sql |
| 2-3 | Login e mapa funcionam | Bug existente antes das sessões |
| 4 | `/api/search/local` (Zod + RPC) | PGRST202 → cache travou de novo |
| 5 | `/api/search/history` (Zod + portal_searches) | PGRST205 → cache ou tabela faltando |
| 6 | `/api/search/parametric` (Zod + Apify) | Provavelmente env var |
| 7 | Rate limit (5/hora) | Checkar fn_check_rate_limit |
| 8 | Zod rejeita input ruim | Alguma migration reverteu |
| 9 | Tests locais passam | Regressão |
| 10 | SQL hardening aplicado | — |

**Tempo total:** ~15 minutos.
