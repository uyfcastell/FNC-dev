from app.core.permission_aliases import expand_permission_keys
from app.core.rbac_catalog import ROUTE_PERMISSION_MAP
from app.core.seed import DEFAULT_PERMISSIONS


def test_all_catalog_permission_keys_resolve_to_seed_permissions() -> None:
    seed_keys = {item["key"].strip().lower() for item in DEFAULT_PERMISSIONS}
    unresolved: list[str] = []

    for key in sorted(set(ROUTE_PERMISSION_MAP.values())):
        expanded = expand_permission_keys(key)
        if not expanded.intersection(seed_keys):
            unresolved.append(key)

    assert unresolved == []
