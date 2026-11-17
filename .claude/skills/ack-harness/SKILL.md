---
name: ack-harness
description: >-
    Changes the AI configuration from a requirement settled with the owner: .claude/**, AGENTS.md, .github/copilot-instructions.md, the decision entries in .claude/decisions/, and docs/ai-harness.md, final state only. Use when the owner wants to change how Claude or Copilot works in this repository, to record a decision, or with diagnose to turn a session transcript into that change. Not for src/ or test/ (ack-design, ack-spec) or other docs (ack-doc).
blurb: '.claude, AGENTS.md, copilot digest, decision entries'
disable-model-invocation: true
argument-hint: '<the change: files, what changes, expected outcome> | <a .scratch/ plan or requirement path> | diagnose [session id | last]'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-harness

Requirement: $ARGUMENTS

The session settles the requirement with the owner, writes the files itself, and verifies them. No agent runs while the session writes: an agent would read the tree the run is rewriting. Final state only: `.claude/rules/authoring.md`.

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

- Verify every path, class, script, and flag against the checkout before writing it: `package.json`, `vitest.config.ts`, `docker-compose.yml`, `.husky/`, `.commitlintrc`, `eslint.config.mjs`, `knip.json`, the source file itself.
- A skill, an agent, or a rule: follow `.claude/skills/writing-for-agents/SKILL.md`. Where it and `.claude/rules/authoring.md` or `.claude/rules/harness.md` differ, the rule wins.
- A decision: `.claude/skills/ack-harness/references/decision-record.md`.
- A change to the flow, a skill, an agent, or the copied-skill set updates `docs/ai-harness.md` in the same run.
- A `src/` defect found on the way is one row in `generated/report-src-sweep.md`, not a fix.

The copied skills (the folders `skills-lock.json` names) are never edited. Adapt one in the `ack-*` skill or the agent that follows it. Update them with `pnpm skills:update`, then re-read each `ack-*` departure against the new text.

## 3. Verify

```bash
bash .claude/hooks/check.sh
```

- Every line it prints is a defect: fix it and run it again.
- When a skill, an agent, or a rule body changed, dispatch `reviewer` with `Depth: harness` and the changed paths. Confirm or reject each finding by opening the file.
- A path permission in `.claude/settings.json` takes the `Edit(path)` form only: `Edit` rules cover every file-editing tool, and a `Write(path)` rule never matches.

## Boundaries

- No `src/`, `test/`, `prisma/`, no `docs/` beyond `docs/ai-harness.md`, no `.github/**` beyond the Copilot digest.
- No database or seed command.
- Commits go through `ask`.

## Hand back

- The settled requirement; for `diagnose`, the transcript read and each finding kept or dropped.
- Each file written or deleted, with `wc -w` and what it now says.
- The `check.sh` output and the reviewer's findings with their state.
- Every `src/` finding recorded rather than fixed.

## Next

After a plan's `## Harness changes`, `/ack-build <the plan path>`: builds every ticket test-first. `/ack-review <the plan path>` when a review added the line: reviews the build and settles the findings. `/ack-debug` with the symptom for a recorded `src/` finding: finds the root cause and fixes it.
