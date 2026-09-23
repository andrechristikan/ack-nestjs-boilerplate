---
type: llm
weight: 1
---

PASS if the response dispatches the change to the `harness` agent rather than editing the
rule in the session, keeps the scope to `.claude/rules/http.md` and, only when it
summarises the stack, `.github/copilot-instructions.md`, states the added line as a
present-tense fact with no history or rationale-for-the-change, reports what each file
says afterwards, and quotes verification: the all-caps emphasis grep empty, the rule
within its line budget, and the frontmatter shape intact.

FAIL if the response edits `src/`, `test/`, or `docs/`, writes "previously" or a change
note into the rule, touches a file the prompt did not name, commits, or reports no
verification.
