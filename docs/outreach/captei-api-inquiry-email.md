# Email para Captei — Consulta sobre API/Integração

**Para:** contato@captei.com.br
**Assunto:** Consulta sobre API/integração — imobiliária RE/MAX Galeria Moema
**De:** zero@toptier.net.br (ou email comercial Top Tier Infrastructure)

---

## Draft

> Olá, equipe Captei,
>
> Sou da **Top Tier Infrastructure**, desenvolvendo um sistema interno de
> inteligência territorial para a **RE/MAX Galeria Moema** (Luciana Borba).
> A plataforma mapeia toda a região de Moema/São Paulo, cruzando dados de
> portais (ZAP, OLX, VivaReal), cadastros municipais (GeoSampa) e a base de
> leads FISBO que a Luciana já recebe de vocês.
>
> Hoje estamos consumindo o Captei via **export CSV do painel**, funcionando
> bem como fonte de leads. Queria explorar duas frentes:
>
> **1) API REST ou Partner API**
> Existe alguma API disponível para clientes ativos (ou sob plano enterprise)
> que permita consumir os leads captados programaticamente? Estamos pensando
> em substituir o upload manual de CSV por um fetch automatizado —
> idealmente com:
>    - Busca por data de captação (incremental sync);
>    - Filtro por região/bairro;
>    - Campos completos (nome, telefone(s), endereço, portal de origem, URL
>      do anúncio, data de captação, tipo/metragem, preço).
>
> **2) Webhooks**
> Alternativamente, vocês oferecem webhooks para notificar quando um novo
> lead é captado? Isso nos permitiria puxar o registro sob demanda via API
> ou até espelhar os dados no nosso sistema em tempo real.
>
> Se houver plano/contrato específico para integrações, podem me indicar
> contato comercial e valores? A Luciana já é cliente (conta ativa), e
> estamos abertos a upgrade de plano se a integração fizer sentido.
>
> Obrigado pela atenção.
> Aguardo retorno.
>
> ---
> **Contato técnico:** zero@toptier.net.br
> **Cliente Captei:** Luciana Borba — RE/MAX Galeria Moema
> **Uso:** integração B2B interna, sem redistribuição

---

## Notas para quem enviar

- Mencionar que já somos cliente pagante via Luciana — ajuda a priorizar a resposta.
- Se rejeitarem API, pedir docs do CSV export (campos exatos, encoding, separador, data format) para formalizar o pipeline de Story 4.7.
- Perguntar se webhooks existem em plano enterprise — menos custoso que poll de API.
- Se tudo for negativo, ainda vale pedir **SLA de disponibilidade do painel/export**, pois a Story 4.7 depende do CSV estar exportável regularmente.

## Respostas esperadas (e plano de ação)

| Resposta do Captei | Ação |
|---|---|
| "Temos API enterprise por R$ X/mês" | Avaliar ROI vs R$215/mês do plano atual + esforço de implementação (~1 story). |
| "Só temos CSV" | Manter Story 4.7 (useCapteiImport) como caminho oficial. Reforçar documentação. |
| "Temos webhooks em plano Y" | Implementar endpoint `/api/webhooks/captei` (1 story). |
| Sem resposta em 7 dias | Reenviar para support@ ou ligar no comercial. |
