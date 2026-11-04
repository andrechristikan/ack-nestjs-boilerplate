New names in this example, not in the checkout: the `.claude/settings.local.json` case arm in `guard-write.sh` and its deny reason.

# Example: a settled requirement

Step 1 of `SKILL.md` ends with a requirement in this shape: Files, Changes, Expected outcomes, Decisions. Step 2 fills the `harness` dispatch from it: `Requirement:` takes the whole text, `Files:` its Files section, `Expected outcomes:` its Expected outcomes section, and `Decisions:` its Decisions section, verbatim.

```markdown
# Harness requirement: guard-write.sh denies a write to the local settings file

## Files

- Edited: `.claude/hooks/guard-write.sh`.
- Left alone: `.claude/settings.json` (its `PreToolUse` entry with matcher `Write|Edit|MultiEdit|NotebookEdit` already runs the hook), `.claude/hooks/guard-bash.sh` (its deny on a command naming the file stays).

## Changes

- The first `case "$rel"` block gains an arm for `.claude/settings.local.json` that calls `deny` with: `.claude/settings.local.json holds the owner's local settings and TYPESAFE_API_KEY. Hand the change to the owner.`
- The header comment on line 2 names the owner's local settings among the denied paths.

## Expected outcomes

- `bash -n .claude/hooks/guard-write.sh` exit 0, and `test -x .claude/hooks/guard-write.sh` exit 0.
- `echo '{"tool_input":{"file_path":".claude/settings.local.json"}}' | bash .claude/hooks/guard-write.sh` prints one JSON line holding `"permissionDecision":"deny"`, exit 0.
- `echo '{"tool_input":{"file_path":".claude/settings.json"}}' | bash .claude/hooks/guard-write.sh` prints nothing, exit 0.
- `jq . .claude/settings.json .claude/hooks/*.json` exit 0.
- No all-caps emphasis; no retired skill named; no other file changed.

## Decisions

- Deny, with no ask.
- The deny reason names the owner as the one who edits the file.
```

A requirement settled through `diagnose` takes the same shape, its Changes the findings the owner kept.
