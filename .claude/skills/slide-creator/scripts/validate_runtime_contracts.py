#!/usr/bin/env python3
"""Validate slide-creator runtime contracts.

Checks the deep bench absorption contracts:
- story-arc.yaml
- slide-function-map.yaml
- design-direction.yaml
- render-lock.yaml
- template-selection-report.yaml
- job-state.yaml
- source-of-truth-policy.yaml
- speaker-notes.md vs deck-spec.yaml
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


VALID_SLIDE_FUNCTIONS = {
    "cover",
    "section_divider",
    "reframe",
    "proof",
    "contrast",
    "mechanism_step",
    "demo_setup",
    "demo_payoff",
    "artifact_reveal",
    "objection_neutralize",
    "synthesis",
    "tension_amplify",
    "emotional_anchor",
    "quiet_pause",
    "cta_concrete",
    "close",
    "appendix",
}

FORBIDDEN_AUDIENCE_MOVEMENT_PREFIXES = (
    "explicar",
    "apresentar",
    "falar",
    "mostrar",
    "listar",
    "descrever",
    "explain",
    "present",
    "show",
    "list",
    "describe",
)

OPENING_BEATS = {"hook", "situation", "context", "cold_open", "complication", "tension", "stakes", "cost_of_inaction"}
REFRAME_BEATS = {"reframe", "insight", "thesis", "governing_thought"}
PROOF_BEATS = {
    "proof",
    "evidence",
    "case",
    "benchmark",
    "data",
    "demo_setup",
    "mechanism",
    "model",
    "framework",
    "process",
    "operating_system",
    "demo_payoff",
    "artifact_reveal",
    "before_after",
    "result",
}
CLOSE_BEATS = {"plan", "decision", "cta", "next_steps", "close"}


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def optional_yaml(root: Path, rel: str, errors: list[str]) -> Any:
    path = root / rel
    if not path.exists():
        return {}
    try:
        return load_yaml(path)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"{rel} is not valid YAML: {exc}")
        return {}


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


def slide_id(slide: dict[str, Any], index: int) -> str:
    return str(slide.get("id") or slide.get("slide_id") or f"s{index:02d}")


def normalize_body(data: Any, key: str) -> dict[str, Any]:
    if isinstance(data, dict):
        body = data.get(key, data)
        if isinstance(body, dict):
            return body
    return {}


def validate_story_arc(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    data = optional_yaml(root, "story-arc.yaml", errors)
    if not data:
        return {"status": "skip", "errors": errors, "warnings": warnings}

    body = normalize_body(data, "story_arc")
    if not body.get("deck_id"):
        errors.append("story-arc.yaml missing deck_id")
    if not body.get("arc_type"):
        errors.append("story-arc.yaml missing arc_type")

    beats = body.get("beats") or body.get("arc") or []
    if not isinstance(beats, list) or not beats:
        errors.append("story-arc.yaml needs beats")
        return {"status": "fail", "errors": errors, "warnings": warnings}
    if len(beats) > 8:
        errors.append("story-arc.yaml has more than 8 beats")

    beat_ids: list[str] = []
    beat_types: set[str] = set()
    slide_total = 0
    for index, beat in enumerate(beats, start=1):
        if not isinstance(beat, dict):
            errors.append(f"beat {index} must be an object")
            continue
        bid = str(beat.get("beat_id") or beat.get("id") or "").strip()
        if not bid:
            errors.append(f"beat {index} missing beat_id")
        else:
            beat_ids.append(bid)
        beat_type = str(beat.get("beat_type") or beat.get("stage") or "").strip()
        if not beat_type:
            errors.append(f"beat {index} missing beat_type")
        else:
            beat_types.add(beat_type)
        narrative_function = str(beat.get("narrative_function") or beat.get("job") or "").strip()
        if len(narrative_function) < 24:
            errors.append(f"beat {index} needs a deck-specific narrative_function")
        try:
            estimated = int(beat.get("slides_estimated", 0))
        except (TypeError, ValueError):
            estimated = 0
        if estimated < 1:
            errors.append(f"beat {index} needs slides_estimated >= 1")
        slide_total += estimated

    duplicates = sorted({bid for bid in beat_ids if beat_ids.count(bid) > 1})
    if duplicates:
        errors.append(f"story-arc.yaml duplicate beat_id values: {', '.join(duplicates)}")
    if not (beat_types & OPENING_BEATS):
        errors.append("story-arc.yaml missing opening/tension beat")
    if not (beat_types & REFRAME_BEATS):
        errors.append("story-arc.yaml missing reframe/thesis beat")
    if not (beat_types & PROOF_BEATS):
        errors.append("story-arc.yaml missing proof/mechanism/payoff beat")
    if not (beat_types & CLOSE_BEATS):
        errors.append("story-arc.yaml missing close/CTA beat")
    if slide_total and slide_total < 3:
        warnings.append("story-arc.yaml estimates fewer than 3 slides")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_slide_function_map(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    data = optional_yaml(root, "slide-function-map.yaml", errors)
    if not data:
        return {"status": "skip", "errors": errors, "warnings": warnings}

    body = normalize_body(data, "slide_function_map")
    if not body.get("deck_id"):
        errors.append("slide-function-map.yaml missing deck_id")
    entries = body.get("entries") or body.get("slides") or []
    if not isinstance(entries, list) or not entries:
        errors.append("slide-function-map.yaml needs entries")
        return {"status": "fail", "errors": errors, "warnings": warnings}

    beat_refs: set[str] = set()
    function_sequence: list[str] = []
    has_payoff = False
    has_close = False
    for index, entry in enumerate(entries, start=1):
        if not isinstance(entry, dict):
            errors.append(f"entry {index} must be an object")
            continue
        sid = str(entry.get("slide_id") or entry.get("id") or "").strip()
        if not sid:
            errors.append(f"entry {index} missing slide_id")
        beat_ref = str(entry.get("beat_ref") or entry.get("beat_id") or "").strip()
        if not beat_ref:
            errors.append(f"entry {index} missing beat_ref")
        else:
            beat_refs.add(beat_ref)
        function = str(entry.get("function") or "").strip()
        if not function:
            errors.append(f"entry {index} missing function")
        elif function not in VALID_SLIDE_FUNCTIONS:
            errors.append(f"entry {index} function '{function}' is not in function_enum")
        function_sequence.append(function)
        if function in {"demo_payoff", "artifact_reveal"}:
            has_payoff = True
        if function in {"cta_concrete", "close"}:
            has_close = True
        movement = str(entry.get("audience_movement") or "").strip()
        if not movement:
            errors.append(f"entry {index} missing audience_movement")
        elif movement.lower().startswith(FORBIDDEN_AUDIENCE_MOVEMENT_PREFIXES):
            errors.append(f"entry {index} audience_movement starts with a forbidden explain-topic verb")

    for index in range(len(function_sequence) - 2):
        window = function_sequence[index : index + 3]
        if window[0] and len(set(window)) == 1:
            warnings.append(f"entries {index + 1}-{index + 3} repeat function '{window[0]}'")

    if not has_payoff and len(entries) >= 6:
        errors.append("slide-function-map.yaml missing demo_payoff or artifact_reveal")
    if not has_close:
        errors.append("slide-function-map.yaml missing cta_concrete or close")

    story_data = optional_yaml(root, "story-arc.yaml", [])
    story_body = normalize_body(story_data, "story_arc")
    beats = story_body.get("beats") or story_body.get("arc") or []
    if isinstance(beats, list) and beats:
        valid_beat_ids = {str(beat.get("beat_id") or beat.get("id")) for beat in beats if isinstance(beat, dict)}
        missing = sorted(beat_refs - valid_beat_ids)
        if missing:
            errors.append(f"slide-function-map.yaml references unknown beats: {', '.join(missing)}")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_design_direction(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    data = optional_yaml(root, "design-direction.yaml", errors)
    if not data:
        return {"status": "skip", "errors": errors, "warnings": warnings}

    body = normalize_body(data, "design_direction")
    for field in (
        "deck_id",
        "visual_reference",
        "dominant_motif",
        "density_limits",
        "variation_rules",
        "composition_rules",
        "audience_context",
    ):
        if not body.get(field):
            errors.append(f"design-direction.yaml missing {field}")

    density = body.get("density_limits") or {}
    for field in (
        "max_governing_claims_per_slide",
        "max_supporting_claims_per_slide",
        "max_visible_words_default",
        "forbidden_patterns",
    ):
        if field not in density:
            errors.append(f"design-direction.yaml density_limits missing {field}")

    variation = body.get("variation_rules") or {}
    for field in ("layout_count_min", "layout_repetition_max", "quiet_slide_ratio_min", "accent_color_density"):
        if field not in variation:
            errors.append(f"design-direction.yaml variation_rules missing {field}")
    if isinstance(variation.get("quiet_slide_ratio_min"), (int, float)) and variation["quiet_slide_ratio_min"] < 0.1:
        warnings.append("design-direction.yaml quiet_slide_ratio_min is below 0.10")

    composition = body.get("composition_rules") or {}
    for field in ("grid_columns", "baseline_padding_pt", "title_anchor", "safe_area_pct"):
        if field not in composition:
            errors.append(f"design-direction.yaml composition_rules missing {field}")

    audience = body.get("audience_context") or {}
    for field in ("audience", "viewing_context", "expected_reading_mode"):
        if field not in audience:
            errors.append(f"design-direction.yaml audience_context missing {field}")

    forbidden = density.get("forbidden_patterns") if isinstance(density, dict) else []
    if isinstance(forbidden, list) and "identity_as_skin" not in forbidden:
        warnings.append("design-direction.yaml should explicitly forbid identity_as_skin")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_template_selection_report(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    report = optional_yaml(root, "template-selection-report.yaml", errors)
    if not report:
        return {"status": "skip", "errors": errors, "warnings": warnings}

    body = report.get("template_selection_report", report)
    selections = body.get("selections") or []
    if not isinstance(selections, list) or not selections:
        errors.append("template-selection-report.yaml has no selections")
        return {"status": "fail", "errors": errors, "warnings": warnings}

    for index, selection in enumerate(selections, start=1):
        if not isinstance(selection, dict):
            errors.append(f"selection {index} must be an object")
            continue
        selected = selection.get("selected") or {}
        if not selected.get("id") and not selected.get("name"):
            errors.append(f"selection {index} missing selected id/name")
        reason = str(selection.get("selected_reason") or "").strip()
        if len(reason) < 24:
            errors.append(f"selection {index} missing deck-specific selected_reason")
        runners = selection.get("rejected_runners_up") or []
        minimum = 2 if selection.get("key_slide") is True else 1
        if len(runners) < minimum:
            errors.append(f"selection {index} needs at least {minimum} rejected_runners_up")
        for runner_index, runner in enumerate(runners, start=1):
            if not isinstance(runner, dict):
                errors.append(f"selection {index} runner {runner_index} must be an object")
                continue
            runner_reason = str(runner.get("rejected_reason") or "").strip()
            if not runner.get("id") and not runner.get("name"):
                errors.append(f"selection {index} runner {runner_index} missing id/name")
            if len(runner_reason) < 24:
                errors.append(f"selection {index} runner {runner_index} needs deck-specific rejected_reason")
        if selection.get("final_confidence") == "low":
            warnings.append(f"selection {index} final_confidence is low")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_render_lock(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    render_lock = optional_yaml(root, "render-lock.yaml", errors)
    if not render_lock:
        return {"status": "skip", "errors": errors, "warnings": warnings}

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

    deck_path = root / "deck-spec.yaml"
    slides = find_slides(load_yaml(deck_path)) if deck_path.exists() else []
    key_ids = {slide_id(slide, index) for index, slide in enumerate(slides[:5], start=1)}
    locks = body.get("slide_visual_locks") or []
    locked_ids = {str(item.get("slide_id")) for item in locks if isinstance(item, dict)}
    missing = sorted(key_ids - locked_ids)
    if missing:
        errors.append(f"render-lock.yaml missing slide_visual_locks for key slides: {', '.join(missing)}")

    image_style = body.get("image_style_lock") or {}
    has_generated_image = any(
        re.search(r"image|hero|scene|generated", json.dumps(slide.get("visual", {}), ensure_ascii=False), re.I)
        for slide in slides
    )
    if has_generated_image and not image_style.get("rendering_family"):
        errors.append("render-lock.yaml image_style_lock.rendering_family required for generated/image-heavy decks")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_job_state(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    state = optional_yaml(root, "job-state.yaml", errors)
    if not state:
        return {"status": "skip", "errors": errors, "warnings": warnings}

    required = (
        "job_id",
        "run_id",
        "job_type",
        "status",
        "inputs",
        "task_records",
        "progress_events",
        "artifacts",
        "policy",
        "final_verdict",
    )
    for field in required:
        if field not in state:
            errors.append(f"job-state.yaml missing {field}")

    policy = state.get("policy") or {}
    if "continue_on_error" not in policy or "timeout_sec" not in policy:
        errors.append("job-state.yaml policy must include continue_on_error and timeout_sec")

    for index, artifact in enumerate(state.get("artifacts") or [], start=1):
        if not isinstance(artifact, dict):
            errors.append(f"artifact {index} must be an object")
            continue
        for field in ("artifact_id", "kind", "path_or_url", "status"):
            if not artifact.get(field):
                errors.append(f"artifact {index} missing {field}")
    if not state.get("artifacts"):
        warnings.append("job-state.yaml has no artifacts")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_source_of_truth_policy(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    policy = optional_yaml(root, "source-of-truth-policy.yaml", errors)
    if not policy:
        return {"status": "skip", "errors": errors, "warnings": warnings}

    body = policy.get("source_of_truth_policy", policy)
    order = body.get("precedence_order") or []
    if not isinstance(order, list) or len(order) < 4:
        errors.append("source-of-truth-policy.yaml needs precedence_order with at least four entries")
    if "latest_deck_spec" not in order:
        errors.append("source-of-truth-policy.yaml precedence_order must include latest_deck_spec")

    conflicts = policy.get("conflict_resolution") or body.get("conflict_resolution") or []
    for index, conflict in enumerate(conflicts, start=1):
        if not isinstance(conflict, dict):
            errors.append(f"conflict {index} must be an object")
            continue
        for field in ("field", "sources_in_conflict", "winning_source", "reason"):
            if not conflict.get(field):
                errors.append(f"conflict {index} missing {field}")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_speaker_notes(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    deck_path = root / "deck-spec.yaml"
    if not deck_path.exists():
        return {"status": "skip", "errors": errors, "warnings": warnings}
    slides = find_slides(load_yaml(deck_path))
    slides_with_notes = [
        slide_id(slide, index)
        for index, slide in enumerate(slides, start=1)
        if str(slide.get("speaker_notes") or "").strip()
    ]
    if not slides_with_notes:
        return {"status": "skip", "errors": errors, "warnings": warnings}

    notes_path = root / "speaker-notes.md"
    if not notes_path.exists():
        errors.append("speaker-notes.md required because deck-spec.yaml contains speaker_notes")
        return {"status": "fail", "errors": errors, "warnings": warnings}
    notes = notes_path.read_text(encoding="utf-8")
    if not notes.strip():
        errors.append("speaker-notes.md is empty but deck-spec.yaml contains speaker_notes")
    for sid in slides_with_notes:
        if sid not in notes:
            warnings.append(f"speaker-notes.md does not mention slide id {sid}")

    return {"status": "pass" if not errors else "fail", "errors": errors, "warnings": warnings}


def validate_runtime_contracts(root: Path) -> dict[str, Any]:
    checks = {
        "story_arc": validate_story_arc(root),
        "slide_function_map": validate_slide_function_map(root),
        "design_direction": validate_design_direction(root),
        "template_selection_report": validate_template_selection_report(root),
        "render_lock": validate_render_lock(root),
        "job_state": validate_job_state(root),
        "source_of_truth_policy": validate_source_of_truth_policy(root),
        "speaker_notes": validate_speaker_notes(root),
    }
    errors: list[str] = []
    warnings: list[str] = []
    for name, report in checks.items():
        for error in report.get("errors", []):
            errors.append(f"{name}: {error}")
        for warning in report.get("warnings", []):
            warnings.append(f"{name}: {warning}")
    return {
        "package": str(root),
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package_dir", help="slide-creator output package directory")
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    args = parser.parse_args()

    report = validate_runtime_contracts(Path(args.package_dir))
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
