---
name: ack-harness-rule-change
tags: [ack-harness, rule]
runs: 1
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Add one line to `.claude/rules/http.md`: a `system` scope controller carries
`@ApiKeyProtected()` and no `@RequestThrottle`. Files: that rule and, if it summarises the
decorator stack, `.github/copilot-instructions.md`. Nothing else changes. Tell me what each
file says afterwards and the verification you ran.
