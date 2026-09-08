# Testing — spec style

How a `*.spec.ts` is written, once you know it belongs here. Where specs live, how jest is
configured, and what is never done to reach green are in `.claude/rules/testing.md`; read that
one first, then this.

Whoever WRITES or REPAIRS a spec follows this file. Whoever only runs the suite does not need
it.

## The spec skeleton (HARD)

Every spec file has the same four blocks, in this order, and nothing between them.

```ts
// 1. imports — nothing above them
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '@modules/session/services/session.service';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';

// 2. jest.mock — AFTER the last import, BEFORE the first describe. Nowhere else.
jest.mock('<third-party-package>');

describe('SessionService', () => {
    // 3. first door — const at the root describe, shape only
    const sessionRepository: DeepMocked<SessionRepository> =
        createMock<SessionRepository>();
    const sessionUtil: DeepMocked<SessionUtil> = createMock<SessionUtil>();
    let service: SessionService;

    beforeEach(async () => {
        // 4. second door — reset, then the behavior every test starts from
        jest.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionService,
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionUtil, useValue: sessionUtil },
            ],
        }).compile();

        service = module.get(SessionService);
    });

    describe('getListCursor', () => {
        it('…', async () => {});
    });
});
```

The rules the skeleton encodes:

- **A mock the file SHARES is `const`, declared at the root `describe`.** Every DI double more
  than one test uses is declared once, at the top of the root `describe`, never inside
  `beforeEach` and never at module scope above the `describe`. The declaration states the
  SHAPE and nothing else.
- **A mock only ONE test needs is declared inside that test.** Do not hoist a single-use
  double to the root just to keep the declarations together.
- **`beforeEach` is the second door — where the mock actually becomes a mock.**
  `jest.resetAllMocks()` on a `createMock` declared at the root `describe` does NOT leak an
  implementation from one test into the next. `jest.clearAllMocks()` clears call records but
  keeps implementations — it is not a reset, do not use it as one.
- **The subject is `let`, rebuilt in `beforeEach`.** A subject shared across tests carries
  state between them.
- **Every DI dependency is mocked. No exception.** Every constructor param, every `@Inject`
  token, every service, repository, util, `ConfigService`, and `RequestStoreService` gets a
  double registered by its class (or token). A real collaborator sitting in the provider list
  makes the spec depend on code it does not cover, and its failure lands on the wrong file.
  The one thing you do NOT double is the subject.
- **Never assert on a logger or a `console` call, and never re-mock them.** A spec that
  asserts on a log line is asserting on the one thing that is allowed to change freely
  (`rules/logging.md`).
- **Mock variable names mirror the DI param they replace — `camelCase`.** Fixture and data
  locals are `camelCase` too (`rules/case-convention.md`). There is no snake_case surface in
  this project, including in specs.
- **Injection is by class.** Repositories and services are provided as `{ provide: SessionRepository,
  useValue: sessionRepository }`, never behind a port token (`rules/architecture.md`).

## `DeepMocked` is one level deep (HARD)

`DeepMocked<T>` from `@golevelup/ts-jest` maps only the TOP level of `T`: a property that is
not a function keeps its original type. `createMock` still mocks the nested object correctly
at RUNTIME, so the spec passes — only the static type is wrong.

**`DeepMocked` / `createMock` is the default for every service, util, repository, and
guard collaborator.** The bite is `DatabaseService.client`: `DatabaseService` does not extend
`PrismaClient`, it exposes one nested `client` member (`rules/database.md`), so
`databaseService.client.user.findUnique` does not type-check on a `DeepMocked<DatabaseService>`.
Repositories (the only layer that injects `DatabaseService` for feature data) are outside
`collectCoverageFrom` and do not get specs. If a health indicator forces a `DatabaseService`
double, stub `client` as a nested object of `jest.fn()` delegates — do not cast the whole
service.

**A `DeepMocked` member is NOT a `jest.Mock` (HARD).** Since `@golevelup/ts-jest` 3 each
mocked method is a `MockInstance` from `jest-mock`, so `(service.method as jest.Mock)` no
longer compiles. Call the mock helper straight off the member
(`userRepository.findOneById.mockResolvedValue(…)`) and let the argument be type-checked.
Only where the argument is a THIRD-PARTY shape does a cast survive, and it takes the extra
hop: `(service.method as unknown as jest.Mock)`.

## Casts in a spec — first-party vs third-party (HARD)

The line is WHOSE contract the fixture is standing in for, not how ugly the cast looks.

**A FIRST-PARTY shape is never cast — it is BUILT.** Our own interface, DTO, Prisma-generated
row, or exception is small, stable, and ours to keep true. A `{ id: 'user-1' } as IUser` is a
lie the compiler was asked to stop reporting. Complete the fixture.

**A THIRD-PARTY shape is cast ONCE, at the boundary that produces it.** An AWS S3 `Body`, a
BullMQ `Job`, a Firebase message: dozens of members we do not own, of which the subject reads
two. One cast, at the factory or the mock call site — never scattered through the assertions.

**`@ts-ignore` and `@ts-expect-error` are FORBIDDEN outright.** Unlike a cast they name no
type at all, so nothing downstream ever re-checks them.

**A cast is never the answer to a type error you did not read.** Read what the compiler
actually says first: a missing type argument (`createMock<IRequestApp>()` resolving to
`IRequestApp<unknown>`), a renamed enum member, or a moved import — none of which a cast
fixes, all of which it hides.

**Each of the four hooks has exactly one job. Reach for whichever ones the file needs — and
write no hook that has no work; an empty hook is noise.**

| Hook | What belongs in it |
|---|---|
| `beforeAll` | Immutable setup shared by every test in the block — fixed `Date` constants, frozen fixture payloads, `jest.useFakeTimers()`. Never something a test can mutate. |
| `beforeEach` | `jest.resetAllMocks()` first, then the baseline behavior every test starts from, then rebuild the subject. |
| `afterEach` | Undo what a TEST did to something real — `jest.restoreAllMocks()` whenever the file used `jest.spyOn` on a real object. `resetAllMocks` does NOT restore a spied original; only `restoreAllMocks` does. |
| `afterAll` | Undo what `beforeAll` set up — `jest.useRealTimers()` when timers were faked there, and the teardown of anything it opened. |

## A repeated `jest.mock()` belongs in the setup file (HARD)

**Every time you write or read a `jest.mock('<pkg>')` at the top of a spec, ask whether that
package is already mocked in other spec files.** A module fake that is repeated across many
files is setup, not spec content.

**Promote it to `test/jest.setup.ts` (and register that file in `test/jest.json`
`setupFilesAfterEnv`) when ALL of these hold:**

- Several spec files mock the same package (three or more is already a pattern).
- The factory is IDENTICAL everywhere, or there is no factory at all — a bare
  `jest.mock('<pkg>')`.
- **No spec anywhere needs the REAL module.**

**Leave it per-file when any of these hold:**

- The factory differs between specs.
- Some spec legitimately exercises the real module. Promoting then breaks that spec silently
  and at a distance.

When you do promote it: add the mock to `test/jest.setup.ts`, register the file in
`test/jest.json` if it is not already, delete the per-file `jest.mock` from EVERY spec that
carried it, and never re-mock it locally again — a local factory replaces the global one and
drops whatever exports the global provided.

**Promoting changes a file every spec in the repo loads.** It is never a silent edit: say how
many files lost the duplicate mock, and say which suites were re-ran after the promotion. Do
not add `test/jest.setup.ts` as a side effect of writing one spec — name it as a hand-back.

## Assertion style (HARD)

**Reaching into `fn.mock.*` is FORBIDDEN.** Not `fn.mock.calls[0]`, not `fn.mock.calls[0][0]`,
not `fn.mock.calls.length`, not `fn.mock.lastCall`, not `fn.mock.results`. Index-into-a-2D-array
assertions do not say what they check, and they break silently the day an argument is added.

Use the matcher that names the thing:

| Instead of | Write |
|---|---|
| `fn.mock.calls.length` | `expect(fn).toHaveBeenCalledTimes(n)` / `expect(fn).not.toHaveBeenCalled()` |
| `fn.mock.calls[0][0]` | `expect(fn).toHaveBeenCalledWith(arg)` |
| `fn.mock.calls[1][0]` | `expect(fn).toHaveBeenNthCalledWith(2, arg)` |
| a partial argument check | `expect.objectContaining({ … })`, `expect.arrayContaining([…])` |
| an argument's class | `expect.any(UserNotFoundException)` |
| `fn.mock.results[0]` | assert the subject's return value instead |

When you must inspect a constructed argument more deeply than a matcher allows, capture it
through the mock's own implementation:

```ts
let created: IUser | undefined;
userRepository.create.mockImplementation(async entity => {
    created = entity;
    return persisted;
});
```

For ordering across DIFFERENT mocks, record it explicitly:

```ts
const callOrder: string[] = [];
userRepository.update.mockImplementation(async () => {
    callOrder.push('update');
    return updated;
});
sessionRepository.deleteMany.mockImplementation(async () => {
    callOrder.push('invalidate');
    return { count: 1 };
});
expect(callOrder).toEqual(['update', 'invalidate']);
```

Assert on real identifiers — the exception class, the enum member, the mapped field name. An
assertion on a bare `true` or a loose string literal drifts silently.

## `AppBaseException` body fields (HARD)

Feature code throws typed `AppBaseException` subclasses, never a Nest `HttpException`
(`rules/exceptions.md`). Specs MUST assert the class and the members the filter chain reads:

```ts
await expect(service.findOneById(id)).rejects.toThrow(UserNotFoundException);
await expect(service.findOneById(id)).rejects.toMatchObject({
    module: 'user',
    statusCode: EnumUserStatusCodeError.notFound,
    statusCodeKey: EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
    messagePath: 'user.error.notFound',
});
```

`expect(…).rejects.toThrow(new UserNotFoundException())` is NOT enough: Jest's instance
matcher compares `.message` only, so `statusCode` / `statusCodeKey` never get checked.

Response body keys on the WIRE are camelCase (`statusCode`, `messagePath`) — including in
specs (`rules/case-convention.md`). A `status_code` fixture is a defect on sight.

For a sync throw, prefer catching and reading the instance:

```ts
try {
    service['assertSomething'](…);
    throw new Error('expected throw');
} catch (error) {
    expect(error).toBeInstanceOf(UserPasswordNotMatchException);
    expect(error).toMatchObject({
        statusCode: EnumUserStatusCodeError.passwordNotMatch,
        messagePath: 'user.error.passwordNotMatch',
    });
}
```

## No class declarations in a spec (HARD)

**A spec file declares no `class`.** Not a fake repository, not a stub service, not a host
class for a decorator, not a subclass of an exception. A class in a spec is a second
implementation nobody maintains.

The verified substitutes:

- **A param decorator** — apply the decorator to a plain object and read the factory back off
  the metadata.
- **A class ref for `Reflector` / `context.getClass()`** — an object literal carries metadata
  fine: `const classRef = {} as Type<unknown>` plus `Reflect.defineMetadata(key, value, classRef)`.
- **A subclass of an abstract exception or base** — instantiate a REAL concrete subclass from
  `src/`. If the base has no concrete subclass anywhere in `src/`, it is unused code — report
  that instead of inventing one.
- **A collaborator** — `createMock<T>()`, always.

If a subject genuinely cannot be specced without declaring a class, that is a design defect
in the subject: report it and do not invent the class.

## Private methods (HARD)

**Every private method gets its own `describe`**, named for the method, reached by index
access on the subject: `service['hashPassword'](…)`. This exists for LINE COVERAGE: a private
helper's guard clauses are routinely unreachable from any public input, and without a describe
of its own the coverage number reports them as tested while nothing ever ran them.

**The caller must really call the private. Stubbing it is FORBIDDEN.**
`jest.spyOn(service as any, 'hashPassword').mockReturnValue(…)` inside a public-method
describe is banned outright. The public describes are the only place the real call path is
recorded; stub the private there and the public spec asserts against a fiction while the
private describe exercises it in isolation — the two together then cover nothing that actually
ships.

Inside the private's own describe, double what the private DEPENDS ON — the injected
collaborators it reaches for are already mocked at the root `describe`, and that is enough.
What you may never double is the private itself.

**The one exception is a foreign boundary.** A third-party package sitting inside the private
may be doubled — through `jest.mock('<package>')` at the top of the file, or through the
injected collaborator that wraps it. Never by stubbing the private method that calls it.

Order inside the file: one `describe` per public method first, in declaration order, then one
`describe` per private method. The public describes still exercise the real path end to end —
the private describes are additional, never a replacement.

## How to spec each layer

The layer decides what is real and what is doubled. Getting this wrong is what produces slow,
brittle specs that test the mock instead of the code.

- **Service** — mock the repository and every injected service / util; assert the
  orchestration (which method was called, with what, in what order) and the thrown exception
  TYPE plus `statusCode` / `statusCodeKey` / `messagePath` for each failure branch. Assert on
  the exception class and the enum member, never on a message string (`rules/exceptions.md`).
- **Guard / strategy** — assert transport behavior only: metadata read, delegation to the
  service, the value assigned onto `request.<field>`, the boolean returned. The authorization
  decision itself belongs to the service's spec. **Controllers need direct instantiation** —
  `Test.createTestingModule` eagerly resolves guards and fails; controllers are also not in
  `collectCoverageFrom`.
- **Pipe** — feed the real input shapes, assert the transformed output and the thrown
  validation error.
- **Interceptor / filter** — assert the emitted shape (`IResponseReturn`, `ResponseErrorDto`)
  and the headers set. These are the highest-value cheap specs in the repo.
- **DTO** — parse a payload through the schema and assert that the result carries exactly the
  declared fields, that an undeclared key is stripped by a response schema and rejected by a
  request schema, and that nothing sensitive rides along. This spec is the executable form of
  the opt-in rule (`rules/dto.md`).
- **Exception** — assert `module`, `statusCode`, `statusCodeKey`, `httpStatus`, and
  `messagePath`. Cheap, and it catches the `statusCodeKey` / `statusCode` mismatch that
  compiles fine (`rules/exceptions.md`).
- **Decorator** — apply it, read the metadata it wrote. No host class (`No class declarations`
  above).
- **Factory / indicator** — construct through the real path; mock only the I/O boundary.
  A health indicator that pings `DatabaseService` is the sanctioned exception that injects it
  (`rules/database.md`) — mock `client` there, not a repository.

Do not spec framework wiring, Prisma itself, a `@Module` decorator, a controller, or a
repository. There is no behavior of ours in the first three, and the last two are outside
`collectCoverageFrom` (`rules/testing.md`).

## Writing the spec

- `it` names state the behavior AND its condition — "throws UserNotFoundException when the
  id is unknown" beats "should fail".
- Cover the branches, not just the happy path. 100% coverage with only happy paths means
  every guard clause in the file is untested and the threshold is lying to you.
- Build fixtures in the spec that needs them. A shared fixture that many specs mutate is how
  one failure cascades into twenty confusing ones.
- Keep each spec independent — no ordering dependency, no shared mutable module state between
  files.
- A spec that would still pass with its subject gutted is worse than no spec: it converts an
  untested file into a file everyone believes is tested. Before finishing one, change the
  behavior it covers in your head and confirm the spec would go red.
