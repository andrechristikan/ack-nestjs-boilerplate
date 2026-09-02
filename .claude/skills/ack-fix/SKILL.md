---
name: ack-fix
description: Make one narrow, named code change. No planning phase — it uses the plan or spec it is handed, or the change the owner named. Use when the change is small and the owner already knows what it is. NOT for new behaviour (ack-feature), NOT for specs (ack-fix-test), NOT for finding an unknown cause (ack-debug).
disable-model-invocation: true
---

One named change. No planning phase — if the change needs one, it is not this skill.

## Which skill is this?

A failing suite splits two ways, and taking the wrong branch wastes the run:

- **The CODE is wrong** — the spec asserts the right thing and the code does not do it. That is
  `/ack-debug` to find why, then this skill to repair it.
- **The SPEC is wrong**, or the code moved and the spec was left behind → `/ack-fix-test`. It
  touches no `src/` at all.

This skill CHANGES CODE. The specs for what it changes come with it — `coder` dispatches
`test-writer` for them.

## Reject early

Stop and point at `/ack-feature` when the request:

- adds behaviour nobody has specified,
- touches three or more modules,
- needs a decision the owner has not made.

Say which, and stop. A fix that grows into a feature mid-run has no plan and no requirement
behind it.

## 1 — Build

**When a plan or a spec already exists, USE IT — do not re-plan.** A `/ack-debug` run hands
over a plan path under `.superpowers/`; the owner may hand over one directly, or simply
describe a repair precise enough to act on. Any of those is the input, and `coder` gets it
verbatim in the dispatch.

Without one, this skill still runs: the change the owner named IS the specification. Do not
invent a planning phase for it — a change that needs a plan is `/ack-debug` or
`/ack-feature`, not this.

Dispatch `coder` with the change, named precisely. It works spec-first and dispatches
`test-writer` itself.

**A schema change is a HAND-BACK to the OWNER**, not an agent task — relay the delta and its
data consequence and wait (`rules/prisma-schema.md`). **New baseline rows go to `seed-writer`.**
`coder` touches neither `prisma/` nor `src/migration/`.

## 2 — Review (ASK, and only at the END)

The change is made and the diff is visible. **Nothing in this step runs unasked (HARD).**

Ask once, with `AskUserQuestion`, multi-select, and dispatch only what comes back:

| Offer | Recommend it when |
|---|---|
| `reviewer-rules` | almost always — static, needs no running infrastructure, cheapest of the three |
| `reviewer-e2e` | the change touched a transport, a queue, or a notification |
| `verifier` | the change touched `imports:`, a route, or a processor — a cycle surfaces nowhere else |

**`reviewer-e2e` NEVER runs on your own initiative (HARD).** It runs when the owner picks it
here, or when they named it explicitly at the start of the run.

Nothing picked means nothing dispatched. **Name every check that was skipped in the hand-back.**

Findings go back to `coder`. **One round, then stop** — what is left after that round goes to
the owner as an open item.

## 3 — Everything green (HARD)

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test --testPathPatterns '<module>'
```

**The test run is SCOPED to the module you actually CHANGED, never the whole suite (HARD).**
The flag is PLURAL — Jest 30 rejects `--testPathPattern` and runs nothing. A module you only
read is not in scope. A full `pnpm test` belongs to `/ack-fix-test` and to the `pre-commit`
hook, which runs it on every commit anyway; running it here adds minutes and proves nothing
the hook will not prove.

**`collectCoverage` is `false`.** A scoped `pnpm test` does not apply the 100% threshold.
Coverage is `pnpm test:cov`. A scoped coverage run exits 1 while every spec passes because
the threshold is GLOBAL — read the `Tests:` line, not the exit code.

**`deadcode` and `spell` ALWAYS exit 0** — `spell` ends in `|| true`, `ts-prune` never
signals. Read their output; the exit code is meaningless.

**Booting is NOT part of this step.** That is `verifier`, offered in §2.

### Coverage short of 100% is the OWNER's call (HARD)

**Never repair a coverage gap silently, and never widen the scope to chase one.** When a
coverage run on a file you touched does not reach 100%, stop and put it to the owner with
`AskUserQuestion`, naming the file, the uncovered lines, and why they are uncovered.

Read the PER-FILE rows for the files you touched. The global summary means nothing on a scoped
coverage run.

Two answers are legitimate, and both belong to the owner:

| They pick | You do |
|---|---|
| fix it | one more `test-writer` dispatch on those files, still inside this module |
| leave it | nothing here — `pre-commit` runs `pnpm test` without coverage, so the threshold is not a hook gate |

**`--no-verify` is never yours to choose.** You do not pass it, suggest it as a default, or
assume a previous answer still holds.

## Boundaries

- Never fix anything yourself.
- **Never dispatch `reviewer-e2e` unasked.**
- Never widen the scope. Something you noticed nearby is a REPORT, not a second change.
- Never edit `prisma/schema.prisma`, and never run a schema, DB, or seed command.
- **Never `--no-verify` on your own initiative.**
- Never stage or commit unless the owner asks in that exchange.

## Hand back

The change, what the agents produced, findings and their resolution, every operational step a
rename introduced, the check output, and **which optional checks were offered, picked, and
skipped**.

## Next

| Then run | When |
|---|---|
| `/ack-verify` | the owner declined `verifier` here and the fix is only observable against the running app |
| `/ack-gate` | the owner declined `reviewer-rules` here |
| `/ack-docs` | the behaviour this changed is described in `docs/` |

**`/ack-fix-test` is NOT a follow-up.** The specs for what you just changed came with the change
— `coder` dispatched `test-writer` for them. `/ack-fix-test` is for specs of code you did NOT
touch.
