/**
 * FASE 2 — Re-verificação na web dos comparáveis/ofertas do ACM Rua Honduras, 629.
 *
 * Workflow multi-agente (rodar DEPOIS, quando o usuário acionar). Para cada item:
 *   1. Busca na web um anúncio atual correspondente ao endereço (portais BR).
 *   2. Confirma URL, preço pedido atual e status (ativo / vendido / fora do ar).
 *   3. Verifica adversarialmente se o anúncio é REALMENTE do mesmo imóvel.
 * Retorna um array estruturado que a sessão usa para gerar o xlsx re-verificado
 * (docs/acm/honduras-629/ACM-Honduras629-REVERIFICADO-<data>.xlsx).
 *
 * Como rodar (na sessão Claude Code, com opt-in de workflow):
 *   Workflow({ scriptPath: 'app/scripts/acm-honduras/reverify-web.workflow.mjs' })
 *
 * ATENÇÃO: este arquivo NÃO é Node executável — `phase()`/`agent()`/`pipeline()`
 * são hooks injetados pelo runtime de Workflow do Claude Code. `node <arquivo>`
 * falha com ReferenceError; use exclusivamente a chamada Workflow acima.
 *
 * NÃO inventa dados: se nada for achado, retorna {found:false} (Art. IV).
 */
export const meta = {
  name: 'acm-honduras-reverify-web',
  description: 'Re-verifica na web os comparáveis/ofertas do ACM Honduras 629 (URL, preço, status)',
  whenToUse: 'Fase 2 da validação ACM Honduras 629 — reconferir anúncios na internet após o corretor validar a Fase 1.',
  phases: [
    { title: 'Buscar', detail: 'um agente por item: acha anúncio web do endereço' },
    { title: 'Verificar', detail: 'confirma adversarialmente que o anúncio é do mesmo imóvel' },
    { title: 'Síntese', detail: 'consolida diffs vs laudo' },
  ],
}

// Itens a re-verificar (endereço + dica de portal do laudo). Mantido em sincronia
// com honduras-dataset.mjs — workflow scripts não acessam filesystem, por isso a
// lista é embutida. Prioriza Top 5 e ofertas (que têm anúncio); ITBI off-market
// raramente tem anúncio indexável, mas tenta-se mesmo assim.
const ITENS = [
  { tipo: 'comparavel', end: 'R. Maestro Chiaffarelli, 86', bairro: 'Jardim América', laudoFonte: 'ITBImap/off-market', laudoPreco: 6_500_000 },
  { tipo: 'comparavel', end: 'R. Marechal Bitencourt, 101', bairro: 'Jardim América', laudoFonte: 'Esquema Imóveis ref. 6254', laudoPreco: 17_000_000, laudoPedido: 19_990_000 },
  { tipo: 'comparavel', end: 'R. Cons. Torres Homem, 399', bairro: 'Jardim América', laudoFonte: 'Chaves na Mão id 33434912', laudoPreco: 7_700_000, laudoPedido: 8_600_000 },
  { tipo: 'comparavel', end: 'R. Henrique Martins', bairro: 'Jardim América', laudoFonte: 'Chaves na Mão (listagem da rua)', laudoPreco: 19_700_000 },
  { tipo: 'comparavel', end: 'R. Canadá, 111', bairro: 'Jardim América', laudoFonte: 'VivaReal (listagem da rua)', laudoPreco: 9_260_000 },
  { tipo: 'oferta', end: 'Rua Argentina, 685', bairro: 'Jardim América', laudoFonte: 'Anúncio georref.', laudoPedido: 26_000_000 },
  { tipo: 'oferta', end: 'Rua Estados Unidos, 691', bairro: 'Jardim América', laudoFonte: 'Anúncio georref.', laudoPedido: 14_000_000 },
  { tipo: 'oferta', end: 'Rua Veneza, 722', bairro: 'Jardim América', laudoFonte: 'Anúncio georref.', laudoPedido: 9_800_000 },
  { tipo: 'oferta', end: 'Rua Veneza, 731', bairro: 'Jardim América', laudoFonte: 'Anúncio georref.', laudoPedido: 7_341_000 },
  { tipo: 'oferta', end: 'Rua Suécia, 526', bairro: 'Jardim Europa', laudoFonte: 'Anúncio', laudoPedido: 9_795_000 },
]

const ACHADO_SCHEMA = {
  type: 'object',
  required: ['found', 'endereco'],
  properties: {
    endereco: { type: 'string' },
    found: { type: 'boolean', description: 'true se achou anúncio atual correspondente' },
    url: { type: 'string', description: 'URL completa do anúncio (vazio se não achou)' },
    portal: { type: 'string', description: 'ZAP, VivaReal, Chaves na Mão, etc.' },
    precoPedidoAtual: { type: ['number', 'null'], description: 'preço pedido atual em R$, ou null' },
    status: { type: 'string', enum: ['ativo', 'vendido', 'fora_do_ar', 'nao_encontrado'] },
    // Programa do anúncio — confirma/corrige o S/V/D do laudo (origem secundária).
    dormitorios: { type: ['number', 'null'], description: 'total de quartos no anúncio (inclui suítes), ou null' },
    suites: { type: ['number', 'null'], description: 'suítes no anúncio, ou null' },
    vagas: { type: ['number', 'null'], description: 'vagas de garagem no anúncio, ou null' },
    evidencia: { type: 'string', description: 'trecho/observação que sustenta o match' },
  },
}

const VEREDITO_SCHEMA = {
  type: 'object',
  required: ['endereco', 'confirmado'],
  properties: {
    endereco: { type: 'string' },
    confirmado: { type: 'boolean', description: 'o anúncio é mesmo deste endereço/imóvel?' },
    motivo: { type: 'string' },
  },
}

phase('Buscar')
const resultados = await pipeline(
  ITENS,
  (item) =>
    agent(
      `Você é um pesquisador imobiliário. Busque na web um anúncio ATUAL do imóvel:\n` +
        `Endereço: ${item.end}, ${item.bairro}, São Paulo/SP.\n` +
        `Dica do laudo (jun/2026): ${item.laudoFonte}.\n` +
        `Use WebSearch/WebFetch em portais BR (ZAP, VivaReal, Chaves na Mão, OLX, Esquema Imóveis, QuintoAndar, imobiliárias de luxo dos Jardins).\n` +
        `Retorne a URL completa, o portal, o preço pedido atual (R$), o status E o programa do anúncio (dormitórios — total, inclui suítes; suítes; vagas) para confirmar/corrigir o laudo. Se não achar nada correspondente, found=false e status="nao_encontrado". NÃO invente URLs, preços nem programa.`,
      { label: `buscar:${item.end}`, phase: 'Buscar', schema: ACHADO_SCHEMA },
    ).then((r) => ({ item, achado: r })),
  // Verifica só quando alegou ter achado.
  async (prev) => {
    if (!prev || !prev.achado?.found || !prev.achado?.url) return prev
    const v = await agent(
      `Verifique adversarialmente se este anúncio é REALMENTE do imóvel da ${prev.item.end}, ${prev.item.bairro}, São Paulo.\n` +
        `URL alegada: ${prev.achado.url} (${prev.achado.portal}).\n` +
        `Abra a URL (WebFetch) e confira rua/número/bairro/características. Na dúvida, confirmado=false.`,
      { label: `verificar:${prev.item.end}`, phase: 'Verificar', schema: VEREDITO_SCHEMA },
    )
    return { ...prev, veredito: v }
  },
)

phase('Síntese')
const limpos = resultados.filter(Boolean).map((r) => {
  const confirmado = r.achado?.found && (!r.veredito || r.veredito.confirmado)
  const delta =
    r.achado?.precoPedidoAtual != null && r.item.laudoPedido
      ? Math.round(((r.achado.precoPedidoAtual - r.item.laudoPedido) / r.item.laudoPedido) * 1000) / 10
      : null
  return {
    endereco: r.item.end,
    tipo: r.item.tipo,
    confirmado: !!confirmado,
    url: confirmado ? r.achado.url : null,
    portal: confirmado ? r.achado.portal : null,
    status: r.achado?.status ?? 'nao_encontrado',
    precoLaudo: r.item.laudoPedido ?? r.item.laudoPreco ?? null,
    precoAtual: confirmado ? r.achado.precoPedidoAtual ?? null : null,
    deltaPercent: confirmado ? delta : null,
    // Programa confirmado no anúncio (corrige o S/V/D secundário do laudo).
    programaAnuncio: confirmado
      ? { dormitorios: r.achado.dormitorios ?? null, suites: r.achado.suites ?? null, vagas: r.achado.vagas ?? null }
      : null,
    evidencia: r.achado?.evidencia ?? null,
    motivoRejeicao: r.achado?.found && r.veredito && !r.veredito.confirmado ? r.veredito.motivo : null,
  }
})

log(`Re-verificação concluída: ${limpos.filter((x) => x.confirmado).length}/${limpos.length} anúncios confirmados.`)
return limpos
