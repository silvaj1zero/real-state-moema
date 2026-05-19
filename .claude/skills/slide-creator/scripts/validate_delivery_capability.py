#!/usr/bin/env python3
"""Validate delivery, API, MCP, and CLI capability contracts for slide-creator."""

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


def validate(skill_dir: Path) -> dict[str, Any]:
    errors: list[str] = []
    files = {
        "delivery": "templates/runtime/delivery-package-contract.yaml",
        "automation": "templates/runtime/api-mcp-cli-contract.yaml",
    }
    for rel in files.values():
        if not (skill_dir / rel).exists():
            errors.append(f"missing required file: {rel}")
    if errors:
        return {"status": "fail", "errors": errors}

    delivery = load_yaml(skill_dir / files["delivery"])
    package = delivery.get("package_contract") or {}
    required_files = package.get("required_files") or []
    manifest_fields = package.get("delivery_manifest_required_fields") or []
    if len(required_files) < 8:
        errors.append("delivery package needs at least 8 required files")
    for field in ("artifacts", "export_targets", "permission_policy", "validation_reports"):
        if field not in manifest_fields:
            errors.append(f"delivery manifest missing required field: {field}")
    if len(delivery.get("share_modes") or []) < 4:
        errors.append("delivery contract needs at least 4 share modes")
    if len((delivery.get("permission_policy") or {}).get("roles") or []) < 4:
        errors.append("delivery contract needs at least 4 permission roles")
    if len((delivery.get("analytics_event_schema") or {}).get("event_types") or []) < 5:
        errors.append("delivery analytics schema needs at least 5 event types")
    if not (delivery.get("follow_up_signal") or {}).get("required_fields"):
        errors.append("delivery contract missing follow_up_signal required fields")

    automation = load_yaml(skill_dir / files["automation"])
    lifecycle = automation.get("shared_job_lifecycle") or {}
    states = lifecycle.get("states") or []
    for state in ("queued", "completed", "failed", "cancelled"):
        if state not in states:
            errors.append(f"job lifecycle missing state: {state}")
    commands = automation.get("cli_commands") or []
    routes = automation.get("api_routes") or []
    tools = automation.get("mcp_tools") or []
    if len(commands) < 6:
        errors.append("automation contract needs at least 6 CLI commands")
    if len(routes) < 7:
        errors.append("automation contract needs at least 7 API routes")
    if len(tools) < 6:
        errors.append("automation contract needs at least 6 MCP tools")
    command_ids = {command.get("id") for command in commands if isinstance(command, dict)}
    for route in routes:
        equivalent = route.get("command_equivalent") if isinstance(route, dict) else None
        if not equivalent:
            errors.append("API route missing command_equivalent")
        elif equivalent != "job-state read" and equivalent not in command_ids:
            errors.append(f"API route maps to unknown CLI command: {equivalent}")
    for tool in tools:
        if not isinstance(tool, dict):
            errors.append("MCP tool must be an object")
            continue
        if not tool.get("safety_boundary"):
            errors.append(f"MCP tool missing safety_boundary: {tool.get('id', 'unknown')}")
        if not tool.get("required_artifacts"):
            errors.append(f"MCP tool missing required_artifacts: {tool.get('id', 'unknown')}")

    return {"status": "pass" if not errors else "fail", "errors": errors}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("skill_dir")
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
