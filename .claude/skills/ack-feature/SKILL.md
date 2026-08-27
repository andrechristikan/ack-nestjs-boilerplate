---
name: ack-feature
description: Build a new feature end to end — interrogate the requirement, plan it, write it spec-first, gate it, and leave every check green. Use when the owner asks for new behaviour. NOT for a narrow fix (ack-fix), NOT for repairing specs (ack-fix-test), NOT for seed data (ack-seed).
disable-model-invocation: true
---

Build one feature, end to end. You orchestrate; the agents do the work.

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

## 2 — Plan

Dispatch `planner` with the settled requirement. It returns a plan file under `.superpowers/`.

Read the plan's **Open questions** section. Anything there goes back to the owner now, not after
code exists.

## 3 — Schema first, if there is one (HARD)

**`prisma/schema.prisma` has NO agent.** When the plan names a schema delta, relay it to the
OWNER — the model, the field, the exact Prisma type, the index, and the data consequence — and
WAIT. Code cannot be written against a column that does not exist, and nobody here may run
`db:migrate` or `db:generate`.

## 4 — Build

Dispatch `coder` with the plan. It works spec-first and dispatches `test-writer` itself — do not
dispatch `test-writer` from here.

**When the plan needs new baseline rows, dispatch `seed-writer`** after the schema lands. It
writes the seed; nobody runs it — the owner does.

## 5 — Gate

Dispatch `reviewer-rules` over what changed. Then `reviewer-e2e` when the feature crosses a
transport, enqueues a job, or sends a notification — it follows the hand-offs to their terminal
point, which is where those defects live.

Findings go back to `coder`. Do not fix anything here.

## 6 — Everything green (HARD)

Run all of these and report each with its output:

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test --testPathPatterns '<module>'
```

**The test run is SCOPED to the modules the feature touched, never the whole suite (HARD).**
Name each one — the flag takes several patterns. A full `pnpm test` belongs to `/ack-fix-test`
and to the `pre-commit` hook, which runs it on every commit anyway.

Then boot the app — dispatch `verifier`, which carries the boot procedure. A cycle surfaces
nowhere else.

**`deadcode` and `spell` ALWAYS exit 0.** `spell` ends in `|| true` and `ts-prune` never
signals. Their exit code means nothing: READ the output and report what it says. `ts-prune`
reports the whole kit surface by design — its entries are not findings
(`rules/architecture.md`).

## Boundaries

- **Never fix anything yourself.** You dispatch and you report.
- Never edit `prisma/schema.prisma`, and never run a schema, DB, or seed command.
- Never `--no-verify`. Never stage or commit unless the owner asks in that exchange.
- No `docs/*.md` — that is `/ack-docs`.

## Hand back

The settled requirement, the plan path, the schema delta the owner applied, what each agent
produced, every status code allocated, every finding and whether it was resolved, every
operational step a rename introduced, and the output of all five checks plus the boot.

## Next

| Then run | When |
|---|---|
| `/ack-verify` | the change touched a route, module wiring, or a processor — a green suite does not prove those |
| `/ack-docs` | the behaviour this changed is described in `docs/` |

`/ack-pr-doc` is NOT a step here. Run it on its own once the branch is settled — it fetches and
moves local refs, which every other skill deliberately avoids.
