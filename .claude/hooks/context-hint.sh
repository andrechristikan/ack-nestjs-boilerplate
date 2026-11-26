#!/usr/bin/env bash
# UserPromptSubmit: on an /ack-* prompt whose transcript's last usage entry reaches the threshold, suggests /compact.
# Never blocks: any failure exits 0 with no output. Reads the transcript's tail only.
set -uo pipefail

threshold=150000

input=$(cat)
[[ $(jq -r '.prompt // empty' <<<"$input" 2>/dev/null) == /ack-* ]] || exit 0
file=$(jq -r '.transcript_path // empty' <<<"$input" 2>/dev/null)
[ -f "$file" ] || exit 0

n=$(tail -n 400 "$file" | jq -s 'map(select(.type == "assistant" and .message.usage != null)) | last | .message.usage
    | (.input_tokens // 0) + (.cache_read_input_tokens // 0) + (.cache_creation_input_tokens // 0)' 2>/dev/null)
[[ $n =~ ^[0-9]+$ ]] && ((n >= threshold)) || exit 0

msg="Context is about $((n / 1000))k tokens. This feature's state is in .scratch/, so /compact before this command loses nothing the skill needs."
jq -cn --arg m "$msg" '{systemMessage: $m, hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $m}}'
exit 0
