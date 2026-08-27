---
name: ack-fix-test
description: Repair or backfill unit specs against code that already exists. The code wins; a business defect is pinned green and reported, never fixed. Use for a failing suite, a coverage gap, or orphan specs. NOT for the specs of behaviour being written now (ack-feature — coder drives those spec-first), NOT for feature code.
disable-model-invocation: true
---

Specs only. `src/` is not yours and not the agent's.

## Which skill is this?

A failing suite splits two ways:

- **The SPEC is wrong**, or the code moved and the spec was left behind → this skill.
- **The CODE is wrong** — the spec asserts the right thing and the code does not do it →
  `/ack-debug` to find why, then `/ack-fix` to repair it. Not here.

The test: if making the suite green requires touching `src/`, you have the wrong skill.

## 1 — Establish what is actually wrong

Run the suite for the named scope first, and read the failure. A suite that fails because the
code moved needs a different repair from one that fails because a spec asserts a defect.

```bash
pnpm test --testPathPatterns '<scope>'
```

**The flag is PLURAL.** Jest 30 rejects the old singular `--testPathPattern` with
`Option "testPathPattern" was replaced by "--testPathPatterns"` and runs nothing.

**Clear the jest cache before believing a coverage gap.** A stale cache invents them.

## 2 — Dispatch

Dispatch `test-writer` in **BACKFILL** mode, naming the scope. Say the mode explicitly — the
agent runs two modes that invert the same question, and it will ask rather than guess.

## 3 — Confirm

Re-run the suite and the coverage for that scope. Report the numbers with the command that
produced them.

**Then run the FULL suite — this skill is the only one that does (HARD).**

```bash
pnpm test:cov
```

Every other skill runs `--testPathPatterns '<module>'` and stops there. A spec repair reaches
past its own scope: a global mock in the jest setup file, a shared fixture, a relocated helper,
and the **100% global coverage threshold, which is measured across the whole run**. The scoped
run cannot see any of that. Report the totals with the command.

Controllers and repositories are deliberately outside `collectCoverageFrom` — a gap there is not
a gap (`rules/testing.md`).

## Boundaries

- **No `src/` changes.** A business defect is pinned green and reported; the fix is a separate
  `/ack-fix` run, decided by the owner. The only sanctioned `src/` edit is a typo or syntax
  error that blocks compilation and cannot change behaviour for any input.
- Never delete or skip a spec to reach green.
- Never lower the coverage threshold, exclude a file from `collectCoverageFrom`, or add an
  ignore comment.
- Never `--no-verify`. Never stage or commit unless the owner asks in that exchange.

## Hand back

Specs written or repaired, the coverage numbers with their command, and every defect pinned
rather than fixed — each with `file:line`.

## Next

Usually nothing. This skill ends where it started: `src/` unchanged.

| Then run | When |
|---|---|
| `/ack-debug` then `/ack-fix` | a defect you pinned green actually matters and the owner wants it fixed |

**Never fix the pinned defect from here.** Pinning it green and fixing it in the same run means
the spec was written to match a fix nobody reviewed.
