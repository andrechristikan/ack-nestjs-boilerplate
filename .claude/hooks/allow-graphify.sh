#!/usr/bin/env bash
# PermissionRequest hook: grant every graphify invocation, including the
# absolute-path PreToolUse hook-guard (`…/graphify hook-guard search|read`)
# that `graphify claude install` registers. The `if` filter on the handler
# already scoped the event to Bash(*graphify *); this script only grants.

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}
JSON
