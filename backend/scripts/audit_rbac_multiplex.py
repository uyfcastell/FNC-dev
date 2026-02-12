#!/usr/bin/env python3
from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ROUTES_FILE = REPO_ROOT / "backend/app/api/routes.py"
RBAC_CATALOG_FILE = REPO_ROOT / "backend/app/core/rbac_catalog.py"
SEED_FILE = REPO_ROOT / "backend/app/core/seed.py"
REPORT_FILE = REPO_ROOT / "docs/rbac_multiplex_audit.md"

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "options", "head"}
FIELD_NAMES = ("status", "new_status", "action", "event", "transition", "operation")
PATH_HINT_RE = re.compile(r"/(status|state|action|transition|event)(?:/|$)", re.IGNORECASE)
FIELD_RE = re.compile(r"\b(status|new_status|action|event|transition|operation)\b")
IF_BRANCH_RE = re.compile(
    r"\b(if|elif)\b[^\n]*(?:status|new_status|action|event|transition|operation)", re.IGNORECASE
)
COMPARE_STRING_RE = re.compile(
    r"(?:\.|\b)(status|new_status|action|event|transition|operation)\b\s*(?:==|!=)\s*[\"']([A-Za-z0-9_\-\.]+)[\"']"
)
COMPARE_ENUM_RE = re.compile(
    r"(?:\.|\b)(status|new_status|action|event|transition|operation)\b\s*(?:==|!=)\s*([A-Z][A-Za-z0-9_\.]+)"
)
IN_SET_RE = re.compile(
    r"(?:\.|\b)(status|new_status|action|event|transition|operation)\b[^\n]*\bin\b\s*\{([^}]*)\}"
)
SET_STRING_RE = re.compile(r"[\"']([A-Za-z0-9_\-\.]+)[\"']")


@dataclass
class EndpointAudit:
    method: str
    path: str
    handler: str
    file_path: str
    line: int
    catalog_permission: str | None
    detected_actions: list[str]
    is_candidate: bool
    risk_level: str
    notes: str


def _literal(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def parse_route_permission_map(path: Path) -> dict[tuple[str, str], str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    result: dict[tuple[str, str], str] = {}
    for node in tree.body:
        value_node: ast.AST | None = None
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "ROUTE_PERMISSION_MAP" for t in node.targets):
            value_node = node.value
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == "ROUTE_PERMISSION_MAP":
            value_node = node.value
        if not isinstance(value_node, ast.Dict):
            continue
        for key_node, val_node in zip(value_node.keys, value_node.values):
            if not isinstance(key_node, ast.Tuple) or len(key_node.elts) != 2:
                continue
            method = _literal(key_node.elts[0])
            route = _literal(key_node.elts[1])
            perm = _literal(val_node)
            if method and route and perm:
                result[(method.upper(), route)] = perm
    return result


def parse_seed_permission_keys(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    keys: set[str] = set()
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(t, ast.Name) and t.id == "DEFAULT_PERMISSIONS" for t in node.targets):
            continue
        if not isinstance(node.value, ast.List):
            continue
        for item in node.value.elts:
            if not isinstance(item, ast.Dict):
                continue
            for k_node, v_node in zip(item.keys, item.values):
                if _literal(k_node) == "key":
                    key_value = _literal(v_node)
                    if key_value:
                        keys.add(key_value)
    return keys


def _full_api_path(route_path: str) -> str:
    if route_path.startswith("/api/"):
        return route_path
    if route_path == "/api":
        return route_path
    return f"/api{route_path}"


def _extract_actions(handler_source: str) -> list[str]:
    actions: set[str] = set()
    for _, action in COMPARE_STRING_RE.findall(handler_source):
        actions.add(action)
    for _, action in COMPARE_ENUM_RE.findall(handler_source):
        actions.add(action)
    for _, raw_set in IN_SET_RE.findall(handler_source):
        for action in SET_STRING_RE.findall(raw_set):
            actions.add(action)
    return sorted(actions)


def parse_routes(path: Path, permission_map: dict[tuple[str, str], str]) -> list[EndpointAudit]:
    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()
    tree = ast.parse(source)
    findings: list[EndpointAudit] = []

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        method: str | None = None
        route_path: str | None = None

        for decorator in node.decorator_list:
            if not isinstance(decorator, ast.Call):
                continue
            if not isinstance(decorator.func, ast.Attribute):
                continue
            if decorator.func.attr not in HTTP_METHODS:
                continue
            if not decorator.args:
                continue
            literal_path = _literal(decorator.args[0])
            if not literal_path:
                continue
            method = decorator.func.attr.upper()
            route_path = _full_api_path(literal_path)
            break

        if not method or not route_path:
            continue

        start = node.lineno
        end = getattr(node, "end_lineno", node.lineno)
        handler_source = "\n".join(lines[start - 1 : end])

        has_path_hint = bool(PATH_HINT_RE.search(route_path))
        has_field_hint = bool(FIELD_RE.search(handler_source))
        has_branch_hint = bool(IF_BRANCH_RE.search(handler_source))
        detected_actions = _extract_actions(handler_source)
        is_candidate = has_path_hint or (has_field_hint and has_branch_hint)

        catalog_permission = permission_map.get((method, route_path))

        risk_level = "LOW"
        notes: list[str] = []
        if has_path_hint:
            notes.append("Path matches multiplex hint keyword")
        if has_field_hint:
            notes.append("Handler references action/status-like fields")
        if has_branch_hint:
            notes.append("Handler has conditional branches on action/status-like fields")

        if is_candidate and len(detected_actions) > 1:
            if catalog_permission:
                risk_level = "RISK: multiplexed"
                notes.append("Single static catalog permission with multiple internal actions")
            else:
                risk_level = "MEDIUM"
                notes.append("Multiple internal actions detected; route has no catalog permission entry")
        elif is_candidate and len(detected_actions) == 1:
            risk_level = "MEDIUM"
        elif is_candidate:
            risk_level = "INFO"

        findings.append(
            EndpointAudit(
                method=method,
                path=route_path,
                handler=node.name,
                file_path=str(path.relative_to(REPO_ROOT)),
                line=start,
                catalog_permission=catalog_permission,
                detected_actions=detected_actions,
                is_candidate=is_candidate,
                risk_level=risk_level,
                notes="; ".join(notes) if notes else "",
            )
        )

    return findings


def build_report(findings: list[EndpointAudit], catalog_keys: set[str], seed_keys: set[str]) -> str:
    candidates = [f for f in findings if f.is_candidate]
    candidates.sort(key=lambda x: (x.path, x.method, x.line))

    top_priority = [f for f in candidates if "/status" in f.path]

    only_catalog = sorted(catalog_keys - seed_keys)
    only_seed = sorted(seed_keys - catalog_keys)

    lines: list[str] = []
    lines.append("# RBAC Multiplex Audit Report")
    lines.append("")
    lines.append("This report is generated automatically by `backend/scripts/audit_rbac_multiplex.py`.")
    lines.append("")
    lines.append("## Scope & heuristics")
    lines.append("")
    lines.append("- Route path contains one of: `/status`, `/state`, `/action`, `/transition`, `/event`.")
    lines.append("- Handler references fields: `status`, `new_status`, `action`, `event`, `transition`, `operation`.")
    lines.append("- Handler has `if/elif` branches using those fields.")
    lines.append("- Internal actions inferred via regex comparisons and `in { ... }` sets.")
    lines.append("")
    lines.append("## Candidate endpoints")
    lines.append("")
    lines.append("| endpoint | handler | catalog_permission | detected_actions | risk_level | notes |")
    lines.append("|---|---|---|---|---|---|")
    for item in candidates:
        endpoint = f"`{item.method} {item.path}`"
        handler_ref = f"`{item.file_path}:{item.line}` (`{item.handler}`)"
        permission = f"`{item.catalog_permission}`" if item.catalog_permission else "_none_"
        actions = ", ".join(f"`{a}`" for a in item.detected_actions) if item.detected_actions else "_none_"
        notes = item.notes or ""
        lines.append(f"| {endpoint} | {handler_ref} | {permission} | {actions} | **{item.risk_level}** | {notes} |")

    lines.append("")
    lines.append("## Top priority")
    lines.append("")
    if not top_priority:
        lines.append("No `/status` candidate endpoints were found.")
    else:
        lines.append("Endpoints containing `/status` (higher priority due to known mobile usage patterns):")
        lines.append("")
        for item in top_priority:
            lines.append(
                f"- `{item.method} {item.path}` -> `{item.handler}` ({item.file_path}:{item.line}), "
                f"permission: `{item.catalog_permission or 'none'}`, risk: **{item.risk_level}**"
            )

    lines.append("")
    lines.append("## Permission key consistency (catalog vs seed DEFAULT_PERMISSIONS)")
    lines.append("")
    lines.append(f"- Catalog permission keys: **{len(catalog_keys)}**")
    lines.append(f"- Seed DEFAULT_PERMISSIONS keys: **{len(seed_keys)}**")
    lines.append("")
    lines.append("### In catalog but missing in seed DEFAULT_PERMISSIONS")
    lines.append("")
    if only_catalog:
        for key in only_catalog:
            lines.append(f"- `{key}`")
    else:
        lines.append("- None")

    lines.append("")
    lines.append("### In seed DEFAULT_PERMISSIONS but not used by catalog")
    lines.append("")
    if only_seed:
        for key in only_seed:
            lines.append(f"- `{key}`")
    else:
        lines.append("- None")

    lines.append("")
    lines.append("## Summary")
    lines.append("")
    risk_count = sum(1 for i in candidates if i.risk_level == "RISK: multiplexed")
    medium_count = sum(1 for i in candidates if i.risk_level == "MEDIUM")
    info_count = sum(1 for i in candidates if i.risk_level == "INFO")
    lines.append(f"- Candidate endpoints analyzed: **{len(candidates)}**")
    lines.append(f"- `RISK: multiplexed`: **{risk_count}**")
    lines.append(f"- `MEDIUM`: **{medium_count}**")
    lines.append(f"- `INFO`: **{info_count}**")

    return "\n".join(lines) + "\n"


def main() -> None:
    permission_map = parse_route_permission_map(RBAC_CATALOG_FILE)
    seed_keys = parse_seed_permission_keys(SEED_FILE)
    findings = parse_routes(ROUTES_FILE, permission_map)
    report = build_report(findings, set(permission_map.values()), seed_keys)
    REPORT_FILE.write_text(report, encoding="utf-8")
    print(f"Audit report written to {REPORT_FILE.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
