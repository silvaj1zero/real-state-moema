# Guia do Usuário — Sistema de Domínio Territorial RE/MAX
## Versão 1.0 — Epic 1: Mapeamento e Registro de Campo

**Para:** Consultores RE/MAX
**Nível:** Iniciante — nenhum conhecimento técnico necessário
**Data:** 2026-03-18

---

## Bem-vinda ao seu novo cockpit de campo

Este app foi construído para você — consultora RE/MAX que caminha pelo bairro, conversa com zeladores, e domina cada rua da sua região. Tudo o que você faz hoje com planilha, papel e memória agora está no seu celular.

**O que o app faz na versão 1.0:**
- Mostra o mapa da sua região com edifícios pré-carregados
- Permite cadastrar e qualificar prédios enquanto caminha
- Funciona sem internet (subsolo, garagem, elevador)
- Mostra seu progresso de domínio territorial

---

## 1. Primeiros Passos

### Instalando o App

1. Abra o link do sistema no navegador do celular (Chrome recomendado)
2. Faça login com seu email e senha
3. Quando aparecer **"Adicionar à tela inicial"**, toque em **Sim**
4. O app aparecerá no seu celular como qualquer outro aplicativo
5. Pronto — pode usar mesmo sem internet depois do primeiro acesso

### Configurando seu Epicentro

Na primeira vez que abrir o app:

1. O mapa aparecerá centrado na **Rua Alvorada** (padrão)
2. Se seu epicentro for diferente, **pressione e segure** no ponto desejado
3. Confirme: "Definir como meu epicentro?"
4. O sistema carregará automaticamente os edifícios da região (aguarde ~30 segundos)

**Os 3 círculos no mapa:**
- **Verde (500m)** — Seu raio inicial de domínio
- **Amarelo (1km)** — Próxima zona (desbloqueada quando 80% do verde estiver mapeado)
- **Vermelho (2km)** — Zona futura

---

## 2. O Mapa — Sua Tela Principal

### Entendendo os Pins

Cada edifício aparece como um pin colorido no mapa:

| Cor do Pin | Significado | Quando usar |
|-----------|------------|-------------|
| Cinza | **Não Visitado** — edifício identificado mas não qualificado | Pins automáticos (pré-carregados) |
| Azul | **Mapeado** — você visitou e registrou informações básicas | Após primeira visita ao prédio |
| Amarelo | **Em Prospecção** — existe oportunidade de negócio ali | Quando identificou FISBO ou lead potencial |
| Verde | **Concluído** — prédio totalmente mapeado e trabalhado | Quando esgotou as oportunidades daquele prédio |

### Navegando pelo Mapa

- **Arrastar** — Mover o mapa
- **Pinçar** — Zoom in/out
- **Tocar em pin** — Abrir card do edifício
- **Botão de localização (canto inferior)** — Centralizar na sua posição
- **Toggle de raios (canto superior)** — Mostrar/esconder os círculos

### O que significam os números no topo

```
Raio 500m: 45% mapeado | 23 de 51 edifícios
```

Isso mostra seu progresso de domínio territorial. Quando chegar a 80%, o próximo raio desbloqueia automaticamente.

---

## 3. Cadastrando um Edifício em Campo

### Cadastro Rápido (menos de 30 segundos)

1. Toque no botão **"+"** (canto inferior direito do mapa)
2. O GPS preenche automaticamente sua localização e sugere o endereço
3. Digite o **nome do edifício** (ex: "Ed. Maracatins 400")
4. Opcionalmente, selecione:
   - **Tipologia:** Studio / 1-2 dorms / 3+ dorms / Comercial
   - **Padrão:** Econômico / Médio / Alto Padrão / Luxo
5. Toque **Salvar**
6. O pin aparece imediatamente no mapa (azul = Mapeado)

### Dica de campo
> Ao caminhar, cadastre apenas **nome + endereço** (GPS automático). Volte depois para qualificar com mais detalhes. Velocidade > perfeição no primeiro registro.

---

## 4. Qualificando um Edifício

### Abrindo o Card do Edifício

Toque em qualquer pin no mapa. O card aparece na parte inferior da tela:

```
┌─────────────────────────────────┐
│ Ed. Maracatins 400              │
│ Al. dos Maracatins, 400 - Moema │
│ Alto Padrão | 3+ dorms          │
│                                 │
│ Status: Mapeado (Azul)     ▼   │
│ Abertura: Zelador amigável ▼   │
│                                 │
│ Oportunidades: 2 placas | 0 online │
│                                 │
│ Notas: ________________________ │
│                                 │
│ [Editar]            [+ Lead]    │
└─────────────────────────────────┘
```

### Campos de Qualificação

| Campo | O que registrar | Por que importa |
|-------|----------------|-----------------|
| **Padrão** | Econômico / Médio / Alto / Luxo | Define o perfil de cliente |
| **Tipologia** | Studio / 1-2 / 3+ / Comercial | Ajuda a cruzar com demanda |
| **Abertura a Corretores** | Zelador amigável / Rígido / Exige autorização | Estratégia de abordagem |
| **Oportunidades** | Quantas placas "Vende-se" + anúncios online | Identifica FISBOs |
| **Notas** | Observações livres | Contexto para próxima visita |

### Alterando o Status

No card do edifício, toque no campo **Status** e selecione:
- **Não Visitado** → Mapeado → Em Prospecção → Concluído

O pin muda de cor automaticamente no mapa.

---

## 5. Edifícios Pré-Carregados (Seed Data)

### O que são os pins cinza que já estão no mapa?

Quando você configurou seu epicentro, o sistema carregou automaticamente edifícios da região usando dados públicos. Eles aparecem como **pins cinza** ("Não Visitado").

### Como diferenciar

- **Pin cinza com badge "auto"** — Pré-carregado pelo sistema. Dados básicos (nome, endereço)
- **Pin azul com badge "verificado"** — Você visitou e confirmou/editou as informações

### O que fazer com eles

Ao visitar um edifício pré-carregado:
1. Toque no pin cinza
2. **Confirme** se os dados estão corretos (nome, endereço)
3. **Edite** o que estiver errado
4. **Adicione** qualificação (padrão, tipologia, abertura)
5. Mude o status para **Mapeado** (azul)

Se um edifício pré-carregado **não existe** (demolido, terreno vazio), toque em **Descartar**.

---

## 6. Usando Offline (Sem Internet)

### Quando funciona offline

O app funciona sem internet para:
- Navegar pelo mapa (na área já carregada)
- Cadastrar novos edifícios
- Qualificar edifícios existentes
- Alterar status

### Como saber se está offline

Um indicador **"Offline"** aparece no topo do app quando não há conexão.

### O que acontece com os dados

1. Seus cadastros e edições são salvos localmente no celular
2. Edifícios registrados offline mostram um badge **"pendente sync"**
3. Quando o celular reconectar ao Wi-Fi ou 4G, os dados sincronizam automaticamente
4. O badge "pendente sync" desaparece

### Dica de campo
> Antes de sair para campo, abra o app no Wi-Fi do escritório. Isso garante que os mapas da região estão carregados para navegação offline.

---

## 7. Filtros e Visualização

### Filtrando edifícios no mapa

Toque no ícone de **filtro** (canto superior do mapa):

- **Por status:** Mostrar apenas "Não Visitado" (para saber onde ir)
- **Por status:** Mostrar apenas "Em Prospecção" (para ver oportunidades ativas)

### Legenda

A legenda no canto do mapa mostra a contagem por status:
```
● Cinza: 28 Não Visitados
● Azul: 15 Mapeados
● Amarelo: 5 Em Prospecção
● Verde: 3 Concluídos
```

### Zoom e Clusters

Ao dar zoom out, os pins se agrupam automaticamente em clusters com números:
```
[12] — Significa 12 edifícios naquela área
```
Dê zoom in para ver os pins individuais.

---

## 8. Sua Rotina com o App

### Rotina Sugerida — Primeira Semana

| Dia | Ação | Meta |
|-----|------|------|
| Segunda | Instalar app, configurar epicentro, explorar mapa pré-carregado | App funcionando |
| Terça | Caminhada de 1h pelo raio de 500m — qualificar edifícios pré-carregados | 15+ prédios qualificados |
| Quarta | Continuar caminhada — focar em "Não Visitados" restantes | 30+ prédios qualificados |
| Quinta | Testar offline: entre em garagem/subsolo e cadastre um prédio | Confirmar que funciona |
| Sexta | Revisar mapa no escritório — ver progresso, anotar patterns | "O app é melhor que planilha?" |

### Indicadores de Sucesso

Você está usando o app corretamente quando:
- O mapa tem mais pins azuis/amarelos/verdes do que cinzas
- A % de cobertura do raio sobe toda semana
- Você prefere abrir o app a abrir a planilha
- Os campos de qualificação ajudam a lembrar detalhes dos prédios

---

## 9. O que Vem Depois (Prévia)

A versão 1.0 é sobre **mapear o território**. As próximas versões adicionam:

### Versão 2.0 — Prospecção com Método
- Cadastro de leads (proprietários FISBO)
- Funil V1→V2→Exclusividade→Venda
- Scripts de objeção acessíveis no app
- Gestão de zeladores/informantes
- Dashboard de KPIs

### Versão 3.0 — Inteligência Automática
- O app detecta FISBOs em portais automaticamente
- ACM gerada com dados reais da região
- Dossiê PDF profissional para a V2
- Feed matinal: "Bom dia — 3 novos FISBOs no seu raio"

### Versão 4.0 — Rede de Parcerias
- Indicações cruzadas entre consultores RE/MAX
- Tracking de comissões e progressão nos Clubes
- Outros consultores da Galeria no sistema

---

## 10. Perguntas Frequentes

**O app funciona no iPhone?**
Sim. PWA funciona em Chrome (Android) e Safari (iOS). No iPhone, abra no Safari e toque em "Compartilhar → Adicionar à Tela Inicial".

**Preciso de internet para usar?**
Apenas para o primeiro acesso e para sincronizar dados. O cadastro e navegação pelo mapa funcionam offline.

**E se eu cadastrar um edifício errado?**
Toque no pin → Editar → Corrija os dados. Você também pode descartar edifícios pré-carregados que não existem.

**Outras pessoas veem meus dados?**
Não. Na versão 1.0, seus dados são privados. Em versões futuras, edifícios base serão compartilhados, mas qualificações (suas notas, status) serão sempre privadas.

**O app substitui o Captei?**
Não nesta versão. A versão 4.0 terá integração com Captei para importar contatos. Até lá, use ambos.

**E se o mapa pré-carregado tiver edifícios errados?**
Normal — dados públicos podem estar desatualizados. Toque no pin e escolha "Descartar" ou edite as informações. Seus dados verificados sempre têm prioridade.

---

## 11. Glossário

| Termo | Significado |
|-------|------------|
| **Epicentro** | Ponto central da sua operação no mapa (padrão: Rua Alvorada) |
| **Raio** | Círculo concêntrico ao redor do epicentro (500m, 1km, 2km) |
| **Seed Data** | Edifícios pré-carregados automaticamente pelo sistema |
| **Pin** | Marcador de edifício no mapa (cores indicam status) |
| **Cobertura** | Percentual de edifícios qualificados vs. total no raio |
| **Cluster** | Agrupamento de pins quando o mapa está com zoom distante |
| **Sync** | Sincronização de dados offline quando a internet volta |
| **FISBO** | For Sale By Owner — proprietário vendendo direto, sem imobiliária |
| **V1** | Visita de Relacionamento — primeiro contato presencial |
| **V2** | Apresentação Técnica — reunião com ACM e proposta de exclusividade |
| **ACM** | Análise Comparativa de Mercado — preços reais da região |
| **FROG** | Família, Relacionamentos, Organizações, Geografia — fontes de leads |
| **PWA** | Progressive Web App — app que funciona no navegador como se fosse nativo |

---

## Suporte

**Problemas técnicos?** Entre em contato com a equipe de desenvolvimento.

**Sugestões de melhoria?** Anote e compartilhe no próximo alinhamento — seu feedback molda as versões futuras.

---

*Guia do Usuário v1.0 — Sistema de Domínio Territorial RE/MAX*
*"Consistência no método, não esforço desordenado."*
