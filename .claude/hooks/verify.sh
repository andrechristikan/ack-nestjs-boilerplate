#!/usr/bin/env bash
# SessionStart: when the session has no baseline yet, records a "<path> <git hash-object>" line for each src/ and test/
# path that differs from HEAD or is untracked, in one state file per session under ${TMPDIR:-/tmp}/claude-verify/, never
# under the repository.
# Stop: the changed set is every such path whose line is not in the baseline, whatever wrote it. When it is not empty, run
# the full pnpm typecheck, then the unit specs of the changed modules; block on failure. A path under src/modules/<name>/
# or test/unit/modules/<name>/ adds the filter test/unit/modules/<name>; one under src/common/<name>/ or
# test/unit/common/<name>/ adds test/unit/common/<name>; any other src/ or test/ path runs the full unit suite. A filtered
# run passes --passWithNoTests; the full run does not.
# A green run writes the changed set's fingerprint to <state>.pass; a Stop whose fingerprint matches it exits 0 unchecked.
# VERIFY_DRY_RUN=1 prints the test command run_tests would run and exits 0, running neither typecheck nor tests.
set -uo pipefail

input=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
session=$(printf '%s' "$input" | jq -r '.session_id // "session"' 2>/dev/null)
state="${TMPDIR:-/tmp}/claude-verify/${session//[^A-Za-z0-9_-]/_}"
mkdir -p "$(dirname "$state")"

cd "$root" || exit 0

fingerprints() {
    { git diff --name-only HEAD -- src test; git ls-files --others --exclude-standard -- src test; } 2>/dev/null | sort -u |
        while IFS= read -r path; do
            printf '%s %s\n' "$path" "$(git hash-object "$path" 2>/dev/null || echo deleted)"
        done
}

if [ "$(printf '%s' "$input" | jq -r '.hook_event_name // empty' 2>/dev/null)" = "SessionStart" ]; then
    [ -e "$state" ] || fingerprints >"$state"
    exit 0
fi

active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)
[ "$active" = "true" ] && exit 0

if [ -e "$state" ]; then
    changed=$(fingerprints | grep -vxFf "$state")
else
    changed=$(fingerprints)
fi
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
    [ "$full" = 1 ] || cmd+=("${filters[@]}" --passWithNoTests)
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

pass="$state.pass"
print=$(printf '%s\n' "$changed" | git hash-object --stdin)
[ "$(cat "$pass" 2>/dev/null)" = "$print" ] && exit 0

out=$(pnpm typecheck 2>&1) || {
    line=$(printf '%s\n' "$out" | grep -m1 'error TS' || printf '%s\n' "$out" | grep -m1 -v '^$' || echo 'pnpm typecheck failed')
    block "pnpm typecheck failed: $line"
}

run_tests
echo "$print" >"$pass"
exit 0
