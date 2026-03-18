# Test Plan — Epic 1: Foundation, Mapa & Registro de Campo

**Versão:** 1.0
**Data:** 2026-03-18
**QA:** Quinn (AIOX)
**Stories cobertas:** 1.1 a 1.7

---

## 1. Definition of Done (DoD) — Epic 1

O Epic 1 está DONE quando TODOS os critérios abaixo forem atendidos:

- [ ] Todas as 7 stories passam seus Acceptance Criteria
- [ ] Testes automatizados passam (unit + integration + E2E)
- [ ] PWA instalável e funcional em Android (Chrome) e iOS (Safari)
- [ ] Modo offline funciona: cadastro + sync automático ao reconectar
- [ ] Seed data carrega edifícios para a região de Moema via Overpass API
- [ ] Performance: cadastro <30s, map load <3s, pins sem jank com 500+
- [ ] Deploy funcional na Vercel acessível via URL
- [ ] Protocolo de teste de campo aprovado (ver `epic1-field-test-protocol.md`)

---

## 2. Test Matrix por Story

### Story 1.1: Setup do Projeto e Infraestrutura Base

| Tipo | Cenário | Resultado Esperado | Prioridade |
|------|---------|-------------------|------------|
| Integration | Conexão Supabase Auth — login com email/senha | Login sucesso, session token retornado | Critical |
| Integration | PostGIS habilitado — `SELECT PostGIS_Version()` | Retorna versão sem erro | Critical |
| E2E | Acessar URL no mobile → tela de login renderiza | Layout responsivo, campos visíveis | High |
| E2E | Instalar PWA via "Adicionar à tela inicial" | App abre standalone com ícone RE/MAX | High |
| Manual | Verificar CI/CD — push no GitHub → deploy Vercel | Preview deploy funcional | Medium |

### Story 1.2: Mapa Interativo com Epicentro e Raios

| Tipo | Cenário | Resultado Esperado | Prioridade |
|------|---------|-------------------|------------|
| Unit | Calcular círculos concêntricos (500m, 1km, 2km) | 3 círculos com raios corretos em metros | High |
| E2E | Mapa carrega centrado na Rua Alvorada | Centro em -23.6008, -46.6658 ± 100m | Critical |
| E2E | 3 raios visíveis com cores corretas | Verde 500m, amarelo 1km, vermelho 2km | High |
| E2E | Toggle raios on/off | Círculos aparecem/desaparecem sem recarregar mapa | Medium |
| E2E | GPS ativo — pin "Você está aqui" | Pin azul na posição real do dispositivo | High |
| Manual | Long press no mapa → reposicionar epicentro | Epicentro move, raios recentram | Medium |
| Edge case | GPS desabilitado no dispositivo | Mensagem pedindo permissão, mapa funciona sem GPS | Medium |

### Story 1.3: Cadastro Rápido de Edifícios

| Tipo | Cenário | Resultado Esperado | Prioridade |
|------|---------|-------------------|------------|
| Unit | Reverse geocoding retorna endereço para coordenadas de Moema | Endereço com rua + número | High |
| E2E | Tap "+" → formulário abre → GPS preenche → digitar nome → salvar | Pin aparece no mapa em <30s total | Critical |
| E2E | Salvar com campos opcionais (tipologia, padrão) | Dados salvos corretamente no Supabase | High |
| Integration | Dados persistem em `edificios` + `edificios_qualificacoes` | 2 registros com FK correto | Critical |
| Edge case | Cadastrar no mesmo ponto que edifício existente (<30m) | Alerta "Edifício próximo já cadastrado" | Medium |
| Edge case | GPS com baixa precisão (>100m) | Warning visual, permite salvar com flag | Low |

### Story 1.4: Qualificação e Card do Edifício

| Tipo | Cenário | Resultado Esperado | Prioridade |
|------|---------|-------------------|------------|
| E2E | Tap em pin → bottom sheet abre com dados | Nome, endereço, padrão, tipologia visíveis | Critical |
| E2E | Editar "Abertura a Corretores" → salvar | Valor atualizado no banco e no card | High |
| E2E | Adicionar nota livre → salvar | Texto persistido, visível ao reabrir | Medium |
| E2E | Swipe-up no bottom sheet → expande | 3 snap points funcionam (peek, half, full) | Medium |
| Edge case | Card de edifício sem qualificação (seed data) | Campos vazios/placeholder editáveis | High |

### Story 1.5: Status de Varredura e Cores

| Tipo | Cenário | Resultado Esperado | Prioridade |
|------|---------|-------------------|------------|
| Unit | Mapeamento status → cor: Não Visitado=cinza, Mapeado=azul, Em Prospecção=amarelo, Concluído=verde | 4 cores corretas | High |
| E2E | Alterar status via card → pin muda de cor | Cor atualiza sem recarregar mapa | Critical |
| E2E | Filtro "Mostrar apenas Não Visitado" | Apenas pins cinza visíveis | High |
| E2E | Legenda no mapa com contagem | "Não Visitado: 45 | Mapeado: 12 | ..." | Medium |
| E2E | Zoom-out com 500+ pins → clustering | Clusters com número, sem sobreposição | High |
| E2E | % cobertura no topo do mapa | "Raio 500m: 42% mapeado" atualizado | High |

### Story 1.6: Suporte Offline

| Tipo | Cenário | Resultado Esperado | Prioridade |
|------|---------|-------------------|------------|
| E2E | Desabilitar rede → cadastrar edifício | Salva em IndexedDB, indicador "pendente sync" | Critical |
| E2E | Reabilitar rede → sync automático | Edifício aparece no Supabase, indicador some | Critical |
| E2E | Navegar mapa offline (área pré-cacheada) | Tiles renderizam na região do epicentro | High |
| E2E | Indicador "Offline" na barra do app | Aparece sem rede, some ao reconectar | High |
| Edge case | 20 edifícios cadastrados offline → sync em batch | Todos sincronizam em <10s | High |
| Edge case | Cadastrar offline → fechar app → reabrir offline | Dados persistem no IndexedDB | Critical |
| Edge case | Conflito: mesmo edifício editado online e offline | Last-write-wins sem crash | Medium |

### Story 1.7: Seed Data

| Tipo | Cenário | Resultado Esperado | Prioridade |
|------|---------|-------------------|------------|
| Integration | Configurar epicentro → Overpass API retorna edifícios | 500+ edifícios no raio 500m (verificado: 1.380) | Critical |
| E2E | Seed data executa → pins cinza aparecem no mapa | Edifícios pré-carregados visíveis | Critical |
| E2E | Badge "auto" vs "verificado" nos pins/cards | Distinção visual clara | High |
| E2E | Editar edifício seed → badge muda para "verificado" | Status atualiza ao salvar qualificação | High |
| E2E | Re-executar seed sob demanda | Novos edifícios adicionados, existentes preservados | Medium |
| Edge case | Overpass API indisponível durante seed | Mensagem de erro + opção retry | High |
| Edge case | Seed em área com poucos edifícios OSM | Funciona com 0 resultados, mapa vazio mas funcional | Medium |

---

## 3. E2E Test Scenarios (Playwright)

```typescript
// Cenários prioritários para automação

test('Login e carregamento do mapa', async ({ page }) => {
  // Login → Map loads → Raios visíveis → Seed pins presentes
});

test('Cadastro rápido de edifício', async ({ page }) => {
  // Tap + → GPS mock → Nome → Salvar → Pin aparece no mapa
});

test('Qualificação via card', async ({ page }) => {
  // Tap pin → Card abre → Editar padrão → Salvar → Reabrir → Valor persistido
});

test('Filtro por status de varredura', async ({ page }) => {
  // Criar 3 edifícios com status diferentes → Filtrar → Contagem correta
});

test('Modo offline com sync', async ({ page, context }) => {
  // Desabilitar rede → Cadastrar → Indicador offline → Reabilitar → Sync → Pin no servidor
});

test('Seed data carrega edifícios', async ({ page }) => {
  // Configurar epicentro Moema → Aguardar seed → 100+ pins cinza no mapa
});

test('Clustering em zoom-out', async ({ page }) => {
  // Com 500+ pins → Zoom out → Clusters com contagem → Zoom in → Pins individuais
});
```

---

## 4. Performance Benchmarks

| Métrica | Target | Método de Medição |
|---------|--------|------------------|
| Map initial load (4G) | <3s | Lighthouse Performance, campo "Time to Interactive" |
| Cadastro completo (3 taps + nome) | <30s | Timer no E2E test, medição manual em campo |
| Pin rendering 1000+ edifícios | <16ms/frame (60fps) | Chrome DevTools Performance, sem dropped frames |
| Clustering transition (zoom) | <200ms | Medição visual, sem "piscar" de pins |
| Offline tile cache size | <60MB | navigator.storage.estimate() após cache |
| Sync de 20 edifícios pendentes | <10s | Timer no E2E test com network throttle |
| Service Worker activation | <2s | SW registration timestamp vs. ready |
| Seed data load (500m, ~1.380 edifícios) | <15s | Timer: epicentro configurado → pins renderizados |

---

## 5. Device Testing Matrix

| Dispositivo | Browser | Prioridade | Notas |
|------------|---------|-----------|-------|
| Android 10+ (mid-range, ex: Samsung A54) | Chrome 120+ | **Primary** | Uso principal em campo |
| iOS 15+ (iPhone 12+) | Safari 15+ | **Primary** | Segundo device mais provável |
| Desktop | Chrome 120+ | Secondary | Uso no escritório |
| Tablet (iPad) | Safari | Low | Opcional, responsivo |

**Critério mínimo:** Funciona sem bugs críticos em Android Chrome + iOS Safari.

---

*Test Plan v1.0 — Quinn (QA) — AIOX*
