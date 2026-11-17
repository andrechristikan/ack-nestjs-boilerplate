#!/bin/sh
set -eu
# Run on the deployed instance, from the repository root: write an env file to
# the environment's path, replacing what the path holds. Both arguments are
# required, so no run fills a path by accident.
USAGE="usage: pnpm vault:push <development|staging|production> <env-file>"
ENV="${1:?$USAGE}"
FILE="${2:?$USAGE}"

KV_MOUNT="${KV_MOUNT:-ack-nestjs-boilerplate}"
WRITE_PATH="$KV_MOUNT/$ENV"

# In-container loopback: exec runs inside the vault container, so 127.0.0.1
# hits its own server, not the `vault:8200` alias.
VAULT_ADDR_INTERNAL="${VAULT_ADDR_INTERNAL:-http://127.0.0.1:8200}"

# The policies are read-only, so the write authenticates as root with the token
# the entrypoint's auto-init left in /vault/init/init.json; the token never
# leaves the container. node on the host turns KEY=value lines into one JSON
# object (blank and # lines skipped, the value taken as written after the first
# =), which `vault kv put -` reads from stdin: no value is parsed as an argument.
node -e 'const d={};for(const l of require("fs").readFileSync(process.argv[1],"utf8").split("\n")){if(l===""||l.startsWith("#"))continue;const i=l.indexOf("=");if(i<1)continue;d[l.slice(0,i)]=l.slice(i+1);}process.stdout.write(JSON.stringify(d));' "$FILE" \
  | docker compose --env-file .env.docker -f ci/docker-compose.yml --profile vault exec -T vault sh -c '
  set -eu
  export VAULT_ADDR="$1"
  VAULT_TOKEN=$(sed -n "s/.*\"root_token\": *\"\([^\"]*\)\".*/\1/p" /vault/init/init.json)
  export VAULT_TOKEN
  vault kv put "$2" - >/dev/null
' _ "$VAULT_ADDR_INTERNAL" "$WRITE_PATH"

echo "vault:push: wrote $WRITE_PATH from $FILE"
