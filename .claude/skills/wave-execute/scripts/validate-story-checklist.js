#!/usr/bin/env node

/**
 * Story Validation — 10-Point Checklist (Mechanical)
 * Part of: SP-WAVE-EXECUTE process (ATM-WE-002)
 *
 * Validates story markdown files against the 10-point structural checklist.
 * Does NOT perform semantic validation (e.g., "are ACs testable?") — only
 * structural/mechanical checks that can be automated.
 *
 * Usage:
 *   node .claude/skills/wave-execute/scripts/validate-story-checklist.js <path> [--strict]
 *   node .claude/skills/wave-execute/scripts/validate-story-checklist.js docs/stories/epic-68/STORY-68.7*.md
 *   node .claude/skills/wave-execute/scripts/validate-story-checklist.js docs/stories/epic-68/ --strict
 *
 * Exit codes:
 *   0 = all stories pass (or non-strict mode)
 *   1 = failures found (--strict mode only)
 */

const fs = require('fs')
const path = require('path')

// ─── ANSI Colors ───

const COLOR = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`
}

const PASS = COLOR.green('\u2713')
const FAIL = COLOR.red('\u2717')
const WARN = COLOR.yellow('\u26A0')

// ─── Sensitive Domain Mapping (CHK-3) ───

const SENSITIVE_DOMAINS = [
  { pattern: /workspace\/[^/]+\/L0-identity\/|workspace\/[^/]+\/L0-/, required_qg: '@cso', domain: 'Identity / L0 layer' },
  { pattern: /packages\/db\/|\/migrations\/|schema.*\.sql/, required_qg: '@db-sage', domain: 'Database / Schema / Migrations' },
  { pattern: /\/auth|\/permission|\/rls/, required_qg: '@architect', domain: 'Authentication / Permissions / RLS' },
  { pattern: /apps\/gateway-ai\//, required_qg: '@infra-chief', domain: 'OpenClaw Gateway AI' },
  { pattern: /\.claude\/|squads\/sinkra-squad\/data\//, required_qg: '@sinkra-chief', domain: 'AIOX Framework / SINKRA data' },
  { pattern: /workspace\/[^/]+\/L1-strategy\/pricing|\/financial/, required_qg: '@cso', domain: 'Pricing / Financial data' }
]

// ─── CLI Args ───

function parseArgs () {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const paths = args.filter(a => a !== '--strict')

  if (args.includes('--help') || args.includes('-h') || paths.length === 0) {
    console.log('Usage: node validate-story-checklist.js <path|glob> [--strict]')
    console.log('')
    console.log('Arguments:')
    console.log('  <path>     Story file (.md), directory, or glob pattern')
    console.log('  --strict   Exit code 1 if any check fails')
    console.log('')
    console.log('Examples:')
    console.log('  node validate-story-checklist.js docs/stories/epic-68/STORY-68.7-MIGRATE-DB-SCHEMA-EDGE-FUNCTIONS.md')
    console.log('  node validate-story-checklist.js docs/stories/epic-68/')
    console.log('  node validate-story-checklist.js --strict docs/stories/epic-68/STORY-68.7*.md')
    process.exit(0)
  }

  return { strict, paths }
}

// ─── File Resolution ───

/**
 * Resolve paths to an array of story file paths.
 * Supports: single file, directory, basic glob (trailing *)
 */
function resolveStoryFiles (inputPaths) {
  const files = []

  for (const inputPath of inputPaths) {
    const resolved = path.resolve(inputPath)

    // Check for basic glob pattern with *
    if (inputPath.includes('*')) {
      const dir = path.dirname(resolved.split('*')[0])
      const globPattern = path.basename(inputPath).replace(/\*/g, '.*')
      const regex = new RegExp('^' + globPattern + '$')

      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const entries = fs.readdirSync(dir)
        for (const entry of entries) {
          if (regex.test(entry) && entry.startsWith('STORY-') && entry.endsWith('.md')) {
            files.push(path.join(dir, entry))
          }
        }
      }
      continue
    }

    if (!fs.existsSync(resolved)) {
      console.error(COLOR.red(`[ERROR] Path not found: ${inputPath}`))
      continue
    }

    const stat = fs.statSync(resolved)
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(resolved)
      for (const entry of entries) {
        if (entry.startsWith('STORY-') && entry.endsWith('.md')) {
          files.push(path.join(resolved, entry))
        }
      }
    } else if (stat.isFile() && resolved.endsWith('.md')) {
      files.push(resolved)
    }
  }

  return [...new Set(files)].sort()
}

// ─── Story Parser ───

/**
 * Extract a markdown section by heading name.
 * Returns the content between ## Heading and the next ## heading (or EOF).
 */
function extractSection (content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`## ${escapedHeading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i')
  const match = content.match(regex)
  return match ? match[1] : null
}

/**
 * Extract YAML code block fields from Executor Assignment section.
 * Parses the ```yaml ... ``` block under ## Executor Assignment.
 */
function extractExecutorBlock (content) {
  const executorSection = content.match(/## Executor Assignment\s*\n```yaml\n([\s\S]*?)```/i)
  if (!executorSection) return {}

  const block = executorSection[1]
  const fields = {}

  const lines = block.split('\n')
  for (const line of lines) {
    const match = line.match(/^(\w[\w_]*):\s*(.*)$/)
    if (match) {
      // Strip surrounding quotes and trim
      let value = match[2].trim()
      value = value.replace(/^["'](.*)["']$/, '$1').trim()
      fields[match[1]] = value
    }
  }

  return fields
}

/**
 * Extract frontmatter-style fields from blockquote header.
 * Parses > **Field:** value lines at the top.
 */
function extractHeaderFields (content) {
  const fields = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(/^>\s*\*\*(.+?):\*\*\s*(.+)$/)
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_')
      fields[key] = match[2].trim()
    }
  }

  return fields
}

// ─── 10-Point Checks ───

/**
 * CHK 1: Title follows naming convention STORY-{epic}.{N}-KEBAB-CASE.md
 */
function checkTitleFormat (filePath) {
  const filename = path.basename(filePath)
  const pattern = /^STORY-\d+\.\d+-[A-Z0-9]+(-[A-Z0-9]+)*\.md$/
  const pass = pattern.test(filename)
  return {
    pass,
    detail: pass ? filename : `"${filename}" does not match STORY-{E}.{N}-KEBAB-CASE.md`
  }
}

/**
 * CHK 2: All ACs have checkbox format - [ ] AC{N}: or - [x] AC{N}:
 */
function checkACFormat (content) {
  const section = extractSection(content, 'Acceptance Criteria')
  if (!section) return { pass: false, detail: 'Acceptance Criteria section not found' }

  const acLines = section.split('\n').filter(l => l.trim().startsWith('- ['))
  if (acLines.length === 0) return { pass: false, detail: 'No ACs found' }

  const acPattern = /^- \[([ x])\] AC\d+:/
  const badACs = acLines.filter(l => !acPattern.test(l.trim()))

  if (badACs.length > 0) {
    return {
      pass: false,
      detail: `${badACs.length} AC(s) missing format "- [ ] AC{N}:" — e.g.: ${badACs[0].trim().substring(0, 60)}`
    }
  }

  return { pass: true, detail: `${acLines.length} ACs found` }
}

/**
 * CHK 3: executor field is non-empty
 */
function checkExecutor (executorFields) {
  const executor = executorFields.executor || ''
  const pass = executor.length > 0
  return { pass, detail: pass ? executor : 'empty', value: executor }
}

/**
 * CHK 4: quality_gate field is non-empty AND different from executor
 */
function checkQualityGate (executorFields) {
  const qg = executorFields.quality_gate || ''
  const executor = executorFields.executor || ''

  if (!qg) return { pass: false, detail: 'empty', value: '' }
  if (qg === executor) return { pass: false, detail: `same as executor (${qg})`, value: qg }
  return { pass: true, detail: `${qg} (\u2260 executor)`, value: qg }
}

/**
 * CHK 5: depends_on references are valid story IDs (format check)
 */
function checkDependsOn (headerFields) {
  const raw = headerFields.depends_on || ''
  if (!raw || raw.toLowerCase() === 'none') {
    return { pass: true, detail: 'None (no dependencies)' }
  }

  // Extract story ID references like 68.2, 67.1, etc.
  const refs = raw.match(/\d+\.\d+/g) || []
  if (refs.length === 0) {
    return { pass: false, detail: `"${raw}" — no valid story ID format found` }
  }

  return { pass: true, detail: refs.join(', ') }
}

/**
 * CHK 6: effort estimate is present (matches pattern like 1h, 2h, 0.5h, etc.)
 */
function checkEffort (headerFields) {
  const effort = headerFields.estimated_effort || ''
  const pattern = /\d+\.?\d*\s*h/i
  const pass = pattern.test(effort)
  return { pass, detail: pass ? effort : (effort || 'missing') }
}

/**
 * CHK 7: repo_target is present
 */
function checkRepoTarget (executorFields) {
  const target = executorFields.repo_target || ''
  const pass = target.length > 0
  return { pass, detail: pass ? target : 'missing' }
}

/**
 * CHK 8: Tasks section has at least 1 task item
 */
function checkTasks (content) {
  const section = extractSection(content, 'Tasks')
  if (!section) return { pass: false, detail: 'Tasks section not found' }

  const taskLines = section.split('\n').filter(l => /^- \[[ x]\]/.test(l.trim()))
  const pass = taskLines.length > 0
  return { pass, detail: pass ? `${taskLines.length} tasks found` : 'no task items found' }
}

/**
 * CHK 9: Dev Notes section exists and is non-empty
 */
function checkDevNotes (content) {
  const section = extractSection(content, 'Dev Notes')
  if (!section) return { pass: false, detail: 'Dev Notes section not found' }

  const lines = section.split('\n').filter(l => l.trim().length > 0)
  const pass = lines.length > 0
  return { pass, detail: pass ? `present (${lines.length} lines)` : 'section empty' }
}

/**
 * CHK 10: Story section has "As a" / "I want" / "so that" format
 */
function checkStoryFormat (content) {
  const section = extractSection(content, 'Story')
  if (!section) return { pass: false, detail: 'Story section not found' }

  const text = section
  const hasAsA = /\*?\*?As an?\*?\*?/i.test(text)
  const hasIWant = /\*?\*?I want\*?\*?/i.test(text)
  const hasSoThat = /\*?\*?so that\*?\*?/i.test(text)

  const missing = []
  if (!hasAsA) missing.push('"As a"')
  if (!hasIWant) missing.push('"I want"')
  if (!hasSoThat) missing.push('"so that"')

  if (missing.length > 0) {
    return { pass: false, detail: `missing: ${missing.join(', ')}` }
  }

  return { pass: true, detail: 'As a/I want/so that' }
}

// ─── CHK-3: Sensitive Domain Check ───

/**
 * Check if story content references sensitive file paths and if the
 * assigned QG agent matches the required one.
 */
function checkSensitiveDomain (content, executorFields) {
  const qg = executorFields.quality_gate || ''
  const warnings = []

  for (const domain of SENSITIVE_DOMAINS) {
    if (domain.pattern.test(content)) {
      if (qg && qg !== domain.required_qg) {
        warnings.push({
          domain: domain.domain,
          required_qg: domain.required_qg,
          assigned_qg: qg
        })
      }
    }
  }

  return warnings
}

// ─── Validation Runner ───

function validateStory (filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const filename = path.basename(filePath)
  const storyIdMatch = filename.match(/STORY-(\d+\.\d+)/)
  const storyId = storyIdMatch ? `STORY-${storyIdMatch[1]}` : filename

  const headerFields = extractHeaderFields(content)
  const executorFields = extractExecutorBlock(content)

  const checks = [
    { num: 1, name: 'Title format', result: checkTitleFormat(filePath) },
    { num: 2, name: 'ACs have checkboxes', result: checkACFormat(content) },
    { num: 3, name: 'executor', result: checkExecutor(executorFields) },
    { num: 4, name: 'quality_gate', result: checkQualityGate(executorFields) },
    { num: 5, name: 'depends_on', result: checkDependsOn(headerFields) },
    { num: 6, name: 'effort', result: checkEffort(headerFields) },
    { num: 7, name: 'repo_target', result: checkRepoTarget(executorFields) },
    { num: 8, name: 'tasks', result: checkTasks(content) },
    { num: 9, name: 'dev_notes', result: checkDevNotes(content) },
    { num: 10, name: 'story format', result: checkStoryFormat(content) }
  ]

  const passCount = checks.filter(c => c.result.pass).length
  const allPass = passCount === 10

  // CHK-3: Sensitive domain warnings
  const sensitiveWarnings = checkSensitiveDomain(content, executorFields)

  return {
    storyId,
    filePath,
    checks,
    passCount,
    allPass,
    sensitiveWarnings,
    executor: executorFields.executor || '',
    quality_gate: executorFields.quality_gate || ''
  }
}

// ─── Output ───

function printResult (result) {
  const statusIcon = result.allPass ? PASS : WARN
  const statusText = result.allPass
    ? COLOR.green(`${result.passCount}/10 PASS`)
    : COLOR.red(`${result.passCount}/10 FAIL`)

  console.log(`${statusIcon} ${COLOR.bold(result.storyId)}: ${statusText}`)

  for (const check of result.checks) {
    const icon = check.result.pass ? PASS : FAIL
    const detail = check.result.pass
      ? COLOR.dim(check.result.detail)
      : COLOR.red(check.result.detail)

    console.log(`  ${check.num.toString().padStart(2)}. ${icon} ${check.name}: ${detail}`)
  }

  // CHK-3: Sensitive domain warnings
  if (result.sensitiveWarnings.length > 0) {
    console.log('')
    console.log(`  ${COLOR.yellow('CHK-3 Sensitive Domain Warning:')}`)
    for (const w of result.sensitiveWarnings) {
      console.log(`    ${WARN} Domain "${w.domain}" requires QG ${COLOR.bold(w.required_qg)}, assigned: ${w.assigned_qg}`)
    }
  }

  // Pipeline-consumable metadata
  if (result.executor || result.quality_gate) {
    console.log('')
    console.log(`  ${COLOR.dim(`[pipeline] executor=${result.executor} quality_gate=${result.quality_gate}`)}`)
  }

  console.log('')
}

function printSummary (results) {
  const total = results.length
  const passed = results.filter(r => r.allPass).length
  const failed = total - passed

  console.log(COLOR.bold('─── Summary ───'))
  console.log(`  Total stories: ${total}`)
  console.log(`  ${COLOR.green(`Passed: ${passed}`)}`)
  if (failed > 0) {
    console.log(`  ${COLOR.red(`Failed: ${failed}`)}`)
  }

  // Aggregate sensitive domain warnings
  const allSensitiveWarnings = results.flatMap(r =>
    r.sensitiveWarnings.map(w => ({ story: r.storyId, ...w }))
  )
  if (allSensitiveWarnings.length > 0) {
    console.log('')
    console.log(COLOR.yellow(`  CHK-3: ${allSensitiveWarnings.length} sensitive domain warning(s)`))
    for (const w of allSensitiveWarnings) {
      console.log(`    ${w.story}: ${w.domain} requires ${w.required_qg}, got ${w.assigned_qg}`)
    }
  }

  console.log('')
}

// ─── Main ───

function main () {
  const { strict, paths } = parseArgs()
  const files = resolveStoryFiles(paths)

  if (files.length === 0) {
    console.error(COLOR.red('[ERROR] No story files found.'))
    process.exit(1)
  }

  console.log('')
  console.log(COLOR.bold('╔══════════════════════════════════════════════════════════╗'))
  console.log(COLOR.bold('║     STORY VALIDATION — 10-Point Checklist (ATM-WE-002)  ║'))
  console.log(COLOR.bold('╚══════════════════════════════════════════════════════════╝'))
  console.log('')

  const results = []

  for (const file of files) {
    try {
      const result = validateStory(file)
      results.push(result)
      printResult(result)
    } catch (err) {
      console.error(COLOR.red(`[ERROR] Failed to validate ${path.basename(file)}: ${err.message}`))
    }
  }

  if (results.length > 1) {
    printSummary(results)
  }

  // Exit code
  const hasFailures = results.some(r => !r.allPass)
  if (strict && hasFailures) {
    process.exit(1)
  }

  process.exit(0)
}

main()
