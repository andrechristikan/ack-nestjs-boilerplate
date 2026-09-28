---
name: ack-pr
description: >-
  Runs a GitHub pull request end to end: writes the description or the version notes
  through writer, creates the PR, comments, replies to reviews. Every gh pr write runs in
  the session with the owner's go-ahead; merge is never done. Use when the owner asks for
  a PR, its description, a PR comment or review reply, or release notes. Not for a commit
  message, docs/*.md (ack-doc), or src/ (ack-plan, ack-build).
disable-model-invocation: true
argument-hint: "description | create | comment | version [base branch, PR number, or tag]"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-pr

Four modes: `description` writes `generated/docs/pr-<slug>.md`; `create` writes it and
opens the PR; `comment` writes a PR comment or a review reply; `version` writes
`generated/docs/version-<slug>.md`. `writer` produces the text; the `gh pr` commands run in
the session with the owner's go-ahead (`references/gh.md`). This skill fetches from `origin`
and moves a local compare ref; every other skill keeps git read-only, so run it once the
branch or release set is settled and run nothing after it.

## 1. Mode and inputs

The argument carries the mode. Ask for a missing piece (the base branch, the PR number,
the tag or range, the comment thread) with `AskUserQuestion`, since this skill runs in the
session; do not guess. A commit message is
not a mode: propose the subject in the session.

## 2. Finish the branch (`create` only)

Invoke `superpowers:finishing-a-development-branch`: it supplies the full-suite run
(`pnpm test`) and the owner's integration choice. A red suite stops the mode with the
failing line. When the choice is the pull request, its own push-and-create step is not
taken: the push and `gh pr create` run in step 6 with `writer`'s text. `merge` stays under
`ask` and is not run by this skill.

## 3. Resolve the compare refs

Follow `references/refs.md`: fetch, point a local `ack-pr/*` ref at the fetched tip, count
the commits ahead. Zero means nothing to describe; say so and stop. The dispatch names the
local ref, never `origin/*` alone. `description` and `create` diff with no second ref so
uncommitted and staged work is included; `version` diffs the resolved range.

## 4. Dispatch `writer`

```
Agent: writer
Mode: description | create | comment | version
Compare: <local ref, or from..to range>
Title: <branch name, PR number and thread, or version label>
Output: generated/docs/pr-<slug>.md | generated/docs/version-<slug>.md |
  generated/docs/pr-comment-<slug>.md
Shape: description and create fill .github/pull_request_template.md, same headings and
  checkbox labels, paste-ready; version is lean release notes; comment answers the thread
  in the same voice.
Acceptance: every claim traced to the diff; public voice; no branch-compare framing, no
  local ref, no working-artifact path, no .claude/ mention (.claude/rules/authoring.md);
  a version identity may appear. Run humanizer in file mode on the document.
Rules to read: .claude/rules/authoring.md
Report: the file path, and every open question the diff could not settle (hand-back only,
  not a document section).
```

Add the working-tree line and the no-questions line from
`../ack-build/references/dispatch.md`.

## 5. Review the text, through `reviewer`

Dispatch `reviewer` at `Depth: docs` over the document (`../ack-build/references/dispatch.md`,
Reviewer), with the requirement "every claim traces to the diff at `Compare`". Every
finding passes `superpowers:receiving-code-review`: open the diff and confirm or reject it
with a reason. A confirmed finding goes back to `writer` in one repair dispatch, then one
scoped re-review.

## 6. GitHub, in the session

`create`, `comment`, and an edit to an existing PR run in the session: the exact command
is shown to the owner and runs on their word (`references/gh.md`). Merge is not part of
any mode: `gh pr merge` stays under `ask` and is not proposed by this skill.

## Verify

Invoke `superpowers:verification-before-completion`. Before the command runs, read the
document once against the diff; a claim the diff does not support goes back to `writer`
in one repair dispatch. The hand-back quotes the `gh` output, not a claim.

## Hand back

The mode, the local compare refs, the document path, the text review's findings and each
one's state (fixed, rejected with the reason, open), the `gh` commands run with their
output (URL, comment id), and every open question `writer` could not settle from the diff.

## Next

Nothing chains after this skill.
