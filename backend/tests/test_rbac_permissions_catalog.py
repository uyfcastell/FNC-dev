import re
from collections import Counter
from pathlib import Path

from fastapi.routing import APIRoute

from app.main import app

KEY_PATTERN = re.compile(r"^\s*-\s*key:\s*(\S+)\s*$")


def _read_permission_keys_from_yaml() -> list[str]:
    keys: list[str] = []
    permissions_path = Path(__file__).resolve().parents[2] / "backend" / "permissions.yml"
    with permissions_path.open(encoding="utf-8") as handle:
        for line in handle:
            match = KEY_PATTERN.match(line)
            if match:
                keys.append(match.group(1).strip())
    return keys


def _keys_from_endpoints() -> set[str]:
    keys: set[str] = set()
    for route in app.router.routes:
        if isinstance(route, APIRoute) and hasattr(route.endpoint, "__permission_key__"):
            keys.add(getattr(route.endpoint, "__permission_key__"))
    return keys


def test_permissions_yaml_covers_all_endpoint_permissions() -> None:
    catalog_keys = set(_read_permission_keys_from_yaml())
    endpoint_keys = _keys_from_endpoints()
    missing = sorted(endpoint_keys - catalog_keys)
    assert not missing, f"Permisos faltantes en permissions.yml: {missing}"


def test_permissions_yaml_has_no_duplicate_keys() -> None:
    keys = _read_permission_keys_from_yaml()
    duplicates = sorted(key for key, count in Counter(keys).items() if count > 1)
    assert not duplicates, f"Permisos duplicados en permissions.yml: {duplicates}"
