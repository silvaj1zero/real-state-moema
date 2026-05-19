#!/usr/bin/env python3
"""Check a PPTX package for residual placeholders."""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path


DEFAULT_PATTERNS = ["{{MATH:", "{{", "}}"]


def check_pptx(path: Path, patterns: list[str]) -> dict[str, object]:
    matches: list[dict[str, str]] = []
    encoded = [pattern.encode("utf-8") for pattern in patterns]
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if not name.startswith("ppt/slides/") or not name.endswith(".xml"):
                continue
            content = archive.read(name)
            for pattern, needle in zip(patterns, encoded):
                if needle in content:
                    matches.append({"file": name, "pattern": pattern})
    return {
        "pptx": str(path),
        "status": "pass" if not matches else "fail",
        "matches": matches,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pptx", help="PPTX file to inspect")
    parser.add_argument(
        "--pattern",
        action="append",
        dest="patterns",
        help="Pattern to search in slide XML. Can be repeated.",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    args = parser.parse_args()

    report = check_pptx(Path(args.pptx), args.patterns or DEFAULT_PATTERNS)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"status: {report['status']}")
        for match in report["matches"]:
            print(f"FOUND {match['pattern']} in {match['file']}")
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
