# Testing — where specs live and how the suite runs

One discipline, one place. Whoever touches a `*.spec.ts` in this repo follows this file, and
`testing-spec-style.md` beside it when actually writing one.

**A spec's measure of success is that it fails when the BEHAVIOR changes** — not that it
passes, and not that it fails when someone merely rearranges the code.

## Where specs live (HARD)

Specs mirror `src/` under `test/`, same relative path, filename plus `.spec.ts`:

```
src/modules/user/services/user.service.ts
  → test/modules/user/services/user.service.spec.ts

src/common/pagination/services/pagination.service.ts
  → test/common/pagination/services/pagination.service.spec.ts
```

This is mechanical, not stylistic: `test/jest.json` `testMatch` is
`<rootDir>/test/**/*.spec.ts`. A spec written anywhere else — colocated in `src/`, or under a
different root — **is never executed**, while `collectCoverageFrom` still counts its subject as
uncovered. Never colocate a spec in `src/`.

A pure structural refactor moves the spec with its subject: same mirrored path, green before
the work is done.

## Local jest facts

- **`test/jest.json` is the ONLY jest configuration in this repository, and no second one is
  ever created (HARD).** A run is `pnpm test`, which is
  `TZ=UTC jest --config test/jest.json --passWithNoTests --detectOpenHandles`; a scoped run
  adds `--testPathPatterns`, never `--config`. Do not write a `jest.config.*`, a `jest` key in
  `package.json`, a per-module or per-suite config file, or a throwaway config under the
  scratchpad to make one spec run. A spec that will not run under `test/jest.json` is a spec
  in the wrong place or a transform gap in that file — fix the path or add the entry to
  `test/jest.json`. A second config silently changes `testMatch`, `setupFilesAfterEnv`, the
  transform, and `collectCoverageFrom`, so a suite that is green under it proves nothing about
  the suite the hook and CI actually run.
- Transform is `@swc/jest`; coverage provider is `v8`; `testTimeout` is 5000ms.
- `@golevelup/ts-jest` is available for typed mock creation.
- **`jest.mock()` goes AFTER imports**, never before.
- Scope a run: `pnpm test --testPathPatterns <path fragment>`. **Jest 30 — the flag is
  `--testPathPatterns`, plural; the old singular `--testPathPattern` is rejected with a
  config error.**
- **`collectCoverage` is `false` in `test/jest.json`.** `pnpm test` does not collect coverage
  and does not apply the threshold. `pnpm test:cov` is the same command plus `--coverage`,
  which is when `coverageThreshold` runs. **A scoped `pnpm test` that exits 0 is not a coverage
  pass.** A scoped `pnpm test:cov` exits 1 while every spec passes, because the threshold is
  GLOBAL and a scoped run measures a few percent of `src/` — read the `Tests:` line and the
  per-file rows for the files you touched; the exit code and the global summary mean nothing
  on a scoped coverage run.
- **Coverage threshold is 100% global** — branches, functions, lines, statements — when
  coverage is collected. That number is only meaningful if the branches are real: 100% reached
  with happy paths alone means every guard clause in the file is untested and the threshold is
  lying to you.
- **A run is SCOPED to the module being worked on, always.** `pnpm test --testPathPatterns
  '<module>'`, where the module is one the work actually CHANGED — a module you only read is
  not in scope. No skill except `/ack-spec` runs the full suite; the `pre-commit` hook
  runs `pnpm test` (no coverage) on every commit, and that is where a broken global mock or
  shared fixture surfaces. Reporting a scoped run as if it were the whole suite is the one
  thing that turns this into a lie — name the pattern you passed.

## What is covered

`collectCoverageFrom` targets these, under `src/{modules,common}` (plus `src/app` for dtos,
filters, and middlewares):

`*.service.ts` · `*.pipe.ts` · `*.guard.ts` · `*.strategy.ts` · `*.interceptor.ts` ·
`*.dto.ts` · `*.decorator.ts` · `*.exception.ts` · `*.filter.ts` · `*.middleware.ts` ·
`*.indicator.ts` · `*.factory.ts`

**Controllers and repositories are deliberately NOT in the coverage set.** A controller is
route delegation and a repository is a Prisma call shape — specs there would assert the mock,
not our behavior. If you find yourself wanting one, the logic is probably in the wrong layer.

**`collectCoverageFrom` decides WHAT gets a spec, and an excluded tree gets NONE (HARD).**
`src/migration/**`, `src/router/**`, `src/configs/**`, `src/languages/**`, and the root
`src/*.ts` files are outside the globs. Wanting coverage on an excluded tree is a request to
change `test/jest.json`, which is the owner's call, never a spec written around the config.

A file whose suffix is NOT on that list is not measured at all — `*.module.ts`, `*.enum.ts`,
`*.interface.ts`, `*.constant.ts`, `*.util.ts`, `*.processor.ts`, `*.repository.ts`,
`*.controller.ts`. Adding a suffix to the list adds every existing file carrying it to the
100% denominator at once.

## TDD

**WHEN is decided by the kind of work, not by preference.**

- **New behavior or a bug fix** (service method, guard, pipe, interceptor, filter, factory, …):
  TDD is mandatory. Write the failing spec FIRST, watch it fail, then implement. The same head
  that implements must watch the red — never split the test-first step onto a later pass.
- **Coverage backfill against code that already exists:** there is no TDD. The existing `src/`
  code wins (see Hard boundaries below).

- **A TDD spec IS the unit test.** It is written at its final path and stays as the regression
  net. There is no separate later step and it is never thrown away.

## Writing the spec itself

The skeleton, the mocking rules, the assertion style, the casting rules, and how to spec each
layer live in `.claude/rules/testing-spec-style.md`. Read that file whenever you WRITE or
REPAIR a spec. This file covers where specs live, how the runner is configured, and what is
never done to reach green — which is what someone who only RUNS the suite needs.

## Hard boundaries

Scope matters — these two kinds of work treat production code differently:

- **TDD (new behavior / bug fix):** changing production code to turn a failing TDD spec green
  **is the job**. The hard boundary below does **not** apply to that red→green step.
- **Coverage backfill (existing code):** the existing `src/` code wins. **Do NOT change
  production code to make a spec pass.** If the code is wrong, the failing spec IS the
  deliverable: leave it red and report the defect with file and line. The only sanctioned
  `src/` edit during backfill is a typo or syntax fix that cannot change behavior for any
  input.

Always:

- **Do NOT delete, `.skip`, or weaken a failing spec to reach green.** A spec that was
  asserting something real and now fails is either a regression or a contract that changed
  deliberately — decide which and say which.
- **Do NOT lower the coverage threshold**, exclude a file from `collectCoverageFrom`, or add
  an ignore comment to reach 100%.
- **Do NOT write e2e or load tests here.** Unit specs only.
- If a file is genuinely untestable as written (a static global, an unmockable import), report
  it as a design defect to fix rather than building an elaborate mock around it. A hard
  `new Date()` is NOT one of these — `jest.useFakeTimers()` in `beforeAll` covers it.

A spec that passes against a broken implementation is worse than no spec: it converts an
untested file into a file everyone believes is tested. Before finishing any spec, break the
code it covers in your head and confirm the spec would catch it.
