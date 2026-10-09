---
name: ack-build
description: >-
    Builds src/ from an approved plan or a pin through coder, test-first where src/ behaviour changes, seeds and the run surface included, with one final review through reviewer. Use with a plan path from /ack-plan or a pin (files, cause at file:line, change). Not for an open question, a new shape, or a symptom without a cause (ack-plan), judging only (ack-review), specs over code that exists (ack-spec), docs (ack-doc), or the harness (ack-harness).
disable-model-invocation: true
model: opus
effort: medium
context: fork
argument-hint: '<.superpowers/<date>-<slug>-plan.md | pin: files <paths>; cause <file:line>; change <one sentence>>'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-build

You orchestrate in a fork; agents do the work. `coder` writes `src/`, `test/`, and the run surface a task lists (`.github/workflows/` and `.github/dependabot.yml` included); you write no code. A fork cannot ask the owner: every question is a hand-back. The project is a boilerplate with no external client: build the correct shape and change every call site (`references/dispatch.md`, Every dispatch). Code is written against the rules on disk; a rule that has to change first is a hand-back naming `/ack-harness`. If a `superpowers:*` skill is not installed, stop and say `claude plugin install superpowers@claude-plugins-official`. Pass `run_in_background: false` on every Agent call; parallel work is several calls in one message (`references/dispatch.md`, Foreground dispatch).

## 1. Input

- A plan path: read the plan whole. Its header carries `**Review depth:** rules and boot | end to end`, set by `/ack-plan`. A header without it means `rules and boot`.
- A pin: files, the cause at `file:line`, and the change. Missing any of the three, stop and hand back. A pin's review depth is `rules and boot`.
- Nothing open is decided here. An open product question, a shape with two readings, or a cause not in hand is a hand-back naming `/ack-plan`.
- The progress ledger is `.superpowers/sdd/<plan-basename>/progress.md`, in the per-plan workspace `superpowers:subagent-driven-development` keeps (its `scripts/sdd-workspace` prints the path). Read it before the first dispatch and resume where its lines end. A `progress.md` directly under `.superpowers/sdd/` belongs to another plan; leave it alone.

## 2. Build, through `coder`

Follow `superpowers:subagent-driven-development` with the project's agents: one fresh `coder` per plan task, in order, one at a time, its brief under `.superpowers/sdd/`. Its review steps are not taken; the one review is step 3. Dispatch template: `references/dispatch.md`, Coder. `coder` runs on the model in its own frontmatter; its Agent call carries no `model`. A pin is one dispatch carrying the pin instead of a plan path, its `Rules to read:` the output of `bash .claude/hooks/rules.sh` over the pin's files.

- When the task changes `src/` behaviour, `coder` writes the failing unit spec under `test/unit/`, watches it fail, and implements. Specs, test helpers, setup or global-setup files, and test config the task's Files list names are written as listed.
- `coder` then runs `pnpm typecheck` and `pnpm test <module>`, or the task's own acceptance commands when the plan names them, and repairs the run surface the change made stale.
- A schema delta is `coder`'s edit and the owner's push: `coder` runs `pnpm db:generate`; relay the model, the field, the index, and the owner's `pnpm db:migrate`.
- Read each report; one quoting every acceptance line green completes the task, and the next starts.
- A rule wins over a plan step: `coder` builds the rule's way and names the deviation; record it on the task's `implemented` ledger line, not as `blocked`.
- A `NEEDS_CONTEXT` or `BLOCKED` report, or an acceptance line not quoted green, stops the build with the question; do not fix it here.

## 3. Final review, through `reviewer`

After the last task is complete, dispatch one `reviewer` at the review depth from step 1 over the whole scope: every file the ledger's `implemented` lines name (`references/dispatch.md`, Reviewer). The requirement is the plan header's `**Requirement:**` line, or the pin. The review checks concurrency: `.claude/rules/concurrency.md`.

Every finding passes `superpowers:receiving-code-review` here, in this orchestration:

- Open the file; confirm or reject the claim with a reason. Severity is the reviewer's label.
- Confirmed findings go to `coder` in one fix dispatch, then one scoped re-review of the fixed findings only.
- After the re-review, a Critical or Important finding still open stops the build and hands back to the owner. A Minor one still open is parked with a ruling.

## 4. Ledger lines

Append to the progress ledger as each agent returns, before the next dispatch:

- `coder` reports `DONE` or `DONE_WITH_CONCERNS`: `Task <N>: implemented (<status>; files <paths>; <decisive test line>[; deviation <rule> over <plan step>])`.
- `coder` reports `NEEDS_CONTEXT` or `BLOCKED`, or an acceptance line is not green: `Task <N>: blocked (<status>: <question>)`.
- Every acceptance line quoted green: `Task <N>: complete`.
- Each `reviewer` round, every finding judged: `Final review: <depth> clean` or `Final review: <depth> (<finding> at <file:line>: <state>; ...)`, the state confirmed, rejected with the reason, fixed, open, or `parked, <ruling>` (Minor only).
- The fix `coder`: `Final review: fix (<findings fixed>; <decisive test line>)`.
- Loop end: `Final review: stopped (<finding> at <file:line>: open)` when a Critical or Important finding is open, otherwise `Final review: complete (<K> fixed, <J> rejected, <P> parked)`.

On a re-run, skip every task with a `Task <N>: complete` line. A task whose last line is `blocked` resumes at the `coder` dispatch with the owner's answer; one whose last line is `implemented` resumes at reading the report. With every task complete, resume after the last `Final review:` line, at the fix step with the owner's answer when that line is `Final review: stopped`.

## 5. Verify

Invoke `superpowers:verification-before-completion`. The evidence for `pnpm typecheck`, `pnpm lint`, `pnpm deadcode`, and `pnpm spell` is the output the final `reviewer` quoted; read it. Then run and read:

```bash
pnpm test <module>
```

`<module>` is a path filter naming each module the work changed; a module only read is out of scope. When a plan task names its own acceptance commands (the unit parity counts), run and read each of those too; integration and e2e are held (`.claude/rules/testing.md`), so a task naming them is a hand-back. How to read `deadcode`, `spell`, and a scoped `test:cov`: `.claude/CLAUDE.md` Gotchas. A coverage gap beyond the TDD specs is named with file and lines for the hand-back.

## 6. Finish

Propose the commit subject (`<type>(<scope>): <description>`, `.commitlintrc`) and stop. `superpowers:finishing-a-development-branch` belongs to `/ack-pr create`.

## Boundaries

- No code written here; `coder` writes, `reviewer` judges.
- No `.claude/**` edit, no DB or seed command, git read-only.
- Commits, staging, and pushes go through `ask`; propose the subject only.

## Hand back

- The input: the plan path or the pin.
- Per task: what `coder` produced and the decisive test line; a `blocked` line with the question the owner answers.
- The final review at its depth: each finding and its state (fixed, rejected with the reason, parked with the ruling, open); a `stopped` line with the question the owner answers.
- Every run-surface file checked and whether it changed; every status code allocated; the schema delta as model, field, index, and the owner's `pnpm db:migrate`.
- The four checks as the final `reviewer` quoted them; the output of `pnpm test <module>` and of every task acceptance command run.
- The proposed commit subject.
- One line per thing noticed outside the scope.

## Next

`/ack-doc` for the docs the change touches. `/ack-pr create` once the branch is settled. `/ack-spec` for a coverage gap beyond the TDD specs. `/ack-review <scope>` to judge the checkout again. `/ack-plan` for anything handed back as open.
