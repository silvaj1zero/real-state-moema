'use client'

/**
 * Sheet de geração do Laudo Técnico ACM completo em PDF (Story 8.3b AC6).
 *
 * Versão técnica (~18 págs) do entregável referenciado pelo Resumo (8.3a). Coleta
 * os campos do alvo/consultor + os parâmetros do valor residual do terreno (Sec. 8b)
 * — pré-preenchidos com os defaults do caso Honduras (seed-data-first) — e roda o
 * mesmo pipeline nativo TS: `computeLaudo` (8.2) → `buildLaudoModel` → React-PDF
 * `pdf().toBlob()`. Geração 100% cliente (offline-capable, ADR-EPIC8-001). Estado
 * de loading + tratamento de erro (AC6). O texto-modelo das 10 seções usa defaults
 * templados (Art. IV), sobrescrevíveis no view-model.
 *
 * Story 9.23 — ativa os mecanismos v5 in-app: guard-rail 9.8 (endereço/vagas/preço),
 * homogeneização FipeZap (default ON), deságio H-3 A–F, gate R5 e painel de
 * transparência (headline em faixa + avisos) antes do download.
 */
import { useState } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import { toAcmComparables, type AcmRpcRow } from '@/lib/acm/adapter'
import {
  computeLaudo,
  type AcmLaudoComputation,
  type EstadoConservacao,
  type ResidualLandParams,
} from '@/lib/acm/methodology'
import type { TipologiaTipo } from '@/lib/acm/tipologia'
import { buildLaudoModel, type LaudoSourceComparable, type LaudoInput } from '@/lib/acm/pdf/laudoModel'
import { buildStaticMapUrl, resolveStaticMapImage } from '@/lib/acm/pdf/staticMap'
import { comparavelToLaudoSource, buildAcmMapMarkers } from '@/lib/acm/comparavelAdapter'
import { LaudoDocument } from '@/lib/acm/pdf/LaudoDocument'
import { AcmAvisosPanel } from './AcmAvisosPanel'
import {
  buildComputeOptions,
  ESTADO_CONSERVACAO_OPCOES,
  FIPEZAP_REFERENCIA_LABEL,
  TIPOLOGIA_OPCOES,
} from './computeOptions'

interface LaudoExportSheetProps {
  open: boolean
  onClose: () => void
  comparaveis: ComparavelNoRaio[]
  lat: number
  lng: number
  enderecoAlvo: string
  radiusMeters: number
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

/** Defaults do residual (Honduras — Laudo Sec. 8b). Pré-preenchidos no formulário. */
const RESIDUAL_DEFAULTS: ResidualLandParams = {
  vgvPerM2: 34_000,
  areaNova: 800,
  custoObraPerM2: 10_500,
  demolicao: 200_000,
  comercializacaoPct: 0.08,
  custoFinanceiroPct: 0.05,
  margemPct: 0.2,
}

/** "" → undefined; senão número (NaN → undefined). Aceita vírgula decimal. */
function numOrUndef(v: string): number | undefined {
  const t = v.trim().replace(',', '.')
  if (!t) return undefined
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : undefined
}

export function LaudoExportSheet({
  open,
  onClose,
  comparaveis,
  lat,
  lng,
  enderecoAlvo,
  radiusMeters,
}: LaudoExportSheetProps) {
  const [endereco, setEndereco] = useState(enderecoAlvo)
  const [bairro, setBairro] = useState('')
  const [proprietario, setProprietario] = useState('')
  const [areaConstruida, setAreaConstruida] = useState('')
  const [areaTerreno, setAreaTerreno] = useState('')
  const [dorms, setDorms] = useState('')
  const [suites, setSuites] = useState('')
  const [vagas, setVagas] = useState('')
  const [pretendido, setPretendido] = useState('')
  const [pedidoReal, setPedidoReal] = useState('')
  const [anuncioRec, setAnuncioRec] = useState('')
  const [metaMin, setMetaMin] = useState('')
  const [metaMax, setMetaMax] = useState('')
  const [refAnuncio, setRefAnuncio] = useState('')
  const [f1, setF1] = useState('') // exposição
  const [f2, setF2] = useState('') // regularização
  const [f3, setF3] = useState('') // Capex
  const [f4, setF4] = useState('') // liquidez
  // Story 9.23 — mecanismos v5
  const [homogeneizacaoAtiva, setHomogeneizacaoAtiva] = useState(true)
  const [estado, setEstado] = useState<EstadoConservacao | ''>('')
  const [tipologia, setTipologia] = useState<TipologiaTipo | ''>('')
  // Residual (Sec. 8b) — pré-preenchido com os defaults Honduras (seed-data-first)
  const [vgvM2, setVgvM2] = useState(String(RESIDUAL_DEFAULTS.vgvPerM2))
  const [areaNova, setAreaNova] = useState(String(RESIDUAL_DEFAULTS.areaNova))
  const [custoObra, setCustoObra] = useState(String(RESIDUAL_DEFAULTS.custoObraPerM2))
  const [demolicao, setDemolicao] = useState(String(RESIDUAL_DEFAULTS.demolicao))

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const areaC = numOrUndef(areaConstruida)
  const areaT = numOrUndef(areaTerreno)
  const podeGerar = !!areaC && areaC > 0 && !!areaT && areaT > 0 && comparaveis.length > 0

  /** Monta o computation compartilhado (fiação v5 + residual local). */
  function buildComputation(areaCVal: number, areaTVal: number): AcmLaudoComputation {
    const acmComps = toAcmComparables(comparaveis as unknown as AcmRpcRow[])
    const fatores = [numOrUndef(f1), numOrUndef(f2), numOrUndef(f3), numOrUndef(f4)].filter(
      (n): n is number => n != null,
    )
    const residual: ResidualLandParams = {
      ...RESIDUAL_DEFAULTS,
      vgvPerM2: numOrUndef(vgvM2) ?? RESIDUAL_DEFAULTS.vgvPerM2,
      areaNova: numOrUndef(areaNova) ?? areaCVal,
      custoObraPerM2: numOrUndef(custoObra) ?? RESIDUAL_DEFAULTS.custoObraPerM2,
      demolicao: numOrUndef(demolicao) ?? RESIDUAL_DEFAULTS.demolicao,
    }
    return computeLaudo({
      ...buildComputeOptions({
        areaConstruida: areaCVal,
        areaTerreno: areaTVal,
        endereco: endereco.trim() || enderecoAlvo,
        vagas: numOrUndef(vagas) ?? null,
        precoPretendido: numOrUndef(pretendido) ?? null,
        homogeneizacaoAtiva,
        estadoConservacao: estado || null,
        propertyType: tipologia || null,
      }),
      comparaveis: acmComps,
      fatoresLiquidez: fatores,
      raio: radiusMeters,
      residual,
    })
  }

  // Prévia de transparência (headline em faixa + avisos + guard-rail) — recomputa
  // a cada render a partir do estado atual (zero recálculo escondido; AC5/AC6).
  const preview = podeGerar && areaC && areaT ? buildComputation(areaC, areaT) : null

  async function handleGerar() {
    setError(null)
    if (!areaC || !areaT) {
      setError('Informe a área construída e a área de terreno do imóvel-alvo.')
      return
    }
    setIsGenerating(true)
    try {
      const residual: ResidualLandParams = {
        ...RESIDUAL_DEFAULTS,
        vgvPerM2: numOrUndef(vgvM2) ?? RESIDUAL_DEFAULTS.vgvPerM2,
        areaNova: numOrUndef(areaNova) ?? areaC,
        custoObraPerM2: numOrUndef(custoObra) ?? RESIDUAL_DEFAULTS.custoObraPerM2,
        demolicao: numOrUndef(demolicao) ?? RESIDUAL_DEFAULTS.demolicao,
      }

      const computation = buildComputation(areaC, areaT)

      // 2) Fonte rica do Top N / Sec. 5 / Sec. 7.1 (inclui lat/lng + anuncio_url)
      const source: LaudoSourceComparable[] = comparaveis.map(comparavelToLaudoSource)

      // 3) Mapa estático: alvo (vermelho) + Top3 dourado/Top4-5 laranja/demais azuis
      //    (pins por comparável quando há coords). Pré-buscado e embutido como data URL.
      const rawMapUrl = buildStaticMapUrl({
        token: MAPBOX_TOKEN,
        center: { lat, lng },
        radiusMeters,
        markers: buildAcmMapMarkers({ lat, lng }, computation.ranking, source),
      })
      const mapaUrl = await resolveStaticMapImage(rawMapUrl)

      const metaFechamento =
        numOrUndef(metaMin) != null && numOrUndef(metaMax) != null
          ? { min: numOrUndef(metaMin) as number, max: numOrUndef(metaMax) as number }
          : null

      const input: LaudoInput = {
        enderecoAlvo: endereco.trim() || enderecoAlvo,
        bairro: bairro.trim() || null,
        proprietario: proprietario.trim() || null,
        areaConstruida: areaC,
        areaTerreno: areaT,
        programa: {
          dormitorios: numOrUndef(dorms) ?? null,
          suites: numOrUndef(suites) ?? null,
          vagas: numOrUndef(vagas) ?? null,
        },
        precoPretendido: numOrUndef(pretendido) ?? null,
        precoPedidoReal: numOrUndef(pedidoReal) ?? null,
        precoAnuncioRecomendado: numOrUndef(anuncioRec) ?? null,
        metaFechamento,
        refAnuncioReal: refAnuncio.trim() || null,
        dataEmissao: new Date().toLocaleDateString('pt-BR'),
        residualParams: residual,
        mapaUrl,
      }

      const model = buildLaudoModel(computation, source, input)

      // 4) Render → blob → download
      const blob = await pdf(<LaudoDocument model={model} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `acm-laudo-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      onClose()
    } catch (e) {
      console.error('Falha ao gerar Laudo ACM:', e)
      setError('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const field = 'flex-1'
  const label = 'block text-[10px] uppercase tracking-wide text-gray-500 mb-1'
  const selectCls = 'w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={isGenerating ? undefined : onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <FileText className="size-4 text-[#003DA5]" />
            Gerar Laudo Técnico (PDF)
          </h2>
          <button onClick={onClose} disabled={isGenerating} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-40">
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Endereço do imóvel-alvo</span>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua Honduras" />
            </div>
            <div className={field}>
              <span className={label}>Bairro</span>
              <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Jardim América" />
            </div>
          </div>
          <div>
            <span className={label}>Proprietário(a)</span>
            <Input value={proprietario} onChange={(e) => setProprietario(e.target.value)} placeholder="Nome do proprietário" />
          </div>

          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Área construída (m²) *</span>
              <Input type="number" value={areaConstruida} onChange={(e) => setAreaConstruida(e.target.value)} placeholder="800" />
            </div>
            <div className={field}>
              <span className={label}>Área terreno (m²) *</span>
              <Input type="number" value={areaTerreno} onChange={(e) => setAreaTerreno(e.target.value)} placeholder="1000" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Dorms</span>
              <Input type="number" value={dorms} onChange={(e) => setDorms(e.target.value)} placeholder="4" />
            </div>
            <div className={field}>
              <span className={label}>Suítes</span>
              <Input type="number" value={suites} onChange={(e) => setSuites(e.target.value)} placeholder="2" />
            </div>
            <div className={field}>
              <span className={label}>Vagas</span>
              <Input type="number" value={vagas} onChange={(e) => setVagas(e.target.value)} placeholder="10" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Preço pretendido</span>
              <Input type="number" value={pretendido} onChange={(e) => setPretendido(e.target.value)} placeholder="12000000" />
            </div>
            <div className={field}>
              <span className={label}>Anúncio real</span>
              <Input type="number" value={pedidoReal} onChange={(e) => setPedidoReal(e.target.value)} placeholder="10500000" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Anúncio recomendado</span>
              <Input type="number" value={anuncioRec} onChange={(e) => setAnuncioRec(e.target.value)} placeholder="11500000" />
            </div>
            <div className={field}>
              <span className={label}>Ref. anúncio real</span>
              <Input value={refAnuncio} onChange={(e) => setRefAnuncio(e.target.value)} placeholder="Cheznous, ref. 73232" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Meta fechamento (min)</span>
              <Input type="number" value={metaMin} onChange={(e) => setMetaMin(e.target.value)} placeholder="10000000" />
            </div>
            <div className={field}>
              <span className={label}>Meta fechamento (max)</span>
              <Input type="number" value={metaMax} onChange={(e) => setMetaMax(e.target.value)} placeholder="10500000" />
            </div>
          </div>

          {/* Story 9.23 — ficha do alvo (opcionais): estado A–F + tipologia R5 */}
          <div className="flex gap-2">
            <div className={field}>
              <span className={label}>Estado do imóvel (régua A–F)</span>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoConservacao | '')}
                className={selectCls}
              >
                <option value="">Não informar (faixa conservadora)</option>
                {ESTADO_CONSERVACAO_OPCOES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={field}>
              <span className={label}>Tipologia do alvo</span>
              <select
                value={tipologia}
                onChange={(e) => setTipologia(e.target.value as TipologiaTipo | '')}
                className={selectCls}
              >
                <option value="">Não informar</option>
                {TIPOLOGIA_OPCOES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 leading-snug">
            A classificação de tipologia dos comparáveis é parcial até a Story 9.4 — o gate R5 sinaliza a limitação nos avisos.
          </p>

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={homogeneizacaoAtiva}
              onChange={(e) => setHomogeneizacaoAtiva(e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            Homogeneizar fechamentos a valor presente ({FIPEZAP_REFERENCIA_LABEL})
          </label>

          <div>
            <span className={label}>Fatores de liquidez (frações) — exposição · regularização · Capex · liquidez</span>
            <div className="flex gap-2">
              <Input type="number" value={f1} onChange={(e) => setF1(e.target.value)} placeholder="0,07" />
              <Input type="number" value={f2} onChange={(e) => setF2(e.target.value)} placeholder="0,05" />
              <Input type="number" value={f3} onChange={(e) => setF3(e.target.value)} placeholder="0,03" />
              <Input type="number" value={f4} onChange={(e) => setF4(e.target.value)} placeholder="0,04" />
            </div>
          </div>

          <div className="pt-1 border-t border-gray-100">
            <span className={label}>Valor residual do terreno (Sec. 8b) — pré-preenchido</span>
            <div className="flex gap-2">
              <div className={field}>
                <span className="block text-[9px] text-gray-400 mb-0.5">VGV R$/m²</span>
                <Input type="number" value={vgvM2} onChange={(e) => setVgvM2(e.target.value)} />
              </div>
              <div className={field}>
                <span className="block text-[9px] text-gray-400 mb-0.5">Área nova m²</span>
                <Input type="number" value={areaNova} onChange={(e) => setAreaNova(e.target.value)} />
              </div>
              <div className={field}>
                <span className="block text-[9px] text-gray-400 mb-0.5">Obra R$/m²</span>
                <Input type="number" value={custoObra} onChange={(e) => setCustoObra(e.target.value)} />
              </div>
              <div className={field}>
                <span className="block text-[9px] text-gray-400 mb-0.5">Demolição</span>
                <Input type="number" value={demolicao} onChange={(e) => setDemolicao(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Story 9.23 AC5 — transparência pré-download */}
          {preview && <AcmAvisosPanel computation={preview} />}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button onClick={handleGerar} disabled={!podeGerar || isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Gerando laudo…
              </>
            ) : (
              <>
                <FileText className="size-4 mr-1.5" />
                Gerar Laudo Técnico (PDF)
              </>
            )}
          </Button>
          {!podeGerar && !isGenerating && (
            <p className="text-[11px] text-gray-400">
              Informe ao menos as áreas construída e de terreno; é preciso ter comparáveis no raio.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
