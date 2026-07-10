# Fluxo de Validação de Comparáveis — ACM Rua Honduras, 629

Objetivo: permitir que o corretor **valide** os comparáveis do ACM e, depois,
**re-verificar na web** os dados (anúncios, preços, programa de quartos) que não
vêm confirmados do ITBI.

**Imóvel-alvo:** Rua Honduras, 629 — Jardim América/SP · 800 m² constr. / 1000 m²
terreno · 4 dorm · 2 suítes · 10 vagas · Score B.
**Fonte base:** Laudo ACM Rua Honduras v4 (Luciana Borba, RE/MAX Galeria,
CRECI 045063-J, emitido 09/06/2026) + `app/src/lib/acm/honduras.fixture.ts`.

---

## Fase 1 — Documento de validação (dados já verificados) ✅ FEITO

Extrai os 23 comparáveis ITBI do laudo, ordena pela **aderência da metodologia**
(área constr. 50% + terreno 20% + proximidade 30% — mesma ordem do laudo;
Top 3 verificado contra o laudo antes de gravar) e gera a planilha editável.

**Rodar:**
```bash
cd app && node scripts/acm-honduras/03-build-xlsx.mjs
```
**Saída:** `docs/acm/honduras-629/ACM-Honduras629-validacao-corretor.xlsx`

**Abas:** Leia-me · Top 3 · Top 5 · Top 10 · Todos (23) · Ofertas ativas · Terrenos.

**O que o corretor faz:** percorre as linhas e preenche **Confere? (✓/✗/?)**,
**Correção** e **Observação**. Atenção especial às colunas marcadas
"**Programa confirmado?** = Não confirmado / Inconsistente" e às distâncias "~"
(aproximadas por geocode) e "—" (sem geocode confiável).

### Limites conhecidos da Fase 1 (a Fase 2 resolve)
- **Datas de venda por item:** o laudo só dá o período global (ITBI 2024–2026).
- **Dorm/Suíte/Vagas (S/V/D):** vêm da Seção 5 do laudo — **dado secundário, não
  ITBI**. Convenção: *dormitórios = total, já inclui as suítes*. Há ao menos uma
  inconsistência (Torres Homem 399 = 5 suítes/4 dorm) → confirmar em anúncio.
- **URLs de anúncio:** o laudo traz a referência/portal (ex.: "Chaves na Mão id
  33434912"), não a URL completa.
- **Distâncias/coords** dos não-Top 5: aproximadas (geocode) ou ausentes.

---

## Fase 2 — Re-verificação na web (rodar DEPOIS)

Workflow multi-agente que, para cada comparável/oferta, busca na internet um
anúncio atual, confirma **URL, preço pedido, status** e o **programa (dorm/suíte/
vagas)** — corrigindo o S/V/D secundário do laudo — e verifica
adversarialmente que o anúncio é mesmo do imóvel.

**Script:** `app/scripts/acm-honduras/reverify-web.workflow.mjs`

**Acionar (na sessão Claude Code — requer opt-in de workflow, ex.: dizer
"use um workflow" ou `ultracode`):**
```
Workflow({ scriptPath: 'app/scripts/acm-honduras/reverify-web.workflow.mjs' })
```

**Retorno:** array por item com `{ confirmado, url, portal, status, precoLaudo,
precoAtual, deltaPercent, programaAnuncio:{dormitorios,suites,vagas}, evidencia }`.

**Passo final (a sessão executa após o workflow):** mesclar o retorno num novo
Excel `ACM-Honduras629-REVERIFICADO-<data>.xlsx`, **preservando as marcações de
validação do corretor** da Fase 1 e adicionando colunas de diff
(URL encontrada · preço atual vs laudo · programa confirmado/corrigido · status).

> Princípio (Art. IV — No Invention): nada é inventado. Item sem anúncio achado
> fica `found:false` / "—". Off-market permanece off-market.

---

## Arquivos do fluxo

| Arquivo | Papel |
|---------|-------|
| `app/scripts/acm-honduras/honduras-dataset.mjs` | Dataset oficial (23 comparáveis + 11 ofertas + alvo), com rastreabilidade à fonte |
| `app/scripts/acm-honduras/03-build-xlsx.mjs` | Fase 1 — geocode + ranking + geração do Excel |
| `app/scripts/acm-honduras/reverify-web.workflow.mjs` | Fase 2 — workflow de re-verificação web |
| `app/scripts/acm-honduras/01-discover.mjs` | Descoberta read-only do banco (consultor/coords) — diagnóstico |
| `docs/acm/honduras-629/ACM-Honduras629-validacao-corretor.xlsx` | **Entregável** ao corretor |

## Nota sobre os dados do banco (PROD)
O banco (`acm_comparaveis`) tem **3.618 ITBI da Luciana, mas da região de Moema** —
**não contém os comparáveis de Honduras 629** (Jardim América). Por isso este
documento usa a fonte autoritativa (laudo oficial), não a RPC. Ver
`01-discover.mjs` para reproduzir esse diagnóstico.
