"""Create/configure GrokForge on FIRSTHALFODD hobby with full env + deploy."""
from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

# Default hobby team (FIRSTHALFODD). Override via VERCEL_TEAM_ID env or --team CLI arg.
DEFAULT_TEAM_ID = "team_er6zwd5YZa517zX4qeOC8wBf"


def resolve_team_id(cli_team: str | None = None) -> str:
    return (cli_team or os.environ.get("VERCEL_TEAM_ID") or DEFAULT_TEAM_ID).strip()


def get_token() -> str:
    if os.environ.get("VERCEL_TOKEN"):
        return os.environ["VERCEL_TOKEN"].strip()
    mcp = Path.home() / ".grok" / "mcp_credentials.json"
    d = json.loads(mcp.read_text(encoding="utf-8"))
    return d["vercel:https://mcp.vercel.com/"]["token_response"]["access_token"]


def api(token: str, method: str, url: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            raw = r.read().decode()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:800]}
        return e.code, payload


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--team",
        default=None,
        help=(
            "Vercel team id (default: env VERCEL_TEAM_ID or "
            f"{DEFAULT_TEAM_ID})"
        ),
    )
    args = parser.parse_args()
    team = resolve_team_id(args.team)

    token = get_token()
    code, proj = api(token, "GET", f"https://api.vercel.com/v9/projects?teamId={team}&limit=50")
    print("list", code, [p.get("name") for p in (proj.get("projects") or [])])
    existing = next(
        (
            p
            for p in (proj.get("projects") or [])
            if p.get("name") in ("grokforge", "grok-forge")
        ),
        None,
    )
    if existing:
        pid = existing["id"]
        print("using", existing["name"], pid)
    else:
        code, created = api(
            token,
            "POST",
            f"https://api.vercel.com/v10/projects?teamId={team}",
            {
                "name": "grokforge",
                "framework": "nextjs",
                "gitRepository": {
                    "type": "github",
                    "repo": "Pitchfork-and-Torch/GrokForge",
                },
                "buildCommand": "prisma generate && next build",
                "installCommand": "npm install",
            },
        )
        print("create", code, created.get("id") or created)
        if code not in (200, 201):
            raise SystemExit(1)
        pid = created["id"]

    env: dict[str, str] = {}
    env_path = Path.home() / ".grok" / "secrets" / "grokforge-vercel-env.env"
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k] = v

    code, existing_env = api(
        token, "GET", f"https://api.vercel.com/v9/projects/{pid}/env?teamId={team}"
    )
    for e in existing_env.get("envs") or []:
        api(
            token,
            "DELETE",
            f"https://api.vercel.com/v9/projects/{pid}/env/{e['id']}?teamId={team}",
        )

    plain = {
        "NEXTAUTH_URL",
        "AUTH_URL",
        "AUTH_TRUST_HOST",
        "XAI_MODEL",
        "ENABLE_DEMO_AUTH",
    }
    for k, v in env.items():
        code, _ = api(
            token,
            "POST",
            f"https://api.vercel.com/v10/projects/{pid}/env?teamId={team}",
            {
                "key": k,
                "value": v,
                "type": "plain" if k in plain else "encrypted",
                "target": ["production", "preview", "development"],
            },
        )
        print("env", k, code, "len", len(v))

    for domain in ("grokforge.app", "www.grokforge.app"):
        code, res = api(
            token,
            "POST",
            f"https://api.vercel.com/v10/projects/{pid}/domains?teamId={team}",
            {"name": domain},
        )
        print("domain", domain, code, res.get("error") or res.get("name") or "ok")

    code, dep = api(
        token,
        "POST",
        f"https://api.vercel.com/v13/deployments?teamId={team}&forceNew=1",
        {
            "name": "grokforge",
            "project": pid,
            "target": "production",
            "gitSource": {
                "type": "github",
                "org": "Pitchfork-and-Torch",
                "repo": "GrokForge",
                "ref": "main",
            },
        },
    )
    print(
        "deploy",
        code,
        dep.get("id"),
        dep.get("url"),
        dep.get("readyState") if isinstance(dep, dict) else dep,
    )
    print("PROJECT_ID", pid)
    print("TEAM", team, "- transfer this project to GrokForge Pro after READY")


if __name__ == "__main__":
    main()
