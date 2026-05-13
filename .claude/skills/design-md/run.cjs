#!/usr/bin/env node
"use strict";

/**
 * /design-md launcher.
 *
 * The canonical implementation lives in:
 *   squads/design-ops/scripts/extract-from-url/run.cjs
 *
 * Keep this file thin so the slash skill never drifts from design-ops.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function findRepoRoot(start) {
  let dir = path.resolve(start);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(__dirname, "..", "..", "..");
}

const repoRoot = findRepoRoot(__dirname);
const canonicalRun = path.join(
  repoRoot,
  "squads",
  "design-ops",
  "scripts",
  "extract-from-url",
  "run.cjs",
);

if (!fs.existsSync(canonicalRun)) {
  const rel = path.relative(repoRoot, canonicalRun);
  console.error(`[design-md] canonical runner not found: ${rel}`);
  process.exit(1);
}

if (require.main !== module) {
  module.exports = require(canonicalRun);
} else {
  const result = spawnSync(process.execPath, [canonicalRun, ...process.argv.slice(2)], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`[design-md] failed to launch canonical runner: ${result.error.message}`);
    process.exit(1);
  }

  if (result.signal) {
    console.error(`[design-md] canonical runner terminated by signal: ${result.signal}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}
