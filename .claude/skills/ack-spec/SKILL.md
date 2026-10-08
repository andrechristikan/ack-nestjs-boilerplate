---
name: ack-spec
description: >-
    Creates or repairs unit, integration, or e2e tests for code that exists through tester, unit to 100% coverage per file, integration and e2e on Testcontainers. Use for a failing suite, a coverage gap, or orphan specs. Not for new behaviour or a symptom whose cause is not in hand (ack-plan), or a src/ change from a plan or a pin (ack-build).
disable-model-invocation: true
model: sonnet
effort: high
context: fork
argument-hint: '<module or path filter, or the failing suite> [unit|integration|e2e]'
---

!`git status --short` !`git diff --name-only HEAD`

# ack-spec

You orchestrate in a fork. `tester` writes `test/`; `coder` writes a confirmed no-flow repair, test-first. On the coverage path the code wins: a spec asserts what `src/` does. A fork cannot ask the owner: every question is a hand-back. The project is a boilerplate with no external client: a repair builds the correct shape and changes every call site (`../ack-build/references/dispatch.md`, Every dispatch). If a `superpowers:*` skill is not installed, stop and say `claude plugin install superpowers@claude-plugins-official`. Pass `run_in_background: false` on every Agent call; parallel dispatches are several calls in one message (`../ack-build/references/dispatch.md`, Foreground dispatch).

## 1. Scope

Run the suite for the named scope and kind and read the failure; the scope is a Vitest path filter. Clear the cache before believing a coverage gap.

```bash
pnpm test <scope>                           # unit
pnpm test:integration <scope>               # integration, Docker daemon running
pnpm test:e2e <scope>                       # e2e, Docker daemon running
pnpm exec vitest --clearCache
```

Kind: `unit` continues. `integration` or `e2e` first checks `docker info` exits 0, then that the type's global-setup and setup files start every engine and fake the subject needs (`.claude/rules/testing.md`, Integration and e2e). A stopped daemon, or an engine the setup does not start, is a hand-back naming what is missing.

## 2. Classify

Every defect the run surfaces, and every defect `tester` hands back, is classified before anyone writes:

| Class | Meaning | Route |
| --- | --- | --- |
| spec wrong | the code moved and the spec was left behind, or the spec asserts a wish | `tester` |
| no-flow bug | confirmed defect; contract, guard stack, status code, and call order stay | `coder`, test-first |
| flow or decision | route, DTO, status code, guard, who may do what, or when; or two readings | hand back the question, or a sweep row |
| cause unknown | a red spec whose cause is not in hand: neither a stale spec nor a pinned defect | hand back the symptom, Next `/ack-plan` |

A pinned no-flow bug (files, cause at `file:line`, the change) goes straight to `coder`. A flow change is a hand-back naming `/ack-plan`.

## 3. Repair, through `coder`

Dispatch one `coder` per pinned no-flow bug (template `../ack-build/references/dispatch.md`, Coder, Pin form): files, cause at `file:line`, the change, `Scope` limited to those files and their `test/` mirrors. `Rules to read:` is the output of `bash .claude/hooks/rules.sh` over that `Scope`, pasted. Acceptance: the red spec quoted, then `pnpm typecheck` and `pnpm test <module>` green.

## 4. Cover, through `tester`

Dispatch `tester`:

```
Agent: tester
Scope: <src paths in scope and their test/ mirrors>
Kind: unit | integration | e2e
Bar: unit, 100% statements, branches, functions, and lines on every file in scope;
  integration and e2e, every subject in scope asserted the way testing.md sets
Source of truth: the code as it is on disk, including repairs this run landed
Mode: cover | repair | relocate only (move green specs, no new assertion)
Rules to read: <the output of bash .claude/hooks/rules.sh over the paths in Scope, pasted>
Report: specs written or repaired; per-file coverage rows; every line that cannot be
  covered without changing src/, with file:line and why; defects noticed, each with
  file:line, unfixed.
```

Add the Every dispatch block from `../ack-build/references/dispatch.md`. `tester` does not edit `src/`.

## 5. Reach 100%

Re-run the scope, then, for unit, run the full coverage suite; this is the only skill that does:

```bash
pnpm test <scope>
pnpm test:cov
```

Read the per-file rows, not the exit code (`references/sweep-log.md`, Coverage reading). A file in scope still short of 100 is another `tester` dispatch. The one thing that stops the loop is a line that cannot be covered without changing `src/`: classify it in step 2. Excluded paths (`vitest.config.ts` `coverage.exclude`) are not a gap here.

## 6. Sweep log

`generated/docs/report-src-sweep.md` is additive. Append one open row per flow or decision finding, under its heading; at the end of every run re-read every row against `src/` and mark gone defects SOLVED (`references/sweep-log.md`). Do not delete a row.

## 7. Verify

Invoke `superpowers:verification-before-completion`. The evidence is the output this run produced: the coverage totals with the command that produced them, every spec run with its filter and its `Tests` line, and each `coder` repair's red and green lines.

## Boundaries

Do not write a spec or a repair yourself; dispatch. Do not delete, `.skip`, or weaken a spec, lower a threshold, extend the exclude list, or add an ignore comment. Do not run the owner's DB and seed commands (`db:migrate`, `migration:*`, `db:studio`, `mongosh`, `redis-cli`); the reset and seeding inside the integration and e2e test helpers are part of the suites and run with them. No boot. Commits go through `ask`; propose the subject only.

## Hand back

Specs written or repaired by file; every no-flow bug fixed (file, line, change); every flow or decision handed back or logged; per-file coverage with the command; files at 100 and files short with the reason; sweep rows opened and rows marked SOLVED; a missing engine or fake when the kind was integration or e2e; one line per thing noticed outside the scope.

## Next

`/ack-plan` for a flow change the owner approved, or a failing spec whose cause is not pinned.
