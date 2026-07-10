/**
 * Story 9.23 — fiação compartilhada dos mecanismos v5 nos export sheets ACM.
 *
 * Os 5 sheets (Laudo/Pacote/Resumo/Entregável/Planilha) chamavam `computeLaudo`
 * com o target mínimo `{ areaConstruida, areaTerreno }`, deixando inertes o
 * guard-rail 9.8, a homogeneização FipeZap 9.11/9.12, o deságio H-3 (régua A–F,
 * 9.14) e o gate R5 (9.17). Este helper monta um único shape de opções a partir
 * do estado do formulário — evita 5 cópias divergentes da fiação (KISS).
 *
 * Art. IV (No Invention): campos ausentes no formulário NÃO viram default. O
 * guard-rail e a homogeneização só ligam com os dados coletados; `estadoConservacao`
 * ausente segue o comportamento 9.14 (aviso conservador, sem deságio silencioso);
 * `tese`/`cenarioDesagio` NUNCA são inferidos aqui.
 */
import type { ComputeLaudoOptions, EstadoConservacao } from '@/lib/acm/methodology'
import type { TipologiaTipo } from '@/lib/acm/tipologia'
import {
  FIPEZAP_SP_FONTE,
  FIPEZAP_SP_ULTIMA_COMPETENCIA,
  FIPEZAP_SP_VENDA_RESIDENCIAL,
} from '@/lib/acm/data/fipezapSpVendaResidencial'

/**
 * Opções da régua H-3 Luciana (2026-07-10) para o select "Estado do imóvel".
 * Percentuais canônicos em `ESTADO_DESAGIO_H3`; aqui só os rótulos de exibição.
 */
export const ESTADO_CONSERVACAO_OPCOES: ReadonlyArray<{
  value: EstadoConservacao
  label: string
}> = [
  { value: 'A', label: 'A — como novo / reformado (0%)' },
  { value: 'B', label: 'B — muito conservado (−5%)' },
  { value: 'C', label: 'C — conservado, pronto p/ morar (−7,5%)' },
  { value: 'D', label: 'D — precisa de reparos (−10%)' },
  { value: 'E', label: 'E — reforma pesada (−15%)' },
  { value: 'F', label: 'F — fora da régua (conversa aberta)' },
]

/** Opções de tipologia do alvo para o gate R5 opt-in (Story 9.17). */
export const TIPOLOGIA_OPCOES: ReadonlyArray<{
  value: TipologiaTipo
  label: string
}> = [
  { value: 'casa', label: 'Casa' },
  { value: 'apartamento', label: 'Apartamento' },
]

/** Competência de referência da homogeneização, para exibição na sheet. */
export const FIPEZAP_REFERENCIA_LABEL = `${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_ULTIMA_COMPETENCIA}`

/** Estado do formulário relevante para a montagem das opções v5. */
export interface AcmFormState {
  areaConstruida: number
  areaTerreno: number
  /** Endereço do alvo — habilita o guard-rail anti-auto-referência (AC1). */
  endereco?: string | null
  vagas?: number | null
  /** Preço pretendido/pedido — nunca entra como evidência de mercado (9.8). */
  precoPretendido?: number | null
  /** Homogeneização FipeZap — default ON; toggle explícito para desligar (AC2). */
  homogeneizacaoAtiva: boolean
  /** Estado do imóvel na régua A–F (AC3). Ausente → comportamento 9.14. */
  estadoConservacao?: EstadoConservacao | null
  /** Tipologia do alvo (AC4). Ausente → gate R5 inerte (regressão Honduras). */
  propertyType?: TipologiaTipo | null
}

/** Fatia de opções v5 (target enriquecido + homogeneização + estado + tipologia). */
export type AcmComputeOptionsSlice = Pick<
  ComputeLaudoOptions,
  'target' | 'homogeneizacao' | 'propertyType'
>

/**
 * Monta o slice de opções v5 comum aos 5 sheets. O chamador combina com os
 * campos próprios de cada sheet (`comparaveis`, `fatoresLiquidez`, `raio`,
 * `residual`) via spread.
 */
export function buildComputeOptions(form: AcmFormState): AcmComputeOptionsSlice {
  const endereco = form.endereco?.trim() || null

  return {
    target: {
      areaConstruida: form.areaConstruida,
      areaTerreno: form.areaTerreno,
      // AC1 — guard-rail 9.8: endereço/vagas/preço pretendido do alvo. Só liga
      // quando os dados existem; ausentes ficam undefined (não viram default).
      ...(endereco != null ? { endereco } : {}),
      ...(form.vagas != null ? { vagas: form.vagas } : {}),
      ...(form.precoPretendido != null ? { precoPretendido: form.precoPretendido } : {}),
      // AC3 — deságio H-3: só quando a consultora escolhe o estado. Ausente →
      // 9.14 (aviso target_condition_unconfirmed, faixa conservadora).
      ...(form.estadoConservacao != null
        ? { estadoConservacao: form.estadoConservacao }
        : {}),
    },
    // AC2 — homogeneização FipeZap default ON (série vendada no repo). Comparáveis
    // sem `dataVenda` seguem a 9.11 (sem ajuste, contados em `semAjuste`).
    ...(form.homogeneizacaoAtiva
      ? {
          homogeneizacao: {
            indice: `${FIPEZAP_SP_FONTE.indice} — ${FIPEZAP_SP_FONTE.recorte}`,
            serie: FIPEZAP_SP_VENDA_RESIDENCIAL,
            dataReferencia: FIPEZAP_SP_ULTIMA_COMPETENCIA,
          },
        }
      : {}),
    // AC4 — gate R5 opt-in. Ausente → inerte (regressão Honduras preservada).
    ...(form.propertyType != null ? { propertyType: form.propertyType } : {}),
  }
}
