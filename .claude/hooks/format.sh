#!/usr/bin/env bash
# PostToolUse Write|Edit|MultiEdit|NotebookEdit: prettier then eslint --fix on a touched src/ or test/ TypeScript file;
# prettier alone on a touched .md file inside the repository (`.prettierrc` sets proseWrap: never).
set -uo pipefail

path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null) || exit 0
[ -n "$path" ] || exit 0

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
rel="${path#"$root"/}"
[ "$rel" != "$path" ] || exit 0

case "$rel" in
    src/*.ts|test/*.ts)
        cd "$root" || exit 0
        [ -f "$rel" ] || exit 0
        pnpm exec prettier --write "$rel" >/dev/null 2>&1
        pnpm exec eslint --fix "$rel" >/dev/null 2>&1
        ;;
    *.md)
        cd "$root" || exit 0
        [ -f "$rel" ] || exit 0
        pnpm exec prettier --write "$rel" >/dev/null 2>&1
        ;;
esac

exit 0
