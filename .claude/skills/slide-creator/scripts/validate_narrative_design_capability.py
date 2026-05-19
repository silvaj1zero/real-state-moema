#!/usr/bin/env python3
"""Validate narrative-design and storyboard-edit capability contracts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def validate(skill_dir: Path) -> dict[str, Any]:
    errors: list[str] = []
    files = {
        "moment": "templates/runtime/narrative-design-moment-grammar.yaml",
        "edit": "templates/runtime/storyboard-edit-contract.yaml",
    }
    for rel in files.values():
        if not (skill_dir / rel).exists():
            errors.append(f"missing required file: {rel}")
    if errors:
        return {"status": "fail", "errors": errors}

    moment = load_yaml(skill_dir / files["moment"])
    required = set(moment.get("moment_schema", {}).get("required_fields") or [])
    for field in {
        "narrative_job",
        "audience_state_before",
        "audience_state_after",
        "primary_visual_move",
        "density_budget",
        "failure_mode",
    }:
        if field not in required:
            errors.append(f"moment_schema missing required field: {field}")
    archetypes = moment.get("moment_archetypes") or []
    if len(archetypes) < 9:
        errors.append("narrative-design moment grammar needs at least 9 archetypes")
    seen_jobs: set[str] = set()
    for item in archetypes:
        if not isinstance(item, dict):
            errors.append("moment archetype must be an object")
            continue
        item_id = item.get("id", "unknown")
        seen_jobs.add(str(item.get("narrative_job")))
        for field in required:
            if field == "moment_id" and item.get("id"):
                continue
            if not item.get(field):
                errors.append(f"{item_id} missing {field}")
        if not item.get("compatible_slide_functions"):
            errors.append(f"{item_id} missing compatible_slide_functions")
        if not item.get("forbidden_visual_moves"):
            errors.append(f"{item_id} missing forbidden_visual_moves")
    if len(seen_jobs) < 8:
        errors.append("moment grammar needs at least 8 distinct narrative jobs")
    if len(moment.get("continuity_rules") or []) < 5:
        errors.append("moment grammar needs at least 5 continuity_rules")

    edit = load_yaml(skill_dir / files["edit"])
    schema = edit.get("edit_request_schema") or {}
    if len(schema.get("target_scopes") or []) < 6:
        errors.append("storyboard-edit contract needs at least 6 target_scopes")
    if len(schema.get("expected_diff_types") or []) < 8:
        errors.append("storyboard-edit contract needs at least 8 expected_diff_types")
    if len(edit.get("preservation_rules") or []) < 5:
        errors.append("storyboard-edit contract needs at least 5 preservation_rules")
    diff = edit.get("diff_contract") or {}
    if len(diff.get("required_sections") or []) < 7:
        errors.append("storyboard-edit diff_contract needs at least 7 required_sections")
    diff_types = set(schema.get("expected_diff_types") or [])
    reruns = diff.get("qa_rerun_by_diff_type") or {}
    missing = sorted(diff_types - set(reruns))
    if missing:
        errors.append(f"storyboard-edit missing QA rerun mapping: {', '.join(missing)}")
    for diff_type, gates in reruns.items():
        if len(gates or []) < 3:
            errors.append(f"{diff_type} needs at least 3 QA rerun gates")
    acceptance = edit.get("acceptance") or {}
    if len(acceptance.get("pass_if") or []) < 4:
        errors.append("storyboard-edit acceptance needs at least 4 pass_if items")
    if len(acceptance.get("block_if") or []) < 4:
        errors.append("storyboard-edit acceptance needs at least 4 block_if items")

    return {"status": "pass" if not errors else "fail", "errors": errors}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("skill_dir")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = validate(Path(args.skill_dir))
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"status: {report['status']}")
        for error in report["errors"]:
            print(f"ERROR: {error}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
