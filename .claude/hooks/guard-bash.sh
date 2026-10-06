#!/usr/bin/env bash
# PreToolUse Bash: foreground only; pnpm only; owner-only database commands; commits and staging ask.
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

owner_prisma="${at_command_start}((npx|pnpm[[:space:]]+(exec|dlx))[[:space:]]+)?prisma[[:space:]]+(db|migrate|studio)${word_end}"
owner_script="${at_command_start}pnpm([[:space:]]+-[^[:space:]]+)*([[:space:]]+run)?[[:space:]]+(db:migrate|db:studio|migration(:seed|:remove|:fresh)?)${word_end}"
owner_node="${at_command_start}node([[:space:]]+[^[:space:];&|]+)*[[:space:]]+(\./)?dist/migration\.js${word_end}"
owner_shell="${at_command_start}(mongosh?|redis-cli)${word_end}"
if printf '%s' "$cmd" | grep -qE "${owner_prisma}|${owner_script}|${owner_node}|${owner_shell}"; then
    decide deny "Owner-only: db:migrate, db:studio, migration, migration:seed, migration:remove, migration:fresh, prisma db/migrate/studio, node dist/migration.js, mongosh, redis-cli. Edit prisma/schema.prisma and hand back the commands the owner runs."
fi

git_write="${at_command_start}git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*[[:space:]]+((commit|add|reset)${word_end}|stash(([[:space:]]+(push|pop|apply|drop|clear|save|branch|store)|[[:space:]]+-[^[:space:]]+)${word_end}|[[:space:]]*([;&|)]|$)))"
if printf '%s' "$cmd" | grep -qE "$git_write"; then
    decide ask "Commits and staging are the owner's call"
fi

exit 0
