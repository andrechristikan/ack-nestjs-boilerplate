---
name: ack-feature
description: Build a NEW feature end to end — interrogate the requirement, then spec, plan and execute it through planner and coder, offer the reviews at the end, and leave every check green. Use when the owner asks for behaviour that does not exist yet. NOT for repairing behaviour that already exists (ack-fix), NOT for specs or a coverage backfill (ack-spec), NOT for seed data (ack-seed).
disable-model-invocation: true
---

Build one NEW feature, end to end. You orchestrate; the agents do the work.

## Reject early

This skill starts from a requirement, not from a symptom. Stop and point elsewhere when the
request is:

| The request | Where it goes |
|---|---|
| behaviour that already exists and is wrong | `/ack-fix` — it pins the symptom, finds the cause, and plans the repair |
| specs for code that already exists, or a coverage backfill | `/ack-spec` — it touches no `src/` |
| baseline rows an install needs | `/ack-seed` |

Say which, and stop. **A repair dressed as a feature skips the whole diagnostic half of
`/ack-fix`** — it builds new behaviour beside the defect and leaves the defect in place.

A feature that turns out to need an existing surface CORRECTED on the way is still this skill;
name the correction in §1 so it lands in the requirement, the spec and the plan, rather than
arriving as an unplanned edit in §5.

## 1 — Interrogate the requirement, HERE

**Do this yourself, in this session.** An agent has no `AskUserQuestion` and cannot ask the
owner anything — hand planning to one before the requirement is settled and it guesses, writes
the guess into a plan, and you discover it after the plan exists.

Use `AskUserQuestion`. Ask about the hard parts, not the obvious ones: edge cases, what happens
on failure, what is deliberately out of scope, which existing surface this becomes visible to,
which route scope it belongs under (`/admin` behaves differently from every other scope — see
`rules/router.md`). Keep going until nothing material is open.

**When the requirement depends on how something OUTSIDE this repository behaves** — an API's
contract, a library's documented guarantee, what a provider returns on failure — dispatch
`researcher` and settle it before planning. A plan built on an assumed third-party contract
fails at integration, which is the most expensive place to find out.

State the settled requirement back in one paragraph before moving on.

## 2 — Spec, through `planner` (HARD)

Dispatch `planner` in **`SPEC` mode** with the settled requirement. It returns
`.superpowers/<slug>-spec.md`: the behaviour as it will be true after the work, the surfaces it
touches, the rules that bind them, what is out of scope, and its open questions.

**You do not write the spec yourself, and neither does `coder`.** Every ack-feature run is
spec → plan → execute in that order, and each artifact exists before the next dispatch starts.
A build that begins from a conversation rather than from a written spec has nothing the owner
approved to check against.

Read the spec's **Open questions** and put them to the owner with `AskUserQuestion` now.
Dispatch `planner` again in `SPEC` mode with the answers when any of them changes the shape.

**Put the spec to the owner before planning it.** Name the file path and ask whether it is
right. A plan built on a spec nobody approved spends the run on the wrong behaviour.

## 3 — Plan, through `planner` (HARD)

Dispatch `planner` in **`PLAN` mode**, naming the APPROVED spec path. It returns
`.superpowers/<slug>-plan.md`: ordered steps, the files each touches, the verification that
closes it, and the rules each step is written against.

Read the plan's **Open questions** — anything there goes back to the owner now, not after code
exists.

**A shape you decide yourself is bound by the same rules the plan is.** Where you answer a design
question in conversation rather than leaving it to `planner` — which layer owns a value, which
module's exception names a failing subject, what a repository receives — read
`.claude/rules/orientation.md` and the row
for that surface first. `coder` treats a decision made here as settled.

## 4 — Schema first, if there is one (HARD)

**A schema delta is `coder`'s edit and the OWNER'S push.** `coder` edits `prisma/schema.prisma`
and runs `db:generate`, so the code typechecks against the new field. Then relay the push to the
owner — the model, the field, the index, the data consequence, and `pnpm db:migrate` — and say
which endpoints stay broken until it runs. Nobody here may run `db:migrate`.

## 5 — Build

Dispatch `coder` with the plan. It works TEST-first — the failing unit spec before the code —
and dispatches `test-writer` itself; do not dispatch `test-writer` from here. That unit spec is
a different artifact from the `.superpowers/` spec §2 produced.

**When the plan needs new baseline rows, dispatch `seed-writer`** after the schema lands. It
writes the seed; nobody runs it — the owner does.

## 6 — Review (ASK, and only at the END)

The work is done and the diff is visible — that is the point at which the owner can judge which
checks are worth their time. **Nothing in this step runs unasked (HARD).**

Ask once, with `AskUserQuestion`, multi-select, and dispatch only what comes back:

| Offer | Recommend it when |
|---|---|
| `reviewer-rules` | almost always — static, needs no running infrastructure, cheapest of the three |
| `reviewer-e2e` | the feature crossed a transport, enqueued a job, or sent a notification |
| `verifier` | the feature touched `imports:`, a route, or a processor — a cycle surfaces nowhere else |

**`reviewer-e2e` NEVER runs on your own initiative (HARD).** It runs when the owner picks it
here, or when they named it explicitly at the start of the run. Say in the offer WHY it might
matter this time; do not decide for them.

Nothing picked means nothing dispatched. **Name every check that was skipped in the hand-back**,
so nobody reads silence as a pass.

Findings go back to `coder`. Do not fix anything here.

**One round of findings, then stop.** What `coder` does not resolve in that round goes to the
owner as an open item. A second automatic round is how a run stops converging.

## 7 — Everything green (HARD)

Run all of these and report each with its output:

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test --testPathPatterns '<module>'
```

**The test run is SCOPED to the modules the feature actually CHANGED, never the whole suite
(HARD).** Name each one — the flag takes several patterns. A module you only read is not in
scope. A full `pnpm test` belongs to `/ack-spec` and to the `pre-commit` hook, which runs it on
every commit anyway.

**`collectCoverage` is `false`.** A scoped `pnpm test` does not apply the 100% threshold.
Coverage is `pnpm test:cov`. A scoped coverage run exits 1 while every spec passes because the
threshold is GLOBAL — read the `Tests:` line, not the exit code.

**`deadcode` and `spell` ALWAYS exit 0.** `spell` ends in `|| true` and `ts-prune` never
signals. Their exit code means nothing: READ the output and report what it says. `ts-prune`
reports the whole kit surface by design — its entries are not findings
(`rules/architecture.md`).

`pnpm build` compiles but does NOT type-check on its own in a way that replaces `pnpm
typecheck` here.

**Booting the app is NOT part of this step.** That is `verifier`, offered in §6 and dispatched
only when the owner picks it.

### Coverage short of 100% is the OWNER's call (HARD)

**Never repair a coverage gap silently, and never widen the scope to chase one.** When a
coverage run on a file you touched does not reach 100%, stop and put it to the owner with
`AskUserQuestion`, naming the file, the uncovered lines, and why they are uncovered.

Read the PER-FILE rows for the files you touched. The global summary means nothing on a scoped
coverage run.

Two answers are legitimate, and both belong to the owner:

| They pick | You do |
|---|---|
| fix it | one more `test-writer` dispatch, on those files only |
| leave it | nothing here — `pre-commit` runs `pnpm test` without coverage, so the threshold is not a hook gate |

**A backfill pass here stays inside the files this feature wrote.** A gap anywhere else — an
older module the coverage run surfaced, a shared helper this feature only imported — is a
one-line REPORT and a `/ack-spec` run, never a second dispatch from here.

**`--no-verify` is never yours to choose.** You do not pass it, suggest it as a default, or
assume a previous answer still holds.

## Boundaries

- **Never fix anything yourself.** You dispatch and you report.
- **Never dispatch `reviewer-e2e` unasked.**
- Never run a DB or seed command. The schema EDIT is `coder`'s; the push is the owner's.
- **Never `--no-verify` on your own initiative.**
- Never stage or commit unless the owner asks in that exchange.
- No `docs/*.md` — that is `/ack-docs`.

## Hand back

The settled requirement, the spec path, the plan path, the schema delta the owner applied, what each agent
produced, every status code allocated, every finding and whether it was resolved, every
operational step a rename introduced, the output of all five checks, and **which optional
checks were offered, which the owner picked, and which were skipped**.

## Next

| Then run | When |
|---|---|
| `/ack-gate` | the owner declined `reviewer-rules` here and now wants the full compliance pass |
| `/ack-docs` | the behaviour this added is described in `docs/` |
| `/ack-spec` | the coverage run surfaced gaps outside this feature's own files |

`/ack-pr-doc` is NOT a step here. Run it on its own once the branch is settled — it fetches and
moves local refs, which every other skill deliberately avoids.
