---
name: ack-fix
description: Repair existing behaviour end to end — pin the symptom, find the cause with evidence, brainstorm the repair, then spec, plan and execute it through planner and coder, offer the reviews, and leave every check green. Use when something that already exists is wrong, whether or not the cause is known yet. NOT for new behaviour (ack-feature), NOT for specs alone (ack-spec), NOT for a compliance pass (ack-gate).
disable-model-invocation: true
---

Repair existing code, end to end. You orchestrate; the agents do the work.

**Find the cause first, then think, then spec, then plan, then build. In that order (HARD).**
Brainstorming a repair for a cause you have not located is guessing with extra steps, and a
`coder` dispatch sent before the cause is pinned repairs the symptom instead.

**A vague symptom is a legitimate start.** "Something is off in workspace invites" is enough to
open this run — §1 to §4 exist to turn it into a cause. What is NOT legitimate is skipping to
the build because the symptom sounded obvious.

## Which skill is this?

A failing suite splits two ways, and taking the wrong branch wastes the run:

- **The CODE is wrong** — the spec asserts the right thing and the code does not do it. This
  skill.
- **The SPEC is wrong**, or the code moved and the spec was left behind → `/ack-spec`. It
  touches no `src/` at all.

The test: if making it right requires touching `src/`, it is this skill.

## Reject early

Stop and point at `/ack-feature` when the request adds behaviour nobody has specified. Say so,
and stop. New behaviour has no symptom to pin and no cause to find, so §1 to §4 have nothing
to work on — the requirement interrogation in `/ack-feature` is what it needs instead.

A repair that turns out to span several modules is still this skill. Breadth is not the
boundary; whether there is existing behaviour to correct is.

## 1 — Pin the symptom

Get it as concrete as the owner can make it: the exact request or job, the exact output, and
whether it reproduces. Where it is still vague, say what you are assuming and carry on — the
locate step narrows it.

The strongest starting points here, in order: a `statusCode` integer plus its `statusCodeKey`
and `module` from the error body, a job id, an `x-request-id` from the response headers, an
error string.

## 2 — Locate

Dispatch `explorer` with the symptom's identifiers — a status-code member, a route, a queue
name, a column, an i18n key. It returns a `file:line` table and nothing else.

**When the symptom points outside this repository** — a vendor error string, a library throwing
something undocumented, behaviour that changed after a version bump — dispatch `researcher`
before tracing. Chasing our code for a cause that lives in a dependency's changelog wastes the
whole run, and inventing a repair pattern when a documented one exists wastes the next one.

## 3 — Trace (ASK before dispatching `reviewer-e2e`)

**`reviewer-e2e` NEVER runs on your own initiative (HARD)** — not even here, where it is the
natural tool. Ask first, with `AskUserQuestion`, naming what it would cost and what it would
find:

- it follows the flow to its terminal point, including every job and notification the flow
  hands off, which is usually where a symptom separates from its cause
- it is the most expensive agent in the set, because it reads whole flows across modules

If the owner declines, work from what `explorer` returned and read the path yourself. Say in
the hand-back that the trace was not run, and which hand-offs are therefore unfollowed.

When it does run, give it the symptom in the dispatch. A trace that does not know what it is
looking for reports everything and explains nothing.

**The causes that hide from a per-file read, and where each lives:**

| Symptom | Look at |
|---|---|
| a field silently missing from the response | the route's response schema does not declare it, so it is stripped (`rules/dto.md`) |
| a payload refused at serialization | the route declares no `schema` on `@Response` while the handler returns data (`rules/dto.md`) |
| a request rejected as unknown key | the request schema is strict and does not declare the field (`rules/validation.md`) |
| a guard rejecting a caller who should pass | decorator ORDER — the stack runs bottom-up and a guard above one it depends on sees `undefined` (`rules/http.md`) |
| a route 404 that should exist | the controller registered in its own module instead of `router.http.<scope>.module.ts` (`rules/router.md`) |
| the raw message path echoed back instead of a message | a flat i18n key, or a key missing from that language file (`rules/i18n.md`) |
| a job that never runs | enqueued onto an `EnumQueue` member no `@QueueProcessor` is registered for (`rules/queue.md`) |
| a transaction that fails at runtime only | MongoDB running standalone rather than as a replica set |
| a header that works in curl and not in a browser | missing from `cors.allowedHeader` (`rules/config.md`) |
| an untranslated Prisma error reaching the client | a raw `P2002` escaping a repository (`rules/database.md`) |

## 4 — Reproduce

Dispatch `verifier` to reproduce the symptom against the running application, or to confirm the
suspected cause produces it. **A cause you have not reproduced is a hypothesis, and the
hand-back says so.** `verifier` never starts a container it found stopped — if infrastructure is
down it hands that back, and you relay the question to the owner rather than answering it for
them.

## 5 — Brainstorm the repair (REQUIRED)

The cause is found. **Read `.claude/rules/orientation.md` and every row it names for the surfaces
the repair will touch, BEFORE you brainstorm.** The options are yours to put to the owner, and an
option a rule forbids is not an option — offering it spends their decision on something that
cannot be built.

Then invoke `superpowers:brainstorming` and work the repair through it HERE, in this session —
it is the step that turns a cause into options with trade-offs instead of the first patch that
comes to mind.

**Come out of it with open questions for the owner, not a decision.** Where two repairs are
both defensible — repair at the call site or at the service, guard the input or fix the
invariant, change the column or change the read — that is the owner's call. Put it to them with
`AskUserQuestion`, each option carrying what the code does TODAY alongside the recommendation.

## 6 — Spec, then plan, through `planner` (HARD)

Both artifacts come from `planner`, in two dispatches, and neither is written in this session.
Every ack-fix run is spec → plan → execute in that order.

1. **`SPEC` mode**, carrying the reproduced cause, the evidence, and the repair the owner chose.
   It returns `.superpowers/<slug>-spec.md`: the behaviour as it will be true after the repair,
   the surfaces it touches, the rules that bind them, what is out of scope.
   **Put that spec to the owner before planning it** — name the path and ask whether it is
   right. Its open questions go to the owner now, and a changed answer is a second `SPEC`
   dispatch, not an edit of your own.
2. **`PLAN` mode**, naming the APPROVED spec path. It returns `.superpowers/<slug>-plan.md`:
   ordered steps, the files each touches, the verification that closes it, and the rules each
   step is written against.

**When the owner hands you a plan already, this step is reading it** — you do not rewrite it,
and you do not dispatch `planner` around it. §1 to §4 still run, to confirm the cause is the
one the plan assumes. A plan built on the wrong cause repairs the wrong file.

## 7 — Build

Dispatch `coder` with the plan. It works TEST-first — the failing unit spec before the code —
and dispatches `test-writer` itself; do not dispatch `test-writer` from here. That unit spec is
a different artifact from the `.superpowers/` spec §6 produced.

**A schema change is `coder`'s edit plus a HAND-BACK of the push** — relay `pnpm db:migrate` and
the data consequence, and say which endpoints stay broken until the owner runs it
(`rules/prisma-schema.md`). **New baseline rows go to `seed-writer`.** `coder` does not touch
`src/migration/`.

## 8 — Review (ASK, and only at the END)

The change is made and the diff is visible. **Nothing in this step runs unasked (HARD).**

Ask once, with `AskUserQuestion`, multi-select, and dispatch only what comes back:

| Offer | Recommend it when |
|---|---|
| `reviewer-rules` | almost always — static, needs no running infrastructure, cheapest of the three |
| `reviewer-e2e` | the repair touched a transport, a queue, or a notification — and it did not already run in §3 |
| `verifier` | the repair touched `imports:`, a route, or a processor — a cycle surfaces nowhere else |

**`reviewer-e2e` NEVER runs on your own initiative (HARD).** It runs when the owner picks it
here or in §3, or when they named it explicitly at the start of the run.

Nothing picked means nothing dispatched. **Name every check that was skipped in the hand-back.**

Findings go back to `coder`. **One round, then stop** — what is left after that round goes to
the owner as an open item.

## 9 — Everything green (HARD)

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test --testPathPatterns '<module>'
```

**The test run is SCOPED to the modules the repair actually CHANGED, never the whole suite
(HARD).** The flag is PLURAL — Jest 30 rejects `--testPathPattern` and runs nothing. A module
you only read while tracing is not in scope. A full `pnpm test` belongs to `/ack-spec` and to
the `pre-commit` hook, which runs it on every commit anyway; running it here adds minutes and
proves nothing the hook will not prove.

**`collectCoverage` is `false`.** A scoped `pnpm test` does not apply the 100% threshold.
Coverage is `pnpm test:cov`. A scoped coverage run exits 1 while every spec passes because the
threshold is GLOBAL — read the `Tests:` line, not the exit code.

**`deadcode` and `spell` ALWAYS exit 0** — `spell` ends in `|| true`, `ts-prune` never signals.
Read their output; the exit code is meaningless.

**Booting is NOT part of this step.** That is `verifier`, in §4 and §8.

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

- **Never fix anything yourself.** You dispatch and you report.
- **Never write the spec or the plan yourself.** Both come from `planner`; `.superpowers/` is
  written by that agent, not by this session.
- **Never dispatch `reviewer-e2e` unasked.**
- **Never stop at the first plausible explanation.** A negative grep proves a STRING is absent,
  not a behaviour.
- Never widen the scope. A defect you passed while tracing is a one-line REPORT, not a second
  repair.
- Never run a DB or seed command. The schema EDIT is `coder`'s; the push is the owner's.
- **Never `--no-verify` on your own initiative.**
- Never stage or commit unless the owner asks in that exchange.
- No `docs/*.md` — that is `/ack-docs`.

## Hand back

The symptom, the root cause and the evidence that reproduces it, the options brainstormed with
the owner's answers, the spec path, the plan path, what each agent produced, findings and their
resolution, every operational step a rename introduced, the output of all five checks, and **which optional
checks were offered, picked, and skipped**. Then, explicitly, what you could not establish —
and whether the trace in §3 was run or declined.

## Next

| Then run | When |
|---|---|
| `/ack-gate` | the owner declined `reviewer-rules` here and now wants the compliance pass |
| `/ack-docs` | the behaviour this changed is described in `docs/` |
| `/ack-feature` | the cause turned out to be missing behaviour, not a defect |

**`/ack-spec` is NOT a follow-up.** The specs for what you just changed came with the change —
`coder` dispatched `test-writer` for them. `/ack-spec` is for specs of code you did NOT touch.
