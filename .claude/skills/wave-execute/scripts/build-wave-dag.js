#!/usr/bin/env node

/**
 * Build Wave DAG — Mission Pattern Execution Planner
 * Wave Execute Skill — SINKRA Mission Pattern
 *
 * Reads an Epic markdown file + individual STORY-*.md files for a given wave,
 * extracts executor assignments and dependencies, builds a topological DAG,
 * groups stories into parallel execution batches, and outputs plan.yaml.
 *
 * Usage:
 *   node .claude/skills/wave-execute/scripts/build-wave-dag.js <epic> <wave> [options]
 *
 * Examples:
 *   node .claude/skills/wave-execute/scripts/build-wave-dag.js epic-68 2
 *   node .claude/skills/wave-execute/scripts/build-wave-dag.js epic-68 2 --calibration 0.4
 *   node .claude/skills/wave-execute/scripts/build-wave-dag.js epic-68 2 --dry-run
 *
 * Options:
 *   --calibration <float>  Effort calibration multiplier (default: 0.3)
 *   --dry-run              Print plan to stdout only, do not write file
 *   --json                 Also output plan.json (machine-readable for wave-coordinator)
 *   --help, -h             Show this help message
 *
 * Exit codes:
 *   0 = SUCCESS (plan generated)
 *   1 = ERROR (missing args, circular dependency, no stories found)
 *
 * Tokens referenced:
 *   TK-WE-017: decomposition_effort_threshold (8h)
 *   TK-WE-018: decomposition_task_threshold (6)
 */

const fs = require('fs')
const path = require('path')

// ─── Constants ───

const ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const STORIES_DIR = path.join(ROOT, 'docs', 'stories')

/**
 * Auto-detect state directory — supports both .aiox/ (Spoke) and .aiox/ (Hub).
 * Falls back to .aiox/ if neither exists (will be created on first write).
 */
function detectStateDir () {
  const aiox = path.join(ROOT, '.aiox')
  if (fs.existsSync(aiox)) return aiox
  return aiox // default fallback
}

const WAVES_DIR = path.join(detectStateDir(), 'waves')

/** Default effort calibration multiplier (retrospective-based) */
const DEFAULT_CALIBRATION = 0.3

/** TK-WE-017: Stories with effort > this are decomposition candidates */
const DECOMPOSITION_EFFORT_THRESHOLD = 8

/** TK-WE-018: Stories with tasks > this are decomposition candidates */
const DECOMPOSITION_TASK_THRESHOLD = 6

// ─── CLI Args ───

function parseArgs () {
  const args = process.argv.slice(2)
  let epic = null
  let wave = null
  let calibration = DEFAULT_CALIBRATION
  let dryRun = false
  let outputJson = false

  if (args.includes('--help') || args.includes('-h') || args.length < 2) {
    console.log('Usage: node build-wave-dag.js <epic> <wave> [options]')
    console.log('')
    console.log('Arguments:')
    console.log('  <epic>                   Epic identifier (e.g., epic-68)')
    console.log('  <wave>                   Wave number (e.g., 2)')
    console.log('')
    console.log('Options:')
    console.log('  --calibration <float>    Effort calibration multiplier (default: 0.3)')
    console.log('  --dry-run                Print plan to stdout only, no file write')
    console.log('  --json                   Also output plan.json (machine-readable)')
    console.log('  --help, -h               Show this help message')
    console.log('')
    console.log('Examples:')
    console.log('  node build-wave-dag.js epic-68 2')
    console.log('  node build-wave-dag.js epic-68 2 --calibration 0.4')
    console.log('  node build-wave-dag.js epic-68 2 --dry-run')
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1)
  }

  // Positional args
  epic = args[0]
  wave = parseInt(args[1], 10)

  if (isNaN(wave) || wave < 1) {
    console.error(`[BUILD-WAVE-DAG] Número de wave inválido: "${args[1]}"`)
    console.error('  Wave deve ser um inteiro positivo (ex: 1, 2, 3)')
    process.exit(1)
  }

  // Named args
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--calibration' && args[i + 1]) {
      calibration = parseFloat(args[i + 1])
      if (isNaN(calibration) || calibration <= 0) {
        console.error(`[BUILD-WAVE-DAG] Calibração inválida: "${args[i + 1]}"`)
        console.error('  Deve ser um float positivo (ex: 0.3, 0.4, 1.0)')
        process.exit(1)
      }
      i++
    }
    if (args[i] === '--dry-run') {
      dryRun = true
    }
    if (args[i] === '--json') {
      outputJson = true
    }
  }

  return { epic, wave, calibration, dryRun, outputJson }
}

// ─── Epic Parsing ───

/**
 * Parse the Epic markdown file to discover which stories belong to which wave.
 * Looks for "### Wave N" headers and extracts story references (68.1, 68.2, etc.)
 * Returns a map: { waveNumber: [storyId, ...] }
 */
function parseEpicWaves (epicDir, epicNum) {
  // Find the EPIC-*.md file
  const files = fs.readdirSync(epicDir)
  const epicFile = files.find(f => f.match(/^EPIC-\d+.*\.md$/i) && !f.includes('ROUNDTABLE') && !f.includes('VALIDATION'))

  if (!epicFile) {
    console.error(`[BUILD-WAVE-DAG] Arquivo EPIC-*.md não encontrado em ${epicDir}`)
    process.exit(1)
  }

  const content = fs.readFileSync(path.join(epicDir, epicFile), 'utf-8')
  const waveMap = {}
  let currentWave = null

  const lines = content.split('\n')
  for (const line of lines) {
    // Match "### Wave N" headers (with optional description after em-dash or colon)
    const waveMatch = line.match(/^###\s+Wave\s+(\d+)\s*[—:\-]/)
    if (waveMatch) {
      currentWave = parseInt(waveMatch[1], 10)
      if (!waveMap[currentWave]) waveMap[currentWave] = []
      continue
    }

    // Within a wave section, find story references like "Story 68.1" or "#### Story 68.1"
    if (currentWave !== null) {
      // Stop at next wave header or next ## section
      if (line.match(/^##\s/) && !line.match(/^###\s+Wave/)) {
        currentWave = null
        continue
      }

      // Extract story IDs from various formats:
      // "#### Story 68.1 — Title"
      // "Story 68.1" in text
      // story refs in depends_on arrays
      const storyMatches = line.matchAll(new RegExp(`(${epicNum}\\.\\d+)`, 'g'))
      for (const m of storyMatches) {
        const storyId = m[1]
        if (!waveMap[currentWave].includes(storyId)) {
          waveMap[currentWave].push(storyId)
        }
      }
    }
  }

  return waveMap
}

// ─── Story File Parsing ───

/**
 * Extract metadata from a STORY-*.md file header block.
 *
 * Parses two sources:
 * 1. Blockquote header (> **Status:** ..., > **Estimated effort:** ..., > **Depends on:** ...)
 * 2. Executor assignment YAML code block (executor, quality_gate, quality_gate_tools, repo_target)
 *
 * Returns: { id, status, effort, effortHours, dependsOn, executor, qualityGate, qualityGateTools, repoTarget, taskCount, title }
 */
function parseStoryFile (filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const fileName = path.basename(filePath)

  // Extract story ID from filename: STORY-68.14-TITLE.md → 68.14
  const idMatch = fileName.match(/STORY-(\d+\.\d+)/)
  if (!idMatch) return null

  const id = idMatch[1]

  // Extract title from first H1 line
  const titleLine = lines.find(l => l.startsWith('# '))
  const title = titleLine ? titleLine.replace(/^#\s+Story\s+\d+\.\d+\s*[—:\-]\s*/, '').trim() : fileName

  // ─── Parse blockquote header ───
  let status = 'Draft'
  let effort = '0h'
  let effortHours = 0
  let dependsOn = []

  for (const line of lines) {
    // Stop parsing blockquote at first non-blockquote, non-empty line after blockquotes started
    if (!line.startsWith('>') && !line.startsWith('#') && line.trim() === '') continue

    // Status: > **Status:** Done (via Epic 67)
    const statusMatch = line.match(/>\s*\*\*Status:\*\*\s*(.+)/)
    if (statusMatch) {
      status = statusMatch[1].trim()
    }

    // Effort: > **Estimated effort:** 3h
    const effortMatch = line.match(/>\s*\*\*Estimated effort:\*\*\s*(.+)/)
    if (effortMatch) {
      effort = effortMatch[1].trim()
      // Parse hours: "3h", "1.5h", "30m", "2h30m"
      effortHours = parseEffort(effort)
    }

    // Depends on: > **Depends on:** 68.2, 68.3
    const depsMatch = line.match(/>\s*\*\*Depends on:\*\*\s*(.+)/)
    if (depsMatch) {
      const depsStr = depsMatch[1].trim()
      if (depsStr.toLowerCase() !== 'none' && depsStr !== '-' && depsStr !== '') {
        dependsOn = depsStr.split(',').map(d => d.trim().replace(/^Story\s+/i, '')).filter(Boolean)
      }
    }
  }

  // ─── Parse executor assignment YAML block ───
  let executor = null
  let qualityGate = null
  let qualityGateTools = []
  let repoTarget = null

  // Try "Executor Assignment" block first, then fall back to "Metadata" block
  const executorBlock = extractYamlBlock(content, 'Executor Assignment') || extractYamlBlock(content, 'Metadata')
  if (executorBlock) {
    executor = extractYamlField(executorBlock, 'executor')
    qualityGate = extractYamlField(executorBlock, 'quality_gate')
    repoTarget = extractYamlField(executorBlock, 'repo_target')

    // Also parse status/depends_on from Metadata block if not already set
    if (!status || status === 'Draft') {
      const metaStatus = extractYamlField(executorBlock, 'status')
      if (metaStatus) status = metaStatus
    }
    const metaDeps = extractYamlField(executorBlock, 'depends_on')
    if (metaDeps && dependsOn.length === 0 && metaDeps !== '[]' && metaDeps !== '') {
      // Parse array notation like [119.2, 119.3] or "119.2, 119.3"
      const cleaned = metaDeps.replace(/[\[\]]/g, '').trim()
      if (cleaned && cleaned.toLowerCase() !== 'none' && cleaned !== '') {
        dependsOn = cleaned.split(',').map(d => d.trim().replace(/^["']/,'').replace(/["']$/,'')).filter(Boolean)
      }
    }

    // quality_gate_tools is a YAML array: ["tool1", "tool2"]
    const toolsMatch = executorBlock.match(/quality_gate_tools:\s*\[([^\]]*)\]/)
    if (toolsMatch) {
      qualityGateTools = toolsMatch[1]
        .split(',')
        .map(t => t.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    }
  }

  // ─── Fallback: parse current markdown table format ───
  if (!status || status === 'Draft') {
    status = extractTableField(lines, 'Status') || status
  }

  const tableEffort = extractTableField(lines, 'Effort')
  if (tableEffort) {
    effort = tableEffort
    effortHours = parseEffort(effort)
  }

  const tableDepends = extractTableField(lines, 'depends_on')
  if (tableDepends && tableDepends !== '—' && tableDepends !== '-') {
    dependsOn = tableDepends
      .split(',')
      .map(d => d.trim().replace(/^Story\s+/i, ''))
      .filter(Boolean)
  }

  executor = executor || extractTableField(lines, 'Executor')
  qualityGate = qualityGate || extractTableField(lines, 'Quality Gate')
  repoTarget = repoTarget || extractTableField(lines, 'repo_target')

  if (qualityGateTools.length === 0) {
    const toolsValue = extractTableField(lines, 'Quality Gate Tools')
    if (toolsValue) {
      qualityGateTools = toolsValue
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    }
  }

  // ─── Count tasks ───
  const tasksSection = extractSection(content, 'Tasks')
  const taskCount = tasksSection
    ? (tasksSection.match(/^- \[(?: |x)\]\s+/gm) || []).length
    : 0

  return {
    id,
    title,
    status,
    effort,
    effortHours,
    dependsOn,
    executor,
    qualityGate,
    qualityGateTools,
    repoTarget,
    taskCount,
    filePath: path.relative(ROOT, filePath)
  }
}

/**
 * Extract a YAML code block that follows a specific markdown heading.
 * e.g., "## Executor Assignment" followed by ```yaml ... ```
 */
function extractYamlBlock (content, headingText) {
  // Match heading (any level) followed by code block
  const pattern = new RegExp(
    `##\\s*${escapeRegex(headingText)}[\\s\\S]*?\`\`\`ya?ml\\s*\\n([\\s\\S]*?)\`\`\``,
    'i'
  )
  const match = content.match(pattern)
  return match ? match[1] : null
}

/**
 * Extract a simple key: value from a YAML-like string.
 */
function extractYamlField (yaml, key) {
  const match = yaml.match(new RegExp(`^\\s*${key}:\\s*["']?(.+?)["']?\\s*$`, 'm'))
  return match ? match[1].trim() : null
}

/**
 * Parse effort string into hours.
 * Supports: "3h", "1.5h", "30m", "2h30m", "1h 30m"
 */
function parseEffort (effortStr) {
  let hours = 0
  const hMatch = effortStr.match(/([\d.]+)\s*h/)
  const mMatch = effortStr.match(/([\d.]+)\s*m/)
  if (hMatch) hours += parseFloat(hMatch[1])
  if (mMatch) hours += parseFloat(mMatch[1]) / 60
  return hours
}

function escapeRegex (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractTableField (lines, fieldName) {
  const escaped = escapeRegex(fieldName)
  const pattern = new RegExp(`^\\|\\s*\\*\\*${escaped}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|\\s*$`, 'i')
  for (const line of lines) {
    const match = line.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

function extractSection (content, headingText) {
  const pattern = new RegExp(
    `##\\s+${escapeRegex(headingText)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
    'i'
  )
  const match = content.match(pattern)
  return match ? match[1] : null
}

// ─── DAG Construction ───

/**
 * Topological sort using Kahn's algorithm.
 * Returns { sorted: [storyId, ...], hasCycle: boolean, cycleNodes: [storyId, ...] }
 */
function topologicalSort (stories) {
  // Build adjacency list and in-degree map
  const storyIds = new Set(stories.map(s => s.id))
  const adjList = new Map()  // dependency → [dependent, ...]
  const inDegree = new Map()

  for (const s of stories) {
    adjList.set(s.id, [])
    inDegree.set(s.id, 0)
  }

  for (const s of stories) {
    // Only consider dependencies that are within this wave's stories
    const deps = s.dependsOn.filter(d => storyIds.has(d))
    inDegree.set(s.id, deps.length)
    for (const dep of deps) {
      adjList.get(dep).push(s.id)
    }
  }

  // Kahn's algorithm
  const queue = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted = []
  while (queue.length > 0) {
    // Sort queue for deterministic output
    queue.sort()
    const node = queue.shift()
    sorted.push(node)

    for (const neighbor of adjList.get(node)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1)
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor)
      }
    }
  }

  const hasCycle = sorted.length !== stories.length
  const cycleNodes = hasCycle
    ? stories.filter(s => !sorted.includes(s.id)).map(s => s.id)
    : []

  return { sorted, hasCycle, cycleNodes }
}

/**
 * Group stories into parallel execution batches.
 * Batch 0 = stories with no in-wave dependencies.
 * Batch N = stories whose dependencies are all in batch < N.
 */
function buildBatches (stories) {
  const storyIds = new Set(stories.map(s => s.id))
  const storyMap = new Map(stories.map(s => [s.id, s]))
  const batchAssignment = new Map()

  // Iterative batch assignment
  let changed = true
  let maxIter = stories.length + 1
  while (changed && maxIter-- > 0) {
    changed = false
    for (const s of stories) {
      if (batchAssignment.has(s.id)) continue

      const inWaveDeps = s.dependsOn.filter(d => storyIds.has(d))
      if (inWaveDeps.length === 0) {
        batchAssignment.set(s.id, 0)
        changed = true
      } else {
        const depBatches = inWaveDeps.map(d => batchAssignment.get(d))
        if (depBatches.every(b => b !== undefined)) {
          batchAssignment.set(s.id, Math.max(...depBatches) + 1)
          changed = true
        }
      }
    }
  }

  // Group into batches
  const maxBatch = Math.max(...[...batchAssignment.values()], 0)
  const batches = []
  for (let i = 0; i <= maxBatch; i++) {
    const batchStories = stories
      .filter(s => batchAssignment.get(s.id) === i)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    batches.push(batchStories)
  }

  return batches
}

// ─── Calibration ───

/**
 * Load retrospective calibration if it exists.
 * Retrospective file: .aiox/waves/{epic}-wave-{N-1}/retrospective.yaml
 */
function loadRetrospectiveCalibration (epic, wave) {
  if (wave <= 1) return null

  const retroPath = path.join(WAVES_DIR, `${epic}-wave-${wave - 1}`, 'retrospective.yaml')
  if (!fs.existsSync(retroPath)) return null

  try {
    const content = fs.readFileSync(retroPath, 'utf-8')
    // Simple extraction: look for "calibration_multiplier: X.X"
    const match = content.match(/calibration_multiplier:\s*([\d.]+)/)
    if (match) return parseFloat(match[1])
  } catch {
    // Silently ignore read errors
  }
  return null
}

// ─── Decomposition Flagging ───

/**
 * Flag stories that may need decomposition (TK-WE-017, TK-WE-018).
 */
function flagDecomposition (story) {
  const flags = []
  if (story.effortHours > DECOMPOSITION_EFFORT_THRESHOLD) {
    flags.push(`effort ${story.effort} > ${DECOMPOSITION_EFFORT_THRESHOLD}h (TK-WE-017)`)
  }
  if (story.taskCount > DECOMPOSITION_TASK_THRESHOLD) {
    flags.push(`${story.taskCount} tasks > ${DECOMPOSITION_TASK_THRESHOLD} (TK-WE-018)`)
  }
  return flags
}

// ─── Output Generation ───

/**
 * Generate plan.yaml content (simple YAML without external dependency).
 */
function generatePlanYaml (plan) {
  const lines = []
  lines.push('# Wave Execution Plan — Generated by build-wave-dag.js')
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(`epic: "${plan.epic}"`)
  lines.push(`wave: ${plan.wave}`)
  lines.push(`total_stories: ${plan.totalStories}`)
  lines.push(`total_batches: ${plan.batches.length}`)
  lines.push(`estimated_effort_raw: "${plan.estimatedEffortRaw}h"`)
  lines.push(`calibration_multiplier: ${plan.calibration}`)
  lines.push(`estimated_effort_calibrated: "${plan.estimatedEffortCalibrated}h"`)
  lines.push(`calibration_source: "${plan.calibrationSource}"`)
  lines.push('')

  if (plan.decompositionCandidates.length > 0) {
    lines.push('decomposition_candidates:')
    for (const dc of plan.decompositionCandidates) {
      lines.push(`  - story: "${dc.id}"`)
      lines.push(`    flags:`)
      for (const flag of dc.flags) {
        lines.push(`      - "${flag}"`)
      }
    }
    lines.push('')
  }

  if (plan.externalDeps.length > 0) {
    lines.push('external_dependencies:')
    lines.push('  # Dependencies on stories outside this wave (cross-wave)')
    for (const dep of plan.externalDeps) {
      lines.push(`  - from: "${dep.from}"`)
      lines.push(`    depends_on: "${dep.dep}"`)
      lines.push(`    note: "Outside wave ${plan.wave} — must be Done before execution"`)
    }
    lines.push('')
  }

  lines.push('batches:')
  for (let i = 0; i < plan.batches.length; i++) {
    const batch = plan.batches[i]
    lines.push(`  - batch: ${i}`)
    lines.push(`    parallel: true`)
    lines.push(`    stories:`)
    for (const s of batch) {
      lines.push(`      - id: "${s.id}"`)
      lines.push(`        title: "${escapeYamlString(s.title)}"`)
      lines.push(`        status: "${s.status}"`)
      lines.push(`        executor: "${s.executor || 'TBD'}"`)
      lines.push(`        quality_gate: "${s.qualityGate || 'TBD'}"`)
      if (s.qualityGateTools.length > 0) {
        lines.push(`        quality_gate_tools:`)
        for (const tool of s.qualityGateTools) {
          lines.push(`          - "${escapeYamlString(tool)}"`)
        }
      }
      lines.push(`        repo_target: "${s.repoTarget || 'TBD'}"`)
      lines.push(`        effort_raw: "${s.effort}"`)
      lines.push(`        effort_calibrated: "${round(s.effortHours * plan.calibration, 1)}h"`)
      lines.push(`        depends_on: [${s.dependsOn.map(d => `"${d}"`).join(', ')}]`)
      lines.push(`        tasks: ${s.taskCount}`)
      lines.push(`        file: "${s.filePath.replace(/\\/g, '/')}"`)
    }
  }

  lines.push('')
  lines.push('dag_order:')
  for (const id of plan.dagOrder) {
    lines.push(`  - "${id}"`)
  }

  lines.push('')
  return lines.join('\n')
}

/**
 * Generate plan.json content (machine-readable for wave-coordinator).
 * Includes spawn instructions per batch for Agent() tool calls.
 */
function generatePlanJson (plan, epic) {
  const jsonPlan = {
    epic: plan.epic,
    wave: plan.wave,
    generated: new Date().toISOString(),
    total_stories: plan.totalStories,
    total_batches: plan.batches.length,
    estimated_effort_raw: `${plan.estimatedEffortRaw}h`,
    calibration_multiplier: plan.calibration,
    estimated_effort_calibrated: `${plan.estimatedEffortCalibrated}h`,
    calibration_source: plan.calibrationSource,
    decomposition_candidates: plan.decompositionCandidates,
    external_dependencies: plan.externalDeps,
    dag_order: plan.dagOrder,
    batches: plan.batches.map((batch, idx) => ({
      batch: idx,
      parallel: true,
      stories: batch.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        executor: s.executor || 'TBD',
        quality_gate: s.qualityGate || 'TBD',
        quality_gate_tools: s.qualityGateTools,
        repo_target: s.repoTarget || 'TBD',
        effort_raw: s.effort,
        effort_calibrated: `${round(s.effortHours * plan.calibration, 1)}h`,
        depends_on: s.dependsOn,
        tasks: s.taskCount,
        file: s.filePath.replace(/\\/g, '/'),
        spawn: {
          description: `Execute Story ${s.id} full cycle`,
          name: `story-${s.id}`,
          subagent_type: 'story-executor',
          isolation: 'worktree',
          run_in_background: true,
          model: 'sonnet',
          prompt: `Execute Story ${s.id} — complete lifecycle. Story file: ${s.filePath.replace(/\\/g, '/')}. Executor: ${s.executor || 'TBD'}. Quality Gate: ${s.qualityGate || 'TBD'}.`
        }
      }))
    }))
  }
  return JSON.stringify(jsonPlan, null, 2)
}

/**
 * Print formatted execution plan to stdout.
 */
function printPlan (plan) {
  const SEP = '═'.repeat(72)
  const sep = '─'.repeat(72)

  console.log('')
  console.log(SEP)
  console.log(`  WAVE EXECUTION PLAN: ${plan.epic.toUpperCase()} — Wave ${plan.wave}`)
  console.log(SEP)
  console.log('')
  console.log(`  Stories:     ${plan.totalStories}`)
  console.log(`  Batches:     ${plan.batches.length}`)
  console.log(`  Effort raw:  ${plan.estimatedEffortRaw}h`)
  console.log(`  Calibration: ${plan.calibration}x (${plan.calibrationSource})`)
  console.log(`  Effort cal:  ${plan.estimatedEffortCalibrated}h`)
  console.log('')

  // Decomposition warnings
  if (plan.decompositionCandidates.length > 0) {
    console.log(`  [!] DECOMPOSITION CANDIDATES (${plan.decompositionCandidates.length}):`)
    for (const dc of plan.decompositionCandidates) {
      console.log(`      Story ${dc.id}: ${dc.flags.join(', ')}`)
    }
    console.log('')
  }

  // External dependencies
  if (plan.externalDeps.length > 0) {
    console.log(`  [!] EXTERNAL DEPENDENCIES (cross-wave):`)
    for (const dep of plan.externalDeps) {
      console.log(`      Story ${dep.from} depends on ${dep.dep} (outside wave ${plan.wave})`)
    }
    console.log('')
  }

  // Batch table
  for (let i = 0; i < plan.batches.length; i++) {
    const batch = plan.batches[i]
    console.log(sep)
    console.log(`  Batch ${i} (${batch.length} stories — parallel)`)
    console.log(sep)
    console.log(`  ${'ID'.padEnd(8)} ${'Status'.padEnd(16)} ${'Effort'.padEnd(10)} ${'Cal.'.padEnd(8)} ${'Executor'.padEnd(12)} ${'QG'.padEnd(14)} Repo`)
    console.log(`  ${'─'.repeat(8)} ${'─'.repeat(16)} ${'─'.repeat(10)} ${'─'.repeat(8)} ${'─'.repeat(12)} ${'─'.repeat(14)} ${'─'.repeat(12)}`)

    for (const s of batch) {
      const cal = `${round(s.effortHours * plan.calibration, 1)}h`
      console.log(
        `  ${s.id.padEnd(8)} ${truncate(s.status, 15).padEnd(16)} ${s.effort.padEnd(10)} ${cal.padEnd(8)} ${(s.executor || 'TBD').padEnd(12)} ${(s.qualityGate || 'TBD').padEnd(14)} ${s.repoTarget || 'TBD'}`
      )
    }
    console.log('')
  }

  // DAG order
  console.log(sep)
  console.log('  DAG Topological Order:')
  console.log(`  ${plan.dagOrder.join(' → ')}`)
  console.log('')
  console.log(SEP)
}

function escapeYamlString (str) {
  return str.replace(/"/g, '\\"')
}

function round (num, decimals) {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

function truncate (str, max) {
  return str.length > max ? str.substring(0, max - 1) + '…' : str
}

// ─── File System Helpers ───

/**
 * Recursively create directories (like mkdir -p).
 */
function mkdirp (dirPath) {
  if (fs.existsSync(dirPath)) return
  const parent = path.dirname(dirPath)
  if (!fs.existsSync(parent)) mkdirp(parent)
  fs.mkdirSync(dirPath)
}

// ─── Main ───

function main () {
  const { epic, wave, calibration: cliCalibration, dryRun, outputJson } = parseArgs()

  // Extract epic number for story matching
  const epicNumMatch = epic.match(/(\d+)/)
  if (!epicNumMatch) {
    console.error(`[BUILD-WAVE-DAG] Formato de epic inválido: "${epic}"`)
    console.error('  Esperado: epic-68, epic-69, etc.')
    process.exit(1)
  }
  const epicNum = epicNumMatch[1]

  // Locate epic directory
  const epicDir = path.join(STORIES_DIR, epic)
  if (!fs.existsSync(epicDir)) {
    console.error(`[BUILD-WAVE-DAG] Diretório não encontrado: ${epicDir}`)
    console.error(`  Verifique se docs/stories/${epic}/ existe.`)
    process.exit(1)
  }

  // ─── Step 1: Parse Epic to discover wave→story mapping ───
  console.log(`[BUILD-WAVE-DAG] Parsing ${epic} wave ${wave}...`)

  const waveMap = parseEpicWaves(epicDir, epicNum)
  const waveStoryIds = waveMap[wave]

  if (!waveStoryIds || waveStoryIds.length === 0) {
    console.error(`[BUILD-WAVE-DAG] Nenhuma story encontrada para Wave ${wave} no ${epic}`)
    console.error(`  Waves disponíveis: ${Object.keys(waveMap).join(', ') || 'nenhuma'}`)
    process.exit(1)
  }

  console.log(`[BUILD-WAVE-DAG] Wave ${wave}: ${waveStoryIds.length} story IDs encontrados no EPIC file`)

  // ─── Step 2: Parse individual STORY-*.md files ───
  const stories = []
  const missing = []

  for (const storyId of waveStoryIds) {
    // Find matching STORY file
    const files = fs.readdirSync(epicDir)
    const storyFile = files.find(f => f.match(new RegExp(`^STORY-${escapeRegex(storyId)}-`, 'i')))

    if (!storyFile) {
      missing.push(storyId)
      continue
    }

    const parsed = parseStoryFile(path.join(epicDir, storyFile))
    if (parsed) {
      stories.push(parsed)
    }
  }

  if (missing.length > 0) {
    console.warn(`[BUILD-WAVE-DAG] AVISO: ${missing.length} stories sem arquivo STORY-*.md: ${missing.join(', ')}`)
    console.warn('  Estas stories serão ignoradas no DAG.')
  }

  if (stories.length === 0) {
    console.error(`[BUILD-WAVE-DAG] Nenhuma story parseada com sucesso para Wave ${wave}`)
    process.exit(1)
  }

  console.log(`[BUILD-WAVE-DAG] ${stories.length} stories parseadas com sucesso`)

  // ─── Step 3: Topological sort ───
  const { sorted: dagOrder, hasCycle, cycleNodes } = topologicalSort(stories)

  if (hasCycle) {
    console.error(`[BUILD-WAVE-DAG] ERRO: Dependência circular detectada!`)
    console.error(`  Stories no ciclo: ${cycleNodes.join(', ')}`)
    console.error('  Corrija as dependências antes de executar a wave.')
    process.exit(1)
  }

  // ─── Step 4: Build parallel batches ───
  const batches = buildBatches(stories)

  // ─── Step 5: Calibration ───
  const retroCalibration = loadRetrospectiveCalibration(epic, wave)
  const calibration = retroCalibration || cliCalibration
  const calibrationSource = retroCalibration
    ? `retrospective wave-${wave - 1}`
    : cliCalibration !== DEFAULT_CALIBRATION
      ? 'cli-override'
      : 'default'

  // ─── Step 6: Effort calculation ───
  const totalEffortRaw = stories.reduce((sum, s) => sum + s.effortHours, 0)
  const totalEffortCalibrated = round(totalEffortRaw * calibration, 1)

  // ─── Step 7: Decomposition candidates ───
  const decompositionCandidates = []
  for (const s of stories) {
    const flags = flagDecomposition(s)
    if (flags.length > 0) {
      decompositionCandidates.push({ id: s.id, flags })
    }
  }

  // ─── Step 8: External dependencies ───
  const storyIdSet = new Set(stories.map(s => s.id))
  const externalDeps = []
  for (const s of stories) {
    for (const dep of s.dependsOn) {
      if (!storyIdSet.has(dep)) {
        externalDeps.push({ from: s.id, dep })
      }
    }
  }

  // ─── Build plan object ───
  const plan = {
    epic,
    wave,
    totalStories: stories.length,
    estimatedEffortRaw: round(totalEffortRaw, 1),
    estimatedEffortCalibrated: totalEffortCalibrated,
    calibration,
    calibrationSource,
    batches,
    dagOrder,
    decompositionCandidates,
    externalDeps
  }

  // ─── Step 9: Output ───
  printPlan(plan)

  if (!dryRun) {
    const outputDir = path.join(WAVES_DIR, `${epic}-wave-${wave}`)
    const outputFile = path.join(outputDir, 'plan.yaml')

    mkdirp(outputDir)
    fs.writeFileSync(outputFile, generatePlanYaml(plan), 'utf-8')

    const relPath = path.relative(ROOT, outputFile).replace(/\\/g, '/')
    console.log(`[BUILD-WAVE-DAG] Plan escrito em: ${relPath}`)

    // Also write plan.json if --json flag or always alongside yaml
    if (outputJson) {
      const jsonFile = path.join(outputDir, 'plan.json')
      fs.writeFileSync(jsonFile, generatePlanJson(plan, epic), 'utf-8')
      const jsonRelPath = path.relative(ROOT, jsonFile).replace(/\\/g, '/')
      console.log(`[BUILD-WAVE-DAG] Plan JSON escrito em: ${jsonRelPath}`)
    }
  } else {
    console.log('[BUILD-WAVE-DAG] --dry-run: nenhum arquivo escrito.')
  }

  // ─── Step 10: Spawn Instructions (--spawn-instructions) ───
  if (process.argv.includes('--spawn-instructions')) {
    let useSwarmTeams = false
    try {
      const configPath = path.join(ROOT, '.aiox-core/core/config/swarm-feature-flags.yaml')
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8')
        if (content.match(/swarm_wave_teams:\s*true/)) {
          useSwarmTeams = true
        }
      }
    } catch (e) {}

    console.log('\n' + '='.repeat(80))
    console.log('SPAWN INSTRUCTIONS — Execute these Agent() tool calls for parallel execution')
    if (useSwarmTeams) {
      console.log('🔥 SWARM OS MODE: Enabled (Sequential Teams via TeamCreate)')
    } else {
       console.log('⚠️ FALLBACK MODE: Swarm Teams disabled. Using Agent(run_in_background)')
    }
    console.log('='.repeat(80))

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      const teamName = `wave-${epic}-${wave}-batch-${batchIdx}`
      
      console.log(`\n--- BATCH ${batchIdx} (${batch.length} stories in PARALLEL via ${useSwarmTeams ? 'SWARM TEAMS' : 'BACKGROUND'}) ---\n`)
      
      if (useSwarmTeams) {
        console.log(`1. MUST CALL TeamCreate FIRST:`)
        console.log(`TeamCreate(`)
        console.log(`  team_name: "${teamName}",`)
        console.log(`  description: "Wave ${wave} execution — ${epic} — Batch ${batchIdx}"`)
        console.log(`)\n`)
        console.log(`2. Then, launch ALL ${batch.length} Agent() calls below in a SINGLE message:`)
      } else {
        console.log(`Launch ALL ${batch.length} Agent() calls below in a SINGLE message (parallel):`)
      }
      console.log('')

      for (const story of batch) {
        const storyId = story.id
        if (!story) continue

        console.log(`Agent(`)
        console.log(`  description: "Execute Story ${storyId} full cycle",`)
        console.log(`  name: "story-${storyId}",`)
        if (useSwarmTeams) {
          console.log(`  team_name: "${teamName}",`)
        } else {
          console.log(`  run_in_background: true,`)
        }
        console.log(`  model: "sonnet",`)
        console.log(`  prompt: """`)
        console.log(`    You are executing Story ${storyId} — complete lifecycle.`)
        console.log(`    Story file: find the STORY-${storyId}*.md file in docs/stories/${epic}/`)
        console.log(`    Executor: ${story.executor}`)
        console.log(`    Quality Gate: ${story.qualityGate}`)
        console.log(``)
        console.log(`    EXECUTE THESE 5 STEPS IN SEQUENCE:`)
        console.log(``)
        console.log(`    Step 1 — @po Validate:`)
        console.log(`      Read the story file. Verify all ACs are testable. Check executor and quality_gate fields.`)
        console.log(`      Mark status → Ready. Add Change Log: "{date} | @po | Validated"`)
        console.log(``)
        console.log(`    Step 2 — ${story.executor} Develop:`)
        console.log(`      Execute ALL tasks from the story. Check off each AC.`)
        console.log(`      Populate Dev Agent Record (Agent Model, Completion Notes, File List).`)
        console.log(`      Mark status → InReview. Add Change Log: "{date} | ${story.executor} | Development complete"`)
        console.log(``)
        console.log(`    Step 3 — ${story.qualityGate} Quality Review:`)
        console.log(`      Review implementation against ALL ACs. ALL severity levels block PASS.`)
        console.log(`      Output structured QG verdict.`)
        console.log(``)
        console.log(`    Step 4 — QG Loop (if FAIL):`)
        console.log(`      Fix ALL findings. Re-submit. Max 3 retries.`)
        console.log(``)
        console.log(`    Step 5 — @po Close:`)
        console.log(`      Verify Dev Agent Record complete. All ACs checked. QG Report populated.`)
        console.log(`      Mark status → Done. Add Change Log: "{date} | @po | Story closed — QG PASS"`)
        console.log(`  """`)
        console.log(`)`)
        console.log('')
      }

      if (batchIdx < batches.length - 1) {
        if (useSwarmTeams) {
          console.log(`\n3. Wait for all teammates to report.`)
          console.log(`4. CRITICAL: Clean up team before next batch:`)
          console.log(`   SendMessage shutdown_request individually to each active teammate, then TeamDelete() (no params)`)
        }
        console.log(`\n>>> WAIT: All ${batch.length} agents in Batch ${batchIdx} must complete before starting Batch ${batchIdx + 1} <<<`)
      } else {
        if (useSwarmTeams) {
          console.log(`\n3. Wait for all teammates to report.`)
          console.log(`4. Clean up the final team:`)
          console.log(`   SendMessage shutdown_request individually to each active teammate, then TeamDelete() (no params)`)
        }
      }
    }

    console.log('\n>>> AFTER ALL BATCHES: Run /roundtable --mode review --preset epic_review <<<')
    console.log('='.repeat(80))
  }

  console.log('[BUILD-WAVE-DAG] Concluído com sucesso.')
}

// ─── Execute ───

main()
