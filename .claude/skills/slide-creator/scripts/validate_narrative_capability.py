#!/usr/bin/env python3
"""Validate bundled narrative capability corpus for the slide-creator skill."""

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
    path = skill_dir / "templates/runtime/narrative-regression-corpus.yaml"
    if not path.exists():
        return {"status": "fail", "errors": [f"missing required file: {path}"]}
    data = load_yaml(path)
    cases = data.get("narrative_cases") or []
    bar = data.get("minimum_reference_bar") or {}
    if len(cases) < int(bar.get("narrative_cases") or 24):
        errors.append("narrative-regression-corpus needs at least 24 narrative_cases")
    jobs = {case.get("deck_job") for case in cases if isinstance(case, dict)}
    if len(jobs) < int(bar.get("deck_jobs") or 12):
        errors.append("narrative-regression-corpus needs broader deck_job coverage")
    required = bar.get("required_case_fields") or []
    for case in cases:
        if not isinstance(case, dict):
            errors.append("narrative case must be an object")
            continue
        cid = case.get("id", "unknown")
        for field in required:
            if not case.get(field):
                errors.append(f"{cid} missing {field}")
        if case.get("audience_current_belief") == case.get("desired_belief"):
            errors.append(f"{cid} current and desired belief cannot match")
        if len(case.get("required_beats") or []) < 4:
            errors.append(f"{cid} needs at least 4 required_beats")
        if len(case.get("key_slide_functions") or []) < 3:
            errors.append(f"{cid} needs at least 3 key_slide_functions")
        if not str(case.get("failure_test", "")).lower().startswith("if "):
            errors.append(f"{cid} failure_test must be executable as an If statement")
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
