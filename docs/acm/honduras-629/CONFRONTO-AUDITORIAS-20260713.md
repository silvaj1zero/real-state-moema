# Honduras 629 — Confronto entre auditorias (13-Jul-2026)

**Peças confrontadas:** dossiê original (esta sessão) × **2ª análise** (`FICHA-UNICA-HONDURAS-629-EXPORT-20260713.md`, ressalvas §5) · 3ª análise em andamento pelo operador.
**Método:** cada ressalva da 2ª auditoria foi re-verificada CONTRA os arquivos-fonte do dossiê antes de aceitar ou contestar.

## 1. Onde as duas análises CONVERGEM (núcleo estável)

Áreas oficiais 441/1.050 (matrícula = GeoSampa) · histórico Av.02/Av.03 · ônus R.10/Av.11 com valores e protocolos idênticos · certidão vencida · quadro sucessório provável (50% meação + 16,67%/filho, pendente inventário) · "não basta Clarisia sozinha" · piso terreno R$ 9,62M · prazo anistia 30/08/2026 · anuência CONPRESP + art. 3º como gates · shortlist sem atestado. **Nenhum número-âncora foi contestado por nenhuma das análises.** A ficha ainda AGREGA valor novo: modelos A/B/C de assinatura com rascunho de cláusula e a tabela de dados em branco.

## 2. Ressalvas da 2ª auditoria — veredicto item a item (re-verificado na fonte)

| # | Ressalva da ficha | Veredicto após re-verificação | Ação |
|---|---|---|---|
| 1 | **Total satélite ~736 m² não fecha** (garagem no print = 101,64 m², não ~20/~121) | **PROCEDENTE — DIVERGÊNCIA MATERIAL DE FATO.** Três leituras coexistem para a garagem (nossa 2024: ~20 m² incerto; nossa 2013: ~121,64 incerto; ficha: 101,64) — todas de capturas de baixa resolução. Se garagem ≈ 101,64: soma 685+101,64+30,48 ≈ **817 m²** ≠ 736 (a menos que o polígono "área coberta" já contenha a garagem — não dá para saber pelas capturas). Impacto se 817: excesso de TO sobe p/ ~292 m² e o cenário regularizado sobe (~R$ 13,1–15,6M) — direção FAVORÁVEL, mas não usar sem confirmação. | **Reabrir a medição NA FONTE:** operador exporta as áreas exatas por polígono do projeto Google Earth (2024 e 2013) OU deixa para a medição real do RT. Até lá, todos os docs mantêm "~736 (a confirmar; leituras divergentes 736–817)". |
| 2 | Faixa 11,8–14M usa R$/m² sem o mesmo tratamento (Capex/deságio) da lente 441 | **PARCIALMENTE PROCEDENTE.** As duas lentes estão no MESMO nível "mercado" (sem deságio): 441×(15.978→19.061) e 736×(idem) — consistentes entre si. O problema real é o dossiê misturar DOIS redutores em lugares diferentes: fator fechamento do laudo (−17,7%) vs deságio medido (−12,7%) na tabela de posicionamento. | Na revisão pós-3ª análise: padronizar UM redutor declarado (ou exibir os dois com rótulo) em todas as tabelas. |
| 3 | "Fechamento esperado ~9,2–9,6M" fica ABAIXO do piso 9,62M | **PROCEDENTE — inconsistência de comunicação** (era o item E5 do nosso próprio prompt de auditoria; 2ª análise confirmou independentemente). O "piso 9,62M" é piso de CONVERSA/ancoragem; o fechamento após deságio pode matematicamente ficar abaixo — mas apresentar os dois sem reconciliar confunde o cliente. | Corrigir o PDF: ou subir o anúncio-ponte (~10,8–11,3M p/ fechamento ≥9,62M) ou renomear o invariante p/ "nunca ANUNCIAR/negociar âncora abaixo de 9,62M" com nota explicando a relação com fechamento. Decisão da consultora. |
| 4 | **Laudo v6 (PDF + computation.json) ainda diz "obras pós-2014 → fora da anistia"; o PDF de cenários diz pré-2014/anistia** | **PROCEDENTE — CONTRADIÇÃO INTERNA MATERIAL confirmada:** o laudo v6 foi gerado ANTES da datação por satélite (b1-b5) e nunca foi regenerado; `conclusoesPrincipais` (bullet 4) e `condicionantes.regularizacao` do JSON afirmam o oposto do Anexo B do PDF de cenários. Se os dois documentos forem ao cliente juntos, a contradição desmonta a credibilidade. | **Gerar laudo v6.1** (builder 07: atualizar o bullet de regularização + JSON) OU anexar errata ao v6. Fazer ANTES da supervisão. |
| 5 | Banner "material interno" presente | CONFIRMADO — já atendido. | — |

## 3. Divergências DA FICHA vs nossos registros (sentido inverso — a ficha também erra/avança)

1. **"Dennis: Vivo (confirmado)"** — nossos registros (nota de titularidade §4) tinham o status do Dennis como **A CONFIRMAR**; a informação do founder de 13-Jul não cobria isso. Se a confirmação aconteceu em outra conversa, documentar a fonte na ficha; senão, rebaixar para "a confirmar". Assinatura do meeiro é indispensável — não pode repousar em suposição.
2. **Garagem 101,64 m²** — a ficha apresenta a leitura como fato; é leitura de captura, tão incerta quanto as nossas. Vale a mesma regra do item 1 acima: só a exportação do projeto/medição do RT fecha o número.

## 4. Estado consolidado para a 3ª análise

- **Fechados (2 análises convergem):** base documental, ônus, sucessão, zona/tombamento, prazo, piso terreno, invariante de área anunciada.
- **Abertos (fila da 3ª análise / correções):** (a) medição da garagem e total de projeção (736×817); (b) contradição laudo v6 × PDF sobre pré/pós-2014 → v6.1 ou errata; (c) reconciliação piso 9,62M × fechamento esperado; (d) padronização do redutor (−17,7% × −12,7%); (e) status do Dennis com fonte.
- **Sugestão de uso da 3ª análise:** rodar o `PROMPT-AUDITORIA-DOSSIE-20260713.md` como está — os itens (a)-(e) correspondem a C1, F3, E5, B5 e (novo) A-sucessão; se a 3ª análise achar os mesmos, temos convergência tripla e a fila de correção final antes da supervisão.

**Nada do que está aberto muda a estratégia** (anistia + anúncio-ponte + saneamento sucessório) — muda números de apresentação e consistência interna. Corrigir (b) é obrigatório antes da supervisão; (a) e (c) antes do cliente.
