---
name: ack-pr
description: >-
    Runs a GitHub pull request end to end: the description or the version notes through writer, the PR, a comment, a review reply, each gh write on the owner's go-ahead. Use when the owner asks for a PR, its description, a PR comment or review reply, or release notes. Not for a commit message, docs/*.md (ack-doc), or src/ (ack-plan, ack-build).
disable-model-invocation: true
argument-hint: 'description | create | comment | version [base branch, PR number, or tag]'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-pr

You orchestrate one `writer` dispatch and the `gh pr` commands. Four modes: `description` writes `generated/docs/pr-<slug>.md`; `create` writes it and opens the PR; `comment` writes a PR comment or a review reply; `version` writes `generated/docs/version-<slug>.md`. This skill runs in the session: the `gh pr` commands run with the owner's go-ahead (`references/gh.md`). It fetches from `origin` and moves a local compare ref; every other skill keeps git read-only, so run it once the branch or release set is settled and run nothing after it. The project is a boilerplate with no external client: the text describes the shape on disk, with no compat or migration note (`../ack-build/references/dispatch.md`, Every dispatch). If a `superpowers:*` skill is not installed, stop and say `claude plugin install superpowers@claude-plugins-official`. Pass `run_in_background: false` on every Agent call (`../ack-build/references/dispatch.md`, Foreground dispatch).

## 1. Mode and inputs

The argument carries the mode. Ask for a missing piece (the base branch, the PR number, the tag or range, the comment thread) with `AskUserQuestion`; do not guess. A commit message is not a mode: propose the subject in the session.

## 2. Finish the branch (`create` only)

Invoke `superpowers:finishing-a-development-branch` for its full-suite run (`pnpm test`). A red suite stops the mode with the failing line. Of its options, only the pull request is offered; merge locally and discard are not taken. Its own push-and-create step is not taken either: the push and `gh pr create` run in step 6 with `writer`'s text. `merge` stays under `ask` and is not run by this skill.

## 3. Resolve the compare refs

Follow `references/refs.md`: fetch, point a local `ack-pr/*` ref at the fetched tip, count the commits ahead, and read the diff. When the stop condition there holds, there is nothing to describe; say so and stop. The dispatch names the local ref, never `origin/*` alone. `description` and `create` diff with no second ref so uncommitted and staged work is included; `version` diffs the resolved range.

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
  a version identity may appear. Indicative for a fact or an obligation, imperative for a
  procedure step; one idea per paragraph; an entry with several separate facts is a list,
  one fact per item, numbered when order matters. Run humanizer in file mode on the document.
Rules to read: <the output of bash .claude/hooks/rules.sh over the Output path and
  .github/pull_request_template.md, pasted>
Report: the file path, and every open question the diff could not settle (hand-back only,
  not a document section).
```

Add the Every dispatch block from `../ack-build/references/dispatch.md`.

## 5. Read the document against the diff

Before any `gh` command, read the document once against the diff at `Compare`. A claim the diff does not support goes back to `writer` in one repair dispatch (step 4 template).

## 6. GitHub, in the session

`create`, `comment`, and an edit to an existing PR run in the session: the exact command is shown to the owner and runs on their word (`references/gh.md`). `description` on a branch with an open PR ends with `gh pr edit` (`references/gh.md`, Update an existing description); with none, it ends at the document. Merge is not part of any mode: `gh pr merge` stays under `ask` and is not proposed by this skill.

## 7. Verify

Invoke `superpowers:verification-before-completion`. The hand-back quotes the `gh` output, not a claim.

## Boundaries

- The session writes no file; `writer` writes the document under `generated/docs/`.
- No merge, no `gh` write without the owner's word, no review verdict on the owner's behalf.
- Git runs the fetch and the local `ack-pr/*` refs of step 3 and the push of step 6, nothing else.

## Hand back

The mode, the local compare refs, the document path, each claim the read in step 5 sent back and how it now reads, the `gh` commands run with their output (URL, comment id), and every open question `writer` could not settle from the diff.

## Next

None: this skill runs last on a settled branch.
