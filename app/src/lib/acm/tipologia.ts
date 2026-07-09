/**
 * Regra R5 — tipologia casa×apto por guia oficial (Story 9.17).
 *
 * Canoniza a lógica que vivia nos scripts Andrade Pertence
 * (`10-backfill-tipologia.mjs` + filtro em `04-build-dataset.mjs`).
 *
 * Prioridade de evidência (Art. IV — sem inventar tipo sem fonte):
 *   1. Guia oficial: Uso IPTU / Descrição do padrão / Complemento
 *   2. Override visual declarativo (VERIFICACAO_VISUAL — SQL → fato verificado)
 *   3. Heurística de lote no SQL (só sem guia; sempre confiança baixa + Fase 1)
 *
 * Gate de pipeline: `filtrarComparaveisPorR5` exclui incompatíveis quando o
 * laudo declara `propertyType` do alvo. Sem `propertyType` o gate é inerte
 * (regressão Honduras preservada).
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TipologiaTipo = 'casa' | 'apartamento' | 'terreno' | 'indefinido'
export type TipologiaConfianca = 'alta' | 'media' | 'baixa'
export type TipologiaFonte = 'guia' | 'heuristica' | 'visual' | 'ausente'

/** Campos da guia oficial relevantes para R5 (contrato 9.4 ampliado). */
export interface GuiaTipologiaFields {
  usoIptu?: string | null
  padraoIptu?: string | null
  complemento?: string | null
  areaTerrenoGuia?: number | null
  areaConstruidaGuia?: number | null
  fracaoIdeal?: number | null
  testadaM?: number | null
  anoConstrucaoIptu?: number | null
}

/**
 * Registro de entrada para classificação. Aceita campos flat (pós-9.4) ou
 * aninhados em `guia` (backfill offline). `sqlCadastral` habilita a heurística
 * de lote quando a guia está ausente.
 */
export interface RegistroTipologia {
  endereco?: string | null
  sqlCadastral?: string | null
  guia?: GuiaTipologiaFields | null
  /** Flat (sink 9.4) — mesma semântica da guia. */
  usoIptu?: string | null
  padraoIptu?: string | null
  complemento?: string | null
  /**
   * Classificação pré-existente (dataset já enriquecido). Aceita rótulos legados
   * do backfill: "casa", "casa (provável)", "apartamento", "apartamento (provável)".
   */
  tipologiaPrevia?: string | null
  tipologiaFontePrevia?: TipologiaFonte | null
}

export interface TipologiaClassificacao {
  tipo: TipologiaTipo
  confianca: TipologiaConfianca
  fonte: TipologiaFonte
  motivos: string[]
  /** Rótulo legado compatível com scripts/planilha ("casa (provável)", …). */
  rotulo: string
}

/** Override visual versionado no dataset (AC5) — chave = SQL digits sem DV opcional. */
export interface VerificacaoVisualOverride {
  /** `reclassificar` força o tipo; `excluir` remove do pool independentemente. */
  acao: 'reclassificar' | 'excluir'
  tipo?: TipologiaTipo
  motivo: string
}

export type VerificacaoVisualMap = Record<string, VerificacaoVisualOverride>

export interface ExcluidoTipologia {
  endereco: string
  sqlCadastral: string | null
  classificacao: TipologiaClassificacao
  motivo: string
}

export interface RelatorioR5 {
  aplicado: boolean
  propertyType: TipologiaTipo | null
  nEntrada: number
  nAceitos: number
  nExcluidos: number
  nHeuristica: number
  nIndefinido: number
  /** Uma linha para Sec. 4 / Leia-me (AC7). */
  regraUmaLinha: string
}

export interface GateR5Result<T> {
  aceitos: T[]
  excluidos: ExcluidoTipologia[]
  relatorio: RelatorioR5
  /** Classificação por endereço (aceitos + excluídos). */
  porEndereco: Map<string, TipologiaClassificacao>
}

/** Texto canônico da Regra R5 (PDF Sec. 4 / planilha Leia-me). */
export const R5_REGRA_UMA_LINHA =
  'R5 Tipologia — Uso/padrão IPTU e Complemento da guia oficial (SF/PMSP) por SQL: só mesma tipologia do alvo; sem guia pública = heurística de lote declarada + conferência humana (Fase 1).'

/**
 * Overrides declarativos do caso Andrade Pertence 132 (Street View dez/2024).
 * Fatos verificados pelo operador — não inventados (Art. IV).
 */
export const VERIFICACAO_VISUAL_ANDRADE_PERTENCE_132: VerificacaoVisualMap = {
  '4117800485': {
    acao: 'reclassificar',
    tipo: 'apartamento',
    motivo: 'Street View dez/2024 — edifício confirmado (Av. Cotovia 726)',
  },
  '4115900611': {
    acao: 'reclassificar',
    tipo: 'apartamento',
    motivo: 'Street View dez/2024 — edifício confirmado (Av. Pavão 700)',
  },
}

/** Lote condominial típico (faixa alta no SQL PMSP) — referência do backfill R5. */
export const LOTE_CONDOMINIAL_MIN = 100

// ---------------------------------------------------------------------------
// Utilitários SQL
// ---------------------------------------------------------------------------

/** Normaliza SQL cadastral para dígitos sem zeros à esquerda. */
export function digitsSql(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/\D+/g, '')
    .replace(/^0+/, '')
}

/**
 * Lote do SQL (4 dígitos antes do DV). Faixa alta (≥100) = unidade condominial
 * típica — heurística documentada no incidente tipologia 09-Jul.
 */
export function loteDoSql(sqlDigits: string): number {
  const s = digitsSql(sqlDigits).padStart(11, '0')
  return Number(s.slice(6, 10))
}

// ---------------------------------------------------------------------------
// Classificação pura (AC2)
// ---------------------------------------------------------------------------

function rotuloDe(tipo: TipologiaTipo, confianca: TipologiaConfianca, usoBruto?: string | null): string {
  if (tipo === 'casa') return confianca === 'baixa' ? 'casa (provável)' : 'casa'
  if (tipo === 'apartamento') return confianca === 'baixa' ? 'apartamento (provável)' : 'apartamento'
  if (tipo === 'terreno') return 'terreno'
  if (usoBruto) return `outro (${usoBruto})`
  return 'indefinido'
}

/** Interpreta rótulo legado do backfill / dataset. */
export function parseRotuloTipologia(rotulo: string | null | undefined): TipologiaTipo | null {
  if (!rotulo) return null
  const r = rotulo.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (r.startsWith('casa')) return 'casa'
  if (r.startsWith('apartamento') || r.startsWith('apto') || r.includes('apartamento')) return 'apartamento'
  if (r.startsWith('terreno')) return 'terreno'
  if (r.startsWith('indefinido') || r.startsWith('sem sql') || r.startsWith('nao classificado')) return 'indefinido'
  if (r.startsWith('outro')) return 'indefinido'
  return null
}

function camposGuia(reg: RegistroTipologia): GuiaTipologiaFields {
  return {
    usoIptu: reg.guia?.usoIptu ?? reg.usoIptu ?? null,
    padraoIptu: reg.guia?.padraoIptu ?? reg.padraoIptu ?? null,
    complemento: reg.guia?.complemento ?? reg.complemento ?? null,
    areaTerrenoGuia: reg.guia?.areaTerrenoGuia ?? null,
    areaConstruidaGuia: reg.guia?.areaConstruidaGuia ?? null,
    fracaoIdeal: reg.guia?.fracaoIdeal ?? null,
    testadaM: reg.guia?.testadaM ?? null,
    anoConstrucaoIptu: reg.guia?.anoConstrucaoIptu ?? null,
  }
}

function temSinalGuia(g: GuiaTipologiaFields): boolean {
  return Boolean(
    (g.usoIptu && String(g.usoIptu).trim()) ||
      (g.padraoIptu && String(g.padraoIptu).trim()) ||
      (g.complemento && String(g.complemento).trim()),
  )
}

/**
 * Classifica tipologia a partir de guia / SQL / prévia (AC2).
 * Determinístico, puro, sem I/O.
 */
export function classificarTipologia(registro: RegistroTipologia): TipologiaClassificacao {
  const g = camposGuia(registro)
  const motivos: string[] = []

  // 1) Guia oficial (Uso / Padrão / Complemento)
  if (temSinalGuia(g)) {
    const uso = String(g.usoIptu ?? '').toUpperCase()
    const padrao = String(g.padraoIptu ?? '').toUpperCase()
    const complemento = String(g.complemento ?? '').toUpperCase()

    // Complemento "AP 82", "AP 31 E 2VG" — causa-raiz do incidente Andrade Pertence.
    if (/\bAP\b|\bAPT\b|\bAPTO\b|APART/.test(complemento)) {
      motivos.push(`Complemento da guia indica unidade vertical: "${g.complemento}"`)
      return {
        tipo: 'apartamento',
        confianca: 'alta',
        fonte: 'guia',
        motivos,
        rotulo: rotuloDe('apartamento', 'alta'),
      }
    }

    if (uso.includes('APARTAMENTO') || padrao.includes('VERTICAL')) {
      if (uso.includes('APARTAMENTO')) motivos.push(`Uso IPTU: ${g.usoIptu}`)
      if (padrao.includes('VERTICAL')) motivos.push(`Padrão: ${g.padraoIptu}`)
      return {
        tipo: 'apartamento',
        confianca: 'alta',
        fonte: 'guia',
        motivos,
        rotulo: rotuloDe('apartamento', 'alta'),
      }
    }

    if (uso.includes('TERRENO') || padrao.includes('TERRENO')) {
      motivos.push(`Uso/padrão indica terreno: ${g.usoIptu ?? g.padraoIptu}`)
      return {
        tipo: 'terreno',
        confianca: 'alta',
        fonte: 'guia',
        motivos,
        rotulo: rotuloDe('terreno', 'alta'),
      }
    }

    if (
      uso.includes('RESIDÊNCIA') ||
      uso.includes('RESIDENCIA') ||
      padrao.includes('HORIZONTAL')
    ) {
      if (uso.includes('RESID')) motivos.push(`Uso IPTU: ${g.usoIptu}`)
      if (padrao.includes('HORIZONTAL')) motivos.push(`Padrão: ${g.padraoIptu}`)
      return {
        tipo: 'casa',
        confianca: 'alta',
        fonte: 'guia',
        motivos,
        rotulo: rotuloDe('casa', 'alta'),
      }
    }

    // Guia presente mas uso não mapeado → indefinido com fonte guia (não chutar).
    motivos.push(`Guia presente sem mapeamento casa/apto: uso="${g.usoIptu ?? ''}" padrão="${g.padraoIptu ?? ''}"`)
    return {
      tipo: 'indefinido',
      confianca: 'media',
      fonte: 'guia',
      motivos,
      rotulo: rotuloDe('indefinido', 'media', g.usoIptu),
    }
  }

  // 2) Pré-classificação do dataset (já enriquecido offline)
  if (registro.tipologiaPrevia) {
    const tipo = parseRotuloTipologia(registro.tipologiaPrevia)
    if (tipo) {
      const fonte = registro.tipologiaFontePrevia ??
        (String(registro.tipologiaPrevia).includes('provável') ||
        String(registro.tipologiaPrevia).includes('provavel')
          ? 'heuristica'
          : 'guia')
      const confianca: TipologiaConfianca =
        fonte === 'heuristica' ? 'baixa' : fonte === 'visual' ? 'alta' : 'alta'
      motivos.push(`Pré-classificação do dataset: ${registro.tipologiaPrevia}`)
      return {
        tipo,
        confianca,
        fonte,
        motivos,
        rotulo: registro.tipologiaPrevia,
      }
    }
  }

  // 3) Heurística de lote (só sem guia) — sempre baixa + Fase 1
  const sql = digitsSql(registro.sqlCadastral)
  if (sql) {
    const lote = loteDoSql(sql)
    const tipo: TipologiaTipo = lote >= LOTE_CONDOMINIAL_MIN ? 'apartamento' : 'casa'
    motivos.push(
      `Heurística de lote SQL ${String(lote).padStart(4, '0')} (≥${LOTE_CONDOMINIAL_MIN}=condomínio) — guia pública indisponível; conferir Fase 1`,
    )
    return {
      tipo,
      confianca: 'baixa',
      fonte: 'heuristica',
      motivos,
      rotulo: rotuloDe(tipo, 'baixa'),
    }
  }

  motivos.push('Sem guia, sem SQL e sem pré-classificação — não classificável')
  return {
    tipo: 'indefinido',
    confianca: 'baixa',
    fonte: 'ausente',
    motivos,
    rotulo: 'indefinido',
  }
}

/**
 * Atalho usado pelo backfill: última guia da lista + SQL digits
 * (API estável para `10-backfill-tipologia.mjs`).
 */
export function classificarDeGuias(
  guias: GuiaTipologiaFields[] | null | undefined,
  sqlDigits: string | null | undefined,
): TipologiaClassificacao {
  const ultima = guias && guias.length ? guias[guias.length - 1] : null
  return classificarTipologia({
    sqlCadastral: sqlDigits,
    guia: ultima,
  })
}

// ---------------------------------------------------------------------------
// Override visual (AC5)
// ---------------------------------------------------------------------------

export function aplicarVerificacaoVisual(
  cls: TipologiaClassificacao,
  sqlCadastral: string | null | undefined,
  overrides?: VerificacaoVisualMap | null,
): TipologiaClassificacao {
  if (!overrides || !sqlCadastral) return cls
  const key = digitsSql(sqlCadastral)
  const ov = overrides[key] ?? overrides[sqlCadastral]
  if (!ov) return cls

  if (ov.acao === 'excluir') {
    return {
      tipo: 'indefinido',
      confianca: 'alta',
      fonte: 'visual',
      motivos: [...cls.motivos, `Override visual EXCLUIR: ${ov.motivo}`],
      rotulo: 'excluido-visual',
    }
  }

  const tipo = ov.tipo ?? 'apartamento'
  return {
    tipo,
    confianca: 'alta',
    fonte: 'visual',
    motivos: [...cls.motivos, `Override visual: ${ov.motivo}`],
    rotulo: rotuloDe(tipo, 'alta'),
  }
}

// ---------------------------------------------------------------------------
// Gate de pipeline (AC3)
// ---------------------------------------------------------------------------

export function tiposCompativeis(alvo: TipologiaTipo, candidato: TipologiaTipo): boolean {
  if (alvo === 'indefinido') return true // sem alvo tipado → não filtra
  return candidato === alvo
}

export interface ComparavelR5Input {
  endereco: string
  sqlCadastral?: string | null
  usoIptu?: string | null
  padraoIptu?: string | null
  complemento?: string | null
  guia?: GuiaTipologiaFields | null
  /** Tipologia já no comparável ACM (`{ valor, fonte }`). */
  tipologia?: { valor: string; fonte?: string | null } | null
  /** Rótulo string legado do dataset. */
  tipologiaLegado?: string | null
}

function registroDeComparavel(c: ComparavelR5Input): RegistroTipologia {
  return {
    endereco: c.endereco,
    sqlCadastral: c.sqlCadastral,
    guia: c.guia,
    usoIptu: c.usoIptu,
    padraoIptu: c.padraoIptu,
    complemento: c.complemento,
    tipologiaPrevia: c.tipologia?.valor ?? c.tipologiaLegado ?? null,
    tipologiaFontePrevia: (c.tipologia?.fonte as TipologiaFonte | undefined) ?? null,
  }
}

/**
 * Filtra comparáveis incompatíveis com o `propertyType` do alvo (AC3).
 * Opt-in: se `propertyType` for null/undefined, devolve a lista intacta.
 */
export function filtrarComparaveisPorR5<T extends ComparavelR5Input>(
  comparaveis: T[],
  propertyType: TipologiaTipo | null | undefined,
  opts?: { verificacaoVisual?: VerificacaoVisualMap | null },
): GateR5Result<T> {
  const porEndereco = new Map<string, TipologiaClassificacao>()

  if (!propertyType || propertyType === 'indefinido') {
    return {
      aceitos: [...comparaveis],
      excluidos: [],
      porEndereco,
      relatorio: {
        aplicado: false,
        propertyType: propertyType ?? null,
        nEntrada: comparaveis.length,
        nAceitos: comparaveis.length,
        nExcluidos: 0,
        nHeuristica: 0,
        nIndefinido: 0,
        regraUmaLinha: R5_REGRA_UMA_LINHA,
      },
    }
  }

  const aceitos: T[] = []
  const excluidos: ExcluidoTipologia[] = []
  let nHeuristica = 0
  let nIndefinido = 0

  for (const c of comparaveis) {
    let cls = classificarTipologia(registroDeComparavel(c))
    cls = aplicarVerificacaoVisual(cls, c.sqlCadastral, opts?.verificacaoVisual)
    porEndereco.set(c.endereco, cls)

    if (cls.fonte === 'heuristica') nHeuristica += 1
    if (cls.tipo === 'indefinido') nIndefinido += 1

    // Override com acao excluir → rotulo excluido-visual
    if (cls.rotulo === 'excluido-visual' || !tiposCompativeis(propertyType, cls.tipo)) {
      excluidos.push({
        endereco: c.endereco,
        sqlCadastral: c.sqlCadastral ?? null,
        classificacao: cls,
        motivo:
          cls.rotulo === 'excluido-visual'
            ? cls.motivos[cls.motivos.length - 1] ?? 'override visual'
            : `tipologia ${cls.tipo} incompatível com alvo ${propertyType}`,
      })
      continue
    }
    aceitos.push(c)
  }

  return {
    aceitos,
    excluidos,
    porEndereco,
    relatorio: {
      aplicado: true,
      propertyType,
      nEntrada: comparaveis.length,
      nAceitos: aceitos.length,
      nExcluidos: excluidos.length,
      nHeuristica,
      nIndefinido,
      regraUmaLinha: R5_REGRA_UMA_LINHA,
    },
  }
}

/**
 * Enriquece `AcmComparable.tipologia` a partir da classificação R5
 * (para passaporte 9.15 e avisos de heurística).
 */
export function toAcmTipologia(
  cls: TipologiaClassificacao,
): { valor: string; fonte: 'guia' | 'heuristica' | 'visual' | 'desconhecida' } {
  const fonte =
    cls.fonte === 'ausente' ? 'desconhecida' : (cls.fonte as 'guia' | 'heuristica' | 'visual')
  return { valor: cls.tipo === 'indefinido' ? cls.rotulo : cls.tipo, fonte }
}

/**
 * Texto de confiança no formato legado do `tipologia-guias.json`
 * (compatível com `04-build-dataset.mjs` e planilhas existentes).
 */
export function confiancaLegado(cls: TipologiaClassificacao): string {
  if (cls.fonte === 'guia') return 'guia oficial'
  if (cls.fonte === 'visual') {
    return cls.motivos[cls.motivos.length - 1] ?? 'verificação visual'
  }
  if (cls.fonte === 'heuristica') {
    return (
      cls.motivos.find((m) => /lote/i.test(m)) ??
      'heurística de lote — guia pública indisponível'
    )
  }
  return 'não classificável'
}
