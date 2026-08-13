"""Optional local smoke: verify platform XAI_API_KEY can call chat completions."""
from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path


def load_key() -> str:
    key = os.environ.get("XAI_API_KEY", "").strip()
    if key:
        return key
    env_local = Path(__file__).resolve().parents[1] / ".env.local"
    if env_local.exists():
        for line in env_local.read_text(encoding="utf-8").splitlines():
            if line.startswith("XAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("No XAI_API_KEY in env or .env.local")


def main() -> None:
    key = load_key()
    body = {
        "model": os.environ.get("XAI_MODEL", "grok-3-mini"),
        "messages": [{"role": "user", "content": "Say hi in three words."}],
    }
    req = urllib.request.Request(
        "https://api.x.ai/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.load(resp)
    content = data["choices"][0]["message"]["content"]
    print("XAI ok", data.get("model"), content[:120])


if __name__ == "__main__":
    main()
