/**
 * Story 9.6 — vendoring das fontes de marca (OFL) p/ os PDFs ACM.
 * Baixa TTFs estáticas (não variáveis — React-PDF exige instâncias estáticas) de
 * fontes oficiais OFL para `app/public/fonts/`. Idempotente: pula se já existe.
 *
 * Spec (docs/branding/luciana-brand-guide.md §Tipografia):
 *   Montserrat Bold(700) + SemiBold(600) — títulos/subtítulos
 *   Inter Regular(400) + Medium(500)     — corpo/dados
 */
import { writeFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../../public/fonts')

// Fontes OFL, instâncias ESTÁTICAS (não variáveis).
const FONTS = [
  { file: 'Montserrat-SemiBold.ttf', url: 'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-SemiBold.ttf' },
  { file: 'Montserrat-Bold.ttf',     url: 'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf' },
  { file: 'Inter-Regular.ttf',       url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_400Regular.ttf' },
  { file: 'Inter-Medium.ttf',        url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_500Medium.ttf' },
]

await mkdir(OUT, { recursive: true })

for (const f of FONTS) {
  const dest = resolve(OUT, f.file)
  try {
    const s = await stat(dest)
    if (s.size > 1000) { console.log(`  • ${f.file} já existe (${(s.size / 1024).toFixed(0)} KB) — pula`); continue }
  } catch { /* não existe, baixa */ }

  process.stdout.write(`  ↓ ${f.file} ... `)
  const res = await fetch(f.url, { redirect: 'follow' })
  if (!res.ok) { console.log(`❌ HTTP ${res.status} (${f.url})`); process.exitCode = 1; continue }
  const buf = Buffer.from(await res.arrayBuffer())
  // Sanidade: TTF começa com 0x00010000 (sfnt) ou 'OTTO'/'true'/'ttcf'.
  const magic = buf.subarray(0, 4)
  const isTTF = magic[0] === 0x00 && magic[1] === 0x01 && magic[2] === 0x00 && magic[3] === 0x00
  const isOTTO = magic.toString('latin1') === 'OTTO' || magic.toString('latin1') === 'true'
  if ((!isTTF && !isOTTO) || buf.length < 1000) { console.log(`❌ não parece TTF (magic=${magic.toString('hex')}, ${buf.length}b)`); process.exitCode = 1; continue }
  await writeFile(dest, buf)
  console.log(`✅ ${(buf.length / 1024).toFixed(0)} KB`)
}

console.log(process.exitCode ? '\n❌ algumas fontes falharam' : '\n✅ fontes vendorizadas em app/public/fonts/')
