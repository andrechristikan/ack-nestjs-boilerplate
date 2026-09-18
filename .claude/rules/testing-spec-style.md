# Testing - spec style

How a `*.spec.ts` is written once `rules/testing.md` says the subject belongs in the unit suite.
Whoever writes or repairs a spec reads both files completely.

## Default spec shape (HARD)

Import every Vitest API explicitly. The unit configuration does not provide globals.

```ts
import { createMock } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';

describe('SessionDomain', () => {
    const sessionRepository = createMock<SessionRepository>();
    const sessionUtil = createMock<SessionUtil>();

    let domain: SessionDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                SessionDomain,
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionUtil, useValue: sessionUtil },
            ],
        }).compile();

        domain = moduleRef.get(SessionDomain);
    });

    describe('getOne', () => {
        it('returns the mapped session when the id exists', async () => {});
    });
});
```

The shape encodes these rules:

- Keep imports first, followed by top-level module mocks when needed, then the root `describe`.
- Declare shared doubles as `const` inside the root `describe`. Declare a one-case double in that case.
- Build injected collaborators with `createMock<Dependency>()` from `@golevelup/ts-vitest`. Its methods remain typed Vitest mocks, including nested members. Use a narrow `Pick` plus `satisfies` only when a tiny explicit double is clearer than a deep mock.
- Rebuild the subject in `beforeEach`. Reset shared mock calls and implementations before establishing that case's baseline.
- Register the real subject and explicit collaborator doubles. Do not mock the subject.
- Name doubles after the constructor parameter or injection token they replace, using `camelCase`.
- Inject repositories, domains, and services by their real class token, following `rules/architecture.md`.
- Do not assert on logs or `console`, and do not replace them merely to silence output. Logging is not a unit contract (`rules/logging.md`).

## Choose the smallest harness

Direct construction is preferred when Nest behavior is irrelevant and every constructor
argument can be represented by its complete declared type without a cast.

Use `Test.createTestingModule(...).compile()` when the subject depends on injection tokens,
provider resolution, scoped providers, or lifecycle behavior. Do not import the production
feature module for a unit spec; doing so expands the subject and can activate real I/O.

Use `moduleRef.get(Subject)` for singleton providers. Use `await moduleRef.resolve(Subject)` for
request-scoped or transient providers. When several resolved providers must share one DI
sub-tree, create and pass one Nest context id to every `resolve()` call.

Nest's `.useMocker()` is allowed only for a small reusable factory whose returned doubles are
explicit and typed. Do not use auto-mocking as a substitute for listing the behavior a branch
reads. `REQUEST` and `INQUIRER` require explicit providers or `.overrideProvider()`.

## Module mocks (HARD)

Prefer dependency injection. Use `vi.mock()` only for a third-party or module-level boundary
that cannot be supplied through the constructor.

```ts
import { generateSecret } from 'otplib';
import { describe, expect, it, vi } from 'vitest';

vi.mock(import('otplib'), () => ({
    generateSecret: vi.fn(),
}));

const generateSecretMock = vi.mocked(generateSecret);
```

- `vi.mock()` and `vi.hoisted()` stay at file scope. They are hoisted ahead of static imports,
  regardless of their visual position.
- Prefer `vi.mock(import('<module>'), factory)` so TypeScript checks the factory exports and
  tools can update the path during a rename.
- A factory returns an object containing every mocked export. A mocked default export uses a
  `default` key.
- Build factory-local values inside the factory. When tests need to access the same value, use
  `vi.hoisted()` before the mock declaration.
- Use `vi.mocked(exportedValue)` to access mock methods. Do not cast an export to `Mock`.
- Use `vi.doMock()` only when a test intentionally needs a non-hoisted mock before a later
  dynamic import. It does not affect modules already imported.
- A bare `vi.mock()` can load a manual `__mocks__` file, but the file is never active without
  the call.

Promote a repeated module mock to `test/vitest.setup.ts` only when at least three specs need an
identical factory and no spec needs the real module. Register the setup file in
`vitest.config.mts`, remove every duplicate local declaration, and run the full unit suite
because the setup file affects every spec. A one-off mock stays local.

## Deep mocks and framework-boundary mocks (HARD)

`createMock<T>()` from `@golevelup/ts-vitest` is the default typed mock for an injected
collaborator and for a Nest/Express transport type received as an argument. It replaces
hand-written casts and exposes Vitest mock methods on nested members.

```ts
import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';

const handler = vi.fn();
const context = createMock<ExecutionContext>({
    getHandler: () => handler,
    getClass: () => TestController,
});
```

- Configure every collaborator behavior that decides the branch under test. Do not rely on an
  auto-stubbed return value to make a branch pass accidentally.
- Use `createMock<T>({}, { strict: true })` when an unexpected method call must fail immediately.
  Strict mode is especially useful for guards, filters, and orchestration cases with a small
  known call surface; configure the expected methods in the case or its baseline.
- `createMock` is distinct from `.useMocker()` (container-wide auto-mocking) and `vi.mock()`
  (module mocking). Use it for explicit collaborators registered with `useValue` and for plain
  framework/third-party arguments.
- When the same HTTP `ExecutionContext` shape (`getHandler`/`getClass`/`switchToHttp` with a
  request/response) recurs across specs, call the shared `createHttpExecutionContext()` factory
  from `test/support/execution-context.mock.ts` (import via `@test/support/...`) instead of
  repeating the nested construction. `createMock`'s partial-override typing does not compose
  cleanly once a class reference and several optional members are mixed, so this one factory
  performs a single explicit cast internally — the same "cast once at the boundary" the
  `createMock` case above already allows — so the 13+ call sites that need this shape stay fully
  typed. A genuinely different `ExecutionContext` (a non-HTTP `getType()`, or a shape only one
  spec needs) stays a direct, local `createMock<ExecutionContext>()` call; do not add a second
  shared factory until a shape repeats the same way.

## Mock lifecycle (HARD)

The operations are different:

| API                    | Effect                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `vi.clearAllMocks()`   | Clears call history while retaining implementations.                                           |
| `vi.resetAllMocks()`   | Clears call history and resets implementations.                                                |
| `vi.restoreAllMocks()` | Restores original properties patched by `vi.spyOn()`; it is not a reset for module auto-mocks. |

Use `vi.resetAllMocks()` before each case when mock objects live across cases, then apply that
case's baseline implementations. Use `afterEach(() => vi.restoreAllMocks())` in any file that
spies on real objects. Prefer local lifecycle hooks over relying on hidden global cleanup.

For time-dependent behavior, call `vi.useFakeTimers()` before creating timers, set a fixed time
with `vi.setSystemTime()`, advance time without sleeping, and call `vi.useRealTimers()` in
teardown. Do not fake `process.nextTick` when the configured worker pool is `forks`.

## Fixtures and casts (HARD)

- Build first-party interfaces, DTOs, generated database rows, and exception inputs completely.
  Use `satisfies` when the inferred literal type is useful. Do not silence missing fields with
  `as SomeType`.
- A large third-party shape may be represented by the members the subject reads and cast once
  at the boundary that produces it, such as a BullMQ `Job` or AWS body.
- `@ts-ignore` and `@ts-expect-error` are forbidden in specs.
- Recreate mutable fixtures per case or in `beforeEach`. Shared immutable constants may live in
  the root `describe`.
- Use real `Date` instances for date columns. A timestamp string does not represent the shape
  emitted by the database client (`rules/dates.md`).

## Arrange, act, assert

Each case protects one observable behavior. Arrange only the state that behavior needs, execute
the subject once, then assert the result, externally visible side effect, or typed error.
Comments that merely label those three phases are unnecessary.

Prefer matchers that state the contract:

| Contract          | Matcher                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| call count        | `toHaveBeenCalledTimes()` / `not.toHaveBeenCalled()`                              |
| call arguments    | `toHaveBeenCalledWith()` / `toHaveBeenNthCalledWith()`                            |
| partial structure | `expect.objectContaining()` / `toMatchObject()`                                   |
| returned value    | assert the subject result                                                         |
| rejected value    | `.rejects` when one assertion is sufficient; otherwise capture the rejection once |

Do not inspect `mock.calls`, `mock.results`, or `lastCall` when a named matcher expresses the
same contract. Recorded arguments are references, so capture an argument in a mock
implementation when the subject mutates it after the call.

Assert call order only when ordering is part of correctness, such as persisting a credential
before invalidating sessions. Record cross-collaborator order explicitly rather than relying
on runner-specific invocation counters.

## Exception assertions (HARD)

Assert an `AppBaseException` subclass and the fields consumed by the filter chain. Execute the
subject once:

```ts
let thrown: unknown;

try {
    await service.findOneById(id);
} catch (error) {
    thrown = error;
}

expect(thrown).toBeInstanceOf(UserNotFoundException);
expect(thrown).toMatchObject({
    module: 'user',
    statusCode: EnumUserStatusCodeError.notFound,
    statusCodeKey: EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
    messagePath: 'user.error.notFound',
});
```

Never assert a localized message string. Wire keys use `camelCase`, including `statusCode` and
`messagePath` (`rules/case-convention.md`).

## Public contract only (HARD)

Test a subject through its public methods and observable output. Do not call a private method
with index access, cast the subject to `any`, or spy on a private method. A refactor that keeps
the public contract unchanged must keep the spec green.

A small host class may be declared in a spec only when Nest metadata or decorator composition
requires a real class target and that metadata is the contract under test. Do not declare fake
repositories, services, or exception subclasses; collaborator doubles are typed objects.

## Layer-specific focus

- **Service:** assert business decisions, argument mapping, meaningful orchestration, and typed
  failures. Assert order only when it changes correctness.
- **Guard / strategy:** assert metadata reads, service delegation, request-context assignment,
  and the returned or rejected transport result. Authorization decisions remain in services.
- **Pipe / validator:** pass real input shapes; assert normalized output and representative
  typed validation failures.
- **Interceptor / filter:** assert emitted response/error shapes, status, and headers. Mock the
  transport boundary, not RxJS itself.
- **DTO:** use the real validation or `ResponseUtil.serialize()` path. Protect sensitive-field
  exclusion, nested serialization, transforms, and important validation contracts.
- **Exception:** table-test shared mapping invariants and test a standalone subclass only when
  it owns custom behavior.
- **Decorator:** apply it to the smallest valid target and read the metadata it writes.
- **Factory / indicator / processor:** construct through the real path; mock external I/O and
  assert branching, dispatch, payload forwarding, return shape, and owned failure mapping.
- **Utility:** test inputs and outputs directly, covering only behavior-changing boundaries.

Do not unit test controllers, repositories, framework wiring, `@Module()` declarations,
Prisma's query builder, constants, enums, interfaces, or generated code (`rules/testing.md`).

## Final quality check

- Name the behavior and condition: `throws UserNotFoundException when the id is unknown`, not
  `should fail`.
- Keep `describe` nesting shallow: root subject, then public method or contract family.
- Use table-driven cases only when inputs vary under the same rule and assertion shape.
- Await every promise and asynchronous matcher. A test must not finish before its assertion.
- Never use snapshots for business decisions or errors whose explicit fields are the contract.
- Mentally break the behavior under test. If the case remains green, strengthen or remove it.
- Coverage identifies unexercised code; it does not justify duplicate cases, private-method
  calls, or assertions on framework internals.
