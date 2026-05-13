#!/usr/bin/env node

/**
 * Wave Launch — Visual Parallel Execution Orchestrator
 * Opens a Windows Terminal tab per story, each running claude --agent story-executor.
 *
 * Architecture:
 *   wave-launch.js (this script — runs in main terminal)
 *     ├── Batch 0: opens N terminal tabs (parallel)
 *     │     ├── Tab "Story 68.14 [@dev → @cso]" → claude --agent story-executor
 *     │     └── Tab "Story 68.15 [@dev → @architect]" → claude --agent story-executor
 *     ├── Monitors .aiox/waves/{epic}-wave-{N}/status/ for completion
 *     ├── Batch 1: opens M terminal tabs (after Batch 0 completes)
 *     └── Final: summary report
 *
 * Usage:
 *   node wave-launch.js <epic> <wave> [options]
 *
 * Options:
 *   --dry-run       Show what would be launched without executing
 *   --no-worktree   Skip git worktree creation
 *   --poll <ms>     Polling interval for status checks (default: 5000)
 *   --help, -h      Show help
 *
 * Status Protocol:
 *   Each story-executor writes a status file on completion:
 *     .aiox/waves/{epic}-wave-{N}/status/{story-id}.json
 *   Content: { "status": "done"|"failed"|"blocked", "timestamp": "...", "summary": "..." }
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const DEFAULT_POLL_MS = 5000

function detectStateDir () {
  const aiox = path.join(ROOT, '.aiox')
  const aiox = path.join(ROOT, '.aiox')
  if (fs.existsSync(aiox)) return aiox
  return aiox
}

function parseArgs () {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h') || args.length < 2) {
    console.log('Usage: node wave-launch.js <epic> <wave> [options]')
    console.log('\nOpens a Windows Terminal tab per story for visual parallel execution.')
    console.log('\nOptions:')
    console.log('  --dry-run       Show what would be launched without executing')
    console.log('  --no-worktree   Skip git worktree creation')
    console.log('  --poll <ms>     Polling interval in ms (default: 5000)')
    console.log('  --help, -h      Show help')
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1)
  }
  const epic = args[0]
  const wave = parseInt(args[1], 10)
  let dryRun = false, noWorktree = false, pollMs = DEFAULT_POLL_MS
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true
    if (args[i] === '--no-worktree') noWorktree = true
    if (args[i] === '--poll' && args[i + 1]) { pollMs = parseInt(args[i + 1], 10) || DEFAULT_POLL_MS; i++ }
  }
  return { epic, wave, dryRun, noWorktree, pollMs }
}

function loadOrBuildPlan (epic, wave) {
  const stateDir = detectStateDir()
  const planJson = path.join(stateDir, 'waves', `${epic}-wave-${wave}`, 'plan.json')
  if (!fs.existsSync(planJson)) {
    console.log('[WAVE-LAUNCH] plan.json not found, building DAG...')
    try {
      execSync(`node "${path.join(__dirname, 'build-wave-dag.js')}" ${epic} ${wave} --json`, { cwd: ROOT, stdio: 'inherit' })
    } catch { console.error('[WAVE-LAUNCH] Failed to build DAG'); process.exit(1) }
  }
  if (!fs.existsSync(planJson)) { console.error('[WAVE-LAUNCH] plan.json not found'); process.exit(1) }
  return JSON.parse(fs.readFileSync(planJson, 'utf-8'))
}

function getStatusDir (epic, wave) {
  const dir = path.join(detectStateDir(), 'waves', `${epic}-wave-${wave}`, 'status')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function readStoryStatus (statusDir, storyId) {
  const file = path.join(statusDir, `${storyId}.json`)
  if (!fs.existsSync(file)) return null
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return null }
}

function createWorktree (epic, wave, storyId) {
  const branchName = `wave/${epic}-${wave}/story-${storyId}`
  const worktreePath = path.join(ROOT, '.claude', 'worktrees', `story-${storyId}`)
  if (fs.existsSync(worktreePath)) {
    console.log(`  [WORKTREE] Already exists: story-${storyId}`)
    return worktreePath
  }
  try {
    execSync(`git worktree add -b "${branchName}" "${worktreePath}" HEAD`, { cwd: ROOT, stdio: 'pipe' })
    console.log(`  [WORKTREE] story-${storyId} -> ${branchName}`)
    return worktreePath
  } catch {
    try {
      execSync(`git worktree add "${worktreePath}" "${branchName}"`, { cwd: ROOT, stdio: 'pipe' })
      return worktreePath
    } catch {
      console.warn(`  [WORKTREE] Failed for story-${storyId}, using main`)
      return ROOT
    }
  }
}

function launchTab (story, workDir, statusDir, dryRun) {
  const executor = story.executor || 'TBD'
  const qg = story.quality_gate || 'TBD'
  const tabTitle = `Story ${story.id} [${executor} > ${qg}]`
  const statusFile = path.join(statusDir, `${story.id}.json`).replace(/\\/g, '/')

  // Write detailed prompt file for the agent
  const promptFile = path.join(workDir, `.wave-prompt-${story.id}.md`)
  const fullPrompt = [
    `# Wave Execution - Story ${story.id}`,
    ``,
    `**Executor:** ${executor}`,
    `**Quality Gate:** ${qg}`,
    `**Story file:** ${story.file}`,
    `**Status file:** ${statusFile}`,
    ``,
    `## SDC Steps`,
    ``,
    `1. **@po Validate:** Read story, verify ACs, mark Ready`,
    `2. **${executor} Develop:** Read persona from .claude/agents/, execute tasks, check ACs, populate Dev Agent Record`,
    `3. **${qg} Review:** Read persona, review against ACs, output PASS/FAIL`,
    `4. **Fix loop (if FAIL):** Fix findings, max 3 rounds`,
    `5. **@po Close:** Mark Done, WRITE STATUS FILE`,
    ``,
    `## CRITICAL: Write Status File When Done`,
    ``,
    `Use the Write tool to create: ${statusFile}`,
    `Content: { "status": "done", "story": "${story.id}", "timestamp": "<ISO>", "summary": "<what happened>" }`,
    `If blocked/failed, use "failed" or "blocked" as status.`,
  ].join('\n')
  fs.writeFileSync(promptFile, fullPrompt, 'utf-8')

  const prompt = `Execute Story ${story.id} - complete SDC lifecycle. Story file: ${story.file}. Executor: ${executor}. Quality Gate: ${qg}. Read .wave-prompt-${story.id}.md in current directory for full instructions. When done, write status JSON to ${statusFile}`

  if (dryRun) {
    console.log(`  [DRY-RUN] Tab: "${tabTitle}"`)
    console.log(`            Dir: ${path.relative(ROOT, workDir)}`)
    console.log(`            Prompt: ${prompt.substring(0, 80)}...`)
    console.log('')
    return
  }

  // Try Windows Terminal (wt) first
  try {
    const child = spawn('cmd.exe', [
      '/c', 'start', '""',
      'wt', '-w', '0', 'nt',
      '--title', tabTitle,
      '-d', workDir,
      '--', 'cmd', '/k',
      `claude --agent story-executor -p "${prompt}"`
    ], { detached: true, stdio: 'ignore', shell: true })
    child.unref()
    console.log(`  [LAUNCHED] ${tabTitle}`)
    return
  } catch { /* fallback below */ }

  // Fallback: plain cmd window
  try {
    const child = spawn('cmd.exe', [
      '/c', 'start', `"${tabTitle}"`,
      'cmd', '/k',
      `cd /d "${workDir}" && claude --agent story-executor -p "${prompt}"`
    ], { detached: true, stdio: 'ignore', shell: true })
    child.unref()
    console.log(`  [LAUNCHED] ${tabTitle} (cmd fallback)`)
  } catch (err) {
    console.error(`  [ERROR] Story ${story.id}: ${err.message}`)
  }
}

function waitForBatch (statusDir, storyIds, pollMs) {
  return new Promise((resolve) => {
    const start = Date.now()
    const interval = setInterval(() => {
      const results = {}
      let count = 0
      for (const id of storyIds) {
        const s = readStoryStatus(statusDir, id)
        if (s) { results[id] = s; count++ }
      }
      const elapsed = Math.round((Date.now() - start) / 1000)
      const t = elapsed >= 60 ? `${Math.floor(elapsed / 60)}m${elapsed % 60}s` : `${elapsed}s`
      process.stdout.write(`\r  [MONITOR] ${count}/${storyIds.length} complete (${t})...  `)
      if (count === storyIds.length) {
        clearInterval(interval)
        console.log(`\r  [MONITOR] ${count}/${storyIds.length} complete! (${t})            `)
        resolve(results)
      }
    }, pollMs)
  })
}

async function main () {
  const { epic, wave, dryRun, noWorktree, pollMs } = parseArgs()

  console.log('[WAVE-LAUNCH] Loading plan...')
  const plan = loadOrBuildPlan(epic, wave)

  const SEP = '='.repeat(72)
  console.log(`\n${SEP}`)
  console.log(`  WAVE LAUNCH: ${plan.epic.toUpperCase()} - Wave ${plan.wave}`)
  console.log(`  ${plan.total_stories} stories | ${plan.total_batches} batches | ${plan.estimated_effort_calibrated} calibrated`)
  console.log(`${SEP}\n`)

  const statusDir = getStatusDir(epic, wave)
  const allResults = {}

  for (let bi = 0; bi < plan.batches.length; bi++) {
    const stories = plan.batches[bi].stories

    // Skip completed stories
    const pending = stories.filter(s => {
      const ex = readStoryStatus(statusDir, s.id)
      if (ex) { allResults[s.id] = ex; console.log(`  [SKIP] ${s.id} already ${ex.status}`); return false }
      if (s.status && s.status.toLowerCase().startsWith('done')) {
        const ds = { status: 'done', story: s.id, timestamp: new Date().toISOString(), summary: 'Already Done per EPIC' }
        fs.writeFileSync(path.join(statusDir, `${s.id}.json`), JSON.stringify(ds, null, 2))
        allResults[s.id] = ds
        console.log(`  [SKIP] ${s.id} Done per EPIC`)
        return false
      }
      return true
    })

    if (!pending.length) { console.log(`  Batch ${bi}: all complete\n`); continue }

    console.log(`${'-'.repeat(72)}`)
    console.log(`  BATCH ${bi} - ${pending.length} terminal tabs opening...`)
    console.log(`${'-'.repeat(72)}`)
    for (const s of pending) {
      console.log(`    ${s.id.padEnd(8)} ${(s.executor || '?').padEnd(14)} -> ${(s.quality_gate || '?').padEnd(14)} ${s.title || ''}`)
    }
    console.log('')

    const ids = []
    for (const s of pending) {
      const dir = noWorktree ? ROOT : createWorktree(epic, wave, s.id)
      launchTab(s, dir, statusDir, dryRun)
      ids.push(s.id)
    }

    if (dryRun) { console.log(`  [DRY-RUN] Would wait for ${ids.length} stories\n`); continue }

    console.log(`\n  Monitoring ${ids.length} terminals (poll: ${pollMs / 1000}s)...`)
    console.log(`  Status dir: ${path.relative(ROOT, statusDir)}\n`)

    const res = await waitForBatch(statusDir, ids, pollMs)
    Object.assign(allResults, res)

    const fails = Object.entries(res).filter(([, r]) => r.status !== 'done')
    if (fails.length) console.warn(`\n  [WARN] ${fails.length} non-done stories in Batch ${bi}`)
    console.log('')
  }

  // Final report
  console.log(`\n${SEP}`)
  console.log(`  WAVE COMPLETE: ${plan.epic.toUpperCase()} - Wave ${plan.wave}`)
  console.log(`${SEP}`)

  let done = 0, failed = 0, blocked = 0
  for (const [id, r] of Object.entries(allResults)) {
    const icon = r.status === 'done' ? 'DONE ' : r.status === 'failed' ? 'FAIL ' : 'BLOCK'
    console.log(`  ${id.padEnd(8)} [${icon}] ${r.summary || ''}`)
    if (r.status === 'done') done++
    else if (r.status === 'failed') failed++
    else blocked++
  }
  console.log(`\n  ${done} done | ${failed} failed | ${blocked} blocked`)
  console.log(SEP)
}

main().catch(err => { console.error('[WAVE-LAUNCH] Fatal:', err.message); process.exit(1) })
