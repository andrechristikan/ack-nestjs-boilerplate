# Testing

## Local jest facts

- Run: `pnpm test` → `TZ=UTC jest --config test/jest.json --passWithNoTests --detectOpenHandles`.
- Transform is `@swc/jest`; coverage provider is `v8`; `testTimeout` is 5000ms.
- `@golevelup/ts-jest` is available for typed mock creation.
- **`jest.mock()` goes AFTER imports**, never before.
- Scope a run while iterating: `pnpm test --testPathPatterns <path fragment>`.

## Where specs live — mechanical, not stylistic

Specs mirror `src/` under `test/`:

```
src/modules/user/services/user.service.ts
  → test/modules/user/services/user.service.spec.ts

src/common/pagination/services/pagination.service.ts
  → test/common/pagination/services/pagination.service.spec.ts
```

`testMatch` is `<rootDir>/test/**/*.spec.ts`. A spec written anywhere else — colocated in `src/`, or under a different root — **is never executed**, while `collectCoverageFrom` still counts its subject as uncovered. Never colocate.

## What is covered

`collectCoverageFrom` targets these, under `src/{modules,common}` (plus `src/app` for dtos, filters, and middlewares):

`*.service.ts` · `*.pipe.ts` · `*.guard.ts` · `*.strategy.ts` · `*.interceptor.ts` · `*.dto.ts` · `*.decorator.ts` · `*.exception.ts` · `*.filter.ts` · `*.middleware.ts` · `*.indicator.ts` · `*.factory.ts`

**Controllers and repositories are deliberately NOT in the coverage set.** A controller is route delegation and a repository is a Prisma call shape — specs there would assert the mock, not our behavior. If you find yourself wanting one, the logic is probably in the wrong layer.

**Coverage threshold is 100% global** — branches, functions, lines, statements. That number is only meaningful if the branches are real: 100% reached with happy paths alone means every guard clause in the file is untested and the threshold is lying to you.

## TDD

**WHEN is decided by the kind of work, not by preference.**

- **New behavior or a bug fix** (service method, guard, pipe, interceptor, filter, factory, …): TDD is mandatory. Write the failing spec FIRST, watch it fail, then implement. The same head that implements must watch the red — never split the test-first step onto a later pass.
- **Coverage backfill against code that already exists:** there is no TDD. The existing `src/` code wins (see Hard boundaries below).

- **A TDD spec IS the unit test.** It is written at its final path and stays as the regression net. There is no separate later step and it is never thrown away.
- A pure structural refactor moves the spec with its subject; it must be green before the work is done.

## How to spec each layer

The layer decides what is real and what is doubled.

- **Service** — mock the repository and every injected service; assert the orchestration (which method was called, with what, in what order) and the thrown exception TYPE for each failure branch. Assert on the exception class and the enum member, never on a message string.
- **Guard / strategy** — assert transport behavior only: metadata read, delegation to the service, the value assigned onto `request.<field>`, the boolean returned. The authorization decision itself belongs to the service's spec.
- **Pipe** — feed the real input shapes, assert the transformed output and the thrown validation error.
- **Interceptor / filter** — assert the emitted shape (`IResponseReturn`, `ResponseErrorDto`) and the headers set. These are the highest-value cheap specs in the repo.
- **DTO** — assert that `ResponseUtil.serialize()` returns exactly the `@Expose()`d fields and that nothing sensitive rides along. This spec is the executable form of the whitelist rule (`rules/validation.md`).
- **Exception** — assert `module`, `statusCode`, `statusCodeKey`, `httpStatus`, and `messagePath`. Cheap, and it catches the `statusCodeKey` / `statusCode` mismatch that compiles fine.
- **Factory / indicator** — construct through the real path; mock only the I/O boundary.

Do not spec framework wiring, Prisma itself, or a `@Module` decorator. There is no behavior of ours in them.

## Hard boundaries

Scope matters — these two kinds of work treat production code differently:

- **TDD (new behavior / bug fix):** changing production code to turn a failing TDD spec green **is the job**. The hard boundary below does **not** apply to that red→green step.
- **Coverage backfill (existing code):** the existing `src/` code wins. **Do NOT change production code to make a spec pass.** If the code is wrong, the failing spec IS the deliverable: leave it red and report the defect with file and line. The only sanctioned `src/` edit during backfill is a typo or syntax fix that cannot change behavior for any input.

Always:

- **Do NOT delete, `.skip`, or weaken a failing spec to reach green.** A spec that was asserting something real and now fails is either a regression or a contract that changed deliberately — decide which and say which.
- **Do NOT lower the coverage threshold**, exclude a file from `collectCoverageFrom`, or add an ignore comment to reach 100%.
- If a file is genuinely untestable as written (a hard `new Date()`, a static global, an unmockable import), report it as a design defect to fix rather than building an elaborate mock around it.

A spec that passes against a broken implementation is worse than no spec: it converts an untested file into a file everyone believes is tested. Before finishing any spec, break the code it covers in your head and confirm the spec would catch it.
