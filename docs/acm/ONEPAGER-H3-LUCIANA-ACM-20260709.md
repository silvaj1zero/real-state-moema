# ACM em 1 página — pauta H-3 com Luciana Borba

**Data:** 2026-07-09 · **Duração sugerida:** 45–60 min  
**Objetivo:** validar formato, linguagem e defaults do método — **não** ensinar código  
**Materiais na mesa:** laudo Honduras v5 · laudo 113 v2 · laudo 132 v4 · planilhas de validação  

---

## 1. Para que serve o ACM (alinhamento em 2 min)

| O ACM é | O ACM não é |
|---------|-------------|
| Âncora em **vendas reais (ITBI)** para a V2 | Laudo judicial / NBR completo |
| Ferramenta de **captação com exclusividade** | Média de anúncios de portal |
| Entrega em **faixa** + comparáveis rastreáveis | Número mágico único “de computador” |

**Três camadas que não devem se misturar:**

1. **Valor técnico** — o que o registro pagou em imóveis parecidos  
2. **Estado do seu imóvel** — melhor/pior que o típico (sua vistoria)  
3. **Jogo comercial** — como anunciar e competir na vitrine  

---

## 2. O que já funciona (mostrar 1 slide mental)

| Caso | Mensagem para a Luciana |
|------|-------------------------|
| **Honduras 629** | Faixa **R$ 10,9–13,0M** (não mais “12,4M ponto”); bairros reais por CEP; SQL nos 23 |
| **Andrade 113** | Com amostra limpa, **R$ 1,1M da dona é defensável** (antes o sistema “mentia”) |
| **Andrade 132** | Anúncio **abaixo** da referência → tese **não cortar preço** |

**Regra de ouro aprendida:** limpar tipologia (casa × apto) muda o número mais do que “fórmula bonita”.

---

## 3. Decisões que só você pode tomar (bloco principal)

### A) Formato da faixa na capa

```
[ ] Gosto: "Mercado R$ X – Y  (referência Z)"
[ ] Prefiro só a referência + teto em nota de rodapé
[ ] Prefiro três cartões: Conservador | Provável | Agressivo
```

### B) Estado do imóvel (substitui o “−15% escondido”)

Escala rápida na visita (rascunho — valide ou reescreva):

| Nota | Significado | Desconto default proposto |
|------|-------------|---------------------------|
| **A** | Novo / reformado integral | 0% |
| **B** | Conservado, pronto morar | −7,5% |
| **C** | Precisa ajustes / Capex leve | −15% |
| **D** | Reforma pesada / caso especial | fora da régua — conversa aberta |

**Pergunta:** no 132 (conservado), faz sentido default **B (−7,5%)** em vez de sempre −15%?

### C) Quando o anúncio está **barato** demais

```
[ ] Texto padrão: "Subprecificado — não recomendo cortar"
[ ] Outro: ________________________________
```

### D) Residual de incorporador (VGV − obra − margem)

```
[ ] Uso na conversa com o dono
[ ] Só no laudo técnico / investidor
[ ] Pode sumir da capa na maioria dos casos
```

### E) O que você precisa **antes** da V1 vs só na V2

```
[ ] Lite 2 páginas na V1 (modo dono)
[ ] Laudo completo só na V2
[ ] Sempre os dois
```

### F) Preferência de erro (calibra o sistema)

Se o modelo errar, o que dói menos?

```
[ ] Superavaliar (captação fácil, venda difícil)
[ ] Subavaliar (captação mais dura, exclusividade mais justa)
```

---

## 4. O que vamos construir a seguir (sem jargão)

| Prioridade | O que você ganha |
|------------|------------------|
| **1** | Desconto de estado **explícito** (fim do −15% misterioso) |
| **2** | Avisos na capa se a amostra estiver fraca |
| **3** | Ranking certo para “valor na casa” vs “valor no terreno” |
| **4** | Tipologia casa/apto **à prova de erro** na base |
| **5** | **ACM Lite** em linguagem de dono, em minutos |

Stories técnicas: `9.14` … `9.19` em `docs/stories/`.

---

## 5. Frases que podemos usar com o proprietário (teste A/B verbal)

1. *“Não estou chutando pelo ZAP. Estou mostrando o que o registro de imóveis pagou perto daqui.”*  
2. *“O mercado não é um número — é uma faixa. Sua casa, pelo estado dela, eu posiciono aqui.”*  
3. *“Se o pedido estiver acima da faixa, o risco é ficar parado. Se estiver abaixo, o risco é deixar dinheiro na mesa.”*  

Marque o que soa com a sua voz; risque o que não usaria nunca.

---

## 6. Fechamento da reunião (checklist 5 min)

| Item | OK? | Nota |
|------|-----|------|
| Formato de faixa aprovado | ☑ | Mercado R$ X–Y (referência Z) |
| Escala A–D (ou outra) aprovada | ☑ | **A–F**: 0 / −5 / −7,5 / −10 / −15 · F fora |
| Defaults 0 / −7,5 / −15% OK? | ☑ | Expandido com −5 e −10 (B e D) |
| Texto “não cortar” no caso barato | ☑ | Subprecificado — não recomendo cortar |
| Residual: capa sim/não | ☑ | Só laudo técnico / investidor |
| Lite na V1: sim/não | ☑ | Lite V1 · laudo completo só V2 |
| Preferência super vs sub avaliar | ☑ | Preferir **subavaliar** |
| Próximo caso real para testar | ☐ | endereço: _______ |

**Dono do follow-up:** founder / operador · **Atualizar:** `ROADMAP-ACM.md` H-3 + defaults nas stories 9.14/9.19  

---

## Versão “print” (copiar para slide único)

> **ACM Luciana — decisão H-3**  
> ITBI real · faixa defensável · estado do imóvel declarado · tese automática (caro / justo / barato) · Lite para o dono · laudo longo só quando precisar  
> **Não é** laudo judicial. **É** disciplina de mercado para fechar exclusividade com autoridade.

---

*Fonte: `AVALIACAO-CRITICA-METODO-ACM-20260709.md` · casos Honduras / 113 / 132 · 2026-07-09*
