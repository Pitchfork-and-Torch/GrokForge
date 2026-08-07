"""
Push GrokForge env vars to a Vercel project.

Uses VERCEL_TOKEN (full account token) or MCP oauth token if it can see the project.
Never prints secret values.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
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


def api(token: str, method: str, url: str, body: dict | None = None) -> tuple[int, object]:
    data = None if body is None else json.dumps(body).encode("utf-8")
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:500]}
        return e.code, payload


def get_token() -> str:
    if os.environ.get("VERCEL_TOKEN"):
        t = os.environ["VERCEL_TOKEN"].strip().strip('"').strip("'")
        if len(t) >= 30 and " " not in t:
            return t
    # secrets file - pick longest non-comment line without spaces
    p = Path.home() / ".grok" / "secrets" / "vercel_token.txt"
    if p.exists():
        candidates: list[str] = []
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip().strip('"').strip("'")
            if not line or line.startswith("#"):
                continue
            if " " in line or len(line) < 30:
                continue
            candidates.append(line)
        if candidates:
            return max(candidates, key=len)
    # MCP oauth
    mcp = Path.home() / ".grok" / "mcp_credentials.json"
    if mcp.exists():
        d = json.loads(mcp.read_text(encoding="utf-8"))
        key = "vercel:https://mcp.vercel.com/"
        if key in d:
            tok = d[key].get("token_response", {}).get("access_token")
            if tok:
                return tok
    raise SystemExit("No Vercel token available")


def main() -> None:
    token = get_token()
    env_path = Path.home() / ".grok" / "secrets" / "grokforge-vercel-env.env"
    if not env_path.exists():
        raise SystemExit(f"Missing {env_path} - run assemble-local-env.py first")
    env = parse_env(env_path)

    # Discover teams + projects
    code, teams_payload = api(token, "GET", "https://api.vercel.com/v2/teams?limit=50")
    teams = []
    if code == 200 and isinstance(teams_payload, dict):
        teams = teams_payload.get("teams") or []
    print("teams_status", code, "count", len(teams))

    targets: list[tuple[str, str, str]] = []  # teamId, projectId, name
    if teams:
        for t in teams:
            tid = t["id"]
            slug = t.get("slug")
            code, proj = api(
                token, "GET", f"https://api.vercel.com/v9/projects?teamId={tid}&limit=50"
            )
            if code != 200:
                print("projects fail", slug, code)
                continue
            for p in (proj.get("projects") or []):
                name = p.get("name") or ""
                if "grok" in name.lower():
                    targets.append((tid, p["id"], name))
                    print("found", slug, name, p["id"])
    else:
        # no team list - try default team from user
        code, user = api(token, "GET", "https://api.vercel.com/v2/user")
        print("user_status", code)
        if code == 200 and isinstance(user, dict):
            tid = (user.get("user") or {}).get("defaultTeamId")
            if tid:
                code, proj = api(
                    token, "GET", f"https://api.vercel.com/v9/projects?teamId={tid}&limit=50"
                )
                if code == 200:
                    for p in (proj.get("projects") or []):
                        name = p.get("name") or ""
                        if "grok" in name.lower():
                            targets.append((tid, p["id"], name))
                            print("found defaultTeam", name, p["id"])

    if not targets:
        # last resort known hobby id + transferred name guesses
        print("NO_GROK_PROJECT_VISIBLE - token cannot see Pro grok-forge")
        print("Set a full Vercel token with Pro team access, or paste env in dashboard.")
        sys.exit(2)

    # Prefer name exact grok-forge or grokforge
    targets.sort(key=lambda x: (0 if x[2] in ("grok-forge", "grokforge") else 1, x[2]))

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

    for team_id, project_id, name in targets:
        print("PUSH", name, project_id)
        # list existing
        code, existing = api(
            token,
            "GET",
            f"https://api.vercel.com/v9/projects/{project_id}/env?teamId={team_id}",
        )
        by_key: dict[str, list[str]] = {}
        if code == 200 and isinstance(existing, dict):
            for e in existing.get("envs") or []:
                by_key.setdefault(e["key"], []).append(e["id"])

        for k in keys:
            val = env.get(k)
            if not val:
                print("  skip empty", k)
                continue
            # delete old
            for eid in by_key.get(k, []):
                api(
                    token,
                    "DELETE",
                    f"https://api.vercel.com/v9/projects/{project_id}/env/{eid}?teamId={team_id}",
                )
            typ = "plain" if k in (
                "NEXTAUTH_URL",
                "AUTH_URL",
                "AUTH_TRUST_HOST",
                "XAI_MODEL",
                "ENABLE_DEMO_AUTH",
            ) else "encrypted"
            body = {
                "key": k,
                "value": val,
                "type": typ,
                "target": ["production", "preview", "development"],
            }
            code, res = api(
                token,
                "POST",
                f"https://api.vercel.com/v10/projects/{project_id}/env?teamId={team_id}",
                body,
            )
            print(f"  {k} -> HTTP {code} len={len(val)}")

        # domains
        for domain in ("grokforge.app", "www.grokforge.app"):
            code, res = api(
                token,
                "POST",
                f"https://api.vercel.com/v10/projects/{project_id}/domains?teamId={team_id}",
                {"name": domain},
            )
            print(f"  domain {domain} -> HTTP {code}")

        # redeploy production from git main
        body = {
            "name": name,
            "project": project_id,
            "target": "production",
            "gitSource": {
                "type": "github",
                "org": "Pitchfork-and-Torch",
                "repo": "GrokForge",
                "ref": "main",
            },
        }
        code, dep = api(
            token,
            "POST",
            f"https://api.vercel.com/v13/deployments?teamId={team_id}&forceNew=1",
            body,
        )
        if code in (200, 201) and isinstance(dep, dict):
            print("deploy", dep.get("id"), dep.get("url"), dep.get("readyState"))
        else:
            print("deploy failed", code, dep)


if __name__ == "__main__":
    main()
