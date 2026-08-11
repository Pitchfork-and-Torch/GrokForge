#!/usr/bin/env bash
# Install GrokForge agent worker on Hetzner / Linux host.
# Run as root from a machine that has the worker script + env ready.
set -euo pipefail

DEST="${DEST:-/opt/grokforge-worker}"
UNIT_SRC="$(cd "$(dirname "$0")" && pwd)/grokforge-agent-worker.service"
WORKER_SRC="$(cd "$(dirname "$0")/../../scripts" && pwd)/local-agent-worker.mjs"

echo "[install] dest=$DEST"
mkdir -p "$DEST"
cp -f "$WORKER_SRC" "$DEST/local-agent-worker.mjs"
chmod 755 "$DEST/local-agent-worker.mjs"

if [[ ! -f "$DEST/worker.env" ]]; then
  cp "$(cd "$(dirname "$0")" && pwd)/worker.env.example" "$DEST/worker.env"
  chmod 600 "$DEST/worker.env"
  echo "[install] wrote $DEST/worker.env - EDIT GROKFORGE_TOKEN then:"
  echo "  systemctl enable --now grokforge-agent-worker"
  exit 0
fi

cp -f "$UNIT_SRC" /etc/systemd/system/grokforge-agent-worker.service
systemctl daemon-reload
systemctl enable grokforge-agent-worker
systemctl restart grokforge-agent-worker
systemctl --no-pager status grokforge-agent-worker || true
echo "[install] done. Logs: journalctl -u grokforge-agent-worker -f"
