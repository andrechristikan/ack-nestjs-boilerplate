#!/bin/sh
set -eu
# Dev-only producer: pull the `apis` secret from the running dev Vault and write
# it to ./.env at the repo root. Mirrors the prod CI "fetch then inject" step.
# Uses the dev root token via the vault container — NEVER run this in prod.
OUT="${1:-.env}"

# KV path is resolved HERE on the host (the vault container has no KV_MOUNT/KV_APP
# env — those belong to the bootstrap service) and injected as an arg into the
# container shell. The dev root token is read from the container's own env.
KV_MOUNT="${KV_MOUNT:-ack-nestjs-boilerplate}"
KV_APP="${KV_APP:-apis}"
KV_PATH="$KV_MOUNT/$KV_APP"

# In-container loopback to the dev listener (exec runs inside the vault
# container, so 127.0.0.1 hits its own server — not the `vault:8200` alias).
VAULT_ADDR_INTERNAL="${VAULT_ADDR_INTERNAL:-http://127.0.0.1:8200}"

# Write to a temp file first; only replace ./.env on success so a failed fetch
# never truncates an existing env. Clean the temp file on any exit.
TMP="$OUT.tmp"
trap 'rm -f "$TMP"' EXIT

# Render key=value lines: vault (in the container) emits JSON; node (on the host)
# flattens .data.data. No jq needed; node is already a project dependency.
docker compose --profile vault exec -T vault \
  sh -c 'VAULT_ADDR="$1" VAULT_TOKEN="$VAULT_DEV_ROOT_TOKEN_ID" exec vault kv get -format=json "$2"' _ "$VAULT_ADDR_INTERNAL" "$KV_PATH" \
  | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s).data.data;process.stdout.write(Object.keys(d).map(k=>`${k}=${d[k]}`).join("\n")+"\n");});' \
  > "$TMP"

mv "$TMP" "$OUT"
trap - EXIT
echo "vault:pull: wrote $OUT"
