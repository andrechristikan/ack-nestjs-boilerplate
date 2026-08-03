---
name: spec-coverage
description: Bring ONE named module's unit specs back to 100% coverage in ack-nestjs-boilerplate — repairing a suite the code moved out from under, deleting or relocating orphan specs, and backfilling files that shipped without one. Use when the owner names a module whose specs are broken, missing, or below 100% and no feature work is being done in this session. It writes `test/**/*.spec.ts` and nothing else — a business-logic defect it finds is reported, never fixed. NOT for a feature's tests (TDD by the `coder` agent inside `coding`), NOT for e2e or load tests, NOT invoked by `coding`.
---

# Spec coverage — one module, specs back to 100%

One job: take a module whose unit specs are broken, orphaned, or absent and get every
measured file in it to 100% without touching what the code does. `rules/testing.md` holds
HOW a spec is written; this skill holds the ORDER and the trap at each step. On disagreement
the rule file governs — fix the skill.

**One named module per run.** Not "the module and whatever else is red". A second module is a
second run.

**Every command in this run is SCOPED to that module (HARD).** Baseline, the agent's own run,
and the verification at step 2 all carry `--testPathPatterns test/modules/<feature>`. A bare
`pnpm test` is never run here and its result is never reported: a whole-repo number says
nothing about the module in hand and turns a finished run into an argument about failures
nobody asked you to fix.

## Shape is always repository-pattern flat (HARD)

This repo has **one** module shape: `controllers/` · `services/` · `repositories/` (plus the
other folder-per-concern dirs in `docs/project-structure.md`). Folder layout does not change mid-run. Orphan handling is only
"subject moved/renamed" or "subject genuinely gone" — never a delete-and-rewrite for a
layer migration.

## `src/` changes are out of scope — reject, do not absorb (HARD)

**This run produces `test/**/*.spec.ts` and nothing else.** No new behavior, no fix to a bug
it uncovers, no refactor of a file that is awkward to spec.

The one edit into `src/` that is sanctioned is the typo-or-syntax fix defined in
`unit-test-writer.md` → "The code wins": an edit that cannot change behavior for any input.
Everything else — an inverted condition, an off-by-one boundary, a missing check, a
status never written — is **pinned by a GREEN spec against current behavior and reported**.
Pinning the wrong behavior is what makes the eventual fix visible; a red spec left behind is
invisible.

**Why the bar is here and not in the agent's judgement:** a defect found while writing specs
arrives with the fix looking obvious and the diff looking harmless. It is neither — nobody
scoped it, nobody reviewed it as a behavior change, and it lands inside a diff every reviewer
is scanning as "just tests".

## Not this skill (HARD)

| The situation | Where it belongs |
|---|---|
| A feature, endpoint, or service is being built | `coding` — `coder` writes the failing spec FIRST; TDD there is not waived |
| The specs are red because the CODE is wrong and the owner wants the code fixed | `coding`, with `superpowers:systematic-debugging` — this skill reports defects, it does not fix them |
| e2e or load tests | out of scope entirely |

**`coding` never invokes this skill.** Feature TDD lives inside `coder`. This skill is a
standalone workflow for coverage backfill after code already exists.

## No spec, no plan (HARD)

**This skill writes no `.superpowers/` artifact.** No `superpowers:brainstorming`, no
`superpowers:writing-plans`. There is no design to settle — the code already exists, the
target is mechanical (100% on the measured files), and `rules/testing.md` already fixes every
stylistic decision. A plan for this run would restate the file list, which is what the scope
block is.

## The scope block (HARD)

**Compute it ONCE, at step 0, and paste it verbatim into the dispatch.** An agent given a
vague scope will widen it — and here widening means rewriting spec files nobody asked about.

```
SCOPE (do not go outside this)
  module:          <feature>
  subject paths:   src/modules/<feature>/**
  spec paths:      test/modules/<feature>/**
  module shape:    repository-pattern flat (controllers/services/repositories)
  green today:     <spec files passing right now, or NONE>
  orphan specs:    <spec files whose mirrored subject is gone>
  uncovered:       <measured src files with no spec at all>
  out of scope:    everything else, including src/ behavior that looks wrong
```

---

## The flow

### 0. Baseline and scope — everything this run is measured against

Without this snapshot there is no way at step 2 to tell a failure you caused from one that was
already there.

- `git branch --show-current`, `git status --short`.
- `ls src/modules/<feature>/` — expect repository-pattern folders (`controllers/`, `services/`,
  `repositories/`, …). Do not invent a layered tree.
- **Record what is GREEN today**, file by file:

  ```bash
  pnpm test --testPathPatterns test/modules/<feature>
  ```

  **Every file green here must still be green at step 2.** A module with no green specs at all
  is stated as such in the hand-back.
- **List the orphans** — spec files whose mirrored subject is gone:

  ```bash
  for f in $(find test/modules/<feature> -name '*.spec.ts'); do
    s="src/${f#test/}"; s="${s%.spec.ts}.ts"
    [ -f "$s" ] || echo "ORPHAN $f"
  done
  ```

  This produces the LIST. The agent decides each one's case (moved/renamed / genuinely gone)
  — but a list computed here is a list you can hold it to at step 3.
- **List what is measured and uncovered.** The measured suffixes are fixed by
  `test/jest.json` `collectCoverageFrom` and restated in `rules/testing.md`:

  `service` · `pipe` · `guard` · `strategy` · `interceptor` · `dto` · `decorator` ·
  `exception` · `filter` · `middleware` · `indicator` · `factory`

  **Controllers and repositories are NOT measured** and are not coverage gaps. A
  `*.module.ts` or `*.util.ts` is also not measured.
- Build the scope block.

### 1. Dispatch — `unit-test-writer`

One dispatch, the scope block verbatim, plus the target: **100% branches, functions, lines and
statements on every measured file under `src/modules/<feature>/`**, and the step-0 green set
still green in its mirrored location.

Tell it explicitly that no feature work is authorised and no code change is authorised beyond
the typo rule — it will otherwise read a broken suite as permission to "fix" production code.

It follows `rules/testing.md`; do not restate any of that file in the dispatch. What it cannot
resolve, and every suspected business-logic defect, lands in
`generated/docs/report-unit-test-<feature>.md` (gitignored working space).

`test/jest.setup.ts` (if present) and `test/jest.json` are already off limits to it —
`unit-test-writer.md` → "Hard boundaries" bans both. A package that meets a promotion criteria
comes back as a REPORT line. Do not re-authorise it in the dispatch.

**If it hands back unfinished, re-dispatch with the REMAINING files named.** Never widen the
scope to "whatever is still red".

### 2. Verify what the agent could not see from inside its scope

The agent runs its own scoped suite and reports. This step is the part its scope block does not
cover.

**Coverage is OFF by default.** `collectCoverage` is `false` in `test/jest.json`, so a plain
`pnpm test` never produces coverage numbers. Verification MUST pass `--coverage`, and must
override the denominator to the module — quote the glob, zsh expands braces:

```bash
pnpm test --testPathPatterns test/modules/<feature> --coverage \
  --collectCoverageFrom='src/modules/<feature>/**/*.{service,pipe,guard,strategy,interceptor,dto,decorator,exception,filter,middleware,indicator,factory}.ts'
```

That mirrors the repo's measured-suffix list scoped to one module, so the 100% threshold becomes
a real gate instead of counting untouched files (or counting nothing). Widening the glob to
`**/*.ts` drags controllers, repositories, and module files into the denominator and makes 100%
unreachable or meaningless.

Then check the three things the agent's own report cannot establish:

- **The step-0 green set is still green.** A file green at baseline and red now is this run's
  failure, not a pre-existing one.
- **Every orphan on the step-0 list is accounted for** — moved, rewritten, or deleted, each
  named in the hand-back. An orphan silently left in place still counts its subject as uncovered.
- **`test/jest.json` (and `test/jest.setup.ts` if present) are unchanged.** `git diff --stat test/`
  shows only spec files under the module's own path.

### 3. Hand the reports to the owner

Read `generated/docs/report-unit-test-<feature>.md` and put it in front of the owner as one list:

- suspected business-logic defects, each with the spec that now pins the current behavior,
- `src/` typos the agent fixed in place,
- orphan specs deleted, and what proved the subject was gone,
- files still short of 100% and why,
- specs still red, separated into "red at baseline" and "red because of this run",
- a repeated `jest.mock()` worth promoting into a shared setup (if applicable), with its file
  count — reported, never applied here.

Nothing here is closed by this step. It is surfaced, and the owner decides what becomes a
`coding` task.

---

## What this run must never do to reach green

`rules/testing.md` → "Hard boundaries" is the canonical list and governs. The three that
this workflow in particular invites:

- **Lowering the coverage threshold or excluding a file from `collectCoverageFrom`.** The
  override at step 2 is a scoped MEASUREMENT on the command line; `test/jest.json` is not edited.
- **Deleting or `.skip`-ing a failing spec whose subject still exists.** That is a rewrite to what
  the code does today, plus a named behavior change. Only a true orphan is deleted.
- **Fixing the code so the spec you wanted to write passes.** The spec follows the code. Report it.
