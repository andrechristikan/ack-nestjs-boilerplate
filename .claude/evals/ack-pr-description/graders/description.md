---
type: llm
weight: 1
---

PASS if the response runs mode `description`: it resolves a local compare ref for `main`
(a fetch and a local `ack-pr/base-main` ref, diffed with no second ref), names the output
path `generated/docs/pr-<slug>.md`, states that the document fills
`.github/pull_request_template.md` with its headings and checkbox labels, keeps the branch
name, the base branch, and every local ref out of the document body, does not run
`gh pr create` or `gh pr merge`, and lists the open questions the diff could not settle
outside the document.

FAIL if the response opens or merges a PR, diffs against `origin/main` or a `..HEAD` range
that drops uncommitted work, writes branch-compare framing or a `.claude/` path into the
description, or produces prose that ignores the PR template.
