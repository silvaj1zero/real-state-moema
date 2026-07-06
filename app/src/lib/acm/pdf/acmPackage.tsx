/**
 * Orquestrador do pacote completo ACM (Story 8.6).
 *
 * A partir de UM ÚNICO `AcmLaudoComputation` (8.2) e do mesmo `LaudoSourceComparable`,
 * monta os 4 entregáveis já entregues (resumo 8.3a, laudo 8.3b, deck + didático 8.4)
 * — garantindo consistência total de números (AC2, zero recálculo divergente). É a
 * "fábrica de ACM em 1 clique" do Roadmap Passo 3.1, 100% nativa (sem engine externo).
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
import { ResumoDocument } from './ResumoDocument'
import { LaudoDocument } from './LaudoDocument'
import { DeckDocument } from './DeckDocument'
import { DidaticoDocument } from './DidaticoDocument'

export type AcmPackageKind = 'resumo' | 'laudo' | 'deck' | 'didatico'

export interface AcmPackageItem {
  kind: AcmPackageKind
  label: string
  filenamePrefix: string
  // ReactElement<DocumentProps> é o que pdf()/renderToBuffer aceitam (React 19 types).
  doc: ReactElement<DocumentProps>
}

/**
 * Monta os 4 entregáveis do pacote a partir do MESMO cálculo/fonte/input.
 * `input` é o superset (LaudoInput); deck/didático adicionam só campos opcionais.
 */
export function buildAcmPackage(
  computation: AcmLaudoComputation,
  source: LaudoSourceComparable[],
  input: LaudoInput,
): AcmPackageItem[] {
  const resumoModel = buildResumoModel(computation, source, input)
  const laudoModel = buildLaudoModel(computation, source, input)
  const deckModel = buildDeckModel(computation, source, input as DeckInput)
  const didaticoModel = buildDidaticoModel(computation, source, input as DidaticoInput)

  return [
    { kind: 'resumo', label: 'Resumo Executivo', filenamePrefix: 'acm-resumo', doc: <ResumoDocument model={resumoModel} /> },
    { kind: 'laudo', label: 'Laudo Técnico', filenamePrefix: 'acm-laudo', doc: <LaudoDocument model={laudoModel} /> },
    { kind: 'deck', label: 'Deck Comercial', filenamePrefix: 'acm-deck', doc: <DeckDocument model={deckModel} /> },
    { kind: 'didatico', label: 'Material Didático', filenamePrefix: 'acm-didatico', doc: <DidaticoDocument model={didaticoModel} /> },
  ]
}
