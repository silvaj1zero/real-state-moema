# Protocolo de Teste de Campo — Epic 1

**Versão:** 1.0
**Data:** 2026-03-18
**QA:** Quinn (AIOX)
**Princípio:** "Se eu tirasse o app e devolvesse a planilha, sentiria falta?"

---

## 1. Visão Geral

| Parâmetro | Valor |
|-----------|-------|
| **Duração** | 5 dias úteis |
| **Testadora principal** | Luciana Borba (RE/MAX Galeria Moema) |
| **Testador secundário** | 1 colega da Galeria (se disponível) |
| **Localização** | Moema, SP — epicentro Rua Alvorada (CEP 04550-000) |
| **Dispositivo** | Smartphone pessoal da Luciana (Android ou iOS) |
| **Objetivo** | Validar que o Epic 1 entrega valor suficiente para substituir planilha/papel |
| **Gate** | Resultado determina se Epic 2 inicia, retorna para ajustes, ou redesenha |

---

## 2. Pré-requisitos

- [ ] App deployado na Vercel e acessível via URL
- [ ] PWA instalável no dispositivo da Luciana
- [ ] Conta criada (email/senha)
- [ ] Epicentro configurado na Rua Alvorada
- [ ] Seed data carregado (~1.380 edifícios no raio 500m)
- [ ] Tiles do mapa pré-cacheados para modo offline
- [ ] Briefing de 15 minutos com a Luciana sobre funcionalidades

---

## 3. Tarefas Diárias

### Dia 1 — Setup e Primeiro Contato
**Objetivo:** Instalar, configurar e fazer a primeira qualificação.

| Tarefa | Detalhes | Métrica |
|--------|---------|---------|
| Instalar PWA | "Adicionar à tela inicial" no celular | Sucesso: sim/não |
| Login | Email/senha | Tempo até mapa visível |
| Verificar seed data | Confirmar que pins cinza aparecem | Contagem de pins visíveis |
| Configurar epicentro | Confirmar Rua Alvorada | Posição correta no mapa |
| Qualificar 10 edifícios | Caminhar pela região, tocar em pins seed, preencher qualificação | Tempo médio por qualificação |

**Pergunta do dia:** "A primeira impressão do mapa com edifícios pré-carregados foi positiva?"

### Dia 2 — Cadastro em Campo
**Objetivo:** Registrar edifícios novos (não presentes no seed) e testar GPS.

| Tarefa | Detalhes | Métrica |
|--------|---------|---------|
| Caminhar pela Al. dos Maracatins | Rota planejada de ~1km | Tempo total de caminhada |
| Registrar 15 edifícios novos | Usar botão "+" com GPS automático | Tempo médio por cadastro |
| Verificar GPS | Comparar coordenadas do app com posição real | Desvio médio em metros |
| Qualificar 10 edifícios seed | Tocar em pins cinza e preencher dados | Tempo médio |

**Pergunta do dia:** "O cadastro foi rápido o suficiente para usar enquanto caminha?"

### Dia 3 — Teste Offline
**Objetivo:** Validar funcionamento em áreas sem sinal (subsolos, garagens).

| Tarefa | Detalhes | Métrica |
|--------|---------|---------|
| Entrar em subsolo/garagem de 3 prédios | Ativar modo avião se necessário | Indicador "Offline" aparece? |
| Cadastrar 3 edifícios sem internet | Usar botão "+" normalmente | Salva localmente? Indicador "pendente"? |
| Sair do subsolo → reconectar | Desativar modo avião | Sync automático? Tempo de sync? |
| Navegar mapa sem internet | Pan/zoom na região pré-cacheada | Tiles carregam? Pins visíveis? |

**Pergunta do dia:** "Confiaria no app para não perder dados quando estiver sem sinal?"

### Dia 4 — Revisão e Análise
**Objetivo:** Revisar todos os edifícios mapeados, testar filtros e cobertura.

| Tarefa | Detalhes | Métrica |
|--------|---------|---------|
| Revisar todos os edifícios cadastrados | Abrir cards, verificar dados | Dados corretos? Algo faltando? |
| Verificar % cobertura | Ler indicador no topo do mapa | "Raio 500m: X% mapeado" |
| Testar filtros | Filtrar por status, ver apenas "Não Visitado" | Filtros funcionam? São úteis? |
| Testar clustering | Zoom out → clusters, zoom in → pins individuais | Performance aceitável? |
| Testar busca | Buscar edifício por nome | Encontra rapidamente? |

**Pergunta do dia:** "O mapa te dá uma visão clara de onde você já passou e onde falta ir?"

### Dia 5 — Uso Livre + Validação Final
**Objetivo:** Luciana usa o app naturalmente na sua rotina de prospecção.

| Tarefa | Detalhes | Métrica |
|--------|---------|---------|
| Prospecção normal | Usar app como quiser durante a manhã (3-4h) | Buildings registrados/qualificados |
| Anotar frustrações | Qualquer momento de atrito ou confusão | Lista de issues |
| Responder questionário | Ver seção 5 abaixo | Scores |

---

## 4. Métricas a Coletar

| Métrica | Como Medir | Target |
|---------|-----------|--------|
| **Edifícios registrados/hora** | Total registrados ÷ horas em campo | ≥10/hora |
| **Tempo médio por cadastro** | Cronômetro: tap "+" até pin aparece | <30 segundos |
| **Tempo médio por qualificação** | Cronômetro: tap pin seed até salvar | <20 segundos |
| **Precisão GPS** | Comparar 5 coordenadas com Google Maps | Desvio <20m |
| **Eventos offline** | Contagem de cadastros sem internet | Todos sincronizaram? |
| **Taxa de sync** | Cadastros pendentes que sincronizaram / total | 100% |
| **Cobertura ao final** | % exibido no app para raio 500m | ≥30% em 5 dias |
| **Bateria por hora** | Nível antes/depois de 1h de uso ativo | <15%/hora |
| **Total edifícios em 5 dias** | Soma de cadastros + qualificações de seed | ≥50 |

---

## 5. Questionário de Validação (Dia 5)

### Pergunta Principal (binária)

> **"Se eu tirasse o app agora e devolvesse a planilha que você usava antes, sentiria falta?"**

- [ ] SIM
- [ ] NÃO

### Perguntas de Detalhe

| # | Pergunta | Tipo |
|---|---------|------|
| Q1 | O mapa com edifícios pré-carregados (seed data) ajudou? | Escala 1-5 |
| Q2 | O cadastro foi rápido o suficiente para usar enquanto caminha? | Escala 1-5 |
| Q3 | Os filtros por status (cores) foram úteis para saber onde já foi? | Escala 1-5 |
| Q4 | O modo offline funcionou quando precisou? | Escala 1-5 |
| Q5 | O que mais faltou que te faria usar o app mais? | Texto livre |
| Q6 | O que te incomodou ou confundiu no app? | Texto livre |
| Q7 | Em uma escala de 0-10, recomendaria este app para um colega da RE/MAX? | NPS (0-10) |

---

## 6. Critérios de Aprovação

### PASS — Epic 2 inicia

Todos os critérios abaixo devem ser atendidos:

- [ ] Pergunta principal = **SIM**
- [ ] NPS ≥ 7
- [ ] ≥50 edifícios registrados/qualificados em 5 dias
- [ ] Tempo médio de cadastro ≤30s
- [ ] 100% de sync offline bem-sucedido
- [ ] Nenhum bug crítico (perda de dados, crash) reportado

### CONDITIONAL PASS — Fix + Re-test 2 dias

- Pergunta principal = SIM, **mas** NPS 5-6
- OU ≥50 edifícios mas com feedback de atrito significativo
- **Ação:** Corrigir issues reportados, re-testar dias 4-5

### FAIL — Retrospectiva + Potencial Redesign

- Pergunta principal = **NÃO**
- OU NPS < 5
- OU <20 edifícios em 5 dias (indica que app não foi usado)
- **Ação:** Retrospectiva com Luciana para identificar root cause. Potencial redesign de UX.

---

## 7. Gate Decision

| Resultado | Próximo Passo |
|-----------|--------------|
| **PASS** | @sm drafta stories Epic 2, @dev inicia implementação |
| **CONDITIONAL** | @dev corrige issues, @qa re-testa em 2 dias, depois reavalia |
| **FAIL** | @pm + @ux + Luciana fazem retrospectiva. Identificar se é UX, performance ou conceito. Redesign se necessário |

---

## 8. Registro de Resultados

*(Preencher após o teste)*

| Dia | Edifícios | Tempo Médio | Issues | Observações |
|-----|-----------|-------------|--------|-------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Pergunta principal:** ___
**NPS:** ___
**Decisão:** PASS / CONDITIONAL / FAIL

---

*Field Test Protocol v1.0 — Quinn (QA) — AIOX*
