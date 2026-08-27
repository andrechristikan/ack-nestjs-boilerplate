---
name: ack-fix
description: Make one narrow, named code change and gate it. No plan, no brainstorm. Use when the change is small and the owner already knows what it is. NOT for new behaviour (ack-feature), NOT for specs (ack-fix-test), NOT for finding an unknown cause (ack-debug).
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

Dispatch `coder` with the change, named precisely. It works spec-first and dispatches
`test-writer` itself.

**A schema change is a HAND-BACK to the OWNER**, not an agent task — relay the delta and its
data consequence and wait (`rules/prisma-schema.md`). **New baseline rows go to `seed-writer`.**
`coder` touches neither `prisma/` nor `src/migration/`.

## 2 — Gate

Dispatch `reviewer-rules` over what changed. Add `reviewer-e2e` when the change touches a
transport, a queue, or a notification.

Findings go back to `coder`.

## 3 — Everything green (HARD)

```bash
pnpm typecheck
pnpm lint
pnpm deadcode
pnpm spell
pnpm test --testPathPatterns '<module>'
```

**The test run is SCOPED to the module you changed, never the whole suite (HARD).** The flag is
PLURAL — Jest 30 rejects `--testPathPattern` and runs nothing. A full `pnpm test` belongs to
`/ack-fix-test` and to the `pre-commit` hook, which runs it on every commit anyway; running it
here adds minutes and proves nothing the hook will not prove.

**`deadcode` and `spell` ALWAYS exit 0** — `spell` ends in `|| true`, `ts-prune` never signals.
Read their output; the exit code is meaningless.

Boot only when the change touched module wiring, a route, or a processor — a cycle surfaces
nowhere else.

## Boundaries

- Never fix anything yourself.
- Never widen the scope. Something you noticed nearby is a REPORT, not a second change.
- Never edit `prisma/schema.prisma`, and never run a schema, DB, or seed command.
- Never `--no-verify`. Never stage or commit unless the owner asks in that exchange.

## Hand back

The change, what the agents produced, findings and their resolution, every operational step a
rename introduced, and the check output.

## Next

| Then run | When |
|---|---|
| `/ack-verify` | the fix is only observable against the running app |
| `/ack-docs` | the behaviour this changed is described in `docs/` |

**`/ack-fix-test` is NOT a follow-up.** The specs for what you just changed came with the change
— `coder` dispatched `test-writer` for them. `/ack-fix-test` is for specs of code you did NOT
touch.
