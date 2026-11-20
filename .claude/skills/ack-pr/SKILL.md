---
name: ack-pr
description: >-
    Runs a GitHub pull request end to end: the description or the version notes through writer, the PR, a comment, a review reply, each gh write on the owner's go-ahead. Use when the owner asks for a PR, its description, a PR comment or review reply, or release notes. Not for a commit message, docs/*.md (ack-doc), or src/ (ack-design).
blurb: 'PR description, create, comment, version notes'
disable-model-invocation: true
argument-hint: 'description | create | comment | version [base branch, PR number, or tag]'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-pr

Input: $ARGUMENTS

The session assigns one `writer` dispatch and runs the `gh pr` commands on the owner's word (`references/gh.md`). Four modes:

- `description` writes `.scratch/pr/pr-<slug>.md`.
- `create` writes it and opens the PR.
- `comment` writes a PR comment or a review reply.
- `version` writes `.scratch/pr/version-<slug>.md`.

Run it once the branch or release set is settled, and run nothing after it.

## 1. Mode and inputs

The argument carries the mode. Ask for a missing piece (the base branch, the PR number, the tag or range, the comment thread) with `AskUserQuestion`. A commit message is not a mode: propose the subject in the session.

## 2. Resolve the compare refs

Follow `references/refs.md`: fetch, point a local `ack-pr/*` ref at the fetched tip, count the commits ahead, and read the diff.

- When the stop condition there holds, there is nothing to describe: say so and stop.

## 3. Dispatch `writer`

```
Agent: writer
Mode: description | create | comment | version
Compare: <local ref, or from..to range>
Title: <branch name, PR number and thread, or version label>
Output: .scratch/pr/pr-<slug>.md | .scratch/pr/version-<slug>.md |
  .scratch/pr/pr-comment-<slug>.md
Shape: as .claude/agents/writer.md, PR and version text, gives
  (.claude/skills/ack-pr/references/example-pr-description.md).
Acceptance: every claim traced to the diff; public voice; no branch-compare framing, no
  local ref, no working-artifact path (.claude/rules/authoring.md); a version identity may
  appear.
Report: the file path, and every open question the diff could not settle (hand-back only,
  not a document section).
```

## 4. Read the document against the diff

Before any `gh` command, read the document once against the diff at `Compare`. A claim the diff does not support goes back to `writer` in one repair dispatch.

## 5. GitHub, in the session

- `create`, `comment`, and an edit to an existing PR: show the owner the exact command; it runs on their word (`references/gh.md`).
- `description` on a branch with an open PR ends with `gh pr edit` (`references/gh.md`, Update an existing description). With none, it ends at the document.
- Merge is not part of any mode: `gh pr merge` stays under `ask` and is not proposed here.

## Boundaries

- The session writes no file; `writer` writes the document under `.scratch/pr/`.
- No merge, no `gh` write without the owner's word, no review verdict on the owner's behalf.
- Git runs the fetch and the local `ack-pr/*` refs of step 2 and the push of step 5, nothing else.

## Hand back

- The mode, the local compare refs, and the document path.
- Each claim step 4 sent back and how it now reads.
- The `gh` commands run, with their output (URL, comment id).
- Every open question `writer` could not settle from the diff.

## Next

None: this skill runs last on a settled branch.
