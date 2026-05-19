#!/usr/bin/env python3
"""Build compact prompt examples from slide-creator template YAML."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required: pip install pyyaml") from exc


USAGE_HINTS = {
    "hook": "abrir com tese, promessa ou ponto de vista forte",
    "reframe": "trocar a crença antiga por uma leitura nova",
    "diagnosis": "mostrar causa raiz por trás dos sintomas",
    "mechanism": "explicar como o sistema produz o resultado",
    "proof": "provar mudança, resultado ou credibilidade",
    "comparison": "comparar players, opções ou critérios",
    "decision": "levar a uma escolha explícita",
    "plan": "mostrar sequência, fases ou próximos passos",
    "teaching": "ensinar método replicável",
    "conversion": "tornar oferta e CTA claros",
}


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise SystemExit(f"Expected mapping YAML in {path}")
    return data


def slot_xml(slot: dict[str, Any]) -> str:
    name = slot.get("name", "slot")
    role = slot.get("role", "")
    max_chars = slot.get("max_chars", "")
    required = str(bool(slot.get("required", False))).lower()
    attrs = [f'name="{name}"', f'required="{required}"']
    if role:
        attrs.append(f'role="{role}"')
    if max_chars:
        attrs.append(f'max_chars="{max_chars}"')
    return f"    <slot {' '.join(attrs)}>...</slot>"


def template_to_example(template: dict[str, Any], index: int) -> str:
    template_id = template.get("id", f"template_{index}")
    function = template.get("function", "general")
    hint = USAGE_HINTS.get(function, "estrutura de slide de uso geral")
    compatible = ", ".join(template.get("compatible_visuals", []) or [])
    slots = template.get("slots", []) or []
    constraints = template.get("constraints", {}) or {}
    lines = [
        f"### {index}. {template_id}",
        f"**Use for**: {hint}",
        "```xml",
        f'<slide_template id="{template_id}" function="{function}">',
    ]
    if compatible:
        lines.append(f"  <compatible_visuals>{compatible}</compatible_visuals>")
    lines.append("  <slots>")
    lines.extend(slot_xml(slot) for slot in slots)
    lines.append("  </slots>")
    if constraints:
        max_words = constraints.get("max_visible_words")
        max_bullets = constraints.get("max_bullets")
        evidence = constraints.get("requires_evidence")
        attrs = []
        if max_words is not None:
            attrs.append(f'max_visible_words="{max_words}"')
        if max_bullets is not None:
            attrs.append(f'max_bullets="{max_bullets}"')
        if evidence is not None:
            attrs.append(f'requires_evidence="{str(bool(evidence)).lower()}"')
        lines.append(f"  <constraints {' '.join(attrs)} />")
    lines.append("</slide_template>")
    lines.append("```")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--templates",
        default="templates/slide/function-library.yaml",
        help="Path to slide/function-library.yaml",
    )
    parser.add_argument(
        "--ids",
        nargs="*",
        default=None,
        help="Optional template IDs to include. Defaults to all templates.",
    )
    parser.add_argument("--output", help="Optional Markdown output path.")
    args = parser.parse_args()

    template_path = Path(args.templates)
    data = load_yaml(template_path)
    templates = data.get("slide_templates", [])
    if not isinstance(templates, list):
        raise SystemExit("Expected `slide_templates` list")

    selected = [
        template
        for template in templates
        if args.ids is None or template.get("id") in set(args.ids)
    ]
    missing = set(args.ids or []) - {template.get("id") for template in selected}
    if missing:
        raise SystemExit(f"Unknown template IDs: {', '.join(sorted(missing))}")

    output = "\n\n".join(
        template_to_example(template, index)
        for index, template in enumerate(selected, start=1)
    )
    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
