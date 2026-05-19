#!/usr/bin/env python3
"""Validate rendered-eval reports for slide-creator packages."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


REQUIRED_CATEGORIES = {"vision", "content", "logic", "technical_render"}


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    return []


def score_value(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, dict):
        raw = value.get("score") or value.get("value")
        if isinstance(raw, (int, float)) and not isinstance(raw, bool):
            return float(raw)
    return None


def extract_slides(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        if "rendered_eval" in data:
            return extract_slides(data["rendered_eval"])
        for key in ("slides", "slide_evaluations", "evaluations", "items"):
            value = data.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def package_path_exists(package_root: Path | None, value: Any) -> bool:
    if package_root is None:
        return True
    if not isinstance(value, str) or not value.strip():
        return False
    if value.startswith(("http://", "https://")):
        return True
    path = Path(value)
    if path.is_absolute():
        return path.exists()
    return (package_root / path).exists()


def validate_scores(slide: dict[str, Any], slide_label: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    scores = slide.get("scores") or slide.get("category_scores") or {}

    if not isinstance(scores, dict):
        return [f"{slide_label}: scores must be an object"], warnings

    missing = REQUIRED_CATEGORIES - set(scores)
    for category in sorted(missing):
        errors.append(f"{slide_label}: missing score category {category}")

    for category, raw_score in scores.items():
        score = score_value(raw_score)
        if score is None:
            errors.append(f"{slide_label}: score {category} must be numeric")
            continue
        if score < 1 or score > 5:
            errors.append(f"{slide_label}: score {category} must be between 1 and 5")
        if category in REQUIRED_CATEGORIES and score < 4:
            errors.append(f"{slide_label}: score {category} below final-delivery threshold 4")

    if "revision_actions" not in slide:
        warnings.append(f"{slide_label}: missing revision_actions")
    if not slide.get("content_description"):
        warnings.append(f"{slide_label}: missing content_description")
    if not slide.get("style_description"):
        warnings.append(f"{slide_label}: missing style_description")

    return errors, warnings


def validate_rendered_eval(path: Path, package_root: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    data = load_yaml(path)
    body = data.get("rendered_eval", data) if isinstance(data, dict) else data
    slides = extract_slides(body)

    if not slides:
        errors.append("rendered-eval has no slide evaluations")

    blockers = []
    if isinstance(body, dict):
        blockers = as_list(body.get("blockers"))
        if blockers:
            errors.append("rendered-eval has unresolved blockers")
        overall = score_value(body.get("overall_score"))
        if overall is not None and overall < 4:
            errors.append("overall_score below final-delivery threshold 4")

    for index, slide in enumerate(slides, start=1):
        slide_id = str(slide.get("slide_id") or slide.get("id") or f"slide_{index}")
        slide_errors, slide_warnings = validate_scores(slide, slide_id)
        errors.extend(slide_errors)
        warnings.extend(slide_warnings)

        image_path = slide.get("image_path") or slide.get("rendered_image") or slide.get("screenshot")
        if image_path and not package_path_exists(package_root, image_path):
            errors.append(f"{slide_id}: rendered image does not exist: {image_path}")

    return {
        "input": str(path),
        "slide_count": len(slides),
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rendered_eval", type=Path)
    parser.add_argument("--package-root", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    report = validate_rendered_eval(args.rendered_eval, package_root=args.package_root)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"status: {report['status']}")
        print(f"slide_count: {report['slide_count']}")
        for error in report["errors"]:
            print(f"ERROR: {error}")
        for warning in report["warnings"]:
            print(f"WARN: {warning}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
