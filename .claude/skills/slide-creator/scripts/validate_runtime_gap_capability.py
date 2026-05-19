#!/usr/bin/env python3
"""Validate runtime gap capability contracts for slide-creator."""

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
    files = [
        "templates/runtime/storyboard-render-bridge.yaml",
        "templates/runtime/speaker-notes-narration-contract.yaml",
        "templates/runtime/runtime-gap-absorption-corpus.yaml",
    ]
    for rel in files:
        if not (skill_dir / rel).exists():
            errors.append(f"missing required file: {rel}")
    if errors:
        return {"status": "fail", "errors": errors}

    bridge = load_yaml(skill_dir / files[0])
    for field in bridge.get("storyboard_contract", {}).get("required_fields", []):
        if not field:
            errors.append("storyboard-render-bridge has empty required field")
    if len(bridge.get("continuity_checks") or []) < 4:
        errors.append("storyboard-render-bridge needs at least 4 continuity checks")

    notes = load_yaml(skill_dir / files[1])
    if len(notes.get("note_modes") or []) < 4:
        errors.append("speaker-notes-narration-contract needs at least 4 note modes")
    if not notes.get("narration_sync"):
        errors.append("speaker-notes-narration-contract missing narration_sync")

    runtime = load_yaml(skill_dir / files[2])
    groups = runtime.get("gap_groups") or []
    if len(groups) < 6:
        errors.append("runtime-gap-absorption-corpus needs at least 6 gap groups")
    for group in groups:
        gid = group.get("id", "unknown") if isinstance(group, dict) else "unknown"
        if not isinstance(group, dict):
            errors.append("runtime gap group must be an object")
            continue
        for field in ("group", "target_score_path", "must_build", "acceptance"):
            if not group.get(field):
                errors.append(f"{gid} missing {field}")
        if len(group.get("must_build") or []) < 4:
            errors.append(f"{gid} needs at least 4 must_build items")
        if len(group.get("acceptance") or []) < 4:
            errors.append(f"{gid} needs at least 4 acceptance items")

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
