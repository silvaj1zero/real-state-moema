#!/usr/bin/env python3
"""Validate Design 100 artifacts for a slide-creator deck package."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


REQUIRED_FILES = [
    "brand-template-manifest.yaml",
    "design-mastery-report.yaml",
    "key-slide-render-review.yaml",
    "visual-regression-checklist.yaml",
    "template-selection-report.yaml",
    "render-lock.yaml",
]

REQUIRED_RENDER_ROLES = {
    "cover",
    "reframe",
    "mechanism",
    "proof_or_demo",
    "cta_or_decision",
}


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def body(data: Any, key: str) -> dict[str, Any]:
    if isinstance(data, dict):
        value = data.get(key, data)
        if isinstance(value, dict):
            return value
    return {}


def validate_manifest(root: Path, errors: list[str], warnings: list[str]) -> None:
    data = body(load_yaml(root / "brand-template-manifest.yaml"), "brand_template_manifest")
    for field in ("source_reference", "visual_dna", "token_map", "layout_families", "component_patterns", "anti_patterns"):
        if not data.get(field):
            errors.append(f"brand-template-manifest.yaml missing {field}")
    source = data.get("source_reference") or {}
    if not source.get("type") or not source.get("path_or_url"):
        errors.append("brand-template-manifest.yaml source_reference needs type and path_or_url")
    dna = data.get("visual_dna") or {}
    if not dna.get("non_color_traits"):
        errors.append("brand-template-manifest.yaml needs non_color_traits")
    tokens = data.get("token_map") or {}
    for section in ("colors", "typography", "spacing", "chart_palette"):
        if not tokens.get(section):
            errors.append(f"brand-template-manifest.yaml token_map missing {section}")
    if source.get("confidence") == "low":
        warnings.append("brand-template-manifest.yaml source confidence is low")


def validate_report(root: Path, errors: list[str], warnings: list[str]) -> None:
    data = body(load_yaml(root / "design-mastery-report.yaml"), "design_mastery_report")
    target = int(data.get("target_score") or 95)
    calculated = float(data.get("calculated_score") or 0)
    if calculated < target:
        errors.append(f"design-mastery-report.yaml calculated_score {calculated:g} below target {target}")
    lenses = data.get("score_lenses") or []
    if len(lenses) < 6:
        errors.append("design-mastery-report.yaml needs all 6 score_lenses")
    for lens in lenses:
        if not isinstance(lens, dict):
            errors.append("design-mastery-report.yaml score_lens must be an object")
            continue
        if not lens.get("id"):
            errors.append("design-mastery-report.yaml score_lens missing id")
        if float(lens.get("score") or 0) < 90:
            errors.append(f"design-mastery-report.yaml lens {lens.get('id')} below 90")
        if not lens.get("evidence"):
            errors.append(f"design-mastery-report.yaml lens {lens.get('id')} missing evidence")
        if lens.get("blockers"):
            errors.append(f"design-mastery-report.yaml lens {lens.get('id')} has blockers")
    if data.get("verdict") != "pass":
        errors.append("design-mastery-report.yaml verdict must be pass")
    mapping = data.get("microdimension_mapping") or {}
    if len(mapping) < 9:
        warnings.append("design-mastery-report.yaml should map all 9 Design microdimensions")


def validate_render_review(root: Path, errors: list[str], warnings: list[str]) -> None:
    data = body(load_yaml(root / "key-slide-render-review.yaml"), "key_slide_render_review")
    slides = data.get("reviewed_slides") or []
    roles = {str(slide.get("required_role")) for slide in slides if isinstance(slide, dict)}
    missing = sorted(REQUIRED_RENDER_ROLES - roles)
    if missing:
        errors.append(f"key-slide-render-review.yaml missing roles: {', '.join(missing)}")
    for slide in slides:
        if not isinstance(slide, dict):
            errors.append("key-slide-render-review.yaml reviewed slide must be an object")
            continue
        sid = slide.get("slide_id") or "unknown"
        if not slide.get("screenshot_or_preview_path"):
            errors.append(f"key-slide-render-review.yaml {sid} missing screenshot_or_preview_path")
        avg = float(slide.get("average_score") or 0)
        if avg < 90:
            errors.append(f"key-slide-render-review.yaml {sid} average_score below 90")
        if slide.get("blockers"):
            errors.append(f"key-slide-render-review.yaml {sid} has blockers")
        for patch in slide.get("visual_patches") or []:
            if isinstance(patch, dict) and patch.get("status") == "open":
                errors.append(f"key-slide-render-review.yaml {sid} has open visual patch")
    aggregate = data.get("aggregate") or {}
    if float(aggregate.get("average_score") or 0) < 95:
        errors.append("key-slide-render-review.yaml aggregate average_score below 95")
    if aggregate.get("verdict") != "pass":
        errors.append("key-slide-render-review.yaml aggregate verdict must be pass")
    if not slides:
        warnings.append("key-slide-render-review.yaml has no reviewed slides")


def validate_regression(root: Path, errors: list[str], warnings: list[str]) -> None:
    data = body(load_yaml(root / "visual-regression-checklist.yaml"), "visual_regression_checklist")
    checks = data.get("checks") or []
    if not checks:
        errors.append("visual-regression-checklist.yaml has no checks")
    for check in checks:
        if not isinstance(check, dict):
            errors.append("visual-regression-checklist.yaml check must be an object")
            continue
        if check.get("status") == "fail":
            errors.append(f"visual-regression-checklist.yaml failed check {check.get('id')}")
        if check.get("status") == "pass" and not check.get("evidence"):
            errors.append(f"visual-regression-checklist.yaml passed check {check.get('id')} missing evidence")
    if data.get("verdict") != "pass":
        errors.append("visual-regression-checklist.yaml verdict must be pass")
    if data.get("release_blockers"):
        errors.append("visual-regression-checklist.yaml has release_blockers")


def validate_design_mastery(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    missing = [name for name in REQUIRED_FILES if not (root / name).exists()]
    errors.extend(f"missing required file: {name}" for name in missing)
    if missing:
        return {"status": "fail", "errors": errors, "warnings": warnings}

    try:
        validate_manifest(root, errors, warnings)
        validate_report(root, errors, warnings)
        validate_render_review(root, errors, warnings)
        validate_regression(root, errors, warnings)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"could not validate design mastery artifacts: {exc}")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("package_dir", help="Deck package directory containing Design 100 artifacts.")
    parser.add_argument("--json", action="store_true", help="Print JSON report.")
    args = parser.parse_args()

    report = validate_design_mastery(Path(args.package_dir))
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"status: {report['status']}")
        for item in report["errors"]:
            print(f"ERROR: {item}")
        for item in report["warnings"]:
            print(f"WARN: {item}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
