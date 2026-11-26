---
name: ack-review
description: >-
    Settles a built feature's review once: from the review.md the build's reviewer wrote, the session settles each finding with the owner, coder applies the kept fixes as written, and one reviewer runs and reads the fixes again. Use with a plan path under .scratch/ whose tickets are all done. Not for a plan's cold read (ack-plan), a bug whose cause is unknown (ack-quick), or the harness files (ack-harness).
blurb: 'review against spec, rules, and flow; findings settled and fixed'
disable-model-invocation: true
argument-hint: '<a .scratch/ plan path>'
---

!`git status --short`

# ack-review

Input: $ARGUMENTS

Every feature takes this review, once. `reviewer` judges and decides, the owner keeps or drops each finding, `coder` executes. The session assigns, asks, and reads hand-backs; it writes the owner's answers and `## Fixes` into `review.md` and nothing under `src/` or `test/`.

## Start

- A ticket not `done`: stop and name `/ack-build`.
- A `- [ ]` line under the plan's `## Harness changes`: stop and name `/ack-harness <the plan path>`.
- Read `.scratch/<feature>/review.md`. A finding with an `**Owner:**` line: continue from its first finding without one, or its first fix not `done`.

## 1. Review

`review.md` absent (a feature built outside `/ack-build`): dispatch `reviewer` with the lines `.claude/skills/ack-build/SKILL.md`, Review, gives.

Read `review.md` against `references/review-file.md`. A rule file `bash .claude/hooks/rules.sh <the changed paths>` prints with no coverage row, a changed endpoint or job with no flow row, or a finding that leaves `coder` a choice goes back in one dispatch naming what is missing.

A red result still open in `review.md` takes `.claude/skills/ack-build/SKILL.md`, Review, steps 1 and 2, before Settle.

## 2. Settle

A short form of `/ack-design` and `/ack-plan` over `review.md`.

1. Put each finding to the owner with `AskUserQuestion`, one finding per question, in number order: the point in plain words, the code now and the code after, then the options keep, drop, or change, each explained, the recommended one first.
2. Write the answer into the finding in the shape `references/review-file.md`, What the session adds, gives. A changed finding is rewritten so its exact change matches the answer.
3. Write `## Fixes` in `review.md`, one row per kept finding, in that shape.

| The finding | Route |
| --- | --- |
| the code departs from the spec or a rule, or a `src/` defect outside the feature that a pin fixes | `coder`, one dispatch with the finding as its pin |
| the spec or the plan is wrong | stop; name `/ack-design` |
| a rule is missing or wrong | a `- [ ]` line under the plan's `## Harness changes`; name `/ack-harness <the plan path>`, then this skill resumes |
| a `src/` defect outside the feature that needs a design, an owner-only command, or held work, and that no plan or spec covers | one row in `generated/report-src-sweep.md` (`.claude/skills/ack-spec/references/sweep-log.md`) |

4. Ask the owner to approve `## Fixes` with `AskUserQuestion`. No dispatch runs before the yes.

## 3. Fix

One `coder` row at a time, in number order:

```
Agent: coder
Pin: <the finding's files, cause at file:line, and exact change, copied from review.md>
First failing spec: <the finding's line>
Decisions to honor: <the plan's line>
```

- `DONE` with the spec quoted failing, then passing: set the row's `Status` to `done`.
- `BLOCKED`: the pin cannot be executed as written. Take it to the owner with the finding; the session does not redesign the fix.

## 4. Re-review

1. Dispatch one new `reviewer` with the lines `.claude/skills/ack-build/SKILL.md`, Review, gives and `Fixed: <the finding numbers>`. It appends a `## Re-review` section to `review.md`.
2. A red result takes `.claude/skills/ack-build/SKILL.md`, Review, steps 1 and 2.
3. A finding still open or a result still red goes to the owner with `AskUserQuestion`.

## Hand back

- The `review.md` path and its coverage table: rule files, decision entries, and flows read.
- Each finding: the owner's answer, its route, its state.
- Each owner answer that rejected a named alternative, as a decision candidate (the choice, the rejected option, the owner's reason): name `/ack-harness`.
- The `## Re-review` results after the fixes.

## Next

`/ack-doc .scratch/<feature>/plan.md`: brings the docs in line with the code. Then the owner commits, then `/ack-pr`: writes the pull request text and opens it on the owner's word.
