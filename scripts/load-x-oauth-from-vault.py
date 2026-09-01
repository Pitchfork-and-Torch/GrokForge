"""Merge process environment or one out-of-tree directory into repo .env.local."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from operator_env import collect_assignments, parse_file, repo_root, write_dotenv


def main() -> None:
    incoming = collect_assignments()
    if not incoming:
        raise SystemExit("no assignments in the process environment or operator directory")

    dest = repo_root() / ".env.local"
    merged = parse_file(dest) if dest.is_file() else {}
    merged.update(incoming)
    write_dotenv(dest, merged)
    print("updated local dotenv", dest.name, "assignments", len(merged))


if __name__ == "__main__":
    main()
