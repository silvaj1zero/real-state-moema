#!/usr/bin/env python3
"""Validate a slide-creator output package against the skill contracts."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from validate_chart_data import (  # noqa: E402
    extract_dataset,
    load_data as load_chart_data,
    validate_dataset_metadata,
    validate_row,
)
from run_regression_fixtures import run_fixtures  # noqa: E402
from validate_rendered_eval import validate_rendered_eval  # noqa: E402
from validate_runtime_contracts import validate_runtime_contracts  # noqa: E402
from validate_design_mastery import validate_design_mastery  # noqa: E402


MINIMAL_REQUIRED_FILES = [
    "briefing-normalized.yaml",
    "story-arc.yaml",
    "slide-function-map.yaml",
    "design-direction.yaml",
    "deck-spec.yaml",
    "qa-report.yaml",
]

FULL_REQUIRED_FILES = [
    "briefing-normalized.yaml",
    "audience-belief-shift.yaml",
    "story-arc.yaml",
    "slide-function-map.yaml",
    "roteiro-template-selection.yaml",
    "slide-structure-selection.yaml",
    "visual-template-selection.yaml",
    "template-selection-report.yaml",
    "theme-profile-selection.yaml",
    "render-lock.yaml",
    "runtime-job-selection.yaml",
    "job-state.yaml",
    "source-of-truth-policy.yaml",
    "research-route-selection.yaml",
    "import-pipeline-selection.yaml",
    "rendered-eval-selection.yaml",
    "bench-capability-selection.yaml",
    "design-direction.yaml",
    "deck-spec.yaml",
    "speaker-notes.md",
    "qa-report.yaml",
    "revision-notes.md",
]

RECOMMENDED_FILES = [
    "planning-reflection.jsonl",
    "key-slide-gate.yaml",
    "rendered-eval.yaml",
    "editability-report.yaml",
    "forward-test.yaml",
    "design-mastery-report.yaml",
]


def load_yaml(path: Path) -> Any:
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
        if "slide" in data:
            return [data]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def load_optional_yaml(root: Path, rel: str, errors: list[str]) -> Any:
    path = root / rel
    if not path.exists():
        return {}
    try:
        return load_yaml(path)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"{rel} is not valid YAML: {exc}")
        return {}


def text_contains(value: Any, *needles: str) -> bool:
    haystack = json.dumps(value, ensure_ascii=False).lower()
    return any(needle.lower() in haystack for needle in needles)


def text_contains_token(value: Any, *needles: str) -> bool:
    haystack = json.dumps(value, ensure_ascii=False).lower()
    for needle in needles:
        token = re.escape(needle.lower())
        if re.search(rf"(?<![a-z0-9]){token}(?![a-z0-9])", haystack):
            return True
    return False


def iter_yaml_json_files(path: Path) -> list[Path]:
    if not path.exists() or not path.is_dir():
        return []
    return sorted(
        item for item in path.rglob("*") if item.suffix.lower() in {".yaml", ".yml", ".json"}
    )


def is_url(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"}


def package_path_exists(root: Path, value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    if is_url(value):
        return True
    path = Path(value)
    if path.is_absolute():
        return path.exists()
    return (root / path).exists()


def validate_chart_file(path: Path) -> dict[str, Any]:
    raw = load_chart_data(path)
    mode, rows, metadata, warnings = extract_dataset(raw)
    errors: list[str] = []

    if mode not in validate_chart_file.supported_modes:
        errors.append(f"unsupported or missing mode: {mode!r}")
    if not rows:
        errors.append("dataset has no rows")
    if mode in validate_chart_file.supported_modes:
        errors.extend(
            validate_dataset_metadata(metadata, require_source=True, require_unit=True)
        )
        for index, row in enumerate(rows, start=1):
            errors.extend(validate_row(mode, row, index))

    return {
        "path": str(path),
        "mode": mode,
        "row_count": len(rows),
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "warnings": warnings,
    }


def validate_template_selection_report(root: Path, errors: list[str], warnings: list[str]) -> None:
    report = load_optional_yaml(root, "template-selection-report.yaml", errors)
    if not report:
        return
    body = report.get("template_selection_report", report)
    selections = body.get("selections") or []
    if not isinstance(selections, list) or not selections:
        errors.append("template-selection-report.yaml has no selections")
        return
    for index, selection in enumerate(selections, start=1):
        if not isinstance(selection, dict):
            errors.append(f"template selection {index} must be an object")
            continue
        selected = selection.get("selected") or {}
        if not selected.get("id") and not selected.get("name"):
            errors.append(f"template selection {index} missing selected id/name")
        if not selection.get("selected_reason"):
            errors.append(f"template selection {index} missing selected_reason")
        runners_up = selection.get("rejected_runners_up") or []
        is_key = selection.get("key_slide") is True or selection.get("slide_id") in {"s01", "s1", 1}
        minimum = 2 if is_key else 1
        if len(runners_up) < minimum:
            errors.append(f"template selection {index} needs at least {minimum} rejected_runners_up")
        for runner_index, runner in enumerate(runners_up, start=1):
            if not isinstance(runner, dict):
                errors.append(f"template selection {index} runner-up {runner_index} must be an object")
                continue
            reason = runner.get("rejected_reason") or ""
            if not runner.get("id") and not runner.get("name"):
                errors.append(f"template selection {index} runner-up {runner_index} missing id/name")
            if len(reason.strip()) < 20:
                errors.append(f"template selection {index} runner-up {runner_index} needs a deck-specific rejected_reason")
        if selection.get("final_confidence") == "low":
            warnings.append(f"template selection {index} final_confidence is low")


def validate_render_lock(root: Path, errors: list[str], slides: list[dict[str, Any]]) -> None:
    render_lock = load_optional_yaml(root, "render-lock.yaml", errors)
    if not render_lock:
        return
    body = render_lock.get("render_lock", render_lock)
    for section in ("canvas", "colors", "typography", "image_style_lock"):
        if not isinstance(body.get(section), dict) or not body.get(section):
            errors.append(f"render-lock.yaml missing {section}")
    colors = body.get("colors") or {}
    if not any(colors.get(field) for field in ("background", "text", "accent")):
        errors.append("render-lock.yaml colors must include at least background/text/accent")
    typography = body.get("typography") or {}
    if not typography.get("heading_family") or not typography.get("body_family"):
        errors.append("render-lock.yaml typography must include heading_family and body_family")
    slide_locks = body.get("slide_visual_locks") or []
    key_slide_ids = {
        str(slide.get("id") or slide.get("slide_id") or f"s{idx:02d}")
        for idx, slide in enumerate(slides[:5], start=1)
    }
    locked_ids = {str(item.get("slide_id")) for item in slide_locks if isinstance(item, dict)}
    missing_key_locks = sorted(key_slide_ids - locked_ids)
    if slides and missing_key_locks:
        errors.append(f"render-lock.yaml missing slide_visual_locks for key slides: {', '.join(missing_key_locks)}")


def validate_job_state(root: Path, errors: list[str], warnings: list[str]) -> None:
    state = load_optional_yaml(root, "job-state.yaml", errors)
    if not state:
        return
    for field in ("job_id", "run_id", "job_type", "status", "inputs", "task_records", "progress_events", "artifacts", "policy", "final_verdict"):
        if field not in state:
            errors.append(f"job-state.yaml missing {field}")
    policy = state.get("policy") or {}
    if "continue_on_error" not in policy or "timeout_sec" not in policy:
        errors.append("job-state.yaml policy must include continue_on_error and timeout_sec")
    artifacts = state.get("artifacts") or []
    if not artifacts:
        warnings.append("job-state.yaml has no artifacts")
    for index, artifact in enumerate(artifacts, start=1):
        if not isinstance(artifact, dict):
            errors.append(f"job-state artifact {index} must be an object")
            continue
        for field in ("artifact_id", "kind", "path_or_url", "status"):
            if not artifact.get(field):
                errors.append(f"job-state artifact {index} missing {field}")


def validate_source_of_truth_policy(root: Path, errors: list[str]) -> None:
    policy = load_optional_yaml(root, "source-of-truth-policy.yaml", errors)
    if not policy:
        return
    body = policy.get("source_of_truth_policy", policy)
    order = body.get("precedence_order") or []
    if not isinstance(order, list) or len(order) < 4:
        errors.append("source-of-truth-policy.yaml needs precedence_order with at least four entries")
    conflicts = policy.get("conflict_resolution") or body.get("conflict_resolution") or []
    for index, conflict in enumerate(conflicts, start=1):
        if not isinstance(conflict, dict):
            errors.append(f"source-of-truth conflict {index} must be an object")
            continue
        for field in ("field", "sources_in_conflict", "winning_source", "reason"):
            if not conflict.get(field):
                errors.append(f"source-of-truth conflict {index} missing {field}")


validate_chart_file.supported_modes = {
    "label-value",
    "xy",
    "xyz",
    "multi-series",
    "range",
    "waterfall",
    "ohlc",
    "box-plot",
    "hierarchical",
    "flow",
    "funnel",
    "heatmap",
    "histogram",
    "gauge",
}


def validate_package(root: Path, profile: str = "full") -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    checks: dict[str, Any] = {}

    if not root.exists():
        errors.append(f"package directory does not exist: {root}")
        return {
            "package": str(root),
            "profile": profile,
            "slide_count": 0,
            "status": "fail",
            "errors": errors,
            "warnings": warnings,
            "checks": checks,
        }

    required_files = FULL_REQUIRED_FILES if profile == "full" else MINIMAL_REQUIRED_FILES
    for rel in required_files:
        if not (root / rel).exists():
            errors.append(f"missing required file: {rel}")

    for rel in RECOMMENDED_FILES:
        if not (root / rel).exists():
            warnings.append(f"missing recommended file: {rel}")

    deck_path = root / "deck-spec.yaml"
    slides: list[dict[str, Any]] = []
    if deck_path.exists():
        try:
            slides = find_slides(load_yaml(deck_path))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"deck-spec.yaml is not valid YAML: {exc}")

    if deck_path.exists() and not slides:
        errors.append("deck-spec.yaml has no slides")

    source_required = False
    chart_required = False
    diagram_required = False
    image_required = False
    template_import_required = False
    rendered_eval_required = False
    pptx_gate_required = False
    regression_required = False

    repeated_structures = 0
    previous_structure = None
    for idx, slide in enumerate(slides, start=1):
        if not slide.get("function"):
            errors.append(f"slide {idx} missing function")
        if not slide.get("action_title"):
            errors.append(f"slide {idx} missing action_title")
        structure = slide.get("structure_id") or slide.get("structure_name")
        if not structure:
            warnings.append(f"slide {idx} missing structure_id/structure_name")
        if structure and structure == previous_structure:
            repeated_structures += 1
        else:
            repeated_structures = 1
        previous_structure = structure
        if repeated_structures > 2:
            errors.append(f"more than two consecutive slides use structure {structure}")
        evidence = slide.get("evidence") or []
        if isinstance(evidence, list):
            for evidence_index, item in enumerate(evidence, start=1):
                if isinstance(item, dict) and item.get("status") == "sourced" and not item.get("source"):
                    errors.append(f"slide {idx} evidence {evidence_index} is sourced without source")
                if isinstance(item, dict) and item.get("status") in {"sourced", "validate"}:
                    source_required = True

        visual = slide.get("visual") or {}
        if text_contains_token(visual, "chart", "graph", "heatmap", "waterfall", "gauge"):
            chart_required = True
        if text_contains_token(visual, "diagram", "graphviz", "mermaid", "tikz", "architecture", "sequence"):
            diagram_required = True
        if text_contains_token(visual, "image", "hero", "scene", "generated", "stock"):
            image_required = True

    selection_files = {
        rel: load_optional_yaml(root, rel, errors)
        for rel in (
            "visual-template-selection.yaml",
            "runtime-job-selection.yaml",
            "import-pipeline-selection.yaml",
            "rendered-eval-selection.yaml",
            "bench-capability-selection.yaml",
            "research-route-selection.yaml",
        )
    }

    if text_contains_token(selection_files["visual-template-selection.yaml"], "chart", "heatmap", "waterfall", "gauge"):
        chart_required = True
    if text_contains_token(selection_files["visual-template-selection.yaml"], "image", "ai_image", "hero", "scene"):
        image_required = True
    if text_contains_token(selection_files["runtime-job-selection.yaml"], "diagram", "graphviz", "mermaid", "tikz"):
        diagram_required = True
    if text_contains(selection_files["import-pipeline-selection.yaml"], "pptx", "template_manifest", "template import"):
        template_import_required = True
    if text_contains(selection_files["rendered-eval-selection.yaml"], "render", "vision", "screenshot"):
        rendered_eval_required = True
    if text_contains(selection_files["bench-capability-selection.yaml"], "pptx", "powerpoint", "editable"):
        pptx_gate_required = True
    if text_contains(selection_files["research-route-selection.yaml"], "source", "benchmark", "scholar", "html"):
        source_required = True
    if (root / "forward-test.yaml").exists():
        regression_required = True

    if source_required and not (root / "source-ledger.yaml").exists():
        errors.append("source-ledger.yaml required because package contains sourced/validated evidence or research route")

    if rendered_eval_required and not (root / "rendered-eval.yaml").exists():
        errors.append("rendered-eval.yaml required because rendered evaluation was selected")

    if template_import_required and not (root / "template-import-report.yaml").exists():
        errors.append("template-import-report.yaml required because PPTX/template import was selected")

    if image_required and not (root / "image-resource-list.yaml").exists():
        errors.append("image-resource-list.yaml required because image/generative visual usage was detected")

    if diagram_required and not (root / "diagram-manifest.yaml").exists():
        errors.append("diagram-manifest.yaml required because diagram rendering was detected")

    if pptx_gate_required and not (root / "editability-report.yaml").exists():
        errors.append("editability-report.yaml required because PPTX/editable delivery was selected")

    speaker_notes_text = (root / "speaker-notes.md").read_text(encoding="utf-8") if (root / "speaker-notes.md").exists() else ""
    slides_with_notes = [
        str(slide.get("id") or slide.get("slide_id") or f"s{idx:02d}")
        for idx, slide in enumerate(slides, start=1)
        if slide.get("speaker_notes")
    ]
    if slides_with_notes and not speaker_notes_text.strip():
        errors.append("speaker-notes.md is empty but deck-spec.yaml contains slide speaker_notes")

    runtime_contract_report = validate_runtime_contracts(root)
    checks["runtime_contracts"] = runtime_contract_report
    for item in runtime_contract_report.get("errors", []):
        errors.append(item)
    for item in runtime_contract_report.get("warnings", []):
        warnings.append(item)

    if regression_required:
        try:
            regression_report = run_fixtures(root)
        except Exception as exc:  # noqa: BLE001
            regression_report = {
                "status": "fail",
                "errors": [f"could not run regression fixtures: {exc}"],
                "warnings": [],
            }
        checks["regression_fixtures"] = regression_report
        for item in regression_report.get("errors", []):
            errors.append(item)

    rendered_eval_path = root / "rendered-eval.yaml"
    if rendered_eval_path.exists():
        try:
            rendered_eval_report = validate_rendered_eval(rendered_eval_path, package_root=root)
        except Exception as exc:  # noqa: BLE001
            rendered_eval_report = {
                "status": "fail",
                "errors": [f"could not validate rendered-eval.yaml: {exc}"],
                "warnings": [],
            }
        checks["rendered_eval"] = rendered_eval_report
        for item in rendered_eval_report.get("errors", []):
            errors.append(f"rendered-eval.yaml: {item}")

    design_mastery_required = (root / "design-mastery-report.yaml").exists()
    if design_mastery_required:
        try:
            design_mastery_report = validate_design_mastery(root)
        except Exception as exc:  # noqa: BLE001
            design_mastery_report = {
                "status": "fail",
                "errors": [f"could not validate Design 100 artifacts: {exc}"],
                "warnings": [],
            }
        checks["design_mastery"] = design_mastery_report
        for item in design_mastery_report.get("errors", []):
            errors.append(f"design_mastery: {item}")
        for item in design_mastery_report.get("warnings", []):
            warnings.append(f"design_mastery: {item}")

    chart_files = iter_yaml_json_files(root / "chart-datasets")
    if chart_required and not chart_files:
        errors.append("chart-datasets/ with at least one YAML/JSON dataset is required because chart usage was detected")

    chart_reports = []
    for chart_file in chart_files:
        try:
            chart_report = validate_chart_file(chart_file)
        except Exception as exc:  # noqa: BLE001
            chart_report = {
                "path": str(chart_file),
                "status": "fail",
                "errors": [f"could not validate chart dataset: {exc}"],
                "warnings": [],
            }
        chart_reports.append(chart_report)
        for item in chart_report["errors"]:
            errors.append(f"{chart_file.relative_to(root)}: {item}")
    checks["chart_datasets"] = chart_reports

    diagram_manifest = load_optional_yaml(root, "diagram-manifest.yaml", errors)
    if diagram_manifest:
        diagrams = diagram_manifest.get("diagrams") or diagram_manifest.get("diagram_manifest", {}).get("diagrams") or []
        if not isinstance(diagrams, list) or not diagrams:
            errors.append("diagram-manifest.yaml has no diagrams")
        for index, diagram in enumerate(diagrams, start=1):
            if not isinstance(diagram, dict):
                errors.append(f"diagram {index} must be an object")
                continue
            for field in ("diagram_id", "slide_id", "engine", "source_file", "output_file"):
                if not diagram.get(field):
                    errors.append(f"diagram {index} missing {field}")
            source_file = diagram.get("source_file")
            output_file = diagram.get("output_file")
            if source_file and not package_path_exists(root, source_file):
                errors.append(f"diagram {index} source_file does not exist: {source_file}")
            if output_file:
                if is_url(output_file):
                    errors.append(f"diagram {index} output_file must be a local package file, not URL: {output_file}")
                elif not package_path_exists(root, output_file):
                    errors.append(f"diagram {index} output_file does not exist: {output_file}")
            qa = diagram.get("qa") or {}
            if qa and qa.get("attributed") is False and diagram.get("engine") == "pdf_figure_extraction":
                errors.append(f"diagram {index} extracted figure must be attributed")

    image_list = load_optional_yaml(root, "image-resource-list.yaml", errors)
    if image_list:
        images = image_list.get("images") or image_list.get("image_resource_list", {}).get("images") or []
        if not isinstance(images, list) or not images:
            errors.append("image-resource-list.yaml has no images")
        for index, image in enumerate(images, start=1):
            if not isinstance(image, dict):
                errors.append(f"image {index} must be an object")
                continue
            for field in ("image_id", "slide_id", "image_type", "role", "container", "text_policy"):
                if not image.get(field):
                    errors.append(f"image {index} missing {field}")
            if image.get("role") == "product_representational" and not image.get("source_or_generation_model"):
                qa = image.get("qa") or {}
                if not qa.get("source_or_generation_model"):
                    errors.append(f"image {index} product representation needs source_or_generation_model")

    template_report = load_optional_yaml(root, "template-import-report.yaml", errors)
    if template_report:
        report_body = template_report.get("template_import_report", template_report)
        for field in ("source_file", "status"):
            if not report_body.get(field):
                errors.append(f"template-import-report.yaml missing {field}")
        fidelity = report_body.get("fidelity_checks") or {}
        if report_body.get("status") == "pass" and fidelity.get("rendered_reference_compared") is False:
            errors.append("template-import-report.yaml cannot pass without rendered_reference_compared: true")

    return {
        "package": str(root),
        "profile": profile,
        "slide_count": len(slides),
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package_dir", help="slide-creator output package directory")
    parser.add_argument("--profile", choices=["full", "minimal"], default="full", help="Validation strictness")
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    args = parser.parse_args()

    report = validate_package(Path(args.package_dir), profile=args.profile)
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
