---
name: ack-build
description: >-
  Builds src/ from an approved plan or a pin through coder and reviewer, test-first, one
  task at a time with a review after every task, seeds and the run surface included, then
  verifies and proposes the commit subject. Use with a plan path from /ack-plan or a pin
  (files, cause at file:line, change). Not for an open question or a new shape (ack-plan),
  a symptom without a cause (ack-debug), judging only (ack-review), specs over code that
  exists (ack-spec), docs (ack-doc), or the harness (ack-harness).
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: "<.superpowers/<date>-<slug>-plan.md | pin: files <paths>; cause <file:line>; change <one sentence>>"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-build

You orchestrate; agents do the work. `coder` writes `src/` and `test/`; you write no code.
You dispatch, read what comes back, and report. A change under `.claude/**` lands first
through `/ack-harness`, before any `src/` work; code is written against the rule as it
stands after that. If a `superpowers:*` skill is not installed, stop and say
`claude plugin install superpowers@claude-plugins-official`.

## Input

- A plan path: read the plan whole. Its header carries `Review depth: rules and boot | end
  to end` and `Docs: yes | no`, set by `/ack-plan`. A header without them means
  `rules and boot` and `no`.
- A pin: files, the cause at `file:line`, and the change. Missing any of the three, stop
  and hand back.
- Nothing open is decided here. An open product question, a shape with two readings, or a
  cause not in hand is a hand-back naming `/ack-plan` or `/ack-debug`.
- The progress ledger is `.superpowers/sdd/<plan-basename>/progress.md`, in the per-plan
  workspace `superpowers:subagent-driven-development` keeps (its `scripts/sdd-workspace`
  prints the path). It lists the tasks a previous run finished; skip those on a re-run. A
  `progress.md` directly under `.superpowers/sdd/` belongs to another plan; leave it alone.

## Build, through `coder`

Follow `superpowers:subagent-driven-development` with the project's agents: one fresh
`coder` per plan task, in order, one at a time, its brief under `.superpowers/sdd/`.
Dispatch template: `references/dispatch.md`, Coder. Pass `model: opus` on the Agent call
when the plan marks the task `Complexity: complex`; otherwise the agent's own model
applies. A pin is one dispatch carrying the pin instead of a plan path.

- `coder` writes the failing spec, watches it fail, implements, runs `pnpm typecheck` and
  `pnpm test <module>`, then repairs the run surface the change made stale.
- A schema delta is `coder`'s edit and the owner's push: `coder` runs `pnpm db:generate`;
  relay the model, the field, the index, the data consequence, and `pnpm db:migrate`.
- A `NEEDS_CONTEXT` or `BLOCKED` hand-back goes to the session as an open question; do
  not fix it here.

## Review every task, through `reviewer`

After each task, dispatch `reviewer` at `Depth: task` with the task brief as the
requirement and the task's files as the scope (`references/dispatch.md`, Reviewer). After
the last task, dispatch one `reviewer` at the plan's review depth over the whole scope.

Every finding passes `superpowers:receiving-code-review` here, in this orchestration:

- Open the file and confirm or reject the claim, with a reason.
- Confirmed findings go to `coder` in one fix dispatch, then one scoped re-review.
- Rejected findings, and what stays open after that round, are lines in the hand-back.
- A task does not start while its predecessor has a confirmed finding unfixed.

## Verify

Invoke `superpowers:verification-before-completion`, then run and read each:

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test <module>
```

`<module>` is a path filter naming each module the work changed; a module only read is
out of scope. How to read `deadcode`, `spell`, and a scoped `test:cov`: `.claude/CLAUDE.md`
Gotchas. A coverage gap beyond the TDD specs is named with file and lines; closing it is
`/ack-spec`.

## Docs, through `writer`

When the plan header says `Docs: yes`, dispatch `writer` with the docs the behaviour
touches (`references/dispatch.md`, Writer).

After `writer` returns, dispatch `reviewer` at `Depth: docs` over the files `writer`
changed (`references/dispatch.md`, Reviewer). Every finding passes
`superpowers:receiving-code-review` as in the task review:

- A confirmed STALE or PHANTOM goes to `writer` in one repair dispatch, then one scoped
  re-review.
- A CONFLICT between a doc and the code goes to the owner unresolved.

## Finish

Propose the commit subject (`<type>(<scope>): <description>`, `.commitlintrc`) and stop.
Commits, staging, and pushes go through `ask`. `superpowers:finishing-a-development-branch`
runs in the session from `/ack-pr create`, not here.

## Hand back

- The input: the plan path or the pin.
- Per task: what `coder` produced and the decisive test line; the task review's findings
  and each one's state (fixed, rejected with the reason, open).
- The final review at the plan's depth.
- Every run-surface file checked and whether it changed; every status code allocated.
- The schema delta and the owner's push command.
- The output of the five checks.
- What `writer` changed; the docs review's findings and each one's state.
- The proposed commit subject.
- One line per thing noticed outside the scope.

## Next

`/ack-pr create` once the branch is settled. `/ack-spec` for a coverage gap beyond the TDD
specs. `/ack-doc` when docs were `no` and are wanted later. `/ack-review <scope>` to judge
the checkout again. `/ack-plan` for anything handed back as open.
