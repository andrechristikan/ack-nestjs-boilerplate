---
name: ack-spec
description: >-
  Creates or repairs tests for code that exists through tester, to 100% coverage per file;
  unit today, integration or e2e once ack-code has added their run surface. A confirmed
  no-flow bug goes to coder test-first; a flow change or a decision is asked or logged in
  the sweep. Use for a failing suite, a coverage gap, or orphan specs. Not for new
  behaviour (ack-code).
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: "<module or path filter, or the failing suite> [unit|integration|e2e]"
---

!`git status --short`
!`git diff --name-only HEAD`

# ack-spec

You orchestrate. `tester` writes `test/`; `coder` writes a confirmed no-flow repair,
test-first. On the coverage path the code wins: a spec asserts what `src/` does. If a
`superpowers:*` skill is not installed, stop and say
`claude plugin install superpowers@claude-plugins-official`.

## 1. Scope

Run the suite for the named scope and read the failure; the scope is a Vitest path filter.
Clear the cache before believing a coverage gap.

```bash
pnpm test <scope>
pnpm exec vitest --clearCache
```

Kind: `unit` continues. `integration` or `e2e` first checks the run surface: a Vitest
project or config, a `package.json` script, and the engine in `docker-compose.yml`
(`.claude/rules/testing.md`). When it is missing, stop and hand back that `/ack-code` adds
the run surface first.

## 2. Classify

Every defect the run surfaces, and every defect `tester` hands back, is classified before
anyone writes:

| Class | Meaning | Route |
|---|---|---|
| spec wrong | the code moved and the spec was left behind, or the spec asserts a wish | `tester` |
| no-flow bug | confirmed defect; contract, guard stack, status code, and call order stay | `coder`, test-first |
| flow or decision | route, DTO, status code, guard, who may do what, or when; or two readings | hand back the question, or a sweep row |

A pinned no-flow bug (files, cause at `file:line`, the change) goes straight to `coder`.
A flow change is `/ack-code`.

## 3. Repair, through `coder`

Dispatch one `coder` per pinned no-flow bug: files, cause at `file:line`, the change,
`Scope` limited to those files and their `test/` mirrors, rules by path
(`.claude/rules/testing.md` plus the scoped rule the file matches), the working-tree line
and the no-questions line from `../ack-code/references/dispatch.md`. Acceptance: the red
spec quoted, then `pnpm typecheck` and `pnpm test <module>` green.

## 4. Cover, through `tester`

Dispatch `tester`:

```
Agent: tester
Scope: <src paths in scope and their test/ mirrors>
Kind: unit | integration | e2e
Bar: 100% statements, branches, functions, and lines on every file in scope
Source of truth: the code as it is on disk, including repairs this run landed
Mode: cover | repair | relocate only (move green specs, no new assertion)
Rules to read: .claude/rules/testing.md, plus the scoped rule each subject matches
Report: specs written or repaired; per-file coverage rows; every line that cannot be
  covered without changing src/, with file:line and why; defects noticed, each with
  file:line, unfixed.
```

Add the working-tree line and the no-questions line from
`../ack-code/references/dispatch.md`. `tester` does not edit `src/`.

## 5. Reach 100%

Re-run the scope, then run the full coverage suite; this is the only skill that does:

```bash
pnpm test <scope>
pnpm test:cov
```

Read the per-file rows, not the exit code (`references/sweep-log.md`, Coverage reading).
A file in scope still short of 100 is another `tester` dispatch. The one thing that stops
the loop is a line that cannot be covered without changing `src/`: classify it in step 2.
Excluded paths (`vitest.config.ts` `coverage.exclude`) are not a gap here.

## 6. Sweep log

`generated/docs/report-src-sweep.md` is additive. Append one open row per flow or decision
finding, under its heading; at the end of every run re-read every row against `src/` and
mark gone defects SOLVED (`references/sweep-log.md`). Do not delete a row.

## 7. Verify

Invoke `superpowers:verification-before-completion`. Report the coverage totals with the
command that produced them, and every spec run with its filter.

## Boundaries

Do not write a spec or a repair yourself; dispatch. Do not delete, `.skip`, or weaken a
spec, lower a threshold, extend the exclude list, or add an ignore comment. Do not run a DB
or seed command. No review, no boot. Commits go through `ask`; propose the subject only.

## Hand back

Specs written or repaired by file; every no-flow bug fixed (file, line, change); every flow
or decision handed back or logged; per-file coverage with the command; files at 100 and
files short with the reason; sweep rows opened and rows marked SOLVED; the run-surface gap
when the kind was integration or e2e; one line per thing noticed outside the scope.

## Next

`/ack-code` for a flow change the owner approved, or to add the integration or e2e run
surface.
