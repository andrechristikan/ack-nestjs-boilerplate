#!/bin/sh
set -eu
# Run on the deployed instance, from the repository root: log in with the
# environment's AppRole and render that environment's secret to an env file.
# The environment is required, so no run pulls one by accident.
ENV="${1:?usage: pnpm vault:pull <development|staging|production> [out-file]}"
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
# node on the host flattens .data.data, no jq needed. A failed read stops here
# with Vault's own error above the hint.
JSON=$(docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault exec -T vault sh -c '
  set -eu
  export VAULT_ADDR="$1"
  RID=$(sed -n 1p "/vault/init/$2.approle")
  SID=$(sed -n 2p "/vault/init/$2.approle")
  SCOPED=$(vault write -field=token auth/approle/login role_id="$RID" secret_id="$SID")
  VAULT_TOKEN="$SCOPED" exec vault kv get -format=json "$3"
' _ "$VAULT_ADDR_INTERNAL" "$ENV" "$READ_PATH") || {
  echo "vault:pull: could not read $READ_PATH. Start Vault (docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault up -d vault vault-bootstrap), or fill an empty path: pnpm vault:push $ENV <env-file>" >&2
  exit 1
}
printf '%s' "$JSON" \
  | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const d=JSON.parse(s).data.data;process.stdout.write(Object.keys(d).map(k=>`${k}=${d[k]}`).join("\n")+"\n");});' \
  > "$TMP"

mv "$TMP" "$OUT"
trap - EXIT
echo "vault:pull: wrote $OUT (env=$ENV)"
