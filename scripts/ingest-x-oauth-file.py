"""Merge an operator-provided KEY=VALUE file into repo .env.local."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from operator_env import parse_file, repo_root, write_dotenv


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("pass a KEY=VALUE file path as the first argument")
    src = Path(sys.argv[1])
    if not src.is_file():
        raise SystemExit("input path is not a file")
    incoming = parse_file(src)
    if not incoming:
        raise SystemExit("no KEY=VALUE assignments in input")

    dest = repo_root() / ".env.local"
    merged = parse_file(dest) if dest.is_file() else {}
    merged.update(incoming)
    write_dotenv(dest, merged)
    print("updated local dotenv", dest.name, "assignments", len(merged))


if __name__ == "__main__":
    main()
