#!/usr/bin/env node

/**
 * Handoff Validator — Quality Checklist Scoring
 * Part of: .claude/skills/handoff/ (SP-HANDOFF-GEN)
 *
 * Scores handoff files (YAML or Markdown) against quality checklists.
 * Supports both .aiox/handoffs/*.yaml and docs/sessions/**\/*.md files.
 *
 * Usage:
 *   node .claude/skills/handoff/scripts/validate-handoff.js <path>
 *   node .claude/skills/handoff/scripts/validate-handoff.js --lite <path>
 *   node .claude/skills/handoff/scripts/validate-handoff.js --summary <path>
 *
 * Exit codes:
 *   0 = all files PASS
 *   1 = one or more files FAIL
 */

const fs = require('fs')
const path = require('path')

// ─── ANSI Colors ───

const C = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  red: s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  ok: '\x1b[32m✓\x1b[0m',
  fail: '\x1b[31m✗\x1b[0m'
}

// ─── Simple YAML Parser (no deps) ───

/**
 * Parses simple YAML (key: value, lists with - prefix, nested objects).
 * Not a full YAML parser — handles the subset used by handoff files.
 */
function parseSimpleYaml (text) {
  const result = {}
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  // Stack tracks { obj, indent, lastKey } — the object context at each nesting level
  const stack = [{ obj: result, indent: -1, lastKey: null }]

  function currentCtx () { return stack[stack.length - 1] }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip comments and empty lines
    if (/^\s*#/.test(line) || /^\s*$/.test(line)) continue

    const match = line.match(/^(\s*)(.+)$/)
    if (!match) continue

    const indent = match[1].length
    const content = match[2]

    // Pop stack to find correct parent level
    while (stack.length > 1 && currentCtx().indent >= indent) {
      stack.pop()
    }

    const ctx = currentCtx()

    // List item: "- value"
    if (content.startsWith('- ')) {
      const rawVal = content.slice(2).trim()

      // List item that is a key-value pair (e.g., "- id: foo")
      const kvInList = rawVal.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s+(.+)$/)

      if (ctx.lastKey !== null) {
        const arr = ctx.obj[ctx.lastKey]
        if (Array.isArray(arr)) {
          if (kvInList) {
            // Start a new object within the list
            const itemObj = {}
            itemObj[kvInList[1]] = kvInList[2].replace(/^["']|["']$/g, '')
            arr.push(itemObj)
            // Push context so subsequent key-value lines attach to this object
            stack.push({ obj: itemObj, indent: indent + 2, lastKey: kvInList[1] })
          } else {
            arr.push(rawVal.replace(/^["']|["']$/g, ''))
          }
        }
      }
      continue
    }

    // Key-value or nested object: "key: value" or "key:"
    const kvMatch = content.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (kvMatch) {
      const key = kvMatch[1]
      const rawValue = kvMatch[2].trim()
      const value = rawValue.replace(/^["']|["']$/g, '')

      if (rawValue === '' || rawValue === '|' || rawValue === '>') {
        // Look ahead: if next content line is a list item, this is a list parent
        let nextIsList = false
        for (let j = i + 1; j < lines.length; j++) {
          const nl = lines[j]
          if (/^\s*#/.test(nl) || /^\s*$/.test(nl)) continue
          const nm = nl.match(/^(\s*)(.+)$/)
          if (nm && nm[1].length > indent && nm[2].startsWith('- ')) {
            nextIsList = true
          }
          break
        }

        if (nextIsList) {
          // This key introduces a list
          ctx.obj[key] = []
          ctx.lastKey = key
        } else {
          // Nested object — create child object and push onto stack
          ctx.obj[key] = {}
          ctx.lastKey = key
          stack.push({ obj: ctx.obj[key], indent, lastKey: null })
        }
      } else if (rawValue === '[]') {
        ctx.obj[key] = []
        ctx.lastKey = key
      } else {
        // Check if next non-empty, non-comment line is a list item at deeper indent
        let isListParent = false
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j]
          if (/^\s*#/.test(nextLine) || /^\s*$/.test(nextLine)) continue
          const nextMatch = nextLine.match(/^(\s*)(.+)$/)
          if (nextMatch) {
            const nextIndent = nextMatch[1].length
            const nextContent = nextMatch[2]
            if (nextIndent > indent && nextContent.startsWith('- ')) {
              isListParent = true
            }
          }
          break
        }

        if (isListParent) {
          // This key introduces a list — the value on this line is ignored or part of flow syntax
          ctx.obj[key] = []
          ctx.lastKey = key
        } else {
          ctx.obj[key] = value
          ctx.lastKey = key
        }
      }
      continue
    }
  }

  return result
}

/**
 * Recursively flatten a parsed YAML object into dot-notated keys.
 * Returns a flat map like { "handoff.from": "@dev", "context.what_was_done": [...] }
 */
function flattenObj (obj, prefix = '') {
  const flat = {}
  for (const [key, val] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(flat, flattenObj(val, p))
    } else {
      flat[p] = val
    }
  }
  return flat
}

// ─── Data Extraction ───

/**
 * Extracts handoff data from a YAML file into a normalized structure.
 */
function extractFromYaml (content) {
  const parsed = parseSimpleYaml(content)
  const flat = flattenObj(parsed)

  // Helper to get value from nested or flat keys
  const get = (...keys) => {
    for (const k of keys) {
      if (flat[k] !== undefined) return flat[k]
    }
    return undefined
  }

  const getArray = (...keys) => {
    for (const k of keys) {
      const v = flat[k]
      if (Array.isArray(v) && v.length > 0) return v
    }
    return []
  }

  return {
    from: get('handoff.from', 'from'),
    to: get('handoff.to', 'to'),
    date: get('handoff.date', 'date'),
    scope: get('handoff.scope', 'scope'),
    what_was_done: getArray('context.what_was_done', 'what_was_done'),
    what_remains: getArray('context.what_remains', 'what_remains'),
    files_modified: getArray('context.files_modified', 'files_modified'),
    files_reference: getArray('context.files_reference', 'files_reference'),
    decisions_made: flat['context.decisions_made'] !== undefined
      ? (Array.isArray(flat['context.decisions_made']) ? flat['context.decisions_made'] : [])
      : undefined,
    blockers: flat['context.blockers'] !== undefined
      ? (Array.isArray(flat['context.blockers']) ? flat['context.blockers'] : [])
      : undefined,
    consumed: get('consumed', 'handoff.consumed', 'context.consumed'),
    signoff: flat['signoff.required'] !== undefined || flat['handoff.signoff'] !== undefined
      ? { present: true }
      : undefined,
    raw: content
  }
}

/**
 * Extracts handoff data from a Markdown file by looking for YAML frontmatter,
 * YAML code blocks, and Markdown structure.
 */
function extractFromMarkdown (content) {
  const data = {
    from: undefined,
    to: undefined,
    date: undefined,
    scope: undefined,
    what_was_done: [],
    what_remains: [],
    files_modified: [],
    files_reference: [],
    decisions_made: undefined,
    blockers: undefined,
    consumed: undefined,
    signoff: undefined,
    raw: content
  }

  // Extract from YAML code blocks
  const yamlBlocks = content.match(/```yaml\n([\s\S]*?)```/g) || []
  for (const block of yamlBlocks) {
    const yamlContent = block.replace(/```yaml\n/, '').replace(/```$/, '')
    const parsed = parseSimpleYaml(yamlContent)
    const flat = flattenObj(parsed)

    if (flat['handoff.from'] || flat['artifact.id']) {
      data.from = data.from || flat['handoff.from'] || flat['from']
      data.to = data.to || flat['handoff.to'] || flat['to']
      data.date = data.date || flat['handoff.date'] || flat['artifact.created'] || flat['date']
      data.scope = data.scope || flat['handoff.scope'] || flat['artifact.scope'] || flat['scope']
    }
  }

  // Extract from inline fields (e.g., **Date:** 2026-03-28)
  const dateMatch = content.match(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) data.date = data.date || dateMatch[1]

  const scopeMatch = content.match(/\*\*Scope:\*\*\s*(\S+)/)
  if (scopeMatch) data.scope = data.scope || scopeMatch[1]

  const fromMatch = content.match(/\*\*(?:From|Owner):\*\*\s*(.+)/)
  if (fromMatch) data.from = data.from || fromMatch[1].trim()

  const toMatch = content.match(/\*\*(?:To|Next Agent):\*\*\s*(.+)/)
  if (toMatch) data.to = data.to || toMatch[1].trim()

  // Extract sections by Markdown headings
  const sections = content.split(/^##\s+/m)

  for (const section of sections) {
    const heading = section.split('\n')[0].toLowerCase().trim()
    const bullets = (section.match(/^[-*]\s+.+/gm) || []).map(b => b.replace(/^[-*]\s+/, '').trim())

    if (/what was done|what_was_done|completed|what happened|executive summary/.test(heading)) {
      data.what_was_done = bullets.length > 0 ? bullets : data.what_was_done
    }
    if (/what remains|what_remains|next steps|remaining|todo|what is missing|what was not done|execution plan/.test(heading)) {
      data.what_remains = bullets.length > 0 ? bullets : data.what_remains
    }
    if (/files|modified|changed|create\/modify/.test(heading)) {
      data.files_modified = bullets.length > 0 ? bullets : data.files_modified
    }
    if (/decision/.test(heading)) {
      data.decisions_made = bullets
    }
    if (/blocker|veto/.test(heading)) {
      data.blockers = bullets
    }
  }

  // Fallback: scan for "what_was_done" sections in YAML blocks
  for (const block of yamlBlocks) {
    const yamlContent = block.replace(/```yaml\n/, '').replace(/```$/, '')
    const parsed = parseSimpleYaml(yamlContent)
    const flat = flattenObj(parsed)

    if (Array.isArray(flat['context.what_was_done']) && flat['context.what_was_done'].length > 0) {
      data.what_was_done = data.what_was_done.length === 0 ? flat['context.what_was_done'] : data.what_was_done
    }
    if (Array.isArray(flat['context.what_remains']) && flat['context.what_remains'].length > 0) {
      data.what_remains = data.what_remains.length === 0 ? flat['context.what_remains'] : data.what_remains
    }
    if (Array.isArray(flat['context.files_modified']) && flat['context.files_modified'].length > 0) {
      data.files_modified = data.files_modified.length === 0 ? flat['context.files_modified'] : data.files_modified
    }
    if (flat['context.decisions_made'] !== undefined && data.decisions_made === undefined) {
      data.decisions_made = Array.isArray(flat['context.decisions_made']) ? flat['context.decisions_made'] : []
    }
    if (flat['context.blockers'] !== undefined && data.blockers === undefined) {
      data.blockers = Array.isArray(flat['context.blockers']) ? flat['context.blockers'] : []
    }
  }

  // Check for consumed marker
  if (/consumed|consumption/.test(content.toLowerCase())) {
    data.consumed = 'detected'
  }

  // Check for signoff block
  if (/signoff|sign-off|approval/i.test(content)) {
    data.signoff = { present: true }
  }

  return data
}

/**
 * Extract data from file content based on format.
 */
function extractData (content, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.yaml' || ext === '.yml') {
    return extractFromYaml(content)
  }
  return extractFromMarkdown(content)
}

// ─── Placeholder Detection ───

const PLACEHOLDER_PATTERNS = [
  /\{[A-Z_]+\}/,           // {PLACEHOLDER}
  /\{[a-z_]+\}/,           // {placeholder}
  /\bTODO\b/i,             // TODO
  /\bTBD\b/i,              // TBD
  /\bFIXME\b/i,            // FIXME
  /\bXXX\b/                // XXX
]

function hasPlaceholders (content) {
  // Exclude comments and template reference lines
  const lines = content.split('\n').filter(l => !l.trim().startsWith('#') && !l.trim().startsWith('//'))
  const text = lines.join('\n')

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(text)) return true
  }
  return false
}

// ─── Checklist Validators ───

/**
 * Full 10-point checklist for complete handoffs.
 */
function validateFull (data) {
  const checks = []

  // 1. from/to/date fields present
  const hasFrom = !!data.from
  const hasTo = !!data.to
  const hasDate = !!data.date
  const allPresent = hasFrom && hasTo && hasDate
  checks.push({
    id: 1,
    name: 'from/to/date fields present',
    pass: allPresent,
    detail: allPresent
      ? `from: ${data.from} | to: ${data.to} | date: ${data.date}`
      : `${!hasFrom ? 'from: MISSING' : ''} ${!hasTo ? 'to: MISSING' : ''} ${!hasDate ? 'date: MISSING' : ''}`.trim()
  })

  // 2. scope field present
  const validScopes = ['intra_processo', 'intra_bu', 'inter_bu']
  const hasScope = !!data.scope && (validScopes.includes(data.scope) || data.scope.length > 0)
  checks.push({
    id: 2,
    name: 'scope field present',
    pass: hasScope,
    detail: hasScope ? `scope: ${data.scope}` : 'MISSING'
  })

  // 3. what_was_done has min 3 items
  const doneCount = data.what_was_done.length
  checks.push({
    id: 3,
    name: 'what_was_done has min 3 items',
    pass: doneCount >= 3,
    detail: `${doneCount} items`
  })

  // 4. what_remains has min 1 item
  const remainsCount = data.what_remains.length
  checks.push({
    id: 4,
    name: 'what_remains has min 1 item',
    pass: remainsCount >= 1,
    detail: `${remainsCount} items`
  })

  // 5. files_modified or files_reference non-empty
  const filesCount = data.files_modified.length + data.files_reference.length
  checks.push({
    id: 5,
    name: 'files_modified or files_reference non-empty',
    pass: filesCount > 0,
    detail: filesCount > 0 ? `${filesCount} files` : 'EMPTY'
  })

  // 6. decisions_made present (even if empty array)
  const decisionsPresent = data.decisions_made !== undefined
  checks.push({
    id: 6,
    name: 'decisions_made present (even if empty array)',
    pass: decisionsPresent,
    detail: decisionsPresent
      ? `${Array.isArray(data.decisions_made) ? data.decisions_made.length : 0} items`
      : 'MISSING'
  })

  // 7. blockers present (even if empty array)
  const blockersPresent = data.blockers !== undefined
  checks.push({
    id: 7,
    name: 'blockers present (even if empty array)',
    pass: blockersPresent,
    detail: blockersPresent
      ? `${Array.isArray(data.blockers) ? data.blockers.length : 0} items`
      : 'MISSING'
  })

  // 8. No unresolved placeholders
  const placeholders = hasPlaceholders(data.raw)
  checks.push({
    id: 8,
    name: 'No unresolved placeholders ({}, TODO, TBD)',
    pass: !placeholders,
    detail: placeholders ? 'FOUND placeholders' : 'clean'
  })

  // 9. For inter_bu: signoff block present
  const isInterBu = data.scope === 'inter_bu'
  const signoffOk = isInterBu ? !!(data.signoff && data.signoff.present) : true
  checks.push({
    id: 9,
    name: 'For inter_bu: signoff block present',
    pass: signoffOk,
    detail: isInterBu
      ? (signoffOk ? 'signoff present' : 'MISSING (required for inter_bu)')
      : 'N/A (not inter_bu)'
  })

  // 10. consumed field present
  const consumedPresent = data.consumed !== undefined && data.consumed !== null
  checks.push({
    id: 10,
    name: 'consumed field present',
    pass: consumedPresent,
    detail: consumedPresent ? `consumed: ${data.consumed}` : 'MISSING'
  })

  return checks
}

/**
 * Lite 6-point checklist for agent-to-agent handoffs.
 */
function validateLite (data) {
  const checks = []

  // 1. from/to/date present
  const hasFrom = !!data.from
  const hasTo = !!data.to
  const hasDate = !!data.date
  const allPresent = hasFrom && hasTo && hasDate
  checks.push({
    id: 1,
    name: 'from/to/date present',
    pass: allPresent,
    detail: allPresent
      ? `from: ${data.from} | to: ${data.to} | date: ${data.date}`
      : `${!hasFrom ? 'from: MISSING' : ''} ${!hasTo ? 'to: MISSING' : ''} ${!hasDate ? 'date: MISSING' : ''}`.trim()
  })

  // 2. what_was_done has min 3 items
  const doneCount = data.what_was_done.length
  checks.push({
    id: 2,
    name: 'what_was_done has min 3 items',
    pass: doneCount >= 3,
    detail: `${doneCount} items`
  })

  // 3. what_remains has min 1 item
  const remainsCount = data.what_remains.length
  checks.push({
    id: 3,
    name: 'what_remains has min 1 item',
    pass: remainsCount >= 1,
    detail: `${remainsCount} items`
  })

  // 4. files_modified non-empty
  const filesCount = data.files_modified.length + data.files_reference.length
  checks.push({
    id: 4,
    name: 'files_modified non-empty',
    pass: filesCount > 0,
    detail: filesCount > 0 ? `${filesCount} files` : 'EMPTY'
  })

  // 5. decisions_made present
  const decisionsPresent = data.decisions_made !== undefined
  checks.push({
    id: 5,
    name: 'decisions_made present',
    pass: decisionsPresent,
    detail: decisionsPresent
      ? `${Array.isArray(data.decisions_made) ? data.decisions_made.length : 0} items`
      : 'MISSING'
  })

  // 6. No placeholders
  const placeholders = hasPlaceholders(data.raw)
  checks.push({
    id: 6,
    name: 'No placeholders',
    pass: !placeholders,
    detail: placeholders ? 'FOUND placeholders' : 'clean'
  })

  return checks
}

// ─── Output Formatting ───

function formatResult (fileName, checks, totalPoints) {
  const score = checks.filter(c => c.pass).length
  const label = score >= Math.ceil(totalPoints * 0.7) ? C.green('PASS') : C.red('FAIL')

  console.log(`${C.bold(fileName)}: ${C.cyan(`${score}/${totalPoints}`)} ${label}`)

  for (const check of checks) {
    const icon = check.pass ? C.ok : C.fail
    console.log(`  ${check.id}. ${icon} ${check.name}: ${C.dim(check.detail)}`)
  }

  return { fileName, score, total: totalPoints, pass: score >= Math.ceil(totalPoints * 0.7), checks }
}

// ─── File Discovery ───

function discoverFiles (inputPath) {
  const resolved = path.resolve(inputPath)

  if (!fs.existsSync(resolved)) {
    console.error(C.red(`Error: path not found: ${resolved}`))
    process.exit(1)
  }

  const stat = fs.statSync(resolved)

  if (stat.isFile()) {
    return [resolved]
  }

  if (stat.isDirectory()) {
    const files = []
    const entries = fs.readdirSync(resolved, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && /\.(yaml|yml|md)$/.test(entry.name)) {
        files.push(path.join(resolved, entry.name))
      }
    }
    // Also scan subdirectories one level deep
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(resolved, entry.name)
        const subEntries = fs.readdirSync(subDir, { withFileTypes: true })
        for (const subEntry of subEntries) {
          if (subEntry.isFile() && /\.(yaml|yml|md)$/.test(subEntry.name)) {
            files.push(path.join(subDir, subEntry.name))
          }
        }
      }
    }
    return files.sort()
  }

  return []
}

// ─── Summary Statistics ───

function printSummary (results) {
  const total = results.length
  if (total === 0) {
    console.log(C.yellow('\nNo handoff files found.'))
    return
  }

  const scores = results.map(r => r.score)
  const avgScore = (scores.reduce((a, b) => a + b, 0) / total).toFixed(1)
  const maxTotal = results[0].total

  // Count specific missing fields across all results
  let missingScope = 0
  let missingConsumed = 0
  let consumed = 0
  let unconsumed = 0

  for (const r of results) {
    for (const c of r.checks) {
      if (c.id === 2 && c.name.includes('scope') && !c.pass) missingScope++
      if (c.name.includes('consumed')) {
        if (!c.pass) {
          missingConsumed++
          unconsumed++
        } else {
          consumed++
        }
      }
    }
  }

  const passCount = results.filter(r => r.pass).length
  const failCount = total - passCount

  console.log(`\n${C.bold('Summary')} (${total} handoffs):`)
  console.log(`  avg_score: ${C.cyan(`${avgScore}/${maxTotal}`)}`)
  console.log(`  pass: ${C.green(passCount)} (${Math.round(passCount / total * 100)}%)`)
  console.log(`  fail: ${failCount > 0 ? C.red(failCount) : failCount} (${Math.round(failCount / total * 100)}%)`)
  if (maxTotal === 10) {
    console.log(`  missing_scope: ${missingScope} (${Math.round(missingScope / total * 100)}%)`)
    console.log(`  consumed: ${consumed} (${Math.round(consumed / total * 100)}%)`)
    console.log(`  unconsumed: ${unconsumed} (${Math.round(unconsumed / total * 100)}%)`)
  }

  // Score distribution
  const dist = {}
  for (const s of scores) {
    dist[s] = (dist[s] || 0) + 1
  }
  console.log('  score_distribution:')
  for (let i = maxTotal; i >= 0; i--) {
    if (dist[i]) {
      console.log(`    ${i}: ${dist[i]}`)
    }
  }
}

// ─── Main ───

function main () {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${C.bold('Handoff Validator')} — Quality Checklist Scoring

${C.cyan('Usage:')}
  node validate-handoff.js <file-or-directory>
  node validate-handoff.js --lite <file-or-directory>
  node validate-handoff.js --summary <file-or-directory>

${C.cyan('Options:')}
  --lite      Use 6-point lite checklist (agent-to-agent)
  --summary   Print summary statistics after validation
  --help, -h  Show this help

${C.cyan('Checklists:')}
  Full (10-point): from/to/date, scope, what_was_done(3+), what_remains(1+),
    files, decisions, blockers, no placeholders, inter_bu signoff, consumed
  Lite (6-point): from/to/date, what_was_done(3+), what_remains(1+),
    files, decisions, no placeholders

${C.cyan('Exit codes:')}
  0 = all PASS | 1 = failures found
`)
    process.exit(0)
  }

  const isLite = args.includes('--lite')
  const isSummary = args.includes('--summary')
  const filePaths = args.filter(a => !a.startsWith('--'))

  if (filePaths.length === 0) {
    console.error(C.red('Error: no file or directory path provided.'))
    process.exit(1)
  }

  const inputPath = filePaths[0]
  const files = discoverFiles(inputPath)

  if (files.length === 0) {
    console.error(C.red(`No .yaml/.yml/.md files found at: ${inputPath}`))
    process.exit(1)
  }

  const totalPoints = isLite ? 6 : 10
  const results = []
  let hasFailures = false

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = extractData(content, filePath)
    const checks = isLite ? validateLite(data) : validateFull(data)
    const fileName = path.relative(process.cwd(), filePath)
    const result = formatResult(fileName, checks, totalPoints)
    results.push(result)
    if (!result.pass) hasFailures = true
    if (files.length > 1) console.log('')
  }

  if (isSummary || files.length > 1) {
    printSummary(results)
  }

  process.exit(hasFailures ? 1 : 0)
}

main()
