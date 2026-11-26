#!/usr/bin/env bash
# PreToolUse Bash: foreground only; pnpm only; owner-only database commands; no read of the root .env, .env.harness,
# .env.docker, keys/, or generated/vault/; no print of the session environment; no write of .claude/rules/discipline.md;
# no write under src/ or test/; commits, staging, and discarding work ask; docker compose down with volumes asks.
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

# The root `.env` holds live credentials, `.env.harness` the harness keys (TYPESAFE_API_KEY, the MCP URLs), and
# `.env.docker` the Compose credentials: a command naming one as a path token (`.env`, `./.env`, `<dir>/.env`, `.env*`,
# `.env.harness`, `.env.docker`) or running the dotenv CLI reads it.
# `--env-file .env` (node, docker compose) hands it to a process unprinted and is stripped first; `.env.example`, any
# other `.env.<name>`, `dotenv/config`, and a quoted `\.env` pattern do not match.
env_cmd=$(printf '%s' "$cmd" | sed -E 's/--env-file(-if-exists)?(=|[[:space:]]+)[^[:space:];&|)]+//g')
env_file="(^|[[:space:]'\"\`=:(<>{,/])\.env(\.(harness|docker))?([[:space:]'\"\`);&|<>,}*?]|$)"
dotenv_cli="${at_command_start}((npx|pnpm[[:space:]]+(exec|dlx))[[:space:]]+)?dotenvx?${word_end}"
if printf '%s' "$env_cmd" | grep -qE "${env_file}|${dotenv_cli}"; then
    decide deny "The root .env, .env.harness, and .env.docker are the owner's and no agent reads them; .env.example and other .env.* files stay readable. Diagnose a boot failure from the container env (docker compose --env-file <the docker env file> --profile deps --profile apis exec -T <service> printenv, never printing a secret value) or the apis log (the same command with logs apis); hand the fix to the owner."
fi

# keys/ (JWT private keys, encryption-secret.env, the Mongo keyfile) and generated/vault/ (init.json: the Vault root
# token and unseal key) are owner-only secret stores: a command naming one as a path token (`keys/x`, `./keys/x`,
# `<dir>/keys/x`, `generated/vault`) reads it. `keys` inside another segment (`api-key/`, `api-keys/`) does not match.
secret_path="(^|[[:space:]'\"\`=:(<>{,/])(keys/|generated/vault([[:space:]'\"\`);&|<>,}*?/]|$))"
if printf '%s' "$cmd" | grep -qE "$secret_path"; then
    decide deny "keys/ (JWT private keys, encryption-secret.env) and generated/vault/ (init.json: the Vault root token and unseal key) are the owner's secret stores and no agent reads them; hand any step that needs them to the owner."
fi

# The session environment may carry credentials: a command that dumps it (bare env, printenv, set, export,
# declare -p/-x) or prints a key variable is denied. `env NAME=value cmd`, `env -u NAME cmd`, and a
# container's `docker compose exec <service> printenv` do not match.
env_dump="${at_command_start}(env|printenv([[:space:]]+[A-Za-z_][A-Za-z0-9_]*)*|set|export([[:space:]]+-p)?|declare[[:space:]]+-[A-Za-z]*[px][A-Za-z]*)[[:space:]]*([;&|)]|$)"
key_print="${at_command_start}(echo|printf)[^;&|]*\\$\\{?TYPESAFE_API_KEY"
if printf '%s' "$cmd" | grep -qE "${env_dump}|${key_print}"; then
    decide deny "The session environment may hold credentials: do not print it. Test whether a variable is set with [ -n \"\${NAME:-}\" ] && echo set."
fi

# .claude/rules/discipline.md changes through the Edit tool alone, which asks the owner: a command naming it beside a
# write form (a redirect onto it, tee, sed -i, mv, cp, rm, truncate, dd, a git checkout/restore/apply/stash, an
# interpreter) is denied. A read (cat, grep, wc, git diff, git log, rules.sh) passes.
if printf '%s' "$cmd" | grep -qE 'rules/discipline\.md'; then
    discipline_redirect=">>?[[:space:]]*[^[:space:];&|]*rules/discipline\.md"
    discipline_tool="${at_command_start}(tee|mv|cp|rm|truncate|dd|python3?|node|perl|ruby|awk)${word_end}"
    discipline_sed="${at_command_start}sed([[:space:]]+[^[:space:];&|]+)*[[:space:]]+(-[A-Za-z]*i|--in-place)"
    discipline_git="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+(checkout|restore|apply|stash)${word_end}"
    if printf '%s' "$cmd" | grep -qE "${discipline_redirect}|${discipline_tool}|${discipline_sed}|${discipline_git}"; then
        decide deny ".claude/rules/discipline.md changes only on the owner's word: edit it with the Edit tool, which asks the owner. A Bash command that writes, moves, deletes, restores, or runs an interpreter on it is denied; cat, grep, wc, git diff, and git log read it."
    fi
fi

# src/ and test/ change through Edit and Write. A src/ or test/ path (relative, ./, or under the project root) written by
# a redirect (a > after - or = is an arrow), tee, truncate, dd of=, cp as destination, sed -i or perl -i (on a path in its
# own segment, or after xargs or find -exec), or an inline python3, node, perl, or ruby script (-, -c, -e, or stdin)
# beside a write call is denied. rm, mv, git mv, git rm, the formatters, and reads pass.
root_re=$(printf '%s' "${CLAUDE_PROJECT_DIR:-$PWD}" | sed 's/[][\.*^$+?(){}|]/\\&/g')
source_path="['\"]?(\./|${root_re}/)?(src|test)/"
source_find="${at_command_start}find([[:space:]]+[^-[:space:];&|][^[:space:];&|]*)*[[:space:]]+['\"]?(\./|${root_re}/)?(src|test)['\"]?${word_end}"
if printf '%s' "$cmd" | grep -qE "(^|[[:space:]'\"=>])(\./|${root_re}/)?(src|test)/|${source_find}"; then
    source_arg='[[:space:]]+[^[:space:];&|]+'
    source_redirect="(^|[^=-])>>?[[:space:]]*${source_path}"
    source_tool="${at_command_start}((tee|truncate)(${source_arg})*[[:space:]]+|dd(${source_arg})*[[:space:]]+of=)${source_path}"
    source_cp="${at_command_start}cp(${source_arg})*[[:space:]]+${source_path}[^[:space:];&|)]*[[:space:]]*([;&|)]|$)"
    source_inplace_flag="(sed|perl)(${source_arg})*[[:space:]]+(-[A-Za-z]*i|--in-place)"
    source_inplace="${at_command_start}${source_inplace_flag}([^;&|'\"]|'[^']*'|\"[^\"]*\")*[[:space:]]${source_path}"
    source_bulk="(${at_command_start}xargs(${source_arg})*|[[:space:]]-exec(dir)?)[[:space:]]+${source_inplace_flag}"
    source_interpreter="${at_command_start}(python3?|node|perl|ruby)"
    source_inline="${source_interpreter}(${source_arg})*[[:space:]]+-([A-Za-z]*[ce])?${word_end}|${source_interpreter}([[:space:]]+-[^[:space:];&|]*)*[[:space:]]*(<<|[;&|)]|$)"
    source_write_call="open\([^)]*,[[:space:]]*(mode[[:space:]]*=[[:space:]]*)?['\"][^'\"]*[wax]|write_text|writeFile|appendFile|fs\.write"
    if printf '%s' "$cmd" | grep -qE "${source_redirect}|${source_tool}|${source_cp}|${source_inplace}|${source_bulk}" ||
        { printf '%s' "$cmd" | grep -qE "$source_inline" && printf '%s' "$cmd" | grep -qE "$source_write_call"; }; then
        decide deny "Write src/ and test/ through Edit or Write: a Bash write skips the rules gate, the write guard, the formatter, and the Stop check. rm, mv, and git mv stay in Bash."
    fi
fi

git_write="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+((commit|add|reset)${word_end}|stash(([[:space:]]+(push|pop|apply|drop|clear|save|branch|store)|[[:space:]]+-[^[:space:]]+)${word_end}|[[:space:]]*([;&|)]|$)))"
if printf '%s' "$cmd" | grep -qE "$git_write"; then
    decide ask "Commits and staging are the owner's call"
fi

git_discard="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+((rm|mv|restore)${word_end}|checkout([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+(--|\.)${word_end})"
if printf '%s' "$cmd" | grep -qE "$git_discard"; then
    decide ask "Staging and discarding work are the owner's call"
fi

compose_down_volumes="${at_command_start}((docker[[:space:]]+compose|docker-compose)([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+)down([[:space:]]+[^[:space:];&|)]+)*[[:space:]]+(-[A-Za-z]*v[A-Za-z]*|--volumes(=[^[:space:];&|)]*)?)${word_end}"
if printf '%s' "$cmd" | grep -qE "$compose_down_volumes"; then
    decide ask "docker compose down with -v or --volumes deletes the named volumes mongo_data and redis_queue_data (the MongoDB data, the BullMQ queue data), and vault_data (Vault's storage) in ci/docker-compose.yml; plain down keeps them."
fi

exit 0
