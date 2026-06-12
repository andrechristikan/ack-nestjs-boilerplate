#!/bin/sh
set -eu
# Dev-only Vault seeding. The server runs in `-dev` mode (auto-unsealed,
# in-memory), so there is no init/unseal/approle here. Idempotent — safe to
# run on every boot; dev data is ephemeral and re-seeded.
export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"

KV_MOUNT="${KV_MOUNT:-ack-nestjs-boilerplate}"
KV_APP="${KV_APP:-apis}"
KV_PATH="$KV_MOUNT/$KV_APP"
SEED_FILE=/seed/.env.example

echo "bootstrap: waiting for vault API..."
until vault status >/dev/null 2>&1; do
  sleep 1
done

if ! vault secrets list 2>/dev/null | grep -q "^$KV_MOUNT/"; then
  echo "bootstrap: enabling kv-v2 at $KV_MOUNT/..."
  vault secrets enable -path="$KV_MOUNT" kv-v2
fi

# Seed from .env.example ONLY if the path has no data yet (first run).
if ! vault kv get "$KV_PATH" >/dev/null 2>&1; then
  echo "bootstrap: seeding $KV_PATH from .env.example..."
  set --
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    set -- "$@" "$line"
  done < "$SEED_FILE"
  vault kv put "$KV_PATH" "$@"
fi

echo "bootstrap: done."
