"""Ingest X OAuth2 client id/secret from a Desktop file into local + vercel env pack."""
from __future__ import annotations

import re
import sys
from pathlib import Path


def parse_file(path: Path) -> tuple[str, str]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    lines = [
        ln.strip()
        for ln in raw.replace("\r", "").split("\n")
        if ln.strip() and not ln.strip().startswith("#")
    ]
    kv: dict[str, str] = {}
    bare: list[str] = []
    for line in lines:
        if "=" in line:
            k, v = line.split("=", 1)
            key = re.sub(r"[^A-Za-z0-9_]", "_", k.strip().upper())
            kv[key] = v.strip().strip('"').strip("'")
        else:
            bare.append(line.strip().strip('"').strip("'"))

    cid = (
        kv.get("AUTH_TWITTER_ID")
        or kv.get("TWITTER_CLIENT_ID")
        or kv.get("CLIENT_ID")
        or kv.get("X_OAUTH2_CLIENT_ID")
        or kv.get("OAUTH2_CLIENT_ID")
        or ""
    )
    csec = (
        kv.get("AUTH_TWITTER_SECRET")
        or kv.get("TWITTER_CLIENT_SECRET")
        or kv.get("CLIENT_SECRET")
        or kv.get("X_OAUTH2_CLIENT_SECRET")
        or kv.get("OAUTH2_CLIENT_SECRET")
        or ""
    )

    # Two bare lines: longer OAuth2 client ids often end with MTpjaQ
    if not cid or not csec:
        if len(bare) >= 2:
            a, b = bare[0], bare[1]
            if a.endswith("MTpjaQ") or len(a) >= len(b):
                cid, csec = a, b
            else:
                cid, csec = b, a
        elif len(bare) == 1 and ("," in bare[0] or ";" in bare[0]):
            parts = re.split(r"[,;]+", bare[0])
            if len(parts) >= 2:
                cid, csec = parts[0].strip(), parts[1].strip()

    if len(cid) < 10 or len(csec) < 10:
        print("PARSE_FAIL lines", len(lines), "cid_len", len(cid), "csec_len", len(csec))
        for i, ln in enumerate(lines[:8]):
            print("line", i, "len", len(ln), "has_eq", "=" in ln)
        raise SystemExit(1)

    return cid, csec


def upsert_env_file(path: Path, updates: dict[str, str]) -> None:
    existing: dict[str, str] = {}
    order: list[str] = []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip() or line.strip().startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            if k not in existing:
                order.append(k)
            existing[k] = v
    for k, v in updates.items():
        if k not in existing:
            order.append(k)
        existing[k] = v
    path.write_text(
        "\n".join(f"{k}={existing[k]}" for k in order) + "\n", encoding="utf-8"
    )


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Desktop" / "11111111111111111111111111.txt"
    if not src.exists():
        raise SystemExit(f"missing {src}")

    cid, csec = parse_file(src)
    print("cid_len", len(cid), "suffix", cid[-8:])
    print("csec_len", len(csec))

    home = Path.home()
    upsert_env_file(
        home / "GrokForge" / ".env.local",
        {"AUTH_TWITTER_ID": cid, "AUTH_TWITTER_SECRET": csec},
    )
    print("updated GrokForge/.env.local")

    pack = home / ".grok" / "secrets" / "grokforge-vercel-env.env"
    upsert_env_file(
        pack,
        {
            "AUTH_TWITTER_ID": cid,
            "AUTH_TWITTER_SECRET": csec,
            "ENABLE_DEMO_AUTH": "false",
        },
    )
    print("updated grokforge-vercel-env.env")

    sec = home / ".grok" / "secrets" / "grokforge-x-oauth2.txt"
    sec.write_text(
        "# GForge X OAuth2 client - do not commit\n"
        f"AUTH_TWITTER_ID={cid}\n"
        f"AUTH_TWITTER_SECRET={csec}\n",
        encoding="utf-8",
    )
    print("wrote secrets/grokforge-x-oauth2.txt")

    # scrub Desktop source only (never delete secrets vault copies)
    try:
        if "Desktop" in src.parts or "desktop" in str(src).lower():
            if src.name != "grokforge-x-oauth2.txt":
                src.unlink()
                print("scrubbed", src.name)
    except OSError as e:
        print("scrub_failed", e)


if __name__ == "__main__":
    main()
