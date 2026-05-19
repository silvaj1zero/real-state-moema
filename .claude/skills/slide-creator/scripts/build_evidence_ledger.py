#!/usr/bin/env python3
"""Create a slide-level evidence ledger from a deck spec YAML file."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


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
        if "slide" in data and "evidence" in data:
            return [data]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def classify_evidence(source: str, status: str) -> str:
    source_lower = source.lower()
    status_lower = status.lower()
    if "assumption" in status_lower or "hipótese" in status_lower:
        return "explicit_assumption"
    if source_lower.startswith(("http://", "https://")):
        if any(domain in source_lower for domain in ("docs.", "github.com", "official")):
            return "official_source"
        return "product_documentation"
    if any(token in source_lower for token in ("benchmark", "eval", "score", "metric")):
        return "benchmark_result"
    if any(token in source_lower for token in ("paper", "arxiv", "doi")):
        return "academic_paper"
    if any(token in source_lower for token in ("screenshot", "image", "video", "gif")):
        return "screenshot_or_media"
    if source:
        return "user_provided_document"
    return "explicit_assumption"


def confidence_for(status: str, source: str) -> str:
    status_lower = status.lower()
    if "sourced" in status_lower and source:
        return "high"
    if source:
        return "medium"
    return "low"


def build_rows(slides: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, slide in enumerate(slides, start=1):
        slide_number = slide.get("number") or slide.get("slide") or index
        slide_id = f"s{int(slide_number):02d}" if str(slide_number).isdigit() else str(slide_number)
        evidence_items = slide.get("evidence") or []
        if isinstance(evidence_items, dict):
            evidence_items = [evidence_items]
        for item_index, item in enumerate(evidence_items, start=1):
            if not isinstance(item, dict):
                continue
            claim = str(item.get("claim") or item.get("text") or "").strip()
            source = str(item.get("source") or "").strip()
            status = str(item.get("status") or "validate").strip()
            rows.append(
                {
                    "claim_id": f"{slide_id}-c{item_index}",
                    "slide_id": slide_id,
                    "claim": claim,
                    "evidence_type": classify_evidence(source, status),
                    "source": source,
                    "confidence": confidence_for(status, source),
                    "visible_or_speaker_notes": "visible" if claim else "speaker_notes",
                    "risk": "needs_source" if not source and status != "assumption" else "none",
                    "freshness": str(item.get("freshness") or "unknown"),
                }
            )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck_spec", help="Deck spec YAML path.")
    parser.add_argument("--output", default="source-ledger.yaml", help="Output YAML path.")
    args = parser.parse_args()

    data = load_yaml(Path(args.deck_spec))
    rows = build_rows(find_slides(data))
    out = {
        "evidence_ledger": {
            "source": str(args.deck_spec),
            "claim_count": len(rows),
            "claims": rows,
            "blockers": [
                row["claim_id"]
                for row in rows
                if row["confidence"] == "low" or row["risk"] != "none"
            ],
        }
    }
    Path(args.output).write_text(
        yaml.safe_dump(out, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    print(f"wrote {args.output} ({len(rows)} claims)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
