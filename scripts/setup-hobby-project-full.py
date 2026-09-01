"""Create/configure GrokForge on a hobby Vercel team with full env + deploy."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from operator_env import collect_assignments

TEAM = os.environ.get("VERCEL_TEAM_ID", "").strip()


def get_token() -> str:
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    if token:
        return token
    raise SystemExit("VERCEL_TOKEN is not set")


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
    if not TEAM:
        raise SystemExit("Set VERCEL_TEAM_ID to the hobby Vercel team id")
    token = get_token()
    code, proj = api(token, "GET", f"https://api.vercel.com/v9/projects?teamId={TEAM}&limit=50")
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
            f"https://api.vercel.com/v10/projects?teamId={TEAM}",
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

    env = collect_assignments()
    if not env:
        raise SystemExit("no assignments in the process environment or operator directory")

    code, existing_env = api(
        token, "GET", f"https://api.vercel.com/v9/projects/{pid}/env?teamId={TEAM}"
    )
    for e in existing_env.get("envs") or []:
        api(
            token,
            "DELETE",
            f"https://api.vercel.com/v9/projects/{pid}/env/{e['id']}?teamId={TEAM}",
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
            f"https://api.vercel.com/v10/projects/{pid}/env?teamId={TEAM}",
            {
                "key": k,
                "value": v,
                "type": "plain" if k in plain else "encrypted",
                "target": ["production", "preview", "development"],
            },
        )
        if code not in (200, 201):
            print("env assign failed HTTP", code)
        else:
            print("env assign ok")

    for domain in ("grokforge.app", "www.grokforge.app"):
        code, res = api(
            token,
            "POST",
            f"https://api.vercel.com/v10/projects/{pid}/domains?teamId={TEAM}",
            {"name": domain},
        )
        print("domain", domain, code, res.get("error") or res.get("name") or "ok")

    code, dep = api(
        token,
        "POST",
        f"https://api.vercel.com/v13/deployments?teamId={TEAM}&forceNew=1",
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
    print("TEAM personal hobby team - transfer this project to GrokForge Pro after READY")


if __name__ == "__main__":
    main()
