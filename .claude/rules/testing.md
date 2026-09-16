# Testing

## Local Vitest facts

- Run the complete suite with `pnpm test`.
- Scope a run by passing a test path after the script name: `pnpm test test/modules/<feature>`.
- Coverage uses the V8 provider and is off by default. Enable it with `--coverage` and scope source collection with `--coverage.include='<glob>'` when a coverage report is useful.
- Import `describe`, `expect`, `it`, `beforeEach`, and `vi` from `vitest`; do not depend on globals.
- Use `vi.fn()`, `vi.spyOn()`, and `vi.mock()` for test doubles. `vi.mock()` is hoisted; values used by its factory must be created with `vi.hoisted()` or inside the factory.
- Put `vi.mock()` and `vi.hoisted()` at file scope. Prefer the type-checked `vi.mock(import('<module>'), factory)` form for project modules, and use `vi.mocked()` to work with mocked exports without casts.
- Prefer `@golevelup/ts-vitest`'s `createMock<T>()` for injected collaborators and framework/third-party transport types such as `ExecutionContext`, `ArgumentsHost`, `CallHandler`, Express `Request`/`Response`, and nested clients. Its methods are typed Vitest mocks, including nested members. Configure every behavior that decides the branch under test; use `createMock<T>({}, { strict: true })` when an unexpected call should fail immediately. Small explicit `Pick` plus `satisfies` doubles remain valid when they are clearer. Do not add another deep-mock package.
- The canonical configuration and setup files are `vitest.config.mts` and `test/vitest.setup.ts` when a shared setup is needed.

## Vitest configuration contract

- Define the unit runner in root `vitest.config.mts` with `defineConfig()` and resolve the aliases from `tsconfig.json` through `vite-tsconfig-paths` or explicit Vite aliases.
- Use the Node environment and include only `test/**/*.spec.ts` in the unit project. Keep globals disabled; every spec imports its APIs from `vitest`.
- The `test` script runs once with `vitest run`. Watch mode is a separate script. Coverage is a separate opt-in flag or script.
- Use `@vitest/coverage-v8`. Configure `coverage.include` for the source layers eligible under this rule so unloaded files appear in a full report; exclusions must represent deliberate non-unit-test surfaces, never missing coverage.
- Keep file isolation enabled. Do not trade shared module state between specs for speed.
- Use `test/vitest.setup.ts` only for initialization or identical module mocks required by the whole suite. A setup file must not hide subject-specific fixtures or behavior.
- The TypeScript transform must preserve the decorator semantics and metadata Nest providers require. Verify the chosen configuration by compiling and resolving a representative decorated provider through `Test.createTestingModule()`; use Nest's documented SWC integration when the default transform cannot preserve that contract.
- Do not install compatibility globals, aliases, or bridge packages. A spec uses Vitest APIs directly.

## Nest test harness

- Instantiate a class directly when the test needs no Nest container behavior.
- Use `Test.createTestingModule(...).compile()` when constructor injection, injection tokens, provider overrides, or Nest lifecycle behavior are part of the setup.
- Register the real subject and explicit doubles for its collaborators. Do not import a production feature module into a unit spec.
- Retrieve singleton providers with `moduleRef.get()`. Retrieve request-scoped or transient providers with `moduleRef.resolve()`; repeated `resolve()` calls create different DI sub-trees unless the same context id is supplied.
- Use `.overrideProvider()` when a test intentionally compiles imported Nest wiring. Use `.useMocker()` only when a reusable mock factory remains explicit about every behavior the subject reads; an auto-mock without an implementation must not decide a branch accidentally.
- Close a compiled module in teardown only when the test activates lifecycle hooks or resources that require shutdown. A unit spec must not open real infrastructure.

## Where specs live

Specs mirror `src/` under `test/`:

```text
src/modules/session/domains/session.domain.ts
  -> test/modules/session/domains/session.domain.spec.ts

src/modules/user/services/user.http.service.ts
  -> test/modules/user/services/user.http.service.spec.ts

src/common/pagination/services/pagination.service.ts
  -> test/common/pagination/services/pagination.service.spec.ts
```

The Vitest include pattern is `test/**/*.spec.ts`. A spec written elsewhere is not part of the unit suite. Never colocate specs in `src/`.

`test/support/` holds shared, explicitly-imported test doubles/utilities that are not themselves specs (e.g. `test/support/execution-context.mock.ts`). It is not mirrored from `src/`, is outside the `test/**/*.spec.ts` include pattern, and is distinct from `test/vitest.setup.ts` (global initialization/module mocks applied to every spec automatically). Import from it with the `@test/*` path alias.

## What earns a unit spec

Test behavior whose regression would affect security, authorization, state transitions, validation, serialization, error mapping, external-I/O orchestration, or queue dispatch. Select subjects by risk, not by filename suffix and not to make a coverage percentage look complete.

Default priorities:

- **Service:** yes when it owns business decisions or multi-collaborator orchestration.
- **Guard / strategy:** yes for authentication, authorization, metadata, and request-context behavior.
- **Pipe / validator:** yes for parsing, normalization, allow-lists, boundaries, and rejection behavior.
- **Interceptor / filter / substantive middleware:** yes for response/error shape, headers, context propagation, and security behavior.
- **Factory / indicator / processor:** yes when it branches, maps failures, dispatches work, or crosses an I/O boundary.
- **DTO:** only for security-sensitive response whitelists, nested serialization, non-trivial transforms, or important validation contracts. Do not create a spec for every declarative DTO.
- **Decorator:** only when metadata values, composition, or arguments are a meaningful contract. Do not test a pass-through wrapper merely because it exists.
- **Exception:** test the shared exception mapping and any exceptional class with custom behavior. Do not create one repetitive spec per constant-only exception subclass.
- **Utility:** test pure logic with meaningful branches or security/domain rules.

Controllers and repositories are deliberately not unit-test targets. Controllers should only delegate routes, while repository specs usually assert mocked Prisma call shapes rather than owned behavior. Test framework wiring, module decorators, constants, enums, interfaces, and generated code through typecheck, boot checks, or higher-level tests instead.

Start with the smallest suite that protects critical contracts. Coverage is diagnostic evidence during that first pass, and coverage below 100% is expected.

The long-term goal is 100% branches, functions, lines, and statements. Move toward it incrementally by adding meaningful contracts in risk order and ratcheting established thresholds upward. Never add equivalent permutations or framework-behavior tests solely to increase a percentage, and never let line coverage hide an untested material branch.

## Minimum case design

For each selected subject, start with the smallest useful set:

1. One representative success path.
2. One case for each materially different security, validation, or business-rule failure branch.
3. One boundary case only where the boundary changes behavior.
4. One collaborator-failure case only when the subject translates, compensates for, or deliberately propagates that failure.

Use table-driven cases when several inputs exercise the same rule. Do not duplicate tests for aliases, equivalent enum members, or framework behavior already covered upstream.

## How to spec each layer

- **Service:** mock repositories and injected services; assert observable orchestration, important argument mapping, required order only when order is contractual, and the exception type for each material failure. Assert the exception class and enum member, never a message string.
- **Guard / strategy:** assert metadata reads, service delegation, request-context assignment, and the returned or rejected transport result. The underlying authorization decision belongs to the service spec.
- **Pipe / validator:** pass real input shapes; assert transformed output and the typed validation error for representative invalid classes.
- **Interceptor / filter:** assert the emitted `IResponseReturn` / `ResponseErrorDto` shape, status, and headers. Mock the transport boundary, not RxJS itself.
- **Middleware:** assert only project-owned decisions and side effects. Do not retest third-party middleware internals.
- **DTO:** serialize through `ResponseUtil.serialize()` for response whitelists; use the real validation/transform path for request contracts. Prefer one focused contract per response family over one spec per DTO.
- **Exception:** assert shared mapping invariants or genuinely custom fields through table-driven cases.
- **Factory / indicator:** construct through the real path and mock only external I/O.
- **Processor:** assert job-name dispatch, payload forwarding, return shape, and unknown-job or translated-failure behavior when present. Business work remains in processor-service specs.
- **Utility:** assert inputs and outputs directly, including only behavior-changing boundaries.

## TDD and backfill

- **New behavior or a bug fix:** TDD is mandatory. Write the failing final-path spec first, watch it fail for the expected reason, implement, then watch it pass.
- **Coverage backfill for existing code:** characterize the current working-tree behavior without changing production behavior. A suspected defect is reported and pinned by a green characterization test only when the current behavior is a meaningful contract; do not invent a test merely to preserve an obvious accident.
- **Structural refactor:** move the mirrored spec with its subject and keep its behavior green.

The same implementer performs the TDD red-to-green loop. `test-writer` is for standalone backfill or repair, not feature implementation.

## Isolation and hygiene

- One subject per spec file unless a table-driven contract intentionally covers a small family such as exception mappings or DTO serialization.
- Recreate mutable fixtures in `beforeEach`; no state leaks across cases.
- Keep fast, deterministic pure functions real when that does not broaden the subject. Mock injected collaborators, databases, Redis, queues, clocks, random values, filesystem access, and network clients at the nearest owned boundary.
- Prefer deterministic clocks and IDs. Use `vi.useFakeTimers()` and `vi.setSystemTime()` for time-dependent behavior, and restore real timers after each case that changes them.
- Reset mock calls and implementations between cases. Restore every `vi.spyOn()` target so a real object is never left patched for the next case.
- A unit suite must not boot real infrastructure or reach the network.
- Never commit `.only` or use `.skip` / `.todo` as a way to make a run green.

## Hard boundaries

- Do not add controller or repository unit specs unless the architecture first changes and gives that class project-owned behavior.
- Do not lower configured coverage thresholds, narrow configured coverage includes, or add ignore comments to hide missing tests.
- Do not edit production code during coverage backfill. Report every blocking source defect for a separate fix workflow.
- Do not delete or weaken a meaningful failing spec. Decide whether it exposes a regression or an intentional contract change and report that decision.
- If a subject is untestable because it hard-codes time, randomness, global state, or construction of an I/O client, report the design defect instead of building an elaborate mock around it.
- Do not call, expose, or spy on a private method to satisfy coverage. Exercise it through the public contract; an unreachable private branch is a design or coverage-scope finding, not a reason to couple a spec to internals.

Before finishing, mentally break the behavior the spec claims to protect. If the spec would still pass, improve or remove it.

## Official references

- Nest testing facilities: https://docs.nestjs.com/fundamentals/testing
- Nest Vitest and path-alias setup: https://docs.nestjs.com/recipes/swc#vitest
- Official Nest TypeScript starter Vitest config: https://github.com/nestjs/typescript-starter/blob/master/vitest.config.ts
- Vitest contract-focused testing: https://vitest.dev/guide/learn/testing-in-practice
- Vitest file filtering: https://vitest.dev/guide/filtering
- Vitest mocking and cleanup: https://vitest.dev/guide/mocking.html
- Vitest module mocking and hoisting: https://vitest.dev/guide/mocking/modules.html
- Vitest fake timers: https://vitest.dev/guide/mocking/timers
- Vitest V8 coverage: https://vitest.dev/guide/coverage.html
- Vitest guidance for AI-authored tests: https://vitest.dev/guide/learn/writing-tests-with-ai
- `@golevelup/ts-vitest` `createMock<T>()`: https://github.com/golevelup/nestjs/tree/master/packages/ts-vitest
