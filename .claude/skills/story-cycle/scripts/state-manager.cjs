#!/usr/bin/env node

/**
 * Story Development Cycle — State Manager
 *
 * Manages workflow state.json for the stateful orchestrator skill.
 * Handles phase transitions, retry tracking, and artifact registration.
 *
 * Usage:
 *   node state-manager.js init <progress_dir> <epic_id> <story_id> [mode]
 *   node state-manager.js read <progress_dir>
 *   node state-manager.js advance <progress_dir> <phase> [result]
 *   node state-manager.js retry <progress_dir> <loop_name>
 *   node state-manager.js artifact <progress_dir> <phase> <path>
 *   node state-manager.js status <progress_dir>
 */

const fs = require('fs');
const path = require('path');

const PHASES = {
  1: { name: 'create', agent: 'sm', command: '*draft', label: 'Create Story' },
  2: { name: 'validate', agent: 'po', command: '*validate-story-draft', label: 'Validate Story' },
  3: { name: 'develop', agent: 'dev', command: '*develop', label: 'Implement Story' },
  4: { name: 'qa_gate', agent: 'qa', command: '*review', label: 'QA Review' },
  5: { name: 'push', agent: 'devops', command: '*push', label: 'Push to Remote' },
  6: { name: 'close', agent: 'po', command: '*close-story', label: 'Close Story' },
};

const MAX_RETRIES = 3;

function getStatePath(progressDir) {
  return path.join(progressDir, 'state.json');
}

function readState(progressDir) {
  const statePath = getStatePath(progressDir);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function writeState(progressDir, state) {
  state.updated_at = new Date().toISOString();
  const statePath = getStatePath(progressDir);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  return state;
}

function createInitialState(epicId, storyId, mode = 'interactive') {
  const now = new Date().toISOString();
  const phases = {};
  for (const [num, def] of Object.entries(PHASES)) {
    phases[num] = {
      name: def.name,
      label: def.label,
      agent: def.agent,
      command: def.command,
      status: num === '1' ? 'pending' : 'pending',
      started_at: null,
      completed_at: null,
      result: null,
    };
  }

  return {
    workflow: 'story-development-cycle',
    version: '2.0',
    epic_id: epicId,
    story_id: storyId,
    story_path: null,
    current_phase: 0,
    phase_status: 'initialized',
    mode,
    phases,
    retry_counts: {
      validate: { count: 0, max: MAX_RETRIES, history: [] },
      qa: { count: 0, max: MAX_RETRIES, history: [] },
    },
    artifacts: {
      story: null,
      validation: null,
      implementation: null,
      qa_gate: null,
      push: null,
      close: null,
    },
    coderabbit_status: 'not_started',
    created_at: now,
    updated_at: now,
  };
}

function advancePhase(state, phaseNum, result = null) {
  const phase = state.phases[phaseNum];
  if (!phase) throw new Error(`Invalid phase: ${phaseNum}`);

  const now = new Date().toISOString();
  phase.status = 'completed';
  phase.completed_at = now;
  if (result) phase.result = result;

  // Find next pending phase
  const nextPhaseNum = parseInt(phaseNum) + 1;
  if (state.phases[nextPhaseNum]) {
    state.current_phase = nextPhaseNum;
    state.phase_status = 'ready';
    state.phases[nextPhaseNum].status = 'ready';
  } else {
    state.current_phase = 0;
    state.phase_status = 'completed';
  }

  return state;
}

function startPhase(state, phaseNum) {
  const phase = state.phases[phaseNum];
  if (!phase) throw new Error(`Invalid phase: ${phaseNum}`);

  phase.status = 'in_progress';
  phase.started_at = new Date().toISOString();
  state.current_phase = parseInt(phaseNum);
  state.phase_status = 'in_progress';

  return state;
}

function recordRetry(state, loopName, reason) {
  const loop = state.retry_counts[loopName];
  if (!loop) throw new Error(`Invalid loop: ${loopName}`);

  loop.count++;
  loop.history.push({
    attempt: loop.count,
    reason,
    timestamp: new Date().toISOString(),
  });

  return {
    state,
    canRetry: loop.count < loop.max,
    count: loop.count,
    max: loop.max,
  };
}

function resetRetry(state, loopName) {
  const loop = state.retry_counts[loopName];
  if (loop) {
    loop.count = 0;
  }
  return state;
}

function registerArtifact(state, key, artifactPath) {
  if (state.artifacts.hasOwnProperty(key)) {
    state.artifacts[key] = artifactPath;
  }
  return state;
}

function getProgressSummary(state) {
  const total = Object.keys(state.phases).length;
  const completed = Object.values(state.phases).filter(p => p.status === 'completed').length;
  const current = state.current_phase > 0 ? state.phases[state.current_phase] : null;

  return {
    total,
    completed,
    percentage: Math.round((completed / total) * 100),
    current_phase: state.current_phase,
    current_label: current ? current.label : 'Completed',
    current_agent: current ? `@${current.agent}` : null,
    current_command: current ? current.command : null,
    is_complete: state.phase_status === 'completed',
    retries: {
      validate: `${state.retry_counts.validate.count}/${state.retry_counts.validate.max}`,
      qa: `${state.retry_counts.qa.count}/${state.retry_counts.qa.max}`,
    },
  };
}

// CLI interface
const [,, command, progressDir, ...args] = process.argv;

if (!command || !progressDir) {
  console.error('Usage: node state-manager.js <command> <progress_dir> [...args]');
  process.exit(1);
}

try {
  switch (command) {
    case 'init': {
      const [epicId, storyId, mode] = args;
      if (!epicId || !storyId) {
        console.error('Usage: node state-manager.js init <dir> <epic_id> <story_id> [mode]');
        process.exit(1);
      }
      const state = createInitialState(epicId, storyId, mode || 'interactive');
      writeState(progressDir, state);
      console.log(JSON.stringify({ success: true, state }, null, 2));
      break;
    }

    case 'read': {
      const state = readState(progressDir);
      if (!state) {
        console.log(JSON.stringify({ success: false, error: 'No state.json found' }));
        process.exit(1);
      }
      console.log(JSON.stringify({ success: true, state }, null, 2));
      break;
    }

    case 'advance': {
      const [phase, result] = args;
      let state = readState(progressDir);
      if (!state) { console.error('No state found'); process.exit(1); }
      state = advancePhase(state, phase, result);
      writeState(progressDir, state);
      const summary = getProgressSummary(state);
      console.log(JSON.stringify({ success: true, summary, state }, null, 2));
      break;
    }

    case 'start': {
      const [phase] = args;
      let state = readState(progressDir);
      if (!state) { console.error('No state found'); process.exit(1); }
      state = startPhase(state, phase);
      writeState(progressDir, state);
      console.log(JSON.stringify({ success: true, state }, null, 2));
      break;
    }

    case 'retry': {
      const [loopName, ...reasonParts] = args;
      let state = readState(progressDir);
      if (!state) { console.error('No state found'); process.exit(1); }
      const result = recordRetry(state, loopName, reasonParts.join(' '));
      writeState(progressDir, result.state);
      console.log(JSON.stringify({ success: true, canRetry: result.canRetry, count: result.count, max: result.max }, null, 2));
      break;
    }

    case 'reset-retry': {
      const [loopName] = args;
      let state = readState(progressDir);
      if (!state) { console.error('No state found'); process.exit(1); }
      state = resetRetry(state, loopName);
      writeState(progressDir, state);
      console.log(JSON.stringify({ success: true }, null, 2));
      break;
    }

    case 'artifact': {
      const [key, artifactPath] = args;
      let state = readState(progressDir);
      if (!state) { console.error('No state found'); process.exit(1); }
      state = registerArtifact(state, key, artifactPath);
      writeState(progressDir, state);
      console.log(JSON.stringify({ success: true }, null, 2));
      break;
    }

    case 'status': {
      const state = readState(progressDir);
      if (!state) {
        console.log(JSON.stringify({ success: false, error: 'No state.json found' }));
        process.exit(1);
      }
      const summary = getProgressSummary(state);
      console.log(JSON.stringify({ success: true, summary }, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (err) {
  console.error(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
}
