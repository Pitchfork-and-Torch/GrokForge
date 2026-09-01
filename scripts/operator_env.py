"""Load local assignments from the process environment or one out-of-tree directory.

Set GROKFORGE_ENV_DIR to an absolute directory outside this repository.
Every regular file in that directory is parsed as KEY=VALUE lines; names of
those files are ignored. If the variable is unset, no files are opened.
"""
from __future__ import annotations

import os
from pathlib import Path

DIR_ENV = "GROKFORGE_ENV_DIR"


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def parse_assignments(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        out[key] = value.strip().strip('"').strip("'")
    return out


def parse_file(path: Path) -> dict[str, str]:
    return parse_assignments(path.read_text(encoding="utf-8", errors="replace"))


def public_schema_keys() -> list[str]:
    example = repo_root() / ".env.example"
    if not example.is_file():
        return []
    return list(parse_file(example))


def operator_env_dir() -> Path | None:
    raw = os.environ.get(DIR_ENV, "").strip()
    if not raw:
        return None
    path = Path(raw).expanduser()
    if not path.is_absolute():
        raise SystemExit(f"{DIR_ENV} must be an absolute path outside the repository")
    path = path.resolve()
    repo = repo_root().resolve()
    try:
        path.relative_to(repo)
    except ValueError:
        pass
    else:
        raise SystemExit(f"{DIR_ENV} must be outside the repository")
    if not path.is_dir():
        raise SystemExit(f"{DIR_ENV} is not a directory")
    return path


def load_dir(path: Path) -> dict[str, str]:
    merged: dict[str, str] = {}
    for child in path.iterdir():
        if not child.is_file():
            continue
        try:
            merged.update(parse_file(child))
        except OSError:
            continue
    return merged


def collect_assignments() -> dict[str, str]:
    """Dir files (if set) then process-env overlay for public schema keys."""
    out: dict[str, str] = {}
    directory = operator_env_dir()
    if directory is not None:
        out.update(load_dir(directory))
    for key in public_schema_keys():
        value = os.environ.get(key)
        if value:
            out[key] = value
    return out


def write_dotenv(path: Path, data: dict[str, str]) -> None:
    lines = [f"{key}={data[key]}" for key in data if data.get(key)]
    path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
