#!/usr/bin/env bash
# PreToolUse mcp__mongodb__*|mcp__redis-cache__*|mcp__redis-queue__*|WebSearch|WebFetch: denies the session's own data reads
# and web calls; a subagent's call carries agent_id and passes.
set -euo pipefail

input=$(cat)
agent=$(jq -r '.agent_id // empty' <<<"$input")
[ -z "$agent" ] || exit 0

case "$(jq -r '.tool_name // empty' <<<"$input")" in
    WebSearch | WebFetch) reason="The session assigns and reads hand-backs. Dispatch researcher for a question the web answers." ;;
    *) reason="The session assigns and reads hand-backs. Dispatch reviewer to check a change's data, or debugger to trace a symptom's." ;;
esac

jq -cn --arg reason "$reason" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
exit 0
