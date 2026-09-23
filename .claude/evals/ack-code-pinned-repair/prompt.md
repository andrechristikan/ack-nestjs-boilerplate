---
name: ack-code-pinned-repair
tags: [ack-code, pinned]
runs: 1
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

The session token check is off by one. In `src/modules/session/domains/session.domain.ts`
the expiry comparison uses `<` where it has to be `<=`, so a token that expires exactly
now is still accepted. Files, cause, and change are known; no open question. Repair it
test-first and tell me which spec you wrote, which checks you ran, and the commit subject
you propose. Do not commit.
