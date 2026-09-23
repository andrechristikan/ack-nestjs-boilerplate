#!/usr/bin/env bash
# PreToolUse Bash: pnpm only; owner-only database commands; commits and staging ask.
set -euo pipefail

cmd=$(jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

decide() {
    jq -cn --arg decision "$1" --arg reason "$2" \
        '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$decision,permissionDecisionReason:$reason}}'
    exit 0
}

at_command_start='(^|[;&|(]|\$\()[[:space:]]*(sudo[[:space:]]+)?'

if printf '%s' "$cmd" | grep -qE "${at_command_start}(npm|yarn)([[:space:]]|\$)"; then
    decide deny "pnpm only: package.json engines and the preinstall guard reject npm and yarn. Use pnpm install, pnpm add, pnpm run. npx is allowed."
fi

if printf '%s' "$cmd" | grep -qE "prisma (db|migrate|studio)|db:migrate|db:studio|dist/migration\.js|${at_command_start}(pnpm( run)? )?migration(:seed|:remove|:fresh)?([[:space:]]|\$)|${at_command_start}(mongosh?|redis-cli)([[:space:]]|\$)"; then
    decide deny "Owner-only: db:migrate, db:studio, migration, migration:seed, migration:remove, migration:fresh, prisma db/migrate/studio, node dist/migration.js, mongosh, redis-cli. Edit prisma/schema.prisma and hand back the commands the owner runs."
fi

if printf '%s' "$cmd" | grep -qE '\bgit\b.*\b(commit|add|stash|reset)\b'; then
    decide ask "Commits and staging are the owner's call"
fi

exit 0
