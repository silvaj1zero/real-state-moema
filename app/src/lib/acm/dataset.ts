/**
 * Carrega dataset canônico ACM (docs/acm/<slug>/dataset.json) → inputs do motor.
 * Usado por build-lite, acm-validate (P-1) e testes — zero I/O de rede.
 */
import type { AcmComparable, AcmTarget, AcmTese } from './methodology'
import type { TipologiaTipo } from './tipologia'

export type { AcmComparable, AcmTarget }

export interface AcmDatasetTarget {
  endereco?: string
  bairro?: string
  areaConstruida: number
  areaTerreno?: number | null
  precoPretendido?: number | null
  precoPedidoReal?: number | null
  vagas?: number | null
  estadoConservacao?: 'A' | 'B' | 'C' | 'D' | null
  lat?: number | null
  lng?: number | null
}

export interface AcmDatasetComparavel {
  endereco: string
  areaConstruida: number
  areaTerreno?: number | null
  preco: number
  distancia?: number | null
  dataVenda?: string | null
  isVendaReal?: boolean
  sqlCadastral?: string | null
  usoIptu?: string | null
  padraoIptu?: string | null
  complemento?: string | null
  tipologia?: string
  tipologiaConfianca?: string
  bairroReal?: string | null
  lat?: number | null
  lng?: number | null
  fonte?: string | null
}

export interface AcmDataset {
  geradoEm?: string
  target: AcmDatasetTarget
  comparaveis: AcmDatasetComparavel[]
  avisos?: string[]
  recorte?: { raioM?: number; regras?: string[] }
}

export interface AcmDatasetLoadOptions {
  /** Default: casa se não houver indício de apto. */
  propertyType?: TipologiaTipo | null
  tese?: AcmTese
}

export function comparavelFromDataset(c: AcmDatasetComparavel): AcmComparable {
  const fonteHeur =
    String(c.tipologiaConfianca ?? '').toLowerCase().includes('heur') ||
    String(c.tipologia ?? '').includes('provável') ||
    String(c.tipologia ?? '').includes('provavel')
  return {
    endereco: c.endereco,
    areaConstruida: c.areaConstruida,
    areaTerreno: c.areaTerreno,
    preco: c.preco,
    distancia: c.distancia,
    dataVenda: c.dataVenda,
    isVendaReal: c.isVendaReal ?? true,
    sqlCadastral: c.sqlCadastral,
    usoIptu: c.usoIptu,
    padraoIptu: c.padraoIptu,
    complemento: c.complemento,
    bairroReal: c.bairroReal,
    tipologia: c.tipologia
      ? {
          valor: c.tipologia,
          fonte: fonteHeur ? 'heuristica' : 'guia',
        }
      : null,
  }
}

export function targetFromDataset(t: AcmDatasetTarget): AcmTarget {
  return {
    areaConstruida: t.areaConstruida,
    areaTerreno: t.areaTerreno ?? 0,
    endereco: t.endereco,
    vagas: t.vagas,
    precoPretendido: t.precoPretendido,
    estadoConservacao: t.estadoConservacao,
  }
}

export function inferPropertyType(ds: AcmDataset): 'casa' | 'apartamento' {
  const hint = `${ds.target.endereco ?? ''} ${ds.target.bairro ?? ''}`
  if (/apart|apto/i.test(hint)) return 'apartamento'
  return 'casa'
}

export function loadAcmDatasetFromObject(
  ds: AcmDataset,
  opts?: AcmDatasetLoadOptions,
): {
  target: AcmTarget
  comparaveis: AcmComparable[]
  propertyType: 'casa' | 'apartamento' | 'terreno' | 'indefinido'
  tese: AcmTese
  precoPedidoReal: number | null
  meta: { enderecoAlvo: string; bairro: string | null; areaConstruida: number; areaTerreno: number | null }
} {
  const propertyType = opts?.propertyType ?? inferPropertyType(ds)
  const tese = opts?.tese ?? (propertyType === 'apartamento' ? 'apto' : 'construcao')
  return {
    target: targetFromDataset(ds.target),
    comparaveis: ds.comparaveis.map(comparavelFromDataset),
    propertyType,
    tese,
    precoPedidoReal: ds.target.precoPedidoReal ?? null,
    meta: {
      enderecoAlvo: ds.target.endereco ?? 'Alvo',
      bairro: ds.target.bairro ?? null,
      areaConstruida: ds.target.areaConstruida,
      areaTerreno: ds.target.areaTerreno ?? null,
    },
  }
}
