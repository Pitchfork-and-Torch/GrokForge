"""Assemble GrokForge .env.local from vaults without printing secret values."""
from __future__ import annotations

import os
import secrets
from pathlib import Path


def parse(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def secrets_root() -> Path:
    raw = os.environ.get("SECRETS_DIR")
    if raw:
        return Path(raw).expanduser()
    return Path(__file__).resolve().parent.parent / ".secrets"


def main() -> None:
    home = Path.home()
    base = home / "GrokForge"
    env_file = base / ".env"
    local_file = base / ".env.local"
    vault = secrets_root() / "credentials.env"
    xai_file = home / ".grok" / "secrets" / "xai-api-key.txt"

    merged: dict[str, str] = {}
    merged.update(parse(env_file))
    merged.update(parse(local_file))

    if not merged.get("DATABASE_URL"):
        raise SystemExit("DATABASE_URL missing from GrokForge .env")

    s = merged.get("AUTH_SECRET") or merged.get("NEXTAUTH_SECRET") or secrets.token_urlsafe(32)
    merged["AUTH_SECRET"] = s
    merged["NEXTAUTH_SECRET"] = s
    merged["NEXTAUTH_URL"] = "https://grokforge.app"
    merged["AUTH_URL"] = "https://grokforge.app"
    merged["AUTH_TRUST_HOST"] = "true"

    # Prefer dedicated GrokForge OAuth2 secrets over SECRETS_DIR / .secrets
    gf_oauth = home / ".grok" / "secrets" / "grokforge-x-oauth2.txt"
    gf = parse(gf_oauth)
    if gf.get("AUTH_TWITTER_ID") and gf.get("AUTH_TWITTER_SECRET"):
        merged["AUTH_TWITTER_ID"] = gf["AUTH_TWITTER_ID"]
        merged["AUTH_TWITTER_SECRET"] = gf["AUTH_TWITTER_SECRET"]
        print("twitter oauth2: grokforge-x-oauth2.txt")
    else:
        v = parse(vault)
        if v.get("X_OAUTH2_CLIENT_ID") and v.get("X_OAUTH2_CLIENT_SECRET"):
            merged["AUTH_TWITTER_ID"] = v["X_OAUTH2_CLIENT_ID"]
            merged["AUTH_TWITTER_SECRET"] = v["X_OAUTH2_CLIENT_SECRET"]
            print("twitter oauth2: secrets dir fallback")
        else:
            print("twitter oauth2: MISSING")

    if xai_file.exists():
        xai = xai_file.read_text(encoding="utf-8").strip().splitlines()[0].strip()
        if len(xai) > 10:
            merged["XAI_API_KEY"] = xai
            merged["XAI_MODEL"] = merged.get("XAI_MODEL") or "grok-3-mini"
            print("xai: ok")

    # local keeps demo; vercel export will force false
    merged["ENABLE_DEMO_AUTH"] = "true"

    keys = [
        "DATABASE_URL",
        "AUTH_SECRET",
        "NEXTAUTH_SECRET",
        "NEXTAUTH_URL",
        "AUTH_URL",
        "AUTH_TRUST_HOST",
        "AUTH_TWITTER_ID",
        "AUTH_TWITTER_SECRET",
        "XAI_API_KEY",
        "XAI_MODEL",
        "ENABLE_DEMO_AUTH",
    ]
    lines = [f"{k}={merged[k]}" for k in keys if merged.get(k)]
    local_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("wrote", local_file)
    for k in keys:
        if merged.get(k):
            print(f"  {k} len={len(merged[k])}")

    # Export pack for Vercel (same secrets) - NOT for git
    export = home / ".grok" / "secrets" / "grokforge-vercel-env.env"
    prod = dict(merged)
    prod["ENABLE_DEMO_AUTH"] = "false"
    prod["NEXTAUTH_URL"] = "https://grokforge.app"
    prod["AUTH_URL"] = "https://grokforge.app"
    export.write_text(
        "\n".join(f"{k}={prod[k]}" for k in keys if prod.get(k)) + "\n",
        encoding="utf-8",
    )
    print("wrote", export, "(for Vercel push script only)")


if __name__ == "__main__":
    main()
