#!/usr/bin/env bash
# PreToolUse Bash: foreground only; pnpm only; owner-only database commands; no read of the root .env, keys/, or
# generated/vault/; commits, staging, and discarding work ask; docker compose down with volumes asks.
set -euo pipefail

decide() {
    jq -cn --arg decision "$1" --arg reason "$2" \
        '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$decision,permissionDecisionReason:$reason}}'
    exit 0
}

payload=$(cat)

if [ "$(printf '%s' "$payload" | jq -r '.tool_input.run_in_background // false')" = "true" ]; then
    decide deny "Foreground only: no run_in_background; run the command in the foreground and wait for it (.claude/CLAUDE.md, Etiquette)."
fi

cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

# A command word: after a separator, `sudo`, `env`, and `NAME=value` prefixes. Matching command words only keeps a
# quoted mention (`grep "db:migrate"`, `git log -S'add'`) out of the decisions below.
at_command_start='(^|[;&|(]|\$\()[[:space:]]*(sudo[[:space:]]+)?(env[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
word_end='([[:space:];&|)]|$)'

if printf '%s' "$cmd" | grep -qE "${at_command_start}(npm|yarn)${word_end}"; then
    decide deny "pnpm only: package.json engines and the preinstall guard reject npm and yarn. Use pnpm install, pnpm add, pnpm run. npx is allowed."
fi

owner_prisma="${at_command_start}((npx|pnpm([[:space:]]+(exec|dlx))?)[[:space:]]+)?(([^[:space:];&|()]*/)?node_modules/\.bin/)?prisma[[:space:]]+(db|migrate|studio)${word_end}"
owner_script="${at_command_start}pnpm([[:space:]]+-[^[:space:]]+)*([[:space:]]+run)?[[:space:]]+(db:migrate|db:studio|migration(:seed|:remove|:fresh)?)${word_end}"
owner_node="${at_command_start}node([[:space:]]+[^[:space:];&|]+)*[[:space:]]+(\./)?dist/migration\.js${word_end}"
owner_shell="${at_command_start}(mongosh?|redis-cli)${word_end}"
if printf '%s' "$cmd" | grep -qE "${owner_prisma}|${owner_script}|${owner_node}|${owner_shell}"; then
    decide deny "Owner-only: db:migrate, db:studio, migration, migration:seed, migration:remove, migration:fresh, prisma db/migrate/studio (bare, npx, pnpm, pnpm exec, pnpm dlx, node_modules/.bin/prisma), node dist/migration.js, mongosh, redis-cli. Edit prisma/schema.prisma and hand back the commands the owner runs."
fi

# The root `.env` holds live credentials: a command naming it as a path token (`.env`, `./.env`, `<dir>/.env`, `.env*`)
# or running the dotenv CLI reads it. `--env-file .env` (node, docker compose) hands it to a process unprinted and is
# stripped first; `.env.example`, `.env.<name>`, `dotenv/config`, and a quoted `\.env` pattern do not match.
env_cmd=$(printf '%s' "$cmd" | sed -E 's/--env-file(-if-exists)?(=|[[:space:]]+)[^[:space:];&|)]+//g')
env_file="(^|[[:space:]'\"\`=:(<>{,/])\.env([[:space:]'\"\`);&|<>,}*?]|$)"
dotenv_cli="${at_command_start}((npx|pnpm[[:space:]]+(exec|dlx))[[:space:]]+)?dotenvx?${word_end}"
if printf '%s' "$env_cmd" | grep -qE "${env_file}|${dotenv_cli}"; then
    decide deny "The root .env is the owner's and no agent reads it; .env.example and other .env.* files stay readable. Diagnose a boot failure from the container env (docker-compose exec -T <service> printenv, never printing a secret value) or a boot with the variable set in the environment, which .env does not override; hand the .env fix to the owner."
fi

# keys/ (JWT private keys, encryption-secret.env, the Mongo keyfile) and generated/vault/ (init.json: the Vault root token
# and unseal key) are owner-only secret stores: a command naming either as a path token (`keys/x`, `./keys/x`,
# `<dir>/keys/x`, `generated/vault`) reads them. `keys` inside another segment (`api-key/`, `api-keys/`) does not match.
secret_path="(^|[[:space:]'\"\`=:(<>{,/])(keys/|generated/vault([[:space:]'\"\`);&|<>,}*?/]|$))"
if printf '%s' "$cmd" | grep -qE "$secret_path"; then
    decide deny "keys/ (JWT private keys, encryption-secret.env) and generated/vault/ (init.json: the Vault root token and unseal key) are the owner's secret stores and no agent reads them; hand any step that needs them to the owner."
fi

git_write="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+((commit|add|reset)${word_end}|stash(([[:space:]]+(push|pop|apply|drop|clear|save|branch|store)|[[:space:]]+-[^[:space:]]+)${word_end}|[[:space:]]*([;&|)]|$)))"
if printf '%s' "$cmd" | grep -qE "$git_write"; then
    decide ask "Commits and staging are the owner's call"
fi

git_discard="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+((rm|mv|restore)${word_end}|checkout([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+(--|\.)${word_end})"
if printf '%s' "$cmd" | grep -qE "$git_discard"; then
    decide ask "Staging and discarding work are the owner's call"
fi

compose_down_volumes="${at_command_start}(docker[[:space:]]+compose|docker-compose)([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+down([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+(-[A-Za-z]*v[A-Za-z]*|--volumes(=[^[:space:];&|)]*)?)${word_end}"
if printf '%s' "$cmd" | grep -qE "$compose_down_volumes"; then
    decide ask "docker compose down with -v or --volumes deletes the named volumes mongo_data, redis_data, and vault_data (the MongoDB data, the Redis cache and queue data, Vault's storage); plain down keeps them."
fi

exit 0
