from pathlib import Path

from .config import get_settings


def _project_storage_dir() -> Path:
    base_dir = Path(__file__).resolve().parents[1]
    return base_dir / "storage"


def get_storage_root() -> Path:
    settings = get_settings()
    if settings.storage_root:
        return Path(settings.storage_root)
    return _project_storage_dir()


def get_remitos_dir_new() -> Path:
    return get_storage_root() / "remitos"


def get_remitos_dir_legacy() -> Path:
    return _project_storage_dir() / "remitos"


def resolve_remito_pdf_path(remito_id: int, pdf_path: str | None, prefer_new: bool = True) -> Path | None:
    if not pdf_path:
        return None
    filename = Path(pdf_path).name
    candidate_dirs = [get_remitos_dir_new(), get_remitos_dir_legacy()]
    if not prefer_new:
        candidate_dirs.reverse()
    for directory in candidate_dirs:
        candidate = directory / filename
        if candidate.exists():
            return candidate
    return None
