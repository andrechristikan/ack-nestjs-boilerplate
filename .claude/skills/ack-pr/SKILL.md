---
name: ack-pr
description: >-
  Runs a GitHub pull request end to end: writes the description or the version notes
  through writer, creates the PR, comments, replies to reviews. Every gh pr write runs in
  the session with the owner's go-ahead; merge is never done. Use when the owner asks for
  a PR, its description, a PR comment or review reply, or release notes. Not for a commit
  message, docs/*.md (ack-doc), or src/ (ack-code).
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: "description | create | comment | version [base branch, PR number, or tag]"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-pr

Four modes: `description` writes `generated/docs/pr-<slug>.md`; `create` writes it and
opens the PR; `comment` writes a PR comment or a review reply; `version` writes
`generated/docs/version-<slug>.md`. `writer` produces the text; the `gh pr` commands run in
the session after the fork returns (`references/gh.md`). This skill fetches from `origin`
and moves a local compare ref; every other skill keeps git read-only, so run it once the
branch or release set is settled and run nothing after it.

## 1. Mode and inputs

The argument carries the mode. Missing pieces (the base branch, the PR number, the tag or
range, the comment thread) are handed back as questions; do not guess. A commit message is
not a mode: propose the subject in the session.

## 2. Resolve the compare refs

Follow `references/refs.md`: fetch, point a local `ack-pr/*` ref at the fetched tip, count
the commits ahead. Zero means nothing to describe; say so and stop. The dispatch names the
local ref, never `origin/*` alone. `description` and `create` diff with no second ref so
uncommitted and staged work is included; `version` diffs the resolved range.

## 3. Dispatch `writer`

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
  a version identity may appear. Run avoid-ai-writing in edit mode on the document.
Rules to read: .claude/rules/authoring.md
Report: the file path, and every open question the diff could not settle (hand-back only,
  not a document section).
```

Add the working-tree line and the no-questions line from
`../ack-code/references/dispatch.md`.

## 4. GitHub, in the session

`create`, `comment`, and an edit to an existing PR run in the session with the exact
command shown to the owner first (`references/gh.md`). Merge is not part of any mode:
`gh pr merge` stays under `ask` and is not proposed by this skill.

## Hand back

The mode, the local compare refs, the document path, the `gh` commands run with their
output (URL, comment id), and every open question `writer` could not settle from the diff.

## Next

Nothing chains after this skill.
