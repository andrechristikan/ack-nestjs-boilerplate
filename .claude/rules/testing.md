# Testing — where specs live and how the suite runs

One discipline, one place. Whoever touches a `*.spec.ts` in this repo follows this file, and
`testing-spec-style.md` beside it when actually writing one.

**A spec's measure of success is that it fails when the BEHAVIOR changes** — not that it
passes, and not that it fails when someone merely rearranges the code.

## Kinds of test (HARD)

Three kinds. Each has one subject and one I/O story. A file that mixes them is the wrong
kind for every assertion it makes.

| Kind | Subject | I/O | What it proves |
|---|---|---|---|
| **Unit** | One class: a domain, HTTP or processor service, util, cache, queue, guard, pipe, interceptor, filter, DTO, exception | Collaborators doubled (`mock<T>()` / `mockDeep<T>()`) | The class's behaviour |
| **Integration** | One adapter: a repository, or another class whose job is a real engine | Prisma and MongoDB (replica set), or Redis, are real | The query or command against that engine |
| **E2E** | One transport path: an HTTP route or a consumed job | The running app | Wiring from the edge through guards, pipes, interceptors, domain, and persistence |

This repository's suite is **unit**. `pnpm test` and `pnpm test:cov` collect `test/**/*.spec.ts`
through `vitest.config.ts`. `coder` and `test-writer` write that kind and no other. Integration
tests, e2e tests, and load tests are not this suite: they are not authored under `test/`, they
are not in that `include`, and they have no TDD cycle here.

`reviewer-e2e` is a read-only review agent that traces a flow in source. It is not an e2e
suite and it writes no test.

### Unit

Every DI collaborator is a double. The subject is the one class that is real
(`rules/testing-spec-style.md`).

- A domain spec doubles the repository (`mock<UserRepository>()`) and asserts orchestration
  and typed exceptions. That is how a repository is present in the unit suite.
- An HTTP or processor service spec doubles the domain. It never reaches a repository.
- A repository is the double, never the subject. Constructing `UserRepository` and stubbing
  `databaseService.client` is still a unit spec of the adapter: it freezes a Prisma `where` /
  `select` shape and does not prove the query against MongoDB. Those files sit outside the
  coverage set.
- A controller and a processor are route or job delegation. They have no unit spec.
- OpenAPI composition on runtime decorators (`@Doc`, `@Response*`, `*Protected`, `FileUpload*`) has no unit spec.
- A contract is a lookup table. The consumer's unit spec exercises it.

TDD is this kind (`coder`). `/ack-spec` covers this kind against code that already exists,
and repairs a confirmed no-flow bug through `coder`.

### Integration

The adapter is the subject. Prisma and the MongoDB replica set are real. Doubling
`DatabaseService.client` makes the file a unit spec of the repository, which this suite does
not write.

This kind is how a Prisma `where`, a `groupBy`, a soft-delete filter, or an id mapping is
proven against the engine. It is not authored under `test/` and it is not collected by
`vitest.config.ts`.

### E2E

The subject is a request or a job entering the running process. Guards, pipes, interceptors,
the HTTP or processor service, the domain, and the repository all run for real.

This kind is not authored under `test/` and it is not collected by `vitest.config.ts`. Load
tests are the same ban.

## Where specs live (HARD)

Specs mirror `src/` under `test/`, same relative path, filename plus `.spec.ts`:

```
src/modules/session/domains/session.domain.ts
  → test/modules/session/domains/session.domain.spec.ts

src/modules/user/services/user.http.service.ts
  → test/modules/user/services/user.http.service.spec.ts

src/common/pagination/services/pagination.service.ts
  → test/common/pagination/services/pagination.service.spec.ts
```

This is mechanical, not stylistic: `vitest.config.ts` `test.include` is
`test/**/*.spec.ts`. A spec written anywhere else — colocated in `src/`, or under a
different root — **is never executed**, while `coverage.include` still counts its subject as
uncovered. Never colocate a spec in `src/`.

A pure structural refactor moves the spec with its subject: same mirrored path, green before
the work is done.

## Local Vitest facts

- **`vitest.config.ts` is the ONLY test configuration in this repository, and no second one is
  ever created (HARD).** A run is `pnpm test`, which is `TZ=UTC vitest run --passWithNoTests`;
  a scoped run appends a path filter, never `--config`. Do not write a `vitest.workspace.*`, a
  second `vitest.config.*`, a `test` key in `vite.config.*`, or a throwaway config under the
  scratchpad to make one spec run. A spec that will not run under `vitest.config.ts` is a spec
  in the wrong place or a transform gap in that file — fix the path or the config. A second
  config silently changes `include`, the transform, the alias resolution and
  `coverage.include`, so a suite that is green under it proves nothing about the suite the
  hook and `.github/workflows/test.yml` actually run.
- SWC transforms through `unplugin-swc` (`module: nodenext`), so decorator metadata matches the
  build. `resolve.tsconfigPaths` resolves the `tsconfig.json` aliases, so a spec imports
  `@modules/…` / `@common/…` exactly as `src/` does. `globals` is on, `environment` is `node`,
  `testTimeout` is 5000ms.
- **`isolate` is `false`.** The suite is `environment: 'node'` and every spec resets doubles
  in `beforeEach`, so Vitest reuses workers across files. `fsModuleCache` is `true`; SWC
  transforms persist under `node_modules/.vitest-cache`. `pool` is the default `forks`
  (Prisma and other native modules can segfault under `threads`). Isolation is not split
  across a second config or a workspace.
- **`test/setup.ts` is `test.setupFiles`.** It mutes Nest `Logger` by assigning no-ops onto
  the class (instance and static) and onto `ConsoleLogger.prototype`.
  `Test.createTestingModule()` installs Nest's `TestingLogger`, whose `error` still prints,
  so the mute is those no-ops — not `Logger.overrideLogger(false)`, not
  `vi.mock('@nestjs/common')`, and not a `console` spy. Do not re-mock `Logger` in a spec
  (`rules/testing-spec-style.md`).
- Blob reports and JSON output land in `.vitest/`, which is gitignored.
- Typed doubles come from `vitest-mock-extended` (`mock<T>()`, `mockDeep<T>()`,
  `MockProxy<T>`, `DeepMockProxy<T>`). The skeleton and its rules are in
  `testing-spec-style.md`.
- **`vi.mock()` is written AFTER the imports**, never before. Vitest hoists it either way; the
  position is the house layout.
- Scope a run: `pnpm test <path fragment>` — the positional argument filters spec files by
  path. `pnpm test user.domain` runs every spec whose path contains that fragment.
- **`coverage.enabled` is `false` in `vitest.config.ts`.** `pnpm test` does not collect
  coverage. `pnpm test:cov` is the same command plus `--coverage`, which is when coverage is
  collected and `coverage.thresholds` (100% branches, functions, lines, statements) apply.
  **A scoped `pnpm test` that exits 0 is not a coverage pass.** A scoped `pnpm test:cov` exits
  1 while every spec passes, because the threshold is GLOBAL and a scoped run measures a few
  percent of `src/` — read the `Tests` line and the per-file rows for the files you touched;
  the exit code and the global summary mean nothing on a scoped coverage run.
- **Coverage threshold is 100% global** — branches, functions, lines, statements — whenever
  coverage is collected. That number is only meaningful if the branches are real: 100% reached
  with happy paths alone means every guard clause in the file is untested and the threshold is
  lying to you.
- **A run is SCOPED to the module being worked on, always.** `pnpm test <module>`, where the
  module is one the work actually CHANGED — a module you only read is not in scope. No skill
  except `/ack-spec` runs the full suite; the `pre-commit` hook runs `pnpm test` (no coverage)
  on every commit, and that is where a broken global mock or shared fixture surfaces.
  Reporting a scoped run as if it were the whole suite is the one thing that turns this into a
  lie — name the filter you passed.
- **GitHub Actions.** `.github/workflows/test.yml` runs `NODE_ENV=test pnpm test` on
  `workflow_dispatch`. `.github/workflows/linter.yml` runs on `pull_request`.

## What is covered

`coverage.include` is every `src/**/*.ts`, minus a denylist in `vitest.config.ts`:

`*.module.ts` · `*.enum.ts` · `*.interface.ts` · `*.constant.ts` · `*.contract.ts` ·
`*.controller.ts` · `*.processor.ts` · `*.repository.ts` · `src/generated/**` ·
`src/migration/**` · `src/router/**` · `src/configs/**` · `src/languages/**` · the root
`src/*.ts` files

Everything else is measured: services, domains, utils, caches, queues, guards, pipes,
interceptors, filters, middlewares, strategies, indicators, factories, decorators
(including the doc kit in `src/common/doc/`), validations, exceptions and DTOs.

**Controllers, processors, repositories, and contracts are not in the coverage set.** A
controller and a processor are delegation, a repository is a Prisma call shape, and a
contract is a lookup table — specs there would assert the mock, restatement, or TypeScript
already proved. If you find yourself wanting a controller, processor, or repository spec,
the logic is probably in the wrong layer. A contract is exercised by the consumer that reads
it (a domain or a pipe), not by a spec of the table. OpenAPI composition on `@Doc` /
`@Response*` / `*Protected` / `FileUpload*` is not a unit subject.

**The denylist decides WHAT gets a spec for `/ack-spec`, and an excluded file gets NONE
(HARD).** Wanting coverage on an excluded path is a request to change `vitest.config.ts`,
which is the owner's call, never a spec written around the config. Adding a path to the
denylist, or removing one, changes the 100% denominator at once.

## TDD (HARD)

New behaviour and a repair go through TDD. Write the failing spec first, watch it fail
because the behaviour is absent, then implement. `coder` writes both halves of that cycle.
The skill is `superpowers:test-driven-development`.

A spec lives at its final path under `test/` and stays as the regression net. TDD is the
**unit** cycle. When the behaviour lives on a domain, the TDD subject is that domain class
(`rules/architecture.md`).

Seeds, controllers, processors, repositories, and contracts have no TDD cycle (the coverage
denylist excludes them). The run surface has no TDD cycle (`rules/architecture.md`). A contract row is the
`src/` that turns the consumer's unit spec green. A repository's presence in that cycle is
the double in the domain spec.

## The code is the specification (`/ack-spec`)

When the job is to cover code that already exists, `src/` wins. `/ack-spec` writes those
specs through `test-writer`.

A **confirmed bug that does not change a flow** is repaired here through `coder`, test-first,
then reported. A flow change or a decision is asked of the owner or appended to
`generated/docs/report-src-sweep.md`.

## Writing the spec itself

The skeleton, the mocking rules, the assertion style, the casting rules, and how to spec each
layer live in `.claude/rules/testing-spec-style.md`. Read that file whenever you WRITE or
REPAIR a spec. This file covers where specs live, how the runner is configured, and what is
never done to reach green — which is what someone who only RUNS the suite needs.

## Hard boundaries

Which skill is running decides who wins:

- **TDD (`coder` / `/ack-code`, and `/ack-spec` on a no-flow repair):** changing `src/` to
  turn a failing spec green is the job.
- **`/ack-spec` coverage path:** the existing `src/` wins. **Do NOT change production code
  to make a coverage spec pass.** If the code is a flow change or a decision, pin the spec
  green against current behaviour and ask or record the defect with file and line. The only
  sanctioned `src/` edit on the coverage path is a typo or syntax fix that cannot change
  behavior for any input.

Always:

- **Do NOT delete, `.skip`, or weaken a failing spec to reach green.** A spec that was
  asserting something real and now fails is either a regression or a contract that changed
  deliberately — decide which and say which.
- **Do NOT lower the coverage threshold**, add a path to the coverage denylist, or add an
  ignore comment (`/* v8 ignore */`) to reach 100%.
- **Do NOT write integration, e2e, or load tests in this tree.** The suite is unit specs
  (`Kinds of test` above).
- If a file is genuinely untestable as written (a static global, an unmockable import), report
  it as a design defect to fix rather than building an elaborate mock around it. A hard
  `new Date()` is NOT one of these — `vi.useFakeTimers()` in `beforeAll` covers it.

A spec that passes against a broken implementation is worse than no spec: it converts an
untested file into a file everyone believes is tested. Before finishing any spec, break the
code it covers in your head and confirm the spec would catch it.
