# Plano de Retomada — 08-Jul-2026 (founder multi-projeto)

> Objetivo: você abrir este arquivo (ou a próxima sessão ler ele) e ninguém se perder.
> Apanhado completo das 72h: `docs/HANDOFF-SESSION-20260708-h1-h2-laudo-v5.md`.

---

## A. Estado em uma linha

ACM: laudo Honduras **v5 pronto e aprovado** (faixa R$ 10,92–12,96M, homogeneizado,
bairros por CEP, mapa ampliado) — **bloqueado na H-3 (reunião com a Luciana)**.
Restante do repo: 2 stories em InReview (Epic 10) e 2 Ready (Epic 6) — é o trabalho
que NÃO depende de ninguém e roda em modo autônomo.

## B. Checklist do FOUNDER (o que só você pode fazer)

- [ ] **Autorizar push/PR** dos ~16 commits locais (`fix/epic7-v-crawl-health`) via
      @devops — decidir se mantém a branch ou renomeia para `feat/acm-h1-h2`.
- [ ] **Reunião H-3 com a Luciana** (leva `LAUDO-ACM-Honduras-v5-2026-07-08.pdf` +
      `RELATORIO-ALTERACOES-LAUDO-v4-v5-20260707.pdf`): labels da faixa · meta
      comercial (manter 10,0–10,5M?) · narrativa Jd. Paulista×Jd. América ·
      critério de dupla guia ITBI · fontes do residual (N-2).
- [ ] Decisões dormentes (sem pressa): Vercel duplicado · waiver LGPD · ajuste por
      idade (N-3) · pin 4 do mapa (fixar coordenada ou manter honesto).

## C. Sequência AUTÔNOMA não-ACM (pós-`/clear`)

> **✅ EXECUTADA em 2026-07-08** (sessão autônoma): 10.1 e 10.2 → Done (PASS,
> suíte re-validada); 6.6 implementada ANTES da 6.7 (inversão prevista — a UI
> consome endpoint/tabela/hook da 6.6) → Done c/ CONCERNS; 6.7 (UI dossiê) →
> Done c/ CONCERNS. Commits locais `254a04d`, `522c7d5`, `15a77f5` — sem push.
> **Pendências p/ founder:** aplicar migrations 023+024 no Supabase SQL Editor;
> decidir contratação Infosimples (`OWNER_LOOKUP_ENABLED` continua OFF).

Trabalho destravado, em ordem SDC, sem depender de decisão externa:

| # | Item | Status hoje | O que fazer | Risco/limite |
|---|---|---|---|---|
| 1 | **Story 10.1** — Call list FISBO priorizada + status de contato | InReview | QA gate (7 checks): rodar suíte/lint/tsc, revisar contra ACs, veredito no story file, Done se PASS | Nenhum |
| 2 | **Story 10.2** — Roteiro de visitas por proximidade | InReview | Mesmo QA gate na sequência | Nenhum |
| 3 | **Story 6.7** — UI "Quem é o dono?" (dossiê de proprietário) | Ready | Implementar (S) — UI sobre dados já existentes; @dev + QA loop | Verificar dependência real do 6.6 antes; se bloquear, inverter com o 6.6 |
| 4 | **Story 6.6** — Lookup proprietário via cartório (Infosimples/ARISP) | Ready | Implementar ATÉ a fronteira da API externa: client + flag + mock/testes; a ativação real fica atrás de credencial/custo | **API paga** — NÃO contratar/consumir crédito sem o founder; deixar flag off |
| — | Story 9.4 (ITBI cross-repo) e 9.1 (régua apto provisória) | Ready | NÃO nesta sequência (são ACM; 9.4 é cross-repo `acm-imobiliario`) | — |

Regras da sessão autônoma: 1 objetivo = 1 sessão quando possível; validação com
saída real (suíte completa ao final de cada story); commits locais por story
(Conventional Commits + ID); **sem push** (@devops); parar e reportar se uma story
exigir decisão de produto/custo.

### Prompt pronto para colar na próxima sessão (pós-/clear)

```
Leia docs/PLANO-RETOMADA-20260708.md (seção C) e execute a sequência autônoma
não-ACM: (1) QA gate das Stories 10.1 e 10.2 (InReview→Done se PASS, veredito no
story file); (2) implementar Story 6.7 (UI dossiê) com QA loop; (3) implementar
Story 6.6 até a fronteira da API Infosimples (client+flag+mocks, flag OFF, sem
consumir API paga). Validação real por story (vitest/eslint/tsc), commit local por
story, sem push. Siga em modo autônomo até concluir ou até bater em decisão que
seja minha; nesse caso, documente e continue com o próximo item.
```

## D. Quando a H-3 acontecer (sequência ACM volta)

H-3 (Luciana) → **H-4**: propagar faixa a resumo/deck/didático + fiação da
homogeneização/guard-rails na UI → **P-1** CLI `acm-validate` → P-2/P-3.
Detalhe no `docs/acm/ROADMAP-ACM.md` §9.
