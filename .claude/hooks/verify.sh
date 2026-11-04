#!/usr/bin/env bash
# Stop: when a src/ or test/ file differs from HEAD or is untracked, run the full pnpm typecheck, then the unit specs of
# the changed modules; block on failure. A path under src/modules/<name>/ or test/unit/modules/<name>/ adds the filter
# test/unit/modules/<name>; one under src/common/<name>/ or test/unit/common/<name>/ adds test/unit/common/<name>; any
# other changed src/ or test/ path runs the full unit suite. The full suite also runs in .husky/pre-commit.
# VERIFY_DRY_RUN=1 prints the test command run_tests would run and exits 0, running neither typecheck nor tests.
set -uo pipefail

input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
[ "$active" = "true" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$root" || exit 0

changed=$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null | grep -E '^(src|test)/' | sort -u)
[ -n "$changed" ] || exit 0

full=0
filters=()
while IFS= read -r filter; do
    if [ "$filter" = full ]; then full=1; else filters+=("$filter"); fi
done < <(
    while IFS= read -r path; do
        if [[ "$path" =~ ^(src|test/unit)/(modules|common)/([^/]+)/ ]]; then
            echo "test/unit/${BASH_REMATCH[2]}/${BASH_REMATCH[3]}"
        else
            echo full
        fi
    done <<< "$changed" | sort -u
)

block() {
    jq -cn --arg reason "$1" '{decision:"block",reason:$reason}'
    exit 0
}

run_tests() {
    local cmd=(pnpm test)
    [ "$full" = 1 ] || cmd+=("${filters[@]}")
    if [ "${VERIFY_DRY_RUN:-0}" = 1 ]; then
        printf 'NODE_ENV=test %s\n' "${cmd[*]}"
        return 0
    fi
    local out line
    out=$(NODE_ENV=test "${cmd[@]}" 2>&1) || {
        line=$(printf '%s\n' "$out" | grep -m1 -E '^ *FAIL ' || printf '%s\n' "$out" | grep -m1 -E 'Error:|✗|×' || echo 'pnpm test failed')
        block "${cmd[*]} failed: $line"
    }
}

[ "${VERIFY_DRY_RUN:-0}" = 1 ] && { run_tests; exit 0; }

out=$(pnpm typecheck 2>&1) || {
    line=$(printf '%s\n' "$out" | grep -m1 'error TS' || printf '%s\n' "$out" | grep -m1 -v '^$' || echo 'pnpm typecheck failed')
    block "pnpm typecheck failed: $line"
}

run_tests
exit 0
