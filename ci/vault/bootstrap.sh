#!/bin/sh
set -eu
# Vault provisioning for a deployed instance: the kv-v2 mount, one read-only
# policy and one AppRole per environment. Idempotent. It writes no secret: the
# owner fills each path with `pnpm vault:push <environment> <env-file>`.
export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"

# Root token minted by the vault entrypoint's auto-init. Per-env AppRole creds
# are persisted next to it so `vault:pull` never needs root.
VAULT_INIT_FILE_PATH="${VAULT_INIT_FILE_PATH:-/vault/init/init.json}"
INIT_DIR=$(dirname "$VAULT_INIT_FILE_PATH")

KV_MOUNT="${KV_MOUNT:-ack-nestjs-boilerplate}"
KV_ENVS="${KV_ENVS:-production staging development}"

echo "bootstrap: waiting for vault API..."
until vault status >/dev/null 2>&1; do
  sleep 1
done

# Auth as root. healthcheck guarantees the server is unsealed (init.json exists).
export VAULT_TOKEN=$(sed -n 's/.*"root_token": *"\([^"]*\)".*/\1/p' "$VAULT_INIT_FILE_PATH")

# kv-v2 mount (once).
if ! vault secrets list 2>/dev/null | grep -q "^$KV_MOUNT/"; then
  echo "bootstrap: enabling kv-v2 at $KV_MOUNT/..."
  vault secrets enable -path="$KV_MOUNT" kv-v2
fi

# AppRole auth (once). A deployment with an OIDC provider swaps it for `jwt`.
if ! vault auth list 2>/dev/null | grep -q "^approle/"; then
  echo "bootstrap: enabling approle auth..."
  vault auth enable approle
fi

for env in $KV_ENVS; do
  policy="$KV_MOUNT-$env-ro"

  # Read-only policy scoped to ONE env path, from /policies/$env-ro.hcl.
  echo "bootstrap: writing policy $policy..."
  vault policy write "$policy" "/policies/$env-ro.hcl"

  # One AppRole per env with only its RO policy. Short token TTL: a pull mints
  # a token, reads once, and discards it.
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

echo "bootstrap: done."
