# HANDOFF — Sessão 2026-06-15 (ITBI ao vivo + Epic 8 ACM + pesquisa FISBO)

> **TL;DR:** As 3.618 vendas reais ITBI de Moema entraram em **produção** e aparecem na tela de ACM do app. Foi criado o **Epic 8** (geração de entregáveis ACM) com ADR + lib de cálculo testada + UI de "mais parecidos". Uma **pesquisa profunda** gerou as stories **7.11/7.12**. 11 commits locais na branch `fix/epic7-v-crawl-health` — **nada no remoto** (push é do @devops). Dev server pode estar rodando; lead/edifício demo e senha da Luciana foram semeados em prod.

---

## 1. O que foi entregue (commits `37d20cd`..`cd4001b`)

### Dado real ITBI no ar (produção, fora de git)
- 2 migrations aplicadas via **SQL Editor** no projeto `hculsnvpyccnekfyficu` (remax-moema):
  - `20260615000001` — enum `fonte_comparavel += 'itbi'`
  - `20260615000002` — campos da metodologia em `acm_comparaveis` (area_construida/terreno, testada, ano_construcao, padrao_iptu, valor_venal, sql_cadastral, score, preco_pedido/desagio, status_anuncio, preco_m2_terreno)
- **Consultor Luciana semeado** em `consultores` (estava vazia): `id=1f7ec2b3-d414-4850-8b6a-32faa8e1f47c` (= auth.uid de luciana.borba@uol.com.br). `consultores.id = auth.uid()` por design.
- Engine externo `acm-imobiliario` publicou **3.618 vendas ITBI** (`fonte=itbi`, `is_venda_real=true`) sob o consultant_id da Luciana. Comando: `python push_acm_supabase.py --bairro moema --fonte itbi --consultant-id <uuid> --apply` (envs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` do `app/.env.local`).

### Epic 8 — Geração de entregáveis ACM
- `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md` + stories 8.0–8.5 + PDFs de referência em `docs/reference/acm-honduras/`.
- **ADR-EPIC8-001 (Accepted):** render **nativo TS `@react-pdf/renderer`**; engine só como fonte de dados. 8.5 descopada.
- **Story 8.2 implementada:** `app/src/lib/acm/methodology.ts` + `honduras.fixture.ts` + `adapter.ts` + `similar.ts` — regressão Honduras travada (mediana 18.264, mercado 12.419.520, fechamento 10.217.539, residual 9.624.000, Top 3 correto). **38/38 testes.**
- **AC4 (UI):** painel "Comparáveis mais parecidos" na `AcmScreen` (input área-alvo → ranqueia por aderência + valor indicativo). Validado ao vivo (113m² → ~R$ 1,25M).
- **Atalho ACM no dashboard:** `DashboardQuickActions.tsx` (ACM/Leads/Feed/Funil).
- Migration draft 8.1 (`20260615000002`) **aplicada**, mas o **sink do engine ainda não preenche** as colunas novas (ficam NULL) — ver pendência opção B.

### Pesquisa + stories
- `docs/research/2026-06-15-fisbo-captacao-ingestao/report.md` (deep-research, 15 confirmadas/10 refutadas).
- Stories **7.11** (FISBO determinístico via `publisherType` nativo ZAP/VivaReal) e **7.12** (proxy residencial BR no crawler vs 403) — **Draft**, derivadas do report.

---

## 2. Estado ao vivo (efêmero)

- **Dev server:** pode estar rodando em `http://localhost:3000` (background, `npm run dev`). Se não, `cd app && npm run dev`.
- **Login demo (Luciana):** `luciana.borba@uol.com.br` / `RemaxMoema2026!` (senha **temporária** definida nesta sessão — trocar).
- **Lead demo:** `/acm/d642463c-02f8-441e-8b77-5346f9c9acdc` (edifício `2c2e1558…`, Rua Alvorada 116, Vila Olímpia). 787 vendas no raio 1km.
- Para ver a tela: **janela anônima** → logar como Luciana (o RLS esconde o lead de outras contas).

---

## 3. Pendências (priorizadas)

1. **Push da branch** `fix/epic7-v-crawl-health` (11 commits locais) — **exclusivo @devops** (Art. II).
2. **Opção B — enriquecer dado ITBI:** atualizar o sink do engine (`engine/src/sinks/supabase_acm.py`, repo `acm-imobiliario`) para mapear os campos novos (area_terreno_m2, sql_cadastral, padrao_iptu…) e re-aplicar (snapshot seguro). Sem isso, as colunas novas ficam NULL e o ranking usa só área.
3. **Implementar 7.11** (FISBO determinístico — alto ROI, baixo esforço) e **7.12** (proxy residencial). Precisam validação @po (`*validate-story-draft`).
4. **Story 8.3** (laudo/resumo PDF nativo) — desbloqueada pela ADR; melhor com verificação visual.
5. **Limpeza demo (opcional):** apagar lead `d642463c…` + edifício `2c2e1558…` quando não precisar mais (não afeta as 3.618 vendas).
6. **Logout button** ausente na UI (lacuna notada).
7. **Outliers ITBI** (ex.: R$236M/278m²) — Roadmap Fase 1.1 (filtro arm's-length) no engine.

---

## 4. Fatos técnicos (para agir sem re-investigar)

- **Scaffold Supabase quebrado:** migrations reais em `supabase/migrations/`, mas `config.toml`/link em `supabase/supabase/`; scaffold perdido em `C:\Users\Zero\supabase` captura o workdir do CLI. `db push` dessincronizado → **aplicar via SQL Editor** (como feito) ou `--workdir` + `migration repair`. Ver `docs/runbooks/apply-itbi-enum-migration.md`.
- **Credenciais locais:** `app/.env.local` tem `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` válidos. A `DATABASE_URL` direta tem senha velha (não usar).
- **Engine:** `C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\squads-custom\acm-imobiliario\engine\` (Python, gitignored). `build` → `moema_consolidado.csv`; geocode cache em `moema_geo.csv`.
- **Metodologia ACM:** lib pura em `app/src/lib/acm/` (single source of truth, testada). Capex Score B=0.15, liquidez composta multiplicativa, aderência 50/20/30.

---
*Handoff 2026-06-15. Próximo objetivo sugerido: implementar Story 7.11 (FISBO determinístico) — maior ROI. Abrir nova sessão (regra operator-zero: sessão curta).*
