#!/usr/bin/env bash
# PostToolUse Read: records a .claude/rules/*.md file read whole (no offset, no limit) by this session or subagent.
# PreToolUse Write|Edit|MultiEdit|NotebookEdit: denies the edit until every path-scoped rule rules.sh prints for the
# target has been recorded; the five unscoped rules load with CLAUDE.md and are not gated.
# State: one file per session and agent under ${TMPDIR:-/tmp}/claude-rules-gate/, never under the repository.
set -euo pipefail

payload=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
event=$(printf '%s' "$payload" | jq -r '.hook_event_name // empty')
path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -n "$path" ] || exit 0
rel="${path#"$root"/}"

session=$(printf '%s' "$payload" | jq -r '.session_id // "session"')
agent=$(printf '%s' "$payload" | jq -r '.agent_id // "main"')
state="${TMPDIR:-/tmp}/claude-rules-gate/${session//[^A-Za-z0-9_-]/_}/${agent//[^A-Za-z0-9_-]/_}"

if [ "$event" = "PostToolUse" ]; then
    case "$rel" in
        .claude/rules/*.md)
            partial=$(printf '%s' "$payload" | jq -r '(.tool_input.offset // .tool_input.limit) != null')
            if [ "$partial" = "false" ]; then
                mkdir -p "$(dirname "$state")"
                echo "$rel" >>"$state"
            fi
            ;;
    esac
    exit 0
fi

case "$rel" in
    /*|../*) exit 0 ;;
esac

missing=$(bash "$root/.claude/hooks/rules.sh" "$rel" \
    | grep -vxE '\.claude/rules/(layering|cross-module|null-safety|naming|discipline)\.md' \
    | grep -vxFf <(sort -u "$state" 2>/dev/null; echo "$rel") || true)
[ -n "$missing" ] || exit 0

jq -cn --arg reason "$rel is bound by rules this agent has not read whole. Read each with the Read tool, no offset and no limit, then repeat the edit: $(printf '%s' "$missing" | tr '\n' ' ')" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
exit 0
