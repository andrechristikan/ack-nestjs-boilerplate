---
name: ack-spec
description: >-
    Creates or repairs unit specs for code that exists, to 100% coverage per file; the code on disk wins and src/ is not changed. Integration and e2e are held. Use for a coverage gap, a spec the code moved away from, or orphan specs. Not for new behaviour (ack-design), a red spec whose cause is unknown (ack-debug), or a src/ fix.
blurb: 'unit specs to 100% for existing code; the code wins'
disable-model-invocation: true
context: fork
agent: tester
argument-hint: '<module or path filter, or the failing suite>'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-spec

Scope: $ARGUMENTS

You are `tester`, running in a fork. A fork cannot ask the owner: every question is a hand-back line. The code on disk is the specification: a spec asserts what `src/` does. A defect in `src/` is logged, not fixed.

## 1. Scope

The scope is a Vitest path filter. Run it and read the failures. Clear the cache before believing a coverage gap.

```bash
pnpm test <scope>
pnpm exec vitest --clearCache
```

Integration and e2e are held (`.claude/rules/testing.md`): a request for either is a hand-back naming the hold.

## 2. Classify

Classify every failure and every gap before writing:

| Class | Meaning | What you do |
| --- | --- | --- |
| spec wrong | the code moved and the spec stayed, or the spec asserts a wish | repair the spec to what `src/` does |
| gap | behaviour in `src/` with no spec | write the spec |
| orphan | a green spec whose subject moved | move it to mirror the subject, add no assertion |
| defect | `src/` is wrong: a contract, a guard, a status code, a call order | keep the spec green against current behaviour; open a sweep row |
| cause unknown | a red spec that is neither stale nor a known defect | hand back the symptom and name `/ack-debug` |

## 3. Cover

1. Run `bash .claude/hooks/rules.sh <every file you touch>` and read each rule it prints. `.claude/rules/testing.md` binds every `test/` file.
2. Read the subject file completely before writing a line. Sibling specs are the style guide.
3. Write or repair the specs. Run the narrowest filter, then the module.

## 4. Reach 100%

```bash
pnpm test <scope>
pnpm test:cov <scope>
```

- Read the per-file rows, not the exit code (`references/sweep-log.md`, Coverage reading).
- A file in scope short of 100 gets another pass.
- A line no input can reach without changing `src/` is a sweep row.
- Paths under `coverage.exclude` in `vitest.config.ts` are not a gap.

## 5. Sweep log

`generated/report-src-sweep.md` holds open defects only.

- Append one row per defect or unreachable line, under its heading (`references/example-sweep-row.md`).
- At the end of the run, re-read every row against `src/` and delete each row whose defect is gone (`references/sweep-log.md`).

## Boundaries

- No `src/` edit beyond a typo that blocks compilation and changes no behaviour.
- No deleted, skipped, or weakened spec; no threshold lowered; no exclude entry; no ignore comment.
- No owner database command, no boot, no commit.

## Hand back

- Specs written, repaired, or moved, by file.
- Per-file coverage rows with the command that produced them; files at 100 and files short with the lines and why.
- Sweep rows opened and rows deleted.
- Each red spec whose cause is unknown, with its failing line.
- One line per thing noticed outside the scope.

## Next

`/ack-debug` for a red spec whose cause is unknown, or for a sweep row the owner wants fixed: finds the root cause and fixes it. `/ack-design` when the fix changes a flow: settles the change into a spec.
