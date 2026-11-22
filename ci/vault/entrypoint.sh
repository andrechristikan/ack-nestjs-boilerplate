#!/bin/sh
set -eu
# Persistent Vault: file backend, auto-init + auto-unseal. First boot writes
# unseal key + root token to init.json; later boots reuse it.
# Limit: the unseal key and the root token sit on the host's disk beside the
# data, so whoever reads the host reads every secret. Unsealing through a KMS
# or Transit and revoking the root token are the deployment's.
VAULT_CONFIG="${VAULT_CONFIG:-/vault/config.hcl}"
VAULT_INIT_FILE_PATH="${VAULT_INIT_FILE_PATH:-/vault/init/init.json}"
export VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"

# Server runs in the background; this script stays PID 1 and unseals it.
vault server -config="$VAULT_CONFIG" &
SERVER_PID=$!
trap 'kill -TERM "$SERVER_PID" 2>/dev/null' TERM INT

# `vault status`: exit 0 unsealed, 2 sealed, 1 unreachable. Wait for 0 or 2.
api_up() {
  vault status >/dev/null 2>&1
  code=$?
  [ "$code" = "0" ] || [ "$code" = "2" ]
}
echo "entrypoint: waiting for vault API..."
until api_up; do sleep 1; done

# Init once on a fresh volume. init.json lives on the volume, beside its data.
if vault status 2>/dev/null | grep -qE 'Initialized[[:space:]]+false'; then
  echo "entrypoint: initializing vault..."
  vault operator init -key-shares=1 -key-threshold=1 -format=json > "$VAULT_INIT_FILE_PATH"
fi

# Unseal on every cold boot. No jq/node in the vault image, so grab the key
# from the line after the "unseal_keys_b64" marker.
if vault status 2>/dev/null | grep -qE 'Sealed[[:space:]]+true'; then
  echo "entrypoint: unsealing vault..."
  UNSEAL_KEY=$(grep -A1 '"unseal_keys_b64"' "$VAULT_INIT_FILE_PATH" | sed -n '2s/.*"\(.*\)".*/\1/p')
  vault operator unseal "$UNSEAL_KEY" >/dev/null
fi

echo "entrypoint: vault unsealed and ready."
wait "$SERVER_PID"
