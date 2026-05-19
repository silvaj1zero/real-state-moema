#!/usr/bin/env python3
"""Validate that slide-creator does not require external squad files."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

FORBIDDEN_RUNTIME_PATTERNS = (
    r"\bsource_paths\s*:",
    r"\bsquads/[a-z0-9_-]+/",
)

ALLOWED_EXPLANATORY_PATTERNS = (
    "Do not require `squads/",
    "must not require",
    "independence_note",
)


def should_skip_line(line: str) -> bool:
    return any(pattern in line for pattern in ALLOWED_EXPLANATORY_PATTERNS)


def scan(root: Path) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []
    for path in sorted(root.rglob("*")):
        if path.is_dir() or path.suffix.lower() not in {".md", ".yaml", ".yml", ".json"}:
            continue
        rel = path.relative_to(root)
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if should_skip_line(line):
                continue
            for pattern in FORBIDDEN_RUNTIME_PATTERNS:
                if re.search(pattern, line):
                    errors.append(f"{rel}:{line_number}: forbidden runtime dependency pattern {pattern!r}")
        if rel.name.lower() == "readme.md":
            warnings.append(f"{rel}: README files add clutter inside skills; prefer SKILL.md or direct references")
    return {
        "root": str(root),
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill_dir", nargs="?", default=".", help="Path to slide-creator skill directory")
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    args = parser.parse_args()

    report = scan(Path(args.skill_dir).resolve())
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
