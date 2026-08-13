"""Copy X OAuth2 client credentials from SafeDeposit vault into GrokForge .env.local."""
from __future__ import annotations

from pathlib import Path


def parse_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def main() -> None:
    vault = (
        Path.home()
        / "SafeDeposit-Secrets"
        / "x-api-safedepositusa"
        / "credentials.env"
    )
    local = Path.home() / "GrokForge" / ".env.local"
    kv = parse_env(vault)
    cid = kv.get("X_OAUTH2_CLIENT_ID", "")
    csec = kv.get("X_OAUTH2_CLIENT_SECRET", "")
    if len(cid) < 6 or len(csec) < 6:
        raise SystemExit("X_OAUTH2_CLIENT_ID/SECRET missing or short in vault")

    existing = local.read_text(encoding="utf-8") if local.exists() else ""
    keep = [
        ln
        for ln in existing.splitlines()
        if not ln.startswith(
            (
                "AUTH_TWITTER_",
                "TWITTER_",
                "ENABLE_DEMO_AUTH=",
            )
        )
    ]
    keep.append(f"AUTH_TWITTER_ID={cid}")
    keep.append(f"AUTH_TWITTER_SECRET={csec}")
    # Local demos stay available; production should set ENABLE_DEMO_AUTH=false or omit
    keep.append("ENABLE_DEMO_AUTH=true")
    local.write_text("\n".join(keep).rstrip() + "\n", encoding="utf-8")
    print("OK wrote .env.local")
    print("AUTH_TWITTER_ID length", len(cid))
    print("AUTH_TWITTER_SECRET length", len(csec))
    print("Add X portal callback: https://grokforge.app/api/auth/callback/twitter")


if __name__ == "__main__":
    main()
