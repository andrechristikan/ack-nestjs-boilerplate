---
name: ack-review
description: >-
    Reviews a built feature once: one reviewer checks the spec, every rule binding the changed files, and each flow beside its sibling, and writes review.md; the session settles each finding with the owner, then coder applies the kept fixes as written. Use with a plan path under .scratch/ whose tickets are all done. Not for a plan's cold read (ack-plan), a bug whose cause is unknown (ack-debug), or the harness files (ack-harness).
blurb: 'review against spec, rules, and flow; findings settled and fixed'
disable-model-invocation: true
argument-hint: '<a .scratch/ plan path>'
---

!`git status --short`

# ack-review

Input: $ARGUMENTS

Every feature takes this review, once. `reviewer` judges and decides, the owner keeps or drops each finding, `coder` executes. The session assigns, asks, and checks; it writes the owner's answers and `## Fixes` into `review.md` and nothing under `src/` or `test/`.

## Start

- A ticket not `done`: stop and name `/ack-build`.
- A `- [ ]` line under the plan's `## Harness changes`: stop and name `/ack-harness <the plan path>`.
- A `review.md` beside the plan: continue from its first finding without an `**Owner:**` line, or its first fix not `done`.

## 1. Review

Dispatch `reviewer` on every feature:

```
Agent: reviewer
Depth: review
Spec: <the spec path>
Plan: <the plan path>
Changed paths: <git diff --name-only HEAD plus git ls-files --others --exclude-standard>
Rules to read: <the output of bash .claude/hooks/rules.sh over the changed paths, pasted>
Decisions to honour: <the plan's line>
Output: .scratch/<feature>/review.md
```

Read `review.md` against `references/review-file.md`. A rule file from `Rules to read` with no coverage row, a changed endpoint or job with no flow row, or a finding that leaves `coder` a choice goes back in one dispatch naming what is missing.

## 2. Settle

A short form of `/ack-design` and `/ack-plan` over `review.md`.

1. Put each finding to the owner with `AskUserQuestion`, one finding per question, in number order: the point in plain words, the code now and the code after, then the options keep, drop, or change, each explained.
2. Write the answer into the finding in the shape `references/review-file.md`, What the session adds, gives. A changed finding is rewritten so its exact change matches the answer.
3. Write `## Fixes` in `review.md`, one row per kept finding, in that shape.

| The finding | Route |
| --- | --- |
| the code departs from the spec or a rule | `coder`, one dispatch with the finding as its pin |
| the spec or the plan is wrong | stop; name `/ack-design` |
| a rule is missing or wrong | a `- [ ]` line under the plan's `## Harness changes`; name `/ack-harness <the plan path>`, then this skill resumes |
| a `src/` defect outside the feature | one row in `generated/report-src-sweep.md` (`.claude/skills/ack-spec/references/sweep-log.md`) |

4. `Coder` is the effort of a `coder` row: run `bash .claude/hooks/jev.sh level` on the finding as `/ack-plan`, Level per ticket, gives, its table included.
5. Ask the owner to approve `## Fixes` with `AskUserQuestion`. No dispatch runs before the yes.

## 3. Fix

One `coder` row at a time, in number order:

```
Agent: coder
Pin: <the finding's files, cause at file:line, and exact change, copied from review.md>
First failing spec: <the finding's line>
Decisions to honour: <the plan's line>
```

- `DONE` with the spec quoted failing, then passing: set the row's `Status` to `done`.
- `BLOCKED`: the pin cannot be executed as written. Take it to the owner with the finding; the session does not redesign the fix.

## 4. Re-review

1. Run the gates of `/ack-build`, Prove, steps 1, 2, and 4, over the modules the fixes touched. A changed file's coverage row under 100 goes back to `coder` once, as that finding's pin.
2. Dispatch one new `reviewer` with `Depth: review`, the same lines as step 1, and `Fixed: <the finding numbers>`. It appends `## Re-review` to `review.md`.
3. A finding still open goes to the owner with `AskUserQuestion`. One fix round, one re-review.

## Hand back

- The `review.md` path and its coverage table: rule files, decision entries, and flows read.
- Each finding: the owner's answer, its route, its state.
- Each owner answer that rejected a named alternative, as a decision candidate (the choice, the rejected option, the owner's reason): name `/ack-harness`.
- The gate output after the fixes.
- The `docs/` pages the change makes stale, as a list for `/ack-doc`.

## Next

`/ack-doc .scratch/<feature>/plan.md`: brings the docs in line with the code. Then the owner commits, then `/ack-pr`: writes the pull request text and opens it on the owner's word.
