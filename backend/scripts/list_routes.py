from __future__ import annotations

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
from pathlib import Path
from app.main import app

EXCLUDE_METHODS = {"HEAD", "OPTIONS"}

def norm_methods(methods):
    if not methods:
        return []
    return sorted([m for m in methods if m not in EXCLUDE_METHODS])

def main():
    rows = []
    for r in app.router.routes:
        path = getattr(r, "path", None)
        if not path:
            continue
        rows.append(
            {
                "path": path,
                "methods": norm_methods(getattr(r, "methods", None)),
                "name": getattr(r, "name", None),
                "tags": getattr(r, "tags", None) or [],
            }
        )

    rows = sorted(rows, key=lambda x: (x["path"], ",".join(x["methods"])))

    out_dir = Path(".rbac")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "routes.json"
    out_file.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {len(rows)} routes to {out_file}")

if __name__ == "__main__":
    main()
