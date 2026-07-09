/**
 * Orquestrador do pacote completo ACM (Story 8.6 + 9.19 Lite).
 *
 * A partir de UM ÚNICO `AcmLaudoComputation` (8.2) e do mesmo `LaudoSourceComparable`,
 * monta os 4 entregáveis premium (resumo, laudo, deck, didático) e, opcionalmente,
 * o ACM Lite (Story 9.19) — consistência total de números (AC2, zero recálculo).
 *
 * Puro: devolve os elementos React-PDF + nomes de arquivo; o call site (sheet) faz
 * `pdf(doc).toBlob()` e o download. Testável via `renderToBuffer` (AC6).
 */
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import type { AcmLaudoComputation } from '@/lib/acm/methodology'
import { buildResumoModel } from './resumoModel'
import { buildLaudoModel, type LaudoInput, type LaudoSourceComparable } from './laudoModel'
import { buildDeckModel, type DeckInput } from './deckModel'
import { buildDidaticoModel, type DidaticoInput } from './didaticoModel'
import { buildLiteModel, type LiteInput } from './liteModel'
import { ResumoDocument } from './ResumoDocument'
import { LaudoDocument } from './LaudoDocument'
import { DeckDocument } from './DeckDocument'
import { DidaticoDocument } from './DidaticoDocument'
import { LiteDocument } from './LiteDocument'

export type AcmPackageKind = 'resumo' | 'laudo' | 'deck' | 'didatico' | 'lite'

export interface AcmPackageItem {
  kind: AcmPackageKind
  label: string
  filenamePrefix: string
  // ReactElement<DocumentProps> é o que pdf()/renderToBuffer aceitam (React 19 types).
  doc: ReactElement<DocumentProps>
}

export interface BuildAcmPackageOptions {
  /** Inclui o ACM Lite (Story 9.19) como 5º entregável. Default false (regressão 8.6). */
  includeLite?: boolean
}

/**
 * Monta os 4 entregáveis premium a partir do MESMO cálculo/fonte/input.
 * `input` é o superset (LaudoInput); deck/didático adicionam só campos opcionais.
 * Com `includeLite: true`, acrescenta o Lite (sem residual/deck no documento).
 */
export function buildAcmPackage(
  computation: AcmLaudoComputation,
  source: LaudoSourceComparable[],
  input: LaudoInput,
  opts?: BuildAcmPackageOptions,
): AcmPackageItem[] {
  const resumoModel = buildResumoModel(computation, source, input)
  const laudoModel = buildLaudoModel(computation, source, input)
  const deckModel = buildDeckModel(computation, source, input as DeckInput)
  const didaticoModel = buildDidaticoModel(computation, source, input as DidaticoInput)

  const itens: AcmPackageItem[] = [
    { kind: 'resumo', label: 'Resumo Executivo', filenamePrefix: 'acm-resumo', doc: <ResumoDocument model={resumoModel} /> },
    { kind: 'laudo', label: 'Laudo Técnico', filenamePrefix: 'acm-laudo', doc: <LaudoDocument model={laudoModel} /> },
    { kind: 'deck', label: 'Deck Comercial', filenamePrefix: 'acm-deck', doc: <DeckDocument model={deckModel} /> },
    { kind: 'didatico', label: 'Material Didático', filenamePrefix: 'acm-didatico', doc: <DidaticoDocument model={didaticoModel} /> },
  ]

  if (opts?.includeLite) {
    itens.push(buildAcmLiteItem(computation, source, input))
  }
  return itens
}

/** Só o ACM Lite (caminho &lt; 5 min com dados já carregados — Story 9.19 AC4). */
export function buildAcmLiteItem(
  computation: AcmLaudoComputation,
  source: LaudoSourceComparable[],
  input: LiteInput | LaudoInput,
): AcmPackageItem {
  const liteInput: LiteInput = {
    enderecoAlvo: input.enderecoAlvo,
    bairro: input.bairro,
    areaConstruida: input.areaConstruida,
    areaTerreno: input.areaTerreno,
    programa: input.programa,
    precoPretendido: input.precoPretendido,
    precoPedidoReal: input.precoPedidoReal,
    dataEmissao: input.dataEmissao,
  }
  const model = buildLiteModel(computation, source, liteInput)
  return {
    kind: 'lite',
    label: 'ACM Lite (modo dono)',
    filenamePrefix: 'acm-lite',
    doc: <LiteDocument model={model} />,
  }
}
