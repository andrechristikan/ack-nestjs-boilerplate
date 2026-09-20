# Testing — spec style

How a `*.spec.ts` is written, once you know it belongs here. Where specs live, how Vitest is
configured, and what is never done to reach green are in `.claude/rules/testing.md`; read that
one first, then this.

Whoever WRITES or REPAIRS a spec follows this file. Whoever only runs the suite does not need
it.

## The spec skeleton (HARD)

Every spec file has the same four blocks, in this order, and nothing between them.

```ts
// 1. imports — nothing above them
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';

// 2. vi.mock — AFTER the last import, BEFORE the first describe. Nowhere else.
vi.mock('<third-party-package>');

describe('SessionDomain', () => {
    // 3. first door — const at the root describe, shape only
    const sessionRepository: MockProxy<SessionRepository> = mock<SessionRepository>();
    const sessionUtil: MockProxy<SessionUtil> = mock<SessionUtil>();
    let domain: SessionDomain;

    beforeEach(async () => {
        // 4. second door — reset, then the behavior every test starts from
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionDomain,
                { provide: SessionRepository, useValue: sessionRepository },
                { provide: SessionUtil, useValue: sessionUtil },
            ],
        }).compile();

        domain = module.get(SessionDomain);
    });

    describe('getListCursor', () => {
        it('…', async () => {});
    });
});
```

`vi`, `describe`, `it`, `expect` and the hooks are globals (`globals: true`); a spec does not
import them from `vitest`. `verbatimModuleSyntax` applies to specs as it does to `src/`: a
type-only import is `import type`.

The rules the skeleton encodes:

- **A mock the file SHARES is `const`, declared at the root `describe`.** Every DI double more
  than one test uses is declared once, at the top of the root `describe`, never inside
  `beforeEach` and never at module scope above the `describe`. The declaration states the
  SHAPE and nothing else.
- **A mock only ONE test needs is declared inside that test.** Do not hoist a single-use
  double to the root just to keep the declarations together.
- **`beforeEach` is the second door — where the mock actually becomes a mock.**
  `vi.resetAllMocks()` resets every `mock()` / `mockDeep()` member, including `calledWith`
  expectations, so no implementation leaks from one test into the next. `vi.clearAllMocks()`
  clears call records but keeps implementations — it is not a reset, do not use it as one.
- **The subject is `let`, rebuilt in `beforeEach`.** A subject shared across tests carries
  state between them.
- **Every DI dependency is mocked. No exception.** Every constructor param, every `@Inject`
  token, every domain, HTTP service, processor service, repository, util, cache, queue,
  `ConfigService`, `SentryService`, and `RequestStoreService` gets a double registered by its
  class (or token). A real collaborator sitting in the provider list makes the spec depend on
  code it does not cover, and its failure lands on the wrong file. The one thing you do NOT
  double is the subject.
- **Never assert on a logger or a `console` call, and never re-mock them.** `test/setup.ts`
  mutes Nest `Logger` (and `ConsoleLogger`) with assigned no-ops.
  `Test.createTestingModule()` installs a `TestingLogger` whose `error` still prints, so the
  mute is those no-ops. A spec that spies it, `vi.mock`s `@nestjs/common`, or asserts on a
  log line is asserting on the one thing that is allowed to change freely
  (`rules/logging.md`).
- **Mock variable names mirror the DI param they replace — `camelCase`.** Fixture and data
  locals are `camelCase` too (`rules/naming.md`). There is no snake_case surface in
  this project, including in specs.
- **Injection is by class.** Repositories and domains are provided as `{ provide: SessionRepository,
  useValue: sessionRepository }`, never behind a port token (`rules/architecture.md`).

## `mock` versus `mockDeep` (HARD)

`mock<T>()` doubles the TOP level of `T`: every method is a typed `vi.fn()`. **It is the
default for every service, domain, util, cache, queue, repository and guard collaborator.**

`mockDeep<T>()` / `DeepMockProxy<T>` is for a collaborator the subject reaches THROUGH a
nested object. The one in this codebase is `DatabaseService.client`
(`rules/database.md`): `mockDeep<DatabaseService>()` types
`databaseService.client.user.findUnique.mockResolvedValue(…)` end to end. Repositories — the
layer that injects `DatabaseService` for feature data — are outside the coverage set and get
no specs; a health indicator is where this double appears.

**A mocked member is called straight, with its argument type-checked.** Write
`userRepository.findOneById.mockResolvedValue(fixture)`; a `MockProxy` member is already a
`vi.fn()`, so a cast to `Mock` / `MockInstance` has no reason to exist. A cast survives only
where the argument is a THIRD-PARTY shape, and it is written once, at that call site.

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
actually says first: a missing type argument (`mock<IRequestApp>()` resolving to
`IRequestApp<unknown>`), a renamed enum member, or a moved import — none of which a cast
fixes, all of which it hides.

**Each of the four hooks has exactly one job. Reach for whichever ones the file needs — and
write no hook that has no work; an empty hook is noise.**

| Hook | What belongs in it |
|---|---|
| `beforeAll` | Immutable setup shared by every test in the block — fixed `Date` constants, frozen fixture payloads, `vi.useFakeTimers()`. Never something a test can mutate. |
| `beforeEach` | `vi.resetAllMocks()` first, then the baseline behavior every test starts from, then rebuild the subject. |
| `afterEach` | Undo what a TEST did to something real — `vi.restoreAllMocks()` whenever the file used `vi.spyOn` on a real object. `resetAllMocks` does NOT restore a spied original; only `restoreAllMocks` does. |
| `afterAll` | Undo what `beforeAll` set up — `vi.useRealTimers()` when timers were faked there, and the teardown of anything it opened. |

## A repeated `vi.mock()` belongs in the setup file (HARD)

**Every time you write or read a `vi.mock('<pkg>')` at the top of a spec, ask whether that
package is already mocked in other spec files.** A module fake that is repeated across many
files is setup, not spec content.

**Promote it to `test/setup.ts` (and register that file in `vitest.config.ts`
`test.setupFiles`) when ALL of these hold:**

- Several spec files mock the same package (three or more is already a pattern).
- The factory is IDENTICAL everywhere, or there is no factory at all — a bare
  `vi.mock('<pkg>')`.
- **No spec anywhere needs the REAL module.**

**Leave it per-file when any of these hold:**

- The factory differs between specs.
- Some spec legitimately exercises the real module. Promoting then breaks that spec silently
  and at a distance.

When you do promote it: add the mock to `test/setup.ts`, register the file in
`vitest.config.ts` if it is not already, delete the per-file `vi.mock` from EVERY spec that
carried it, and never re-mock it locally again — a local factory replaces the global one and
drops whatever exports the global provided.

**Promoting changes a file every spec in the repo loads.** It is never a silent edit: say how
many files lost the duplicate mock, and say which suites were re-ran after the promotion. Do
not add `test/setup.ts` as a side effect of writing one spec — name it as a hand-back.

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

`expect(…).rejects.toThrow(new UserNotFoundException())` is NOT enough: the instance
matcher compares `.message` only, so `statusCode` / `statusCodeKey` never get checked.

Response body keys on the WIRE are camelCase (`statusCode`, `messagePath`) — including in
specs (`rules/naming.md`). A `status_code` fixture is a defect on sight.

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
  the metadata. A store decorator reads CLS through `ClsServiceManager.getClsService()`, so the
  spec spies that static and returns a `ClsService` double.
- **A class ref for `Reflector` / `context.getClass()`** — an object literal carries metadata
  fine: `const classRef = {} as Type<unknown>` plus `Reflect.defineMetadata(key, value, classRef)`.
- **A subclass of an abstract exception or base** — instantiate a REAL concrete subclass from
  `src/`. If the base has no concrete subclass anywhere in `src/`, it is unused code — report
  that instead of inventing one.
- **A collaborator** — `mock<T>()` (or `mockDeep<T>()`), always.

If a subject genuinely cannot be specced without declaring a class, that is a design defect
in the subject: report it and do not invent the class.

## Private methods (HARD)

**Every private method gets its own `describe`**, named for the method, reached by index
access on the subject: `service['hashPassword'](…)`. This exists for LINE COVERAGE: a private
helper's guard clauses are routinely unreachable from any public input, and without a describe
of its own the coverage number reports them as tested while nothing ever ran them.

**The caller must really call the private. Stubbing it is FORBIDDEN.**
`vi.spyOn(service as any, 'hashPassword').mockReturnValue(…)` inside a public-method
describe is banned outright. The public describes are the only place the real call path is
recorded; stub the private there and the public spec asserts against a fiction while the
private describe exercises it in isolation — the two together then cover nothing that actually
ships.

Inside the private's own describe, double what the private DEPENDS ON — the injected
collaborators it reaches for are already mocked at the root `describe`, and that is enough.
What you may never double is the private itself.

**The one exception is a foreign boundary.** A third-party package sitting inside the private
may be doubled — through `vi.mock('<package>')` at the top of the file, or through the
injected collaborator that wraps it. Never by stubbing the private method that calls it.

Order inside the file: one `describe` per public method first, in declaration order, then one
`describe` per private method. The public describes still exercise the real path end to end —
the private describes are additional, never a replacement.

## How to spec each layer

This skeleton is **unit**. The three kinds, and which this suite collects, are
`rules/testing.md`. The layer decides what is real and what is doubled. Getting this wrong
is what produces slow, brittle specs that test the mock instead of the code.

- **Util / cache / queue** — mock what it injects (`ConfigService`, the helper, the cache
  store, the BullMQ `Queue`); assert the value it computes or the call it hands to the
  boundary — for a queue class, the job name, the payload (with every encrypted field
  encrypted) and the job options.
- **Domain** — mock the repository and every injected domain / util / queue / cache; assert the
  orchestration (which method was called, with what, in what order) and the thrown exception
  TYPE plus `statusCode` / `statusCodeKey` / `messagePath` for each failure branch. Assert on
  the exception class and the enum member, never on a message string (`rules/exceptions.md`).
- **HTTP service / processor service** — mock the domain and every injected util; assert
  transport shaping and the hand-off into the domain (or the processor channel work), not the
  domain's business rules.
- **Guard / strategy** — assert transport behavior only: metadata read, delegation to the
  domain, the value assigned onto `request.<field>`, the boolean returned. The authorization
  decision itself belongs to the domain's spec. **Controllers need direct instantiation** —
  `Test.createTestingModule` eagerly resolves guards and fails; controllers are also not in
  the coverage set.
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
  (`rules/database.md`) — `mockDeep<DatabaseService>()` there, not a repository.

Do not spec framework wiring, Prisma itself, a `@Module` decorator, a controller, a
processor, a repository, a contract table, or a Swagger doc factory (`*.doc.ts`). There is
no behavior of ours in the first three, and the last five are outside the coverage set
(`rules/testing.md`). A unit spec doubles the repository from the domain. A repository as
subject with Prisma and PostgreSQL real is an integration test, and that kind is not this suite.

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
