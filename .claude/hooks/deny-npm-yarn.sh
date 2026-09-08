#!/usr/bin/env bash
# PreToolUse (Bash) hook: deny any command that invokes npm or yarn.
# This project pins PNPM through package.json engines ("npm": "please-use-pnpm",
# "yarn": "please-use-pnpm") and a `npx only-allow pnpm` preinstall guard.
# npx is allowed — only the npm and yarn clients themselves are blocked.

cmd=$(jq -r ".tool_input.command // empty")

if printf '%s' "$cmd" | grep -qE '(^|[;&|(]|\$\()[[:space:]]*(sudo[[:space:]]+)?(npm|yarn)([[:space:]]|$)'; then
    cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"This project is PNPM only — package.json engines sets \"npm\" and \"yarn\" to \"please-use-pnpm\", and preinstall runs `npx only-allow pnpm`. Use the pnpm equivalent instead (pnpm install, pnpm add, pnpm run). npx is allowed."}}
JSON
fi

exit 0
