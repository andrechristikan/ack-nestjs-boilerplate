#!/usr/bin/env bash
# PreToolUse (Write|Edit) hook: deny writes into docs/superpowers/.
# Skill output (specs/plans/sdd notes) belongs in .superpowers/ (gitignored),
# NOT docs/ which is tracked and reserved for durable project documentation.

f=$(jq -r ".tool_input.file_path // empty")

case "$f" in
    *docs/superpowers/*)
        cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Skill output does NOT go in docs/ — that directory is TRACKED and committed. Write specs/plans/sdd notes to .superpowers/ instead (gitignored; see .gitignore under 'Superpowers skill output'). docs/*.md is reserved for durable project documentation."}}
JSON
        ;;
esac

exit 0
