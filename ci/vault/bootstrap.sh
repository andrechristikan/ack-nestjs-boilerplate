#!/bin/sh
set -eu
# Dev-only Vault provisioning, shaped like prod. Idempotent: seeds only on an
# empty path. Prod parity: mount, paths, and policies are identical; only auth
# differs (AppRole here, swap for `jwt` + OIDC claims in prod).
export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"

# Root token minted by the vault entrypoint's auto-init. Per-env AppRole creds
# are persisted next to it so `vault:pull` never needs root.
INIT_FILE="${INIT_FILE:-/vault/init/init.json}"
INIT_DIR=$(dirname "$INIT_FILE")

KV_MOUNT="${KV_MOUNT:-ack-nestjs-boilerplate}"
KV_ENVS="${KV_ENVS:-production staging development}"
KV_SEED_ENV="${KV_SEED_ENV:-development}"
SEED_FILE=/seed/.env.example

echo "bootstrap: waiting for vault API..."
until vault status >/dev/null 2>&1; do
  sleep 1
done

# Auth as root. healthcheck guarantees the server is unsealed (init.json exists).
export VAULT_TOKEN=$(sed -n 's/.*"root_token": *"\([^"]*\)".*/\1/p' "$INIT_FILE")

# kv-v2 mount (once).
if ! vault secrets list 2>/dev/null | grep -q "^$KV_MOUNT/"; then
  echo "bootstrap: enabling kv-v2 at $KV_MOUNT/..."
  vault secrets enable -path="$KV_MOUNT" kv-v2
fi

# AppRole auth (once) — dev stand-in for prod's OIDC/JWT.
if ! vault auth list 2>/dev/null | grep -q "^approle/"; then
  echo "bootstrap: enabling approle auth..."
  vault auth enable approle
fi

for env in $KV_ENVS; do
  policy="$KV_MOUNT-$env-ro"

  # Read-only policy scoped to ONE env path, from /policies/$env-ro.hcl.
  echo "bootstrap: writing policy $policy..."
  vault policy write "$policy" "/policies/$env-ro.hcl"

  # One AppRole per env with only its RO policy. Short TTL mirrors CI's
  # mint/use/discard. Prod: a `jwt` role bound to the GitHub env claim.
  echo "bootstrap: writing approle $KV_MOUNT-$env..."
  vault write "auth/approle/role/$KV_MOUNT-$env" \
    token_policies="$policy" \
    token_ttl=5m \
    token_max_ttl=15m \
    secret_id_ttl=0 \
    secret_id_num_uses=0 >/dev/null

  # Mint + persist this role's creds so `vault:pull` authenticates WITHOUT root.
  # Bootstrap is the privileged broker (it holds root); pull is a pure consumer
  # of the scoped, read-only AppRole. role_id on line 1, secret_id on line 2.
  echo "bootstrap: writing approle creds for $env..."
  RID=$(vault read -field=role_id "auth/approle/role/$KV_MOUNT-$env/role-id")
  SID=$(vault write -f -field=secret_id "auth/approle/role/$KV_MOUNT-$env/secret-id")
  printf '%s\n%s\n' "$RID" "$SID" > "$INIT_DIR/$env.approle"
done

# Seed ONLY dev, only on first run. Prod/staging stay empty: a dev box must
# never hold real prod secrets.
SEED_PATH="$KV_MOUNT/$KV_SEED_ENV"
if ! vault kv get "$SEED_PATH" >/dev/null 2>&1; then
  echo "bootstrap: seeding $SEED_PATH from .env.example..."
  set --
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    set -- "$@" "$line"
  done < "$SEED_FILE"
  vault kv put "$SEED_PATH" "$@" >/dev/null
fi

echo "bootstrap: done."
