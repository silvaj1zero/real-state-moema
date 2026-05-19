#!/usr/bin/env python3
"""Validate slide-creator chart datasets against supported data modes."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


MODE_REQUIRED: dict[str, list[str]] = {
    "label-value": ["label", "value"],
    "xy": ["x", "y"],
    "xyz": ["x", "y", "z"],
    "multi-series": ["label"],
    "range": ["category", "low", "high"],
    "waterfall": ["category", "amount"],
    "ohlc": ["date", "open", "high", "low", "close"],
    "box-plot": ["category", "min", "q1", "median", "q3", "max"],
    "hierarchical": ["name"],
    "flow": ["from", "to", "size"],
    "funnel": ["label", "value"],
    "heatmap": ["x", "y", "value"],
    "histogram": ["value"],
    "gauge": ["value"],
}

MODE_NUMERIC: dict[str, list[str]] = {
    "label-value": ["value"],
    "xy": ["y"],
    "xyz": ["y", "z"],
    "range": ["low", "high"],
    "waterfall": ["amount"],
    "ohlc": ["open", "high", "low", "close"],
    "box-plot": ["min", "q1", "median", "q3", "max"],
    "flow": ["size"],
    "funnel": ["value"],
    "heatmap": ["value"],
    "histogram": ["value"],
    "gauge": ["value"],
}


def load_data(path: Path) -> Any:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        return json.loads(text)
    try:
        import yaml  # type: ignore
    except ImportError as exc:
        raise SystemExit("PyYAML is required for YAML inputs; use JSON or install PyYAML.") from exc
    return yaml.safe_load(text)


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def extract_dataset(raw: Any) -> tuple[str | None, list[Any], dict[str, Any], list[str]]:
    warnings: list[str] = []
    metadata: dict[str, Any] = {}
    if isinstance(raw, dict) and "chart_dataset" in raw:
        raw = raw["chart_dataset"]
    if isinstance(raw, dict):
        metadata = raw
        mode = raw.get("mode")
        rows = raw.get("rows")
        if rows is None and mode == "gauge" and "value" in raw:
            rows = [{"value": raw["value"]}]
        if rows is None:
            rows = []
        if not isinstance(rows, list):
            warnings.append("rows must be a list")
            rows = []
        return mode, rows, metadata, warnings
    if isinstance(raw, list):
        warnings.append("mode not found; pass --mode or wrap data in chart_dataset.mode")
        return None, raw, metadata, warnings
    return None, [], metadata, ["input must be a list or chart_dataset object"]


def validate_row(mode: str, row: Any, index: int) -> list[str]:
    errors: list[str] = []
    if not isinstance(row, dict):
        return [f"row {index}: must be an object"]

    for field in MODE_REQUIRED[mode]:
        if field not in row:
            errors.append(f"row {index}: missing required field '{field}'")

    for field in MODE_NUMERIC.get(mode, []):
        if field in row and not is_number(row[field]):
            errors.append(f"row {index}: field '{field}' must be numeric")

    if mode == "multi-series":
        numeric_series = [
            key for key, value in row.items() if key != "label" and is_number(value)
        ]
        if not numeric_series:
            errors.append(f"row {index}: multi-series requires at least one numeric series")

    if mode == "range" and {"low", "high"} <= row.keys():
        if is_number(row["low"]) and is_number(row["high"]) and row["high"] < row["low"]:
            errors.append(f"row {index}: high must be greater than or equal to low")

    if mode == "ohlc" and {"open", "high", "low", "close"} <= row.keys():
        values = [row["open"], row["high"], row["low"], row["close"]]
        if all(is_number(value) for value in values):
            if row["high"] < max(row["open"], row["low"], row["close"]):
                errors.append(f"row {index}: high must cover open, low, and close")
            if row["low"] > min(row["open"], row["high"], row["close"]):
                errors.append(f"row {index}: low must cover open, high, and close")

    if mode == "box-plot" and {"min", "q1", "median", "q3", "max"} <= row.keys():
        values = [row["min"], row["q1"], row["median"], row["q3"], row["max"]]
        if all(is_number(value) for value in values) and values != sorted(values):
            errors.append(f"row {index}: expected min <= q1 <= median <= q3 <= max")

    if mode == "hierarchical" and "children" in row:
        children = row["children"]
        if not isinstance(children, list):
            errors.append(f"row {index}: children must be a list")
        else:
            for child_index, child in enumerate(children, start=1):
                errors.extend(validate_row("hierarchical", child, int(f"{index}{child_index}")))

    return errors


def validate_dataset_metadata(
    metadata: dict[str, Any],
    *,
    require_source: bool,
    require_unit: bool,
) -> list[str]:
    errors: list[str] = []
    source = str(metadata.get("source") or "").strip()
    unit = str(metadata.get("unit") or "").strip()
    illustrative = metadata.get("illustrative") is True or metadata.get("is_factual") is False
    unit_optional = metadata.get("unit_optional") is True

    if require_source and not illustrative and not source:
        errors.append("dataset source is required unless illustrative: true or is_factual: false")
    if require_unit and not unit_optional and not unit:
        errors.append("dataset unit is required unless unit_optional: true")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Chart dataset YAML or JSON")
    parser.add_argument("--mode", choices=sorted(MODE_REQUIRED), help="Override dataset mode")
    parser.add_argument("--allow-missing-source", action="store_true", help="Do not fail when factual source is missing")
    parser.add_argument("--allow-missing-unit", action="store_true", help="Do not fail when unit is missing")
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    args = parser.parse_args()

    raw = load_data(args.input)
    detected_mode, rows, metadata, warnings = extract_dataset(raw)
    mode = args.mode or detected_mode

    errors: list[str] = []
    if mode not in MODE_REQUIRED:
        errors.append(f"unsupported or missing mode: {mode!r}")
    if not rows:
        errors.append("dataset has no rows")

    if mode in MODE_REQUIRED:
        errors.extend(
            validate_dataset_metadata(
                metadata,
                require_source=not args.allow_missing_source,
                require_unit=not args.allow_missing_unit,
            )
        )
        for index, row in enumerate(rows, start=1):
            errors.extend(validate_row(mode, row, index))

    report = {
        "input": str(args.input),
        "mode": mode,
        "row_count": len(rows),
        "source": metadata.get("source"),
        "unit": metadata.get("unit"),
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "warnings": warnings,
    }

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"{report['status'].upper()} {args.input} mode={mode} rows={len(rows)}")
        for item in errors:
            print(f"ERROR: {item}")
        for item in warnings:
            print(f"WARN: {item}")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
