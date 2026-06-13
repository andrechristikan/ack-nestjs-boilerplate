#!/bin/sh
set -eu
# Dev-only: log in with the per-ENV AppRole and render that env's secret to a
# local env file. Mirrors prod CI's auth/fetch/inject. NEVER run in prod.
# Prod parity: kv read + flatten are identical; only the auth block changes
# (prod: a single `vault write auth/jwt/login ... jwt=$GITHUB_OIDC`).
ENV="${1:-development}"
OUT="${2:-.env}"

KV_MOUNT="${KV_MOUNT:-ack-nestjs-boilerplate}"
READ_PATH="$KV_MOUNT/$ENV"

# In-container loopback: exec runs inside the vault container, so 127.0.0.1
# hits its own server, not the `vault:8200` alias.
VAULT_ADDR_INTERNAL="${VAULT_ADDR_INTERNAL:-http://127.0.0.1:8200}"

# Temp file first, swap in on success: a failed fetch never truncates the
# existing env file. Temp cleaned on any exit.
TMP="$OUT.tmp"
trap 'rm -f "$TMP"' EXIT

# Pure consumer: no root token here. Log in with the env's AppRole creds that
# bootstrap already minted to /vault/init/<env>.approle (role_id on line 1,
# secret_id on line 2). The scoped token reads ONLY this env's path by policy.
# node on the host flattens .data.data, no jq needed.
docker compose --profile vault exec -T vault sh -c '
  set -eu
  export VAULT_ADDR="$1"
  RID=$(sed -n 1p "/vault/init/$2.approle")
  SID=$(sed -n 2p "/vault/init/$2.approle")
  SCOPED=$(vault write -field=token auth/approle/login role_id="$RID" secret_id="$SID")
  VAULT_TOKEN="$SCOPED" exec vault kv get -format=json "$3"
' _ "$VAULT_ADDR_INTERNAL" "$ENV" "$READ_PATH" \
  | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s).data.data;process.stdout.write(Object.keys(d).map(k=>`${k}=${d[k]}`).join("\n")+"\n");});' \
  > "$TMP"

mv "$TMP" "$OUT"
trap - EXIT
echo "vault:pull: wrote $OUT (env=$ENV)"
