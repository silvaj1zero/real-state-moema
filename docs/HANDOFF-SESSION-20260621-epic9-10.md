# Handoff — Sessão 2026-06-21 · Epic 9 (ACM paridade) + Epic 10 (Agenda FISBO)

> Handoff consolidado para a próxima sessão. Estado limpo: tudo abaixo está
> commitado e no remoto (`fix/epic7-v-crawl-health`), nada pela metade.
> Complementa `docs/HANDOFF-SESSION-20260617-epic9-acm.md` (que tem o **rascunho
> da régua de apartamento** da 9.1, ainda válido).

## Branch / remoto
`fix/epic7-v-crawl-health` — HEAD `efeee5f`. Commits desta linha de trabalho:
- `dd0e0d3` Epic 9 PRD + stories + spike 9.0
- `5fe106b` 9.3 mapa Top-5/pins
- `1f279b7` 9.2 planilha XLSX 7 abas
- `efeee5f` Epic 10 (PRD + 10.1/10.2)

## Estado dos épicos
**Epic 9 — ACM paridade premium (`docs/prd/EPIC-9-ACM-PARIDADE-PREMIUM.md`)**
- ✅ **9.0 Done** — spike: RPC viva já expõe lat/lng; metodologia 100% NULL nas 3.618 ITBI; `tipo` NULL. (`docs/acm/9.0-data-audit.md`)
- ✅ **9.3 Done** — mapa Top-5/pins (8.7 já fazia; delta foi wirar o Resumo). Gate PASS.
- ✅ **9.2 Done** — planilha XLSX canônica 7 abas (exceljs). Gate CONCERNS (AC2 18/21 col por dado faltante).
- 🔴 **9.1 Ready** — discriminador apto/casa + régua de Score. **Bloqueio: elicit com a Luciana** (rascunho pronto no handoff 20260617). Auto-classificação por `tipo` depende de 9.4.
- 🔴 **9.4 Ready** — fechar AC3 do sink. **Cross-repo `acm-imobiliario`** (`engine/src/sinks/supabase_acm.py`). É o gargalo que destrava colunas/score/dedup.
- Esboços no PRD (não draftados): 9.5 (validação web/Fase B), 9.6 (tipografia/logo), 9.7 (config geo).

**Epic 10 — Agenda de Prospecção FISBO (`docs/prd/EPIC-10-AGENDA-FISBO.md`)**
- 🟡 **10.1 Ready** — call list FISBO priorizada + status de tentativa de contato (atendeu/não atendeu/retornar/agendado). Reusa `is_fisbo`, contato enriquecido (`tel:`/`wa.me`), funil. Adiciona **1 coluna de status** (@data-engineer decide `leads` vs `scraped_listings`).
- 🟡 **10.2 Ready** — roteiro de visitas por proximidade (haversine + fallback bairro), realce no `MapView`. Sem TSP.
- Fora de escopo (futuro): discador VoIP, calendário grid, TSP avançado, dedup por telefone, métricas.

## Como retomar (sessão nova)
- **9.1:** "refine a régua de apto do handoff 20260617 e prepare para a Luciana validar" → implementar `propertyType` em `methodology.ts` + seções condicionais do laudo + seletor na UI.
- **9.4:** abrir o repo `acm-imobiliario` (caminho provável `C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\squads-custom\acm-imobiliario\`); mapear sink + backfill idempotente + dedup por SQL. Verificação de cobertura neste repo via `app/scripts/acm-audit/9.0-data-audit.mjs`.
- **10.1/10.2:** ciclo @dev → @qa → @devops (já são Ready). Começar pela 10.1 (10.2 depende dela).

## Ambiente / comandos
- App: `cd app && npm run dev` (Next.js 16, Turbopack, `localhost:3000`, `.env.local` com Supabase+Mapbox).
- Testes ACM: `cd app && npx vitest run src/lib/acm src/components/acm --no-file-parallelism` (132/132 verdes ao fim desta sessão).
- Supabase: PostgREST + `SUPABASE_SERVICE_ROLE_KEY` de `app/.env.local` (DATABASE_URL direto obsoleto). PostgREST capa 1000 linhas → usar `count: exact, head: true`. Consultor ITBI Luciana: `1f7ec2b3-d414-4850-8b6a-32faa8e1f47c`.

## Pendências de repositório (não commitadas — decisão do founder)
`app/package.json` + `app/package-lock.json` (modificados, não relacionados), `.claude/settings.local.json.bak`, `app/scripts/acm-honduras/`, `docs/acm/honduras-629/`, `docs/guides/MIGRACAO-ACM-laudo-planilha-mapa.md`, e os dois HANDOFF-SESSION (20260617, 20260621) — todos **fora dos commits** desta sessão. Avaliar na próxima.

## Nota de processo (operator-zero)
Sessão longa (muitas trocas de agente). Recomendado `/clear` e nova sessão por objetivo (9.1, 9.4, ou Epic 10) para não pagar cache_read alto.
