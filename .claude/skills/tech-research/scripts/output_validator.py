#!/usr/bin/env python3
"""Output structure validator for tech-research pipeline.

Worker atom: QG-PROD-6 (output completeness)
Deterministic: file existence + content checks, no LLM needed.

Usage:
    python output_validator.py [--mode current|target] /path/to/docs/research/2026-03-28-slug/

Modes (Sprint 0 A2 fix — REQUIRED_FILES paradox):
    current  Default. Baseline V1 artifacts that every Claude Code + Codex run
             must produce. Aligns with E07 gold standard (docs/research/
             2026-05-06-harness-repositories-apr-may-2026/).
    target   Aspirational V3 artifacts including curiosity_queue, evolving_report,
             and execution-log JSONL. Used by spy v5 evolution + future skill
             upgrades. Currently only E07 partially satisfies; Claude Code runs
             intentionally fail under target until the cognitive atoms ship.
"""

import argparse
import os
import sys
import json
import re

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

REQUIRED_FILES_CURRENT = [
    "README.md",
    "00-query-original.md",
    "01-deep-research-prompt.md",
    "02-research-report.md",
    "03-recommendations.md",
    "metrics.yaml",
    "pipeline-state.yaml",
]

REQUIRED_FILES_TARGET = REQUIRED_FILES_CURRENT + [
    "curiosity_queue.yaml",
    "evolving_report.md",
    "execution-log.jsonl",
]

# Default for backward compatibility when callers do not pass --mode.
REQUIRED_FILES = REQUIRED_FILES_CURRENT

OPTIONAL_FILES = []

README_REQUIRED_SECTIONS = [
    "TL;DR",
    "Research Metadata",
    "workflow_version",
    "runtime_contract",
    "coverage_score",
    "citation_verified",
    "stop_reason",
    "rubrics",
]

REPORT_MIN_SIZE = 500
RECS_MIN_SIZE = 200


def _load_structured_file(path: str) -> dict:
    """Load YAML or JSON file content."""
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    if path.endswith(".json") or not HAS_YAML:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    try:
        data = yaml.safe_load(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def validate_output(output_dir: str) -> dict:
    """Validate research output directory structure and content."""
    results = {
        "directory": output_dir,
        "valid": True,
        "checks": [],
        "warnings": [],
        "errors": [],
    }

    if not os.path.isdir(output_dir):
        results["valid"] = False
        results["errors"].append(f"Directory not found: {output_dir}")
        return results

    for f in REQUIRED_FILES:
        path = os.path.join(output_dir, f)
        if os.path.exists(path):
            size = os.path.getsize(path)
            results["checks"].append({"file": f, "status": "EXISTS", "size": size})

            if f == "02-research-report.md" and size < REPORT_MIN_SIZE:
                results["warnings"].append(f"{f} is small ({size} bytes, min {REPORT_MIN_SIZE})")
            if f == "03-recommendations.md" and size < RECS_MIN_SIZE:
                results["warnings"].append(f"{f} is small ({size} bytes, min {RECS_MIN_SIZE})")
        else:
            results["valid"] = False
            results["errors"].append(f"MISSING required file: {f}")
            results["checks"].append({"file": f, "status": "MISSING"})

    for f in OPTIONAL_FILES:
        path = os.path.join(output_dir, f)
        if os.path.exists(path):
            results["checks"].append({"file": f, "status": "EXISTS", "size": os.path.getsize(path)})
        else:
            results["warnings"].append(f"Optional file missing: {f}")

    readme_path = os.path.join(output_dir, "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, encoding="utf-8") as f:
            content = f.read()
        for section in README_REQUIRED_SECTIONS:
            if section not in content:
                results["valid"] = False
                results["errors"].append(f"README.md missing required section/keyword: {section}")

        if "scope_declaration_required: true" in content and "scope_declaration" not in content:
            results["valid"] = False
            results["errors"].append("README.md declares scope_declaration_required but no scope_declaration block was found")

    report_path = os.path.join(output_dir, "02-research-report.md")
    if os.path.exists(report_path):
        with open(report_path, encoding="utf-8") as f:
            content = f.read()
        confidence_tags = len(re.findall(r"\[(?:HIGH|MEDIA|LOW)\s*—", content))
        if confidence_tags == 0:
            results["valid"] = False
            results["errors"].append("02-research-report.md has no confidence tags [HIGH|MEDIA|LOW]")
        results["checks"].append({"check": "confidence_tags", "count": confidence_tags})

        source_dates = len(re.findall(r"—\s*\d{4}", content))
        results["checks"].append({"check": "source_dates_in_refs", "count": source_dates})

        if re.search(r"\b(alternatives?|comparativo|comparison|landscape|builders?|tools?|frameworks?)\b", content, re.IGNORECASE):
            if "scope_declaration" not in content and "## Scope" not in content:
                results["valid"] = False
                results["errors"].append("Comparison/category report missing scope_declaration or ## Scope section")

        if "## Stop Reason" not in content and "stop_reason" not in content:
            results["valid"] = False
            results["errors"].append("02-research-report.md missing Stop Reason section or stop_reason marker")

    metrics = _load_structured_file(os.path.join(output_dir, "metrics.yaml"))
    pipeline_state = _load_structured_file(os.path.join(output_dir, "pipeline-state.yaml"))

    for field in ["workflow_version", "coverage_score", "integrity_score", "citation_verified", "stop_reason", "rubrics", "runtime_contract"]:
        if field not in metrics:
            results["valid"] = False
            results["errors"].append(f"metrics.yaml missing required field: {field}")

    rubrics = metrics.get("rubrics")
    if not isinstance(rubrics, dict) or not rubrics:
        results["valid"] = False
        results["errors"].append("metrics.yaml rubrics must be a non-empty mapping")
    else:
        for axis in ["information_recall", "analysis", "presentation"]:
            axis_value = rubrics.get(axis)
            if not isinstance(axis_value, dict) or "passed" not in axis_value or "total" not in axis_value:
                results["valid"] = False
                results["errors"].append(f"metrics.yaml rubrics missing passed/total for axis: {axis}")

    if not pipeline_state.get("pipeline_id"):
        results["valid"] = False
        results["errors"].append("pipeline-state.yaml missing required field: pipeline_id")
    if not pipeline_state.get("status"):
        results["valid"] = False
        results["errors"].append("pipeline-state.yaml missing required field: status")
    if "stop_reason" not in pipeline_state:
        results["valid"] = False
        results["errors"].append("pipeline-state.yaml missing required field: stop_reason")

    curiosity = _load_structured_file(os.path.join(output_dir, "curiosity_queue.yaml"))
    if "items" not in curiosity or not isinstance(curiosity.get("items"), list):
        results["valid"] = False
        results["errors"].append("curiosity_queue.yaml missing list field: items")

    execution_log_path = os.path.join(output_dir, "execution-log.jsonl")
    if os.path.exists(execution_log_path):
        with open(execution_log_path, encoding="utf-8") as f:
            rows = [line.strip() for line in f if line.strip()]
        if not rows:
            results["valid"] = False
            results["errors"].append("execution-log.jsonl is empty")
        for idx, row in enumerate(rows, start=1):
            try:
                json.loads(row)
            except json.JSONDecodeError:
                results["valid"] = False
                results["errors"].append(f"execution-log.jsonl line {idx} is not valid JSON")

    follow_ups = [f for f in os.listdir(output_dir) if re.match(r"0[4-9]-.*\.md|[1-9]\d-.*\.md", f)]
    if follow_ups:
        results["checks"].append({"check": "follow_up_files", "count": len(follow_ups), "files": follow_ups})

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Validate tech-research pipeline output structure.",
    )
    parser.add_argument(
        "--mode",
        choices=["current", "target"],
        default="current",
        help=(
            "Validation mode. 'current' (default) checks the V1 baseline that all "
            "Claude Code + Codex runs must produce. 'target' adds V3 cognitive "
            "atoms (curiosity_queue.yaml, evolving_report.md, execution-log.jsonl) "
            "expected after spy v5 evolution. Default mode is the gate that runs "
            "today; target mode is the aspirational gate."
        ),
    )
    parser.add_argument("output_dir", help="Path to docs/research/{date}-{slug}/")
    args = parser.parse_args()

    global REQUIRED_FILES
    REQUIRED_FILES = (
        REQUIRED_FILES_TARGET if args.mode == "target" else REQUIRED_FILES_CURRENT
    )

    result = validate_output(args.output_dir)
    result["mode"] = args.mode
    print(json.dumps(result, indent=2))

    if not result["valid"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
