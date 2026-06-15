# HANDOFF — Integração ITBI → acm_comparaveis (2026-06-15)

> **TL;DR:** Foi construída (e validada em dry-run) a ingestão de **vendas reais
> de ITBI/PMSP** que este app planejou mas nunca implementou (cron
> `epic7_itbi_monthly` → edge function `trigger_itbi_snapshot`, ausente). Um
> **engine Python externo** já produz as linhas de `acm_comparaveis`
> (`is_venda_real=true`) para **Moema + região**. Falta o lado-app: aplicar 1
> migration, fornecer credenciais e decidir a hospedagem do job mensal.

---

## 1. Contexto

O app já tinha a UI de ACM (raio, mini-mapa, filtro `is_venda_real`, dossiê) e o
schema (`acm_comparaveis`, RPC `fn_comparaveis_no_raio`), mas a **fonte de vendas
fechadas (ITBI)** estava vazia — só havia anúncios (crawler MercadoLivre =
`scraped_listings`, preço pedido). O engine externo preenche essa lacuna com
**vendas efetivamente registradas** (a "régua de fechamento" da metodologia ACM).

Cliente: **luciana-borba** (mesma operadora deste app). O engine é a capability
`acm-imobiliario` que já produziu o laudo da Rua Honduras 629 (Jardins) e agora
foi parametrizado para **Moema**.

## 2. Onde vive o engine (OUTRO repositório)

> Não está neste repo. Fica na zona de negócio do AIOX-Enterprise (gitignored):

```
C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\
  squads-custom\acm-imobiliario\
    engine\                         ← pipeline Python (ITBI→geocode→score→push)
    docs\INTEGRACAO-MOEMA-SUPABASE.md   ← doc detalhada da integração
```

Invocável via AIOX: skill `/acm` → agente `@acm-analyst` → comando `*push-moema moema`.

## 3. O que JÁ está feito (lado engine) ✅

- **Bairro `moema`** em `engine/config.yaml` (CEP 040xx/045xx — Moema, Vila Nova
  Conceição, Indianópolis, Campo Belo, Planalto Paulista) com **filtros de
  apartamento** (não casa).
- **Sink** `engine/src/sinks/supabase_acm.py` — mapeia o schema do engine para
  `acm_comparaveis`, com **semântica de snapshot** (remove e reinsere as linhas
  ITBI do consultor a cada run; não toca em comparáveis manuais nem em anúncios).
- **Runner** `engine/push_acm_supabase.py` — `--bairro moema` (dry-run) / `--apply`.
- **Fix de geocode** — viewbox ampliado para cobrir Moema (antes rejeitava Moema-sul).
- **Migration** criada NESTE repo: `supabase/migrations/20260615000001_add_itbi_fonte_comparavel.sql`.
- **Validação dry-run (nada escrito no banco):**
  - **3.812 vendas reais** Moema+região 2024–2026 (3.385 apês + 427 casas).
  - Ticket mediano R$ 1,8 M · R$/m² mediano R$ 9.720.
  - Amostra 80 → **76 linhas válidas** mapeadas (coordenadas PostGIS corretas).

## 4. O que FALTA (lado app — @devops do real-state-moema) ⬜

1. **Aplicar a migration** `20260615000001_add_itbi_fonte_comparavel.sql`
   (adiciona `'itbi'` ao enum `fonte_comparavel`). Sem ela, usar `ACM_FONTE=cartorio`.
   ```bash
   supabase db push   # ou o fluxo de migration do projeto
   ```
2. **Fornecer credenciais** para o `--apply` (no ambiente onde o engine roda):
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ACM_CONSULTANT_ID` (UUID da
   luciana-borba em `auth.users`), opcional `ACM_FONTE=itbi`.
3. **Rodar o geocode completo** (1.366 endereços únicos, ~23 min @1/seg) e publicar:
   ```bash
   cd <engine>
   pip install -r requirements.txt
   python -m src.cli build  --bairro moema
   python -m src.cli geocode --bairro moema      # ~23 min
   python push_acm_supabase.py --bairro moema    # dry-run (confere contagem)
   python push_acm_supabase.py --bairro moema --apply   # publica (snapshot)
   ```
4. **Decidir hospedagem do job mensal** — o cron `epic7_itbi_monthly` chama a edge
   function `trigger_itbi_snapshot` (que **não existe**). Duas saídas:
   - (a) Agendar o **job Python** (GitHub Action mensal) que roda o passo 3; OU
   - (b) **Portar** a ingestão para a edge function `trigger_itbi_snapshot` em TS
     (reescreve parsing xlsx + geocode + score — esforço maior, 100% nativo).
   Até decidir, repontar/desabilitar o cron evita erro mensal silencioso.

## 5. Fatos técnicos (para agir sem re-investigar)

- **Tabela alvo:** `acm_comparaveis` (migration `..._003_epic3_intelligence.sql`).
  NOT NULL: `consultant_id, endereco, area_m2, preco, is_venda_real, fonte`.
  `coordinates GEOGRAPHY(Point,4326)` — formato `'SRID=4326;POINT(lng lat)'`.
- **RPC de leitura:** `fn_comparaveis_no_raio(p_lat,p_lng,p_consultant_id,p_raio_m)`
  filtra `consultant_id = p_consultant_id AND coordinates IS NOT NULL AND ST_DWithin`.
  → linhas ITBI aparecem no ACM por raio; UI separa via flag `is_venda_real`.
- **Enum `fonte_comparavel`:** `manual, scraping, captei, cartorio` (+ `itbi` após a migration).
- **Snapshot key:** linhas ITBI têm `notas` começando com `[ITBI]` + SQL do ITBI.
  O delete do snapshot filtra por `consultant_id + fonte + notas LIKE '[ITBI]%'`.
- **Caveat consultant_id:** ITBI é regional, mas `acm_comparaveis` é por-consultor;
  os dados vão sob o id da luciana-borba (app de consultor único). Se virar
  multi-consultor, avaliar tabela regional + ajuste na RPC.

## 6. Arquivos tocados

**Neste repo (real-state-moema):**
- `supabase/migrations/20260615000001_add_itbi_fonte_comparavel.sql` (novo)
- `docs/HANDOFF-SESSION-20260615.md` (este)

**No repo do engine (AIOX-Enterprise / luciana-borba — referência):**
- `engine/config.yaml` (bairro moema + filtros)
- `engine/src/sources/pmsp_itbi.py` (filtros por-bairro; tipo apto/casa)
- `engine/src/sinks/supabase_acm.py` (novo — sink)
- `engine/push_acm_supabase.py` (novo — runner)
- `engine/src/geocode.py` (viewbox ampliado p/ Moema)
- `engine/docs/INTEGRACAO-MOEMA-SUPABASE.md` (doc completa)

## 7. Decisões em aberto (para o dono do app)

- [ ] Aplicar migration do enum `itbi` ou seguir com `cartorio`?
- [ ] Hospedar job Python (GitHub Action) **ou** portar para edge function TS?
- [ ] `ACM_CONSULTANT_ID` definitivo da luciana-borba.
- [ ] Repontar/desabilitar `epic7_itbi_monthly` até o job existir.

---
*Handoff gerado em 2026-06-15. Branch atual: `fix/epic7-v-crawl-health`. Integração
ITBI por engine externo (Python) → acm_comparaveis. Nada foi escrito no banco
(apenas dry-run validado).*
