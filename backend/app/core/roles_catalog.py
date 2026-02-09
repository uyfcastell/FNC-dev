from __future__ import annotations

CANONICAL_ROLES: tuple[str, ...] = (
    "Administración",
    "Auditoría",
    "Encargado de Depósito",
    "Encargado de Locales",
    "Encargado de Planta",
    "Encargado de Reparto",
    "Encargado de Empaque",
    "Operario de Producción",
)

TEST_ROLE_PREFIXES: tuple[str, ...] = ("RBAC Role ", "PR2 ")


def normalize_role_name(name: str) -> str:
    return (
        name.strip()
        .upper()
        .replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
        .replace("Ü", "U")
        .replace("Ñ", "N")
    )


CANONICAL_ROLE_NAMES = frozenset(CANONICAL_ROLES)
CANONICAL_ROLE_NAMES_NORMALIZED = frozenset(normalize_role_name(role) for role in CANONICAL_ROLES)


def is_canonical_role_name(name: str) -> bool:
    return normalize_role_name(name) in CANONICAL_ROLE_NAMES_NORMALIZED


def is_test_role_name(name: str) -> bool:
    stripped = name.strip()
    return any(stripped.startswith(prefix) for prefix in TEST_ROLE_PREFIXES)


def is_test_user_email(email: str) -> bool:
    return email.strip().lower().startswith("rbac-") and email.strip().lower().endswith("@example.com")
