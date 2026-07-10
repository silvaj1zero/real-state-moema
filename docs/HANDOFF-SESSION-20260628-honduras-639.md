# HANDOFF — Sessão 28-Jun-2026 · Verificação Honduras 639 + Revisão Laudo ACM v4

> Consultora: Luciana Borba (RE/MAX Galeria) · Caso: ACM Rua Honduras, 629 (Jardim América/SP)
> Branch: `fix/epic7-v-crawl-health`

---

## 1. Objetivo da sessão

Durante uma pesquisa de ACM, apareceu um "comparável" anunciado na **Rua Honduras, 639**.
Dúvida do usuário: **erro de anúncio (mesmo imóvel que o alvo 629)** ou **imóvel similar distinto**?
Depois: **revisar o laudo `LAUDO_ACM_Rua_Honduras_RE-MAX_v4.pdf` e ajustar se necessário**.

---

## 2. Achado principal — CONCLUÍDO ✅

**Rua Honduras 639 = Rua Honduras 629 (o PRÓPRIO imóvel-alvo), não um similar distinto.**

Confirmado via **Chaves na Mão** (anúncio público). Atributos batem 1:1 com o `TARGET` do laudo:

| Atributo | Honduras 629 (laudo) | Honduras 639 (anúncio) |
|---|---|---|
| Área construída | 800 m² | **800 m²** ✅ |
| Quartos | 4 dorm | **4** ✅ |
| Vagas | 10 | **10** ✅ (assinatura rara) |
| Preço venda | "pretendido" R$ 12,0M | **R$ 12,0M** ✅ |
| Locação | (629 = R$ 45k/mês comercial) | R$ 65–72k/mês residencial |
| Bairro | Jardim América | Jardim Paulista *(divisa)* |

**Por que diverge no papel:** (1) 629 vs 639 = numeração do anúncio; (2) a Rua Honduras fica
na **divisa** Jd. América / Jd. Paulista — os portais classificam o trecho como Jd. Paulista
(mesmo padrão já visto na Fase 2: Bitencourt, Torres Homem, Veneza). O laudo já reconhece isso
(pág. 5: "o nº 629 situa-se na fronteira entre Jardim América e Jardim Paulista").

**Implicação metodológica:** o anúncio 639 (R$ 12M = expectativa da proprietária) **NÃO pode
entrar como comparável nem concorrência** — seria auto-referência circular. Não confundir com a
oferta ativa `"Rua Honduras s/nº (Jd. Europa)"` do laudo (418 m² / R$ 22,5M / 736 m) — **essa é
outro imóvel, legítimo**.

Memória gravada: `project_honduras-639-mesmo-imovel.md` (+ índice em `MEMORY.md`).

---

## 3. Revisão do laudo — o erro JÁ FOI CORRIGIDO externamente ⚠️

Ponto crítico da sessão: **o arquivo PDF foi regravado durante a revisão.**

- **Versão lida às 17:14** (966.093 bytes): pág. 6 dizia
  *"Destaque para a Rua Honduras, **639** — vizinho direto do alvo: mesma metragem (800 m²),
  pedido de R$ 12,0M, **reforçando a leitura de preço**"* → **auto-referência circular (erro).**
- **Versão atual, regravada às 17:17** (966.112 bytes, md5 `9ec5906a…`): pág. 6 agora diz
  *"Destaque para a Rua **Maestro Chiaffarelli — 820 m² por R$ 11,3M** … fixando o **teto
  realista de negociação**"* → **metodologicamente correto** (concorrente ativo real).

**Verificação da versão atual (`_laudo_v4_NOW.txt`):**
- `639` → **0 ocorrências**
- `vizinho` → **0** · `reforçando a leitura` → **0**
- `12,0M` → 1 ocorrência (a confirmar: deve ser só o preço pretendido legítimo no sumário)
- Nota de due diligence "nº 629 figura como casa comercial em locação" → **permanece (correto)**

**Conclusão:** o problema apontado na revisão **já não existe** na versão atual do laudo. Alguém
(usuário ou sistema-fonte "Jardins Intelligence Lab") regenerou o PDF corrigindo exatamente o
trecho. O laudo NÃO é gerado pelo pipeline do app (`app/src/lib/acm/pdf/laudoModel.ts` não contém
esse texto — é documento externo).

---

## 4. Estado / próximos passos

- [x] Verificar referência Honduras 639 → **é o mesmo imóvel (629)**
- [x] Revisar laudo v4 → erro do 639 identificado
- [x] Constatar que a versão atual (17:17) **já corrigiu** o erro
- [ ] **PENDENTE (interrompido):** confirmar o contexto da única ocorrência restante de `12,0M`
      na versão atual (reler pág. 2/3/5/6) — garantir que é só o preço pretendido da proprietária,
      não outra menção residual ao anúncio do próprio imóvel.
- [ ] (Opcional) Reconciliar due diligence: 629 = 639 → os anúncios de locação R$ 45k (comercial)
      e ~R$ 65–72k (residencial) são do **mesmo bem**; a divergência de uso/valor é exatamente o
      que a due diligence (pág. 17) deve resolver na matrícula/IPTU.
- [ ] O usuário havia escolhido "eu edito o PDF (gero v5)" **antes** de descobrirmos que o arquivo
      já fora corrigido — essa ação **não é mais necessária** salvo se a checagem do `12,0M` revelar
      resíduo.

## 5. Artefatos desta sessão

- `docs/HANDOFF-SESSION-20260628-honduras-639.md` (este arquivo)
- Memória: `project_honduras-639-mesmo-imovel.md`
- Dumps temporários em Downloads (podem ser apagados): `_laudo_v4_dump.txt` (versão 17:14, com o
  erro), `_laudo_v4_NOW.txt` (versão 17:17, corrigida)
- Fonte-chave: `app/scripts/acm-honduras/honduras-dataset.mjs` (TARGET + comparáveis)

## 6. Contexto que economiza tempo na próxima sessão

- O laudo v4 é **externo** (Jardins Intelligence Lab), não sai do app. Editar o PDF direto exige
  PyMuPDF redaction (risco estético) — preferir regenerar na fonte.
- Portais bloqueiam WebFetch (HTTP 403). Para verificar anúncios, usar o **Chrome da sessão**
  (`claude-in-chrome`) via Google → snippets do Chaves na Mão já trazem área/quartos/vagas/preço.
- PyMuPDF (`import fitz`) e `pdftotext` estão disponíveis. Console é cp1252 → **sempre gravar em
  arquivo UTF-8 e ler com o Read tool**, ou `sys.stdout.reconfigure(encoding='utf-8')`.
