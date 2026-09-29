#!/usr/bin/env bash
# Stop: typecheck and the unit suite when src/ or test/ changed; block on failure.
set -uo pipefail

input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
[ "$active" = "true" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$root" || exit 0

changed=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | grep -E '^(src|test)/' | sort -u)
[ -n "$changed" ] || exit 0

block() {
    jq -cn --arg reason "$1" '{decision:"block",reason:$reason}'
    exit 0
}

out=$(pnpm typecheck 2>&1) || {
    line=$(printf '%s\n' "$out" | grep -m1 'error TS' || printf '%s\n' "$out" | grep -m1 -v '^$' || echo 'pnpm typecheck failed')
    block "pnpm typecheck failed: $line"
}

out=$(pnpm test 2>&1) || {
    line=$(printf '%s\n' "$out" | grep -m1 -E '^ *FAIL ' || printf '%s\n' "$out" | grep -m1 -E 'Error:|✗|×' || echo 'pnpm test failed')
    block "pnpm test failed: $line"
}

exit 0
