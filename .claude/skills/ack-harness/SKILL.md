---
name: ack-harness
description: >-
    Changes the AI configuration from a requirement settled with the owner: .claude/**, AGENTS.md, .github/copilot-instructions.md, the decision entries in .claude/decisions/, and docs/*/ai-harness.md, final state only. Use when the owner wants to change how Claude or Copilot works in this repository, to record a decision, or with diagnose to turn a session transcript into that change. Not for src/ or test/ (ack-design, ack-spec) or other docs (ack-doc).
blurb: '.claude, AGENTS.md, copilot digest, decision entries'
disable-model-invocation: true
argument-hint: '<the change: files, what changes, expected outcome> | <a .scratch/ plan or requirement path> | diagnose [session id | last]'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-harness

Requirement: $ARGUMENTS

The session settles the requirement with the owner, dispatches `harness` to write the files, and verifies them. No other agent runs while `harness` writes: it would read the tree the run is rewriting. Final state only: `.claude/rules/authoring.md`.

## 1. Settle

- Ask with `AskUserQuestion` what changes, which files, what stays out, and the expected outcome, until nothing material is open. Do not re-ask what the owner named. The settled requirement takes the shape of `references/example-requirement.md`.
- A `.scratch/<feature>/plan.md`: the requirement is the `- [ ]` lines of its `## Harness changes`. Tick each one `- [x]` as step 3 passes for it.
- A requirement settled for a later run is written to `.scratch/requirements/harness-<slug>.md`; given that path, ask only what its `## Open` holds.
- Follow `.claude/skills/ponytail/SKILL.md` at level `ultra`: a line Claude would follow without being told, or could find by reading the code, is not added. Prefer deleting a line to adding one.
- A fact that has to hold every time is a hook or a `deny` entry, not a sentence.

With `diagnose`:

- Locate the transcript under `~/.claude/projects/<encoded project path>/`, the absolute repository path with `/` replaced by `-`. A session id names `<id>.jsonl`; `last` is the newest `.jsonl` other than the current session.
- Read it for: a skill step skipped, an agent working outside its dispatch, a ticket ignored, a question the code answers put to the owner, tokens spent on noise.
- Put the findings to the owner as candidate changes. The ones the owner keeps are the requirement.

## 2. Write

Dispatch `harness` in the foreground, and wait for its hand-back:

- `Requirement`: the settled text, or its `.scratch/` path.
- `Files`: each file edited, added, or deleted.
- `Left alone`: what stays out.
- `Expected outcomes`: the checks the settled requirement names.
- `Report`: `.claude/agents/harness.md`, Hand back.

A question it hands back goes to the owner with `AskUserQuestion`; dispatch again with the answer. A `src/` defect it reports is one row in `generated/report-src-sweep.md`, not a fix.

Copied skills: `.claude/rules/harness.md`, Copied skills.

## 3. Verify

```bash
bash .claude/hooks/check.sh
```

- Every line it prints is a defect.
- When a skill, an agent, or a rule body changed, dispatch `reader` with the changed paths. Confirm or reject each finding by opening the file.
- The `check.sh` lines and the confirmed findings go back to `harness` in one repair dispatch; run `check.sh` again after it.

## Boundaries

- No `src/`, `test/`, `prisma/`, no `docs/` beyond `docs/*/ai-harness.md`, no `.github/**` beyond the Copilot digest.
- No database or seed command.
- Commits go through `ask`.

## Hand back

- The settled requirement; for `diagnose`, the transcript read and each finding kept or dropped.
- Each file written or deleted, with `wc -w` and what it now says.
- The `check.sh` output and the reader's findings with their state.
- Every `src/` finding recorded rather than fixed.

## Next

After a plan's `## Harness changes`, `/ack-build <the plan path>`: builds every ticket test-first. `/ack-review <the plan path>` when a review added the line: settles the findings in `review.md` and fixes the kept ones. `/ack-quick` with the symptom for a recorded `src/` finding: finds the root cause, fixes it test-first, and reviews the fix.
