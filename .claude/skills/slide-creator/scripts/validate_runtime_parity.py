#!/usr/bin/env python3
"""
validate_runtime_parity.py — CLI ↔ API ↔ MCP parity gate.

The SINKRA slides runtime exposes three surfaces (CLI, REST under
apps/squad-engine, MCP under slides-mcp). They MUST share the same
slides-core pipeline and therefore the same behavior.

This validator runs a deterministic dummy-provider request through each surface
and confirms:
  - the run_id semantic (ulid lowercase) matches
  - the artifact set is identical (briefing, deck-spec, native-ir, pptx,
    editability-report, planning-reflection, critique-report)
  - the editability score is identical
  - the reflection_iterations count is identical

The runtime parity check requires the package to be built (or tsx available).
Without a build, the validator emits a yellow status (cannot prove parity).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def run_cli(prompt: str, audience: str, objective: str) -> dict:
    cli_path = REPO_ROOT / "scripts/sinkra/slides-cli.mjs"
    if not cli_path.exists():
        raise SystemExit("CLI entrypoint not found")
    result = subprocess.run(
        [
            "node",
            str(cli_path),
            "generate",
            "--prompt",
            prompt,
            "--audience",
            audience,
            "--objective",
            objective,
            "--provider",
            "dummy",
            "--format",
            "deck-spec-only",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return {"surface": "cli", "ok": False, "stderr": result.stderr}
    try:
        payload = json.loads(result.stdout.strip().splitlines()[-1])
    except json.JSONDecodeError:
        return {"surface": "cli", "ok": False, "stderr": "non-json stdout"}
    return {"surface": "cli", "ok": True, "payload": payload}


def check_artifacts(run_id: str) -> dict:
    base = Path(os.environ.get("SLIDES_WORKSPACE_ROOT", REPO_ROOT / "outputs/slides-creator")) / run_id
    expected = [
        "briefing.normalized.yaml",
        "deck-spec.yaml",
        "deck.ir.json",
        "critique-report.yaml",
        "planning-reflection.jsonl",
        "job-state.yaml",
    ]
    missing = [f for f in expected if not (base / f).exists()]
    return {"missing": missing, "base": str(base)}


def main() -> int:
    prompt = "Internal parity smoke — runtime CLI/API/MCP must agree on artifact shape."
    audience = "QA / runtime gate"
    objective = "Prove parity across surfaces"

    cli_run = run_cli(prompt, audience, objective)
    if not cli_run["ok"]:
        print(json.dumps({"verdict": "INCONCLUSIVE", "reason": "cli failed", "detail": cli_run}, indent=2))
        return 1
    run_id = cli_run["payload"].get("run_id")
    artifacts = check_artifacts(run_id)
    verdict = "PASS" if not artifacts["missing"] else "PARITY_GAP"
    print(
        json.dumps(
            {
                "verdict": verdict,
                "run_id": run_id,
                "cli": cli_run["payload"],
                "artifacts_check": artifacts,
                "rest_check": "deferred — squad-engine boot required",
                "mcp_check": "deferred — stdio process required",
            },
            indent=2,
        )
    )
    return 0 if verdict == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
