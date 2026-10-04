"""
Push GrokForge env vars to a Vercel project.

Uses VERCEL_TOKEN from the process environment.
Assignments come from the process environment, or from a directory the operator sets.
Never prints secret values.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from operator_env import collect_assignments


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
    token = os.environ.get("VERCEL_TOKEN", "").strip().strip('"').strip("'")
    if len(token) >= 30 and " " not in token:
        return token
    raise SystemExit("VERCEL_TOKEN is not set")


def main() -> None:
    token = get_token()
    env = collect_assignments()
    if not env:
        raise SystemExit("no assignments in the process environment or operator directory")

    code, teams_payload = api(token, "GET", "https://api.vercel.com/v2/teams?limit=50")
    teams = []
    if code == 200 and isinstance(teams_payload, dict):
        teams = teams_payload.get("teams") or []
    print("teams_status", code, "count", len(teams))

    targets: list[tuple[str, str, str]] = []
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
        print("NO_GROK_PROJECT_VISIBLE")
        print("Set a full Vercel token with Pro team access, or paste env in dashboard.")
        sys.exit(2)

    targets.sort(key=lambda x: (0 if x[2] in ("grok-forge", "grokforge") else 1, x[2]))

    public_plain = {
        "NEXTAUTH_URL",
        "AUTH_URL",
        "AUTH_TRUST_HOST",
        "XAI_MODEL",
        "ENABLE_DEMO_AUTH",
    }

    for team_id, project_id, name in targets:
        print("PUSH", name, project_id)
        code, existing = api(
            token,
            "GET",
            f"https://api.vercel.com/v9/projects/{project_id}/env?teamId={team_id}",
        )
        by_key: dict[str, list[str]] = {}
        if code == 200 and isinstance(existing, dict):
            for e in existing.get("envs") or []:
                by_key.setdefault(e["key"], []).append(e["id"])

        pushed = 0
        skipped = 0
        for key, val in env.items():
            if not val:
                skipped += 1
                continue
            for eid in by_key.get(key, []):
                api(
                    token,
                    "DELETE",
                    f"https://api.vercel.com/v9/projects/{project_id}/env/{eid}?teamId={team_id}",
                )
            typ = "plain" if key in public_plain else "encrypted"
            body = {
                "key": key,
                "value": val,
                "type": typ,
                "target": ["production", "preview", "development"],
            }
            code, _res = api(
                token,
                "POST",
                f"https://api.vercel.com/v10/projects/{project_id}/env?teamId={team_id}",
                body,
            )
            if code in (200, 201):
                pushed += 1
            else:
                print("  assign failed HTTP", code)
        print("  assignments ok", pushed, "empty", skipped)

        for domain in ("grokforge.app", "www.grokforge.app"):
            code, _res = api(
                token,
                "POST",
                f"https://api.vercel.com/v10/projects/{project_id}/domains?teamId={team_id}",
                {"name": domain},
            )
            print(f"  domain {domain} -> HTTP {code}")

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
