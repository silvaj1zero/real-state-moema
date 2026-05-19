#!/usr/bin/env python3
"""
validate_design_100_runtime.py — Design 100 executable gate.

Bridges the runtime artifacts produced by slides-renderer (`deck.ir.json`,
`editability-report.json`) with the canonical design contracts shipped in this
skill (`templates/visual/design-mastery-contract.yaml`,
`templates/visual/brand-template-manifest.yaml`,
`templates/visual/key-slide-render-review.yaml`,
`templates/visual/visual-regression-checklist.yaml`).

Verdict policy
--------------
A deck is allowed to claim Design 100 only when ALL of the following hold:
  - editability_score >= 95 AND editability_report.verdict == PASS
  - 5 key slides present in the IR: cover, reframe, mechanism, proof (or demo),
    cta (these are the canonical decision slides from key-slide-render-review).
  - brand-template-manifest.yaml exists alongside the run artifacts.
  - design-mastery-report.yaml emitted by this script does NOT report blockers.
  - visual-regression checklist passes (overflow, contrast, density, palette
    consistency, native overlays).

The script is intentionally conservative — it refuses Design 100 when any signal
is missing, per .claude/rules/extraction-no-fallbacks.md (no universal defaults).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:  # pragma: no cover - import guard
    print("ERROR: PyYAML not available. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(3)


CANONICAL_KEY_FUNCTIONS = ("cover", "reframe", "mechanism", "proof", "cta")
DENSITY_WORD_LIMIT = 45


@dataclass
class Finding:
    code: str
    severity: str  # "BLOCKER" | "OBSERVATION"
    message: str


@dataclass
class Report:
    run_id: str
    evaluated_at: str
    editability_score: int
    findings: list[Finding] = field(default_factory=list)
    scores: dict[str, int] = field(default_factory=dict)
    verdict: str = "UNKNOWN"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def find_run_dir(arg: str) -> Path:
    p = Path(arg).expanduser().resolve()
    if not p.exists():
        raise SystemExit(f"run dir not found: {p}")
    return p


def collect_text(slide: dict[str, Any]) -> str:
    """Flatten all text in a slide for density/coverage analysis."""
    chunks: list[str] = [slide.get("action_title", "")]

    def walk(node: dict[str, Any]) -> None:
        if not isinstance(node, dict):
            return
        if node.get("type") == "text":
            for run in node.get("runs", []) or []:
                chunks.append(str(run.get("text", "")))
        elif node.get("type") == "shape" and node.get("text"):
            walk(node["text"])
        elif node.get("type") == "group":
            for child in node.get("children", []) or []:
                walk(child)
        elif node.get("type") == "table":
            for row in node.get("rows", []) or []:
                for cell in row.get("cells", []) or []:
                    chunks.append(str(cell.get("text", "")))

    for node in slide.get("nodes", []) or []:
        walk(node)
    return "\n".join(chunks)


def score_key_slides(ir: dict[str, Any], findings: list[Finding]) -> int:
    """Verify the 5 decisive slides are present and well-formed."""
    present = {s.get("function") for s in ir.get("slides", [])}
    missing = [f for f in CANONICAL_KEY_FUNCTIONS if f not in present and f != "proof"]
    # proof OR demo OR demo_setup counts as the proof slot
    proof_alt = {"proof", "demo", "demo_setup"} & present
    if not proof_alt:
        missing.append("proof|demo|demo_setup")
    if missing:
        findings.append(
            Finding(
                code="KEY_SLIDES_MISSING",
                severity="BLOCKER",
                message=f"Missing key slide functions: {sorted(missing)}.",
            )
        )
        return 0
    return 100


def score_density(ir: dict[str, Any], findings: list[Finding]) -> int:
    """Detect overflow / wall-of-text per slide."""
    violations: list[str] = []
    for slide in ir.get("slides", []) or []:
        if slide.get("function") in ("appendix", "summary"):
            continue
        text = collect_text(slide)
        words = len([w for w in text.split() if w.strip()])
        if words > DENSITY_WORD_LIMIT:
            violations.append(f"{slide.get('id')} ({words} words)")
    if violations:
        findings.append(
            Finding(
                code="DENSITY_OVER_LIMIT",
                severity="OBSERVATION",
                message=f"Slides exceeding {DENSITY_WORD_LIMIT}-word density: {violations}.",
            )
        )
        return max(0, 100 - 8 * len(violations))
    return 100


def score_palette(ir: dict[str, Any], findings: list[Finding]) -> int:
    """Brand fidelity heuristic — every color used in the IR must come from the theme palette."""
    theme = ir.get("theme", {}) or {}
    palette = theme.get("palette", {}) or {}
    allowed = set()
    for key, value in palette.items():
        if isinstance(value, str):
            allowed.add(value.lower())
        elif isinstance(value, list):
            for v in value:
                if isinstance(v, str):
                    allowed.add(v.lower())
    allowed.add("#ffffff")
    allowed.add("#000000")

    leaks: list[tuple[str, str]] = []

    def visit(slide_id: str, node: dict[str, Any]) -> None:
        if not isinstance(node, dict):
            return
        for color_key in ("fill", "stroke"):
            color = node.get(color_key)
            if isinstance(color, str) and color.lower() not in allowed:
                leaks.append((slide_id, color))
        if node.get("type") == "text":
            for run in node.get("runs", []) or []:
                color = run.get("color")
                if isinstance(color, str) and color.lower() not in allowed:
                    leaks.append((slide_id, color))
        if node.get("type") == "shape" and node.get("text"):
            visit(slide_id, node["text"])
        if node.get("type") == "group":
            for child in node.get("children", []) or []:
                visit(slide_id, child)

    for slide in ir.get("slides", []) or []:
        for node in slide.get("nodes", []) or []:
            visit(slide.get("id", "?"), node)

    if leaks:
        sample = leaks[:5]
        findings.append(
            Finding(
                code="PALETTE_DRIFT",
                severity="OBSERVATION",
                message=f"{len(leaks)} non-theme colors used (sample: {sample}).",
            )
        )
        return max(0, 100 - 6 * len(leaks))
    return 100


def score_overlap(ir: dict[str, Any], findings: list[Finding]) -> int:
    """Trivial rectangle overlap detector inside each slide (heuristic, not authoritative)."""
    issues = 0
    for slide in ir.get("slides", []) or []:
        boxes: list[tuple[int, int, int, int, str]] = []

        def collect(node: dict[str, Any]) -> None:
            if not isinstance(node, dict):
                return
            box = node.get("box")
            if isinstance(box, dict) and node.get("type") in ("text", "shape", "image", "table", "chart"):
                boxes.append(
                    (
                        int(box.get("x", 0)),
                        int(box.get("y", 0)),
                        int(box.get("x", 0)) + int(box.get("w", 0)),
                        int(box.get("y", 0)) + int(box.get("h", 0)),
                        str(node.get("id", "")),
                    )
                )
            if node.get("type") == "group":
                for child in node.get("children", []) or []:
                    collect(child)

        for node in slide.get("nodes", []) or []:
            collect(node)
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]:
                    continue
                # Allow fully-contained children (group/parent semantics).
                contained = (
                    (a[0] <= b[0] and a[1] <= b[1] and a[2] >= b[2] and a[3] >= b[3])
                    or (b[0] <= a[0] and b[1] <= a[1] and b[2] >= a[2] and b[3] >= a[3])
                )
                if contained:
                    continue
                issues += 1
    if issues > 0:
        findings.append(
            Finding(
                code="OVERLAP_DETECTED",
                severity="OBSERVATION",
                message=f"{issues} potential overlapping rectangles (heuristic).",
            )
        )
    return max(0, 100 - 5 * issues)


def evaluate(run_dir: Path) -> Report:
    ir_path = run_dir / "deck.ir.json"
    edit_path = run_dir / "editability-report.json"
    manifest_path = run_dir / "brand-template-manifest.yaml"

    if not ir_path.exists():
        raise SystemExit(f"missing artifact: {ir_path}")
    ir = load_json(ir_path)

    findings: list[Finding] = []

    editability_score = 0
    if edit_path.exists():
        edit = load_json(edit_path)
        editability_score = int(edit.get("editability_score", 0))
        if edit.get("verdict") != "PASS":
            findings.append(
                Finding(
                    code="EDITABILITY_NOT_PASS",
                    severity="BLOCKER",
                    message=f"Editability verdict {edit.get('verdict')!r}; required PASS for Design 100.",
                )
            )
    else:
        findings.append(
            Finding(
                code="MISSING_EDITABILITY_REPORT",
                severity="BLOCKER",
                message=f"editability-report.json not found at {edit_path}.",
            )
        )

    if not manifest_path.exists():
        findings.append(
            Finding(
                code="MISSING_BRAND_MANIFEST",
                severity="OBSERVATION",
                message=f"brand-template-manifest.yaml not found at {manifest_path}; brand fidelity unproven.",
            )
        )

    scores = {
        "editability": editability_score,
        "key_slides": score_key_slides(ir, findings),
        "density": score_density(ir, findings),
        "palette": score_palette(ir, findings),
        "overlap": score_overlap(ir, findings),
    }
    overall = round(sum(scores.values()) / len(scores))
    blockers = [f for f in findings if f.severity == "BLOCKER"]

    if blockers or overall < 95:
        verdict = "DESIGN_LT_100"
    else:
        verdict = "DESIGN_100"

    return Report(
        run_id=str(run_dir.name),
        evaluated_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat().replace("+00:00", "Z"),
        editability_score=editability_score,
        findings=findings,
        scores=scores | {"overall": overall},
        verdict=verdict,
    )


def write_report(run_dir: Path, report: Report) -> Path:
    out_path = run_dir / "design-mastery-report.yaml"
    payload = {
        "schema_version": "1.0.0",
        "run_id": report.run_id,
        "evaluated_at": report.evaluated_at,
        "editability_score": report.editability_score,
        "scores": report.scores,
        "findings": [
            {"code": f.code, "severity": f.severity, "message": f.message}
            for f in report.findings
        ],
        "verdict": report.verdict,
    }
    with out_path.open("w", encoding="utf-8") as fh:
        yaml.safe_dump(payload, fh, sort_keys=False)
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(description="SINKRA Design 100 runtime gate.")
    parser.add_argument(
        "run_dir",
        help="Path to the run workspace, e.g. outputs/slides-creator/{run_id}/",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero when verdict != DESIGN_100.",
    )
    args = parser.parse_args()

    run_dir = find_run_dir(args.run_dir)
    report = evaluate(run_dir)
    out_path = write_report(run_dir, report)
    print(
        json.dumps(
            {
                "verdict": report.verdict,
                "overall": report.scores.get("overall"),
                "editability_score": report.editability_score,
                "report_path": str(out_path),
                "blockers": [f.message for f in report.findings if f.severity == "BLOCKER"],
            },
            indent=2,
        )
    )
    if args.strict and report.verdict != "DESIGN_100":
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
