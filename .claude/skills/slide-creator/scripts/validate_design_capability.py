#!/usr/bin/env python3
"""Validate bundled Design capability corpora for the slide-creator skill."""

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


def fail_if(condition: bool, errors: list[str], message: str) -> None:
    if condition:
        errors.append(message)


def validate_design_regression(skill_dir: Path, errors: list[str]) -> None:
    data = load_yaml(skill_dir / "templates/eval/design-regression-corpus.yaml")
    cases = data.get("fixture_cases") or []
    bar = data.get("minimum_reference_bar") or {}
    fail_if(len(cases) < int(bar.get("fixture_cases") or 30), errors, "design-regression-corpus needs at least 30 fixture_cases")
    deck_jobs = {case.get("deck_job") for case in cases if isinstance(case, dict)}
    themes = {case.get("theme_profile") for case in cases if isinstance(case, dict)}
    densities = {case.get("density") for case in cases if isinstance(case, dict)}
    fail_if(len(deck_jobs) < int(bar.get("deck_jobs") or 10), errors, "design-regression-corpus needs broader deck_job coverage")
    fail_if(len(themes) < int(bar.get("theme_profiles") or 8), errors, "design-regression-corpus needs broader theme_profile coverage")
    for required in bar.get("density_levels") or []:
        fail_if(required not in densities, errors, f"design-regression-corpus missing density {required}")
    for case in cases:
        if not isinstance(case, dict):
            errors.append("design-regression-corpus fixture case must be an object")
            continue
        cid = case.get("id", "unknown")
        for field in ("deck_job", "fixture_set", "wireframes", "theme_profile", "density", "required_checks"):
            fail_if(not case.get(field), errors, f"design-regression-corpus {cid} missing {field}")
        fail_if(len(case.get("wireframes") or []) < 2, errors, f"design-regression-corpus {cid} needs at least 2 wireframes")
        fail_if(len(case.get("required_checks") or []) < 3, errors, f"design-regression-corpus {cid} needs at least 3 required_checks")


def validate_import_corpus(skill_dir: Path, errors: list[str]) -> None:
    data = load_yaml(skill_dir / "templates/import/template-import-regression-corpus.yaml")
    cases = data.get("source_family_cases") or []
    bar = data.get("minimum_reference_bar") or {}
    fail_if(len(cases) < int(bar.get("source_family_cases") or 20), errors, "template-import-regression-corpus needs at least 20 source_family_cases")
    families = {case.get("source_family") for case in cases if isinstance(case, dict)}
    for family in bar.get("required_source_families") or []:
        fail_if(family not in families, errors, f"template-import-regression-corpus missing source family {family}")
    for case in cases:
        if not isinstance(case, dict):
            errors.append("template-import-regression-corpus source family case must be an object")
            continue
        cid = case.get("id", "unknown")
        for field in ("source_family", "use_for", "expected_manifest", "fidelity_checks"):
            fail_if(not case.get(field), errors, f"template-import-regression-corpus {cid} missing {field}")
        fail_if(len(case.get("expected_manifest") or []) < 3, errors, f"template-import-regression-corpus {cid} needs at least 3 expected_manifest items")
        fail_if(len(case.get("fidelity_checks") or []) < 3, errors, f"template-import-regression-corpus {cid} needs at least 3 fidelity_checks")


def validate_theme_snapshots(skill_dir: Path, errors: list[str]) -> None:
    data = load_yaml(skill_dir / "templates/runtime/theme-runtime-snapshot-suite.yaml")
    cases = data.get("snapshot_cases") or []
    bar = data.get("minimum_reference_bar") or {}
    fail_if(len(cases) < int(bar.get("snapshot_cases") or 16), errors, "theme-runtime-snapshot-suite needs enough snapshot_cases")
    themes = {case.get("theme_profile") for case in cases if isinstance(case, dict)}
    fail_if(len(themes) < int(bar.get("theme_profiles_sampled") or 12), errors, "theme-runtime-snapshot-suite needs more sampled themes")
    families = set()
    for case in cases:
        if not isinstance(case, dict):
            errors.append("theme-runtime-snapshot-suite snapshot case must be an object")
            continue
        cid = case.get("id", "unknown")
        for field in ("theme_profile", "component_families", "required_bindings"):
            fail_if(not case.get(field), errors, f"theme-runtime-snapshot-suite {cid} missing {field}")
        families.update(case.get("component_families") or [])
        fail_if(len(case.get("required_bindings") or []) < 4, errors, f"theme-runtime-snapshot-suite {cid} needs at least 4 required_bindings")
    fail_if(len(families) < int(bar.get("component_families") or 10), errors, "theme-runtime-snapshot-suite needs broader component family coverage")


def validate(skill_dir: Path) -> dict[str, Any]:
    errors: list[str] = []
    for rel in (
        "templates/eval/design-regression-corpus.yaml",
        "templates/import/template-import-regression-corpus.yaml",
        "templates/runtime/theme-runtime-snapshot-suite.yaml",
    ):
        fail_if(not (skill_dir / rel).exists(), errors, f"missing required file: {rel}")
    if not errors:
        validate_design_regression(skill_dir, errors)
        validate_import_corpus(skill_dir, errors)
        validate_theme_snapshots(skill_dir, errors)
    return {"status": "pass" if not errors else "fail", "errors": errors}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("skill_dir", help="Path to slide-creator skill directory")
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
