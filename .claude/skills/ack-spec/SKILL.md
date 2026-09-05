---
name: ack-spec
description: Write and repair unit specs against code that already exists, until coverage is 100%. The code is the specification — it is never changed here, not even when it looks wrong. Use for a failing suite, a coverage gap, or orphan specs. NOT for the specs of behaviour being written now (ack-feature and ack-fix drive those spec-first), NOT for feature code.
disable-model-invocation: true
---

Specs only. **`src/` is not yours and not the agent's — not one line, for any reason (HARD).**

## The code is the specification

Everything under `src/` is treated as correct, and the spec is written to describe what it
actually does. That is the whole discipline of this skill: you are reading behaviour out of the
code, never arguing with it.

**Code that looks wrong is still pinned green.** Write the spec that asserts what it does today,
then report it as a suspected defect with `file:line` — the repair is a separate `/ack-fix` run
the owner decides on. Pinning a defect green and repairing it in the same run means the spec was
written to match a fix nobody reviewed.

**Follow the code that is there.** The existing specs are the style guide as much as
`rules/testing-spec-style.md` is: match how the sibling suites build their mocks, name their
blocks, and arrange their fixtures. A spec that works but reads like it came from another
repository is a finding against itself.

## Which skill is this?

A failing suite splits two ways:

- **The SPEC is wrong**, or the code moved and the spec was left behind → this skill.
- **The CODE is wrong** — the spec asserts the right thing and the code does not do it →
  `/ack-fix`. Not here.

The test: if making the suite green requires touching `src/`, you have the wrong skill. Stop and
say so rather than reaching for the one line that would fix it.

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
agent runs two modes that invert the same question, and if the dispatch names none it writes
nothing and hands the gap back.

Carry the target into the dispatch: 100% on every file in scope, and the code as written is the
behaviour to describe.

## 3 — Confirm, and reach 100% (HARD)

Re-run the suite for that scope, then run the FULL coverage suite. **This skill is the only one
that does.**

```bash
pnpm test:cov
```

Every other skill runs `--testPathPatterns '<module>'` without coverage and stops there. A spec
repair reaches past its own scope: a global mock, a shared fixture, a relocated helper, and the
**100% global threshold, which is measured only when `--coverage` is on**. `collectCoverage` is
`false` in `test/jest.json`, so `pnpm test` never applies the threshold and `pre-commit`, which
runs `pnpm test`, would not catch a coverage gap. Report the totals with the command that
produced them.

Controllers and repositories are deliberately outside `collectCoverageFrom` — a gap there is not
a gap (`rules/testing.md`).

**100% is the bar this skill exists to reach, not a question for the owner.** A file in scope
still short of it is another `test-writer` dispatch, and then another, until the per-file rows
read 100 across statements, branches, functions and lines. Read the PER-FILE rows; the global
summary means nothing while other modules are still uncovered.

**The one thing that stops the loop is a line that cannot be covered without changing `src/`** —
an unreachable branch, a defensive throw no input can produce, a type-narrowing guard the
compiler already proves. That is a HAND-BACK naming the file, the line, and why it is
unreachable. It is not a waiver you grant yourself, and it is not a reason to lower the
threshold.

## Boundaries

- **No `src/` changes. None.** Not a typo, not a syntax error, not an import, not the one line
  that would make the suite compile. A blocked compile is a hand-back with the file and the
  error, and the owner takes it to `/ack-fix`.
- **No gate, no review, no boot.** This skill dispatches `test-writer` and nothing else. It
  writes no `src/`, so there is nothing for `reviewer-rules`, `reviewer-e2e` or `verifier` to
  judge.
- Never delete or skip a spec to reach green.
- Never lower the coverage threshold, exclude a file from `collectCoverageFrom`, or add an
  ignore comment.
- **Never `--no-verify` on your own initiative.**
- Never stage or commit unless the owner asks in that exchange.

## Hand back

Specs written or repaired, the coverage numbers with their command, every file that reached 100%
and every file that did not with the reason, and every defect pinned rather than fixed — each
with `file:line`.

## Next

Usually nothing. This skill ends where it started: `src/` unchanged.

| Then run | When |
|---|---|
| `/ack-fix` | a defect you pinned green actually matters and the owner wants it repaired |

**Never repair the pinned defect from here.**
