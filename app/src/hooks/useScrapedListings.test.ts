import { describe, it, expect } from 'vitest'

// Test the CSV parser logic directly (extracted for testability)
function parseCsv(text: string) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''))
  const rows: Array<{ endereco: string; preco: number; area_m2: number }> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })

    const endereco = row['endereco'] || row['endereço'] || row['address']
    const preco = parseFloat(row['preco'] || row['preço'] || row['price'] || '0')
    const area = parseFloat(row['area_m2'] || row['area'] || row['m2'] || '0')

    if (!endereco || preco <= 0 || area <= 0) continue
    rows.push({ endereco, preco, area_m2: area })
  }

  return rows
}

describe('CSV Parser', () => {
  it('should parse valid CSV', () => {
    const csv = `endereco,preco,area_m2
Rua A 100,850000,80
Rua B 200,1200000,120`

    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].endereco).toBe('Rua A 100')
    expect(rows[0].preco).toBe(850000)
    expect(rows[0].area_m2).toBe(80)
  })

  it('should skip rows with missing required fields', () => {
    const csv = `endereco,preco,area_m2
"Rua A",850000,80
,500000,60
"Rua C",0,90`

    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].endereco).toBe('Rua A')
  })

  it('should return empty for header-only CSV', () => {
    const rows = parseCsv('endereco,preco,area_m2')
    expect(rows).toHaveLength(0)
  })

  it('should return empty for empty string', () => {
    const rows = parseCsv('')
    expect(rows).toHaveLength(0)
  })

  it('should handle alternative column names', () => {
    const csv = `endereço,preço,area
"Rua X",900000,95`

    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].preco).toBe(900000)
  })

  it('should handle CSV without quotes', () => {
    const csv = `endereco,preco,area_m2
Rua Simples 100,750000,70`

    const rows = parseCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].endereco).toBe('Rua Simples 100')
  })
})
