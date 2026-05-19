#!/usr/bin/env python3
"""Run forward-test regression fixtures against a slide-creator package."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


def load_yaml(path: Path) -> Any:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def find_slides(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        for key in ("slides", "deck_spec", "deck"):
            value = data.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
            if isinstance(value, dict):
                nested = find_slides(value)
                if nested:
                    return nested
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def text_contains(value: Any, *needles: str) -> bool:
    text = json.dumps(value, ensure_ascii=False).lower()
    return any(needle.lower() in text for needle in needles)


def file_exists(root: Path, rel: str) -> bool:
    return (root / rel).exists()


def validate_narrative_fixture(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    story_arc = load_yaml(root / "story-arc.yaml")
    deck_spec = load_yaml(root / "deck-spec.yaml")
    slides = find_slides(deck_spec)

    if not story_arc:
        errors.append("narrative_failure_fixture: missing story-arc.yaml")
    if not slides:
        errors.append("narrative_failure_fixture: deck-spec.yaml has no slides")
    for index, slide in enumerate(slides, start=1):
        if not slide.get("function"):
            errors.append(f"narrative_failure_fixture: slide {index} missing function")
        if not slide.get("action_title"):
            errors.append(f"narrative_failure_fixture: slide {index} missing action_title")

    functions = [slide.get("function") for slide in slides if slide.get("function")]
    if len(functions) != len(set(functions)):
        warnings.append("narrative_failure_fixture: duplicate slide functions detected; verify repetition is intentional")

    return errors, warnings


def validate_design_fixture(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    deck_spec = load_yaml(root / "deck-spec.yaml")
    visual_selection = load_yaml(root / "visual-template-selection.yaml")
    slides = find_slides(deck_spec)

    if not visual_selection:
        errors.append("design_failure_fixture: missing visual-template-selection.yaml")

    repeated = 0
    previous_structure = None
    for index, slide in enumerate(slides, start=1):
        structure = slide.get("structure_id") or slide.get("structure_name")
        if not structure:
            warnings.append(f"design_failure_fixture: slide {index} missing structure")
        if structure and structure == previous_structure:
            repeated += 1
        else:
            repeated = 1
        previous_structure = structure
        if repeated > 2:
            errors.append(f"design_failure_fixture: more than two consecutive slides use {structure}")

        qa = slide.get("qa") or {}
        if qa.get("visible_word_count") and qa["visible_word_count"] > 45:
            warnings.append(f"design_failure_fixture: slide {index} exceeds default density limit")

    if text_contains(deck_spec, "decorative") and not text_contains(deck_spec, "proof", "demo", "clarity"):
        warnings.append("design_failure_fixture: decorative media detected without proof/demo/clarity reason")

    return errors, warnings


def validate_research_fixture(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    ledger = load_yaml(root / "source-ledger.yaml")
    research_route = load_yaml(root / "research-route-selection.yaml")
    deck_spec = load_yaml(root / "deck-spec.yaml")

    if text_contains(deck_spec, "status\": \"sourced", "status\": \"validate") and not ledger:
        errors.append("research_failure_fixture: sourced or validate evidence needs source-ledger.yaml")
    if ledger:
        claims = ledger.get("claims") or ledger.get("evidence_ledger", {}).get("claims") or []
        if not claims:
            errors.append("research_failure_fixture: source-ledger.yaml has no claims")
        for index, claim in enumerate(claims, start=1):
            if not isinstance(claim, dict):
                errors.append(f"research_failure_fixture: claim {index} must be an object")
                continue
            if claim.get("risk") == "needs_source" or not claim.get("source"):
                errors.append(f"research_failure_fixture: claim {index} lacks usable source")
    if ledger and not research_route:
        warnings.append("research_failure_fixture: source ledger exists without research-route-selection.yaml")

    return errors, warnings


def validate_render_fixture(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    rendered_eval = load_yaml(root / "rendered-eval.yaml")
    export_report_exists = file_exists(root, "editability-report.yaml") or file_exists(root, "package-validation-report.json")

    if not rendered_eval:
        errors.append("render_failure_fixture: missing rendered-eval.yaml")
    if not export_report_exists:
        warnings.append("render_failure_fixture: no export/editability/package validation report found")

    if rendered_eval:
        blockers = rendered_eval.get("blockers") or []
        if blockers:
            errors.append("render_failure_fixture: unresolved rendered-eval blockers")
        overall = rendered_eval.get("overall_score")
        if isinstance(overall, (int, float)) and overall < 4:
            errors.append("render_failure_fixture: overall_score below 4")

    return errors, warnings


def validate_template_selection_fixture(root: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    slide_functions = load_yaml(root / "slide-function-map.yaml")
    structure_selection = load_yaml(root / "slide-structure-selection.yaml")
    import_selection = load_yaml(root / "import-pipeline-selection.yaml")

    if not slide_functions:
        errors.append("template_selection_failure_fixture: missing slide-function-map.yaml")
    if not structure_selection:
        errors.append("template_selection_failure_fixture: missing slide-structure-selection.yaml")

    if structure_selection and not text_contains(structure_selection, "why", "reason", "pick"):
        warnings.append("template_selection_failure_fixture: template selection lacks explicit pick reasons")
    if text_contains(import_selection, "induced", "pack") and not text_contains(import_selection, "audience", "media", "deck_job"):
        warnings.append("template_selection_failure_fixture: induced pack selection lacks audience/media/deck_job rationale")

    return errors, warnings


FIXTURE_VALIDATORS = {
    "narrative_failure_fixture": validate_narrative_fixture,
    "design_failure_fixture": validate_design_fixture,
    "research_failure_fixture": validate_research_fixture,
    "render_failure_fixture": validate_render_fixture,
    "template_selection_failure_fixture": validate_template_selection_fixture,
}


def selected_fixtures(root: Path, only: list[str] | None) -> list[str]:
    if only:
        return only
    requested = load_yaml(root / "forward-test.yaml")
    fixture_names = requested.get("fixtures") or requested.get("fixture_used") or []
    if isinstance(fixture_names, str):
        return [fixture_names]
    if isinstance(fixture_names, list) and fixture_names:
        return [name for name in fixture_names if isinstance(name, str)]
    return list(FIXTURE_VALIDATORS)


def run_fixtures(root: Path, only: list[str] | None = None) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    fixture_reports = []

    for fixture_name in selected_fixtures(root, only):
        validator = FIXTURE_VALIDATORS.get(fixture_name)
        if validator is None:
            errors.append(f"unknown fixture: {fixture_name}")
            continue
        fixture_errors, fixture_warnings = validator(root)
        fixture_reports.append(
            {
                "fixture": fixture_name,
                "status": "pass" if not fixture_errors else "fail",
                "errors": fixture_errors,
                "warnings": fixture_warnings,
            }
        )
        errors.extend(fixture_errors)
        warnings.extend(fixture_warnings)

    return {
        "package": str(root),
        "status": "pass" if not errors else "fail",
        "fixtures": fixture_reports,
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package_dir", type=Path)
    parser.add_argument("--fixture", action="append", choices=sorted(FIXTURE_VALIDATORS))
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    report = run_fixtures(args.package_dir, only=args.fixture)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"status: {report['status']}")
        for error in report["errors"]:
            print(f"ERROR: {error}")
        for warning in report["warnings"]:
            print(f"WARN: {warning}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
