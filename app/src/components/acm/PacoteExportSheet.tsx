'use client'

/**
 * Sheet do PACOTE COMPLETO ACM em 1 clique (Story 8.6).
 *
 * Um único formulário (superset) → um `computeLaudo` (8.2) → `buildAcmPackage` monta
 * os 4 entregáveis (resumo/laudo/deck/didático) → download sequencial dos 4 PDFs.
 * Consistência total de números (AC2). Progresso por entregável + tolerância a falha
 * (um que falhe não impede os já gerados — AC4). Sem nova dependência de ZIP (AC3).
 */
import { useState } from 'react'
import { X, Loader2, PackageCheck } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ComparavelNoRaio } from '@/lib/supabase/types'
import { toAcmComparables, type AcmRpcRow } from '@/lib/acm/adapter'
import { computeLaudo, type ResidualLandParams } from '@/lib/acm/methodology'
import type { LaudoInput, LaudoSourceComparable } from '@/lib/acm/pdf/laudoModel'
import { buildAcmPackage } from '@/lib/acm/pdf/acmPackage'
import { buildStaticMapUrl, resolveStaticMapImage } from '@/lib/acm/pdf/staticMap'
import { comparavelToLaudoSource, buildAcmMapMarkers } from '@/lib/acm/comparavelAdapter'

interface PacoteExportSheetProps {
  open: boolean
  onClose: () => void
  comparaveis: ComparavelNoRaio[]
  lat: number
  lng: number
  enderecoAlvo: string
  radiusMeters: number
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const RESIDUAL_DEFAULTS: ResidualLandParams = {
  vgvPerM2: 34_000,
  areaNova: 800,
  custoObraPerM2: 10_500,
  demolicao: 200_000,
  comercializacaoPct: 0.08,
  custoFinanceiroPct: 0.05,
  margemPct: 0.2,
}

function numOrUndef(v: string): number | undefined {
  const t = v.trim().replace(',', '.')
  if (!t) return undefined
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : undefined
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function PacoteExportSheet({
  open,
  onClose,
  comparaveis,
  lat,
  lng,
  enderecoAlvo,
  radiusMeters,
}: PacoteExportSheetProps) {
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
  const [f1, setF1] = useState('')
  const [f2, setF2] = useState('')
  const [f3, setF3] = useState('')
  const [f4, setF4] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [progresso, setProgresso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const areaC = numOrUndef(areaConstruida)
  const areaT = numOrUndef(areaTerreno)
  const podeGerar = !!areaC && areaC > 0 && !!areaT && areaT > 0 && comparaveis.length > 0

  async function handleGerar() {
    setError(null)
    if (!areaC || !areaT) {
      setError('Informe a área construída e a área de terreno do imóvel-alvo.')
      return
    }
    setIsGenerating(true)
    try {
      // 1) Cálculo ÚNICO (8.2) com residual → co-âncora
      const acmComps = toAcmComparables(comparaveis as unknown as AcmRpcRow[])
      const fatores = [numOrUndef(f1), numOrUndef(f2), numOrUndef(f3), numOrUndef(f4)].filter(
        (n): n is number => n != null,
      )
      const residual: ResidualLandParams = { ...RESIDUAL_DEFAULTS, areaNova: areaC }
      const computation = computeLaudo({
        target: { areaConstruida: areaC, areaTerreno: areaT },
        comparaveis: acmComps,
        fatoresLiquidez: fatores,
        raio: radiusMeters,
        residual,
      })

      // 2) Fonte rica (mesma dos entregáveis individuais; inclui lat/lng + anuncio_url)
      const source: LaudoSourceComparable[] = comparaveis.map(comparavelToLaudoSource)

      // 3) Mapa estático com pins por comparável (Top3 dourado/Top4-5 laranja/demais azuis)
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

      // 4) Monta os 4 entregáveis a partir do MESMO cálculo e baixa em sequência
      const itens = buildAcmPackage(computation, source, input)
      const hoje = new Date().toISOString().split('T')[0]
      const falhas: string[] = []

      for (const item of itens) {
        setProgresso(`Gerando ${item.label}…`)
        try {
          const blob = await pdf(item.doc).toBlob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${item.filenamePrefix}-${hoje}.pdf`
          a.click()
          URL.revokeObjectURL(url)
          await delay(400) // evita o browser descartar downloads múltiplos
        } catch (e) {
          console.error(`Falha ao gerar ${item.label}:`, e)
          falhas.push(item.label)
        }
      }

      if (falhas.length) {
        setError(`Pacote gerado com falha em: ${falhas.join(', ')}. Os demais foram baixados.`)
      } else {
        onClose()
      }
    } catch (e) {
      console.error('Falha ao gerar o pacote ACM:', e)
      setError('Não foi possível gerar o pacote. Tente novamente.')
    } finally {
      setIsGenerating(false)
      setProgresso(null)
    }
  }

  const field = 'flex-1'
  const label = 'block text-[10px] uppercase tracking-wide text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={isGenerating ? undefined : onClose} />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <PackageCheck className="size-4 text-[#003DA5]" />
            Gerar pacote completo (PDF)
          </h2>
          <button onClick={onClose} disabled={isGenerating} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-40">
            <X className="size-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            Gera os 4 entregáveis de uma vez — Resumo, Laudo, Deck e Material Didático — a partir do mesmo cálculo.
          </p>

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

          <div>
            <span className={label}>Fatores de liquidez (frações) — exposição · regularização · Capex · liquidez</span>
            <div className="flex gap-2">
              <Input type="number" value={f1} onChange={(e) => setF1(e.target.value)} placeholder="0,07" />
              <Input type="number" value={f2} onChange={(e) => setF2(e.target.value)} placeholder="0,05" />
              <Input type="number" value={f3} onChange={(e) => setF3(e.target.value)} placeholder="0,03" />
              <Input type="number" value={f4} onChange={(e) => setF4(e.target.value)} placeholder="0,04" />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button onClick={handleGerar} disabled={!podeGerar || isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                {progresso ?? 'Gerando pacote…'}
              </>
            ) : (
              <>
                <PackageCheck className="size-4 mr-1.5" />
                Gerar pacote completo (4 PDFs)
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
