---
type: llm
weight: 1
---

PASS if the response treats the request as a pinned repair: it names the session domain
file and the `<` to `<=` change, states that a failing spec under `test/` is written and
watched fail before the implementation, names `pnpm typecheck` and a scoped
`pnpm test session` (not the full suite) as the checks, proposes one conventional commit
subject of the form `<type>(<scope>): <description>`, and does not commit.

FAIL if the response starts a brainstorm, a spec, or a plan for a change that is already
pinned; skips the failing spec; runs or claims the full suite as its check; commits or
stages; or asks the owner a question the prompt already answered.
