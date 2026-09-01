"""Write repo .env.local from the process environment or one out-of-tree directory."""
from __future__ import annotations

import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from operator_env import collect_assignments, repo_root, write_dotenv


def main() -> None:
    merged = collect_assignments()
    if not merged.get("DATABASE_URL"):
        raise SystemExit("DATABASE_URL missing from the process environment or operator directory")

    secret = merged.get("AUTH_SECRET") or merged.get("NEXTAUTH_SECRET") or secrets.token_urlsafe(32)
    merged["AUTH_SECRET"] = secret
    merged["NEXTAUTH_SECRET"] = secret

    dest = repo_root() / ".env.local"
    write_dotenv(dest, merged)
    print("wrote local dotenv", dest.name, "assignments", len(merged))


if __name__ == "__main__":
    main()
