---
name: ack-build
description: >-
  Builds src/ from an approved plan or a pin through coder and reviewer, one task at a
  time with a review after every task: test-first when a task changes src/ behaviour, the
  test files a plan task lists written as listed, seeds and the run surface included; then
  verifies and proposes the commit subject. Use with a plan path from /ack-plan or a pin
  (files, cause at file:line, change). Not for an open question or a new shape (ack-plan),
  a symptom without a cause (ack-plan), judging only (ack-review), specs over code that
  exists (ack-spec), docs (ack-doc), or the harness (ack-harness).
disable-model-invocation: true
model: opus
effort: medium
context: fork
argument-hint: "<.superpowers/<date>-<slug>-plan.md | pin: files <paths>; cause <file:line>; change <one sentence>>"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-build

You orchestrate; agents do the work. `coder` writes `src/`, `test/`, and the run surface a
task lists (`.github/workflows/` and `.github/dependabot.yml` included); you write no code.
You dispatch, read what comes back, and report. A change under `.claude/**` lands first
through `/ack-harness`, before any `src/` work; code is written against the rule as it
stands after that. If a `superpowers:*` skill is not installed, stop and say
`claude plugin install superpowers@claude-plugins-official`.

## Dispatch in the foreground

Pass `run_in_background: false` on every Agent call; parallel work is several calls in one
message (`references/dispatch.md`, Foreground dispatch).

## Input

- A plan path: read the plan whole. Its header carries `**Review depth:** rules and boot |
  end to end`, set by `/ack-plan`. A header without it means `rules and boot`.
- A pin: files, the cause at `file:line`, and the change. Missing any of the three, stop
  and hand back.
- Nothing open is decided here. An open product question, a shape with two readings, or a
  cause not in hand is a hand-back naming `/ack-plan`.
- The progress ledger is `.superpowers/sdd/<plan-basename>/progress.md`, in the per-plan
  workspace `superpowers:subagent-driven-development` keeps (its `scripts/sdd-workspace`
  prints the path). Read it before the first dispatch and resume where its lines end. A
  `progress.md` directly under `.superpowers/sdd/` belongs to another plan; leave it alone.

## Build, through `coder`

Follow `superpowers:subagent-driven-development` with the project's agents: one fresh `coder`
per plan task, in order, one at a time, its brief under `.superpowers/sdd/`. Dispatch template:
`references/dispatch.md`, Coder. `coder` runs on the model in its own frontmatter; its
Agent call carries no `model`. A pin is one dispatch carrying the pin instead of a plan path.

- When the task changes `src/` behaviour, `coder` writes the failing unit spec under
  `test/unit/`, watches it fail, and implements. Specs, test helpers, setup or
  global-setup files, and test config the task's Files list names are written as listed.
- `coder` then runs `pnpm typecheck` and `pnpm test <module>`, or the task's own acceptance
  commands when the plan names them, and repairs the run surface the change made stale.
- A schema delta is `coder`'s edit and the owner's push: `coder` runs `pnpm db:generate`;
  relay the model, the field, the index, the data consequence, and `pnpm db:migrate`.
- A `NEEDS_CONTEXT` or `BLOCKED` report stops the build (Ledger lines); do not fix it here.

## Review every task, through `reviewer`

After each task, dispatch `reviewer` at `Depth: task` with the task brief as the
requirement and the task's files as the scope (`references/dispatch.md`, Reviewer). After
the last task, dispatch one `reviewer` at the plan's review depth over the whole scope; its
findings run the same loop under the same stop and park rule. Every review checks
concurrency: `.claude/rules/code-style.md`, Concurrency and errors.

Every finding passes `superpowers:receiving-code-review` here, in this orchestration:

- Open the file; confirm or reject the claim with a reason. Severity is the reviewer's label.
- Confirmed findings go to `coder` in one fix dispatch, then one scoped re-review: one round.
- After the re-review, a Critical or Important finding still open stops the build: the task
  gets no `complete` line and the fork hands back to the owner. A Minor one still open is
  parked with a ruling; the task is complete and the next task starts.
- A task waits while its predecessor has a confirmed Critical or Important finding unfixed.

### Ledger lines

Append to the progress ledger as each agent returns, before the next dispatch:

- `coder` reports `DONE` or `DONE_WITH_CONCERNS`:
  `Task <N>: implemented (<status>; files <paths>; <decisive test line>)`.
- `coder` reports `NEEDS_CONTEXT` or `BLOCKED`: `Task <N>: blocked (<status>: <question>)`.
- Each `reviewer` round, every finding judged: `Task <N>: review <R> clean` or
  `Task <N>: review <R> (<finding> at <file:line>: <state>; ...)`, the state confirmed,
  rejected with the reason, fixed, open, or `parked, <ruling>` (Minor only).
- A fix `coder`: `Task <N>: fix (<findings fixed>; <decisive test line>)`.
- Loop end: `Task <N>: stopped (<finding> at <file:line>: open)` when a Critical or
  Important finding is open, otherwise `Task <N>: complete (<K> fixed, <J> rejected, <P> parked)`.
- The final review: `Final review: <depth> (<finding> at <file:line>: <state>; ...)` per
  round, `Final review: fix (<findings fixed>; <decisive test line>)`, then
  `Final review: stopped (<finding> at <file:line>: open)` or `Final review: complete`.

On a re-run, skip every task with a `Task <N>: complete` line. A task whose last line is
`blocked` resumes at the `coder` dispatch, one whose last line is `stopped` at its fix step,
each with the owner's answer; any other task resumes at the step after its last line. With
every task complete, resume after the last `Final review:` line, at the final fix step with
the owner's answer when that line is `Final review: stopped`.

## Verify

Invoke `superpowers:verification-before-completion`. The evidence for `pnpm typecheck`,
`pnpm lint`, `pnpm deadcode`, and `pnpm spell` is the output the final `reviewer` quoted;
read it. Then run and read:

```bash
pnpm test <module>
```

`<module>` is a path filter naming each module the work changed; a module only read is
out of scope. When a plan task names its own acceptance commands (`pnpm test:integration`,
`pnpm test:e2e`, the unit parity counts), run and read each of those too. How to read
`deadcode`, `spell`, and a scoped `test:cov`: `.claude/CLAUDE.md` Gotchas. A coverage gap
beyond the TDD specs is named with file and lines; closing it is `/ack-spec`.

## Finish

Propose the commit subject (`<type>(<scope>): <description>`, `.commitlintrc`) and stop.
Commits, staging, and pushes go through `ask`. `superpowers:finishing-a-development-branch`
runs in the session from `/ack-pr create`, not here.

## Hand back

- The input: the plan path or the pin.
- Per task: what `coder` produced and the decisive test line; the task review's findings
  and each one's state (fixed, rejected with the reason, parked with the ruling, open); a
  `blocked` or `stopped` line with the question the owner answers.
- The final review at the plan's depth; every run-surface file checked and whether it
  changed; every status code allocated; the schema delta and the owner's push command.
- The four checks as the final `reviewer` quoted them; the output of `pnpm test <module>` and
  of every task acceptance command run.
- The proposed commit subject.
- One line per thing noticed outside the scope.

## Next

`/ack-doc` for the docs the change touches. `/ack-pr create` once the branch is settled.
`/ack-spec` for a coverage gap beyond the TDD specs. `/ack-review <scope>` to judge the
checkout again. `/ack-plan` for anything handed back as open.
