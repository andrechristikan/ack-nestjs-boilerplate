#!/usr/bin/env bash
# PostToolUse Write|Edit: prettier then eslint --fix on a touched src/ or test/ TypeScript file.
set -uo pipefail

path=$(jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -n "$path" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
rel="${path#"$root"/}"

case "$rel" in
    src/*.ts|test/*.ts)
        cd "$root" || exit 0
        [ -f "$rel" ] || exit 0
        pnpm exec prettier --write "$rel" >/dev/null 2>&1
        pnpm exec eslint --fix "$rel" >/dev/null 2>&1
        ;;
esac

exit 0
