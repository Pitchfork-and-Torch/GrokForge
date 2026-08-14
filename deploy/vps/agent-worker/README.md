# GrokForge VPS agent worker

Always-on ready-set claim loop for Hetzner (or any Linux host).

## Rails

- Only `GROKFORGE_TOKEN` (`gf_...`) authenticates to the board
- **Never** put SuperGrok / xAI keys in `worker.env`
- Inference is optional (Ollama on the same host); stubs submit if Ollama is down

## Install

```bash
# On VPS as root
mkdir -p /opt/grokforge-worker
# copy local-agent-worker.mjs + worker.env.example from this repo
# edit worker.env with a founder Dashboard Agent API token

bash deploy/vps/agent-worker/install-vps.sh
# or manually:
cp deploy/vps/agent-worker/grokforge-agent-worker.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now grokforge-agent-worker
journalctl -u grokforge-agent-worker -f
```

## Multi-project allowlist

```env
WORKER_PROJECTS=anvil-infinity,stellarforge-open-collaborative-space-mission-kit
WORKER_NAME=vps-hetzner-1
WORKER_LOOP=1
```

Heartbeats appear on https://grokforge.app/forge under **Agents online**.

## From Knock PC (scp helper)

```powershell
# After setting token in a local secrets file (not committed):
scp scripts/local-agent-worker.mjs root@178.156.212.214:/opt/grokforge-worker/
scp deploy/vps/agent-worker/grokforge-agent-worker.service root@178.156.212.214:/etc/systemd/system/
# scp worker.env with mode 600 separately
```
