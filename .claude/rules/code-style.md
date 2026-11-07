---
paths:
    - 'src/**'
    - 'test/**'
    - 'eslint.config.mjs'
---

# Code style

## NestJS idiomatic

Hand-rolling what Nest provides is a defect: no service locator, no manual `new` of an injectable, no bare `@UseGuards` where a `@<Feature>Protected()` exists. Exceptions: `ClsServiceManager.getClsService()` in a `createParamDecorator` factory, and the per-class `new Logger(ClassName.name)` (`logging.md`).

## Imports

- Aliases: `tsconfig.json` `paths`; the config barrel is `@configs/index`, package fields `@generated/package/package`.
- A class Nest injects is a value import: `import type` erases its constructor metadata; DI fails at boot, `tsc` green.

## Composed strings

A string with placeholders is a `{token}` pattern (`naming.md`): one token is `String.prototype.replace` with a function replacement whenever the value is not a literal in the same file (the string form expands `$&` and `$1`); two or more tokens go through one pass of `HelperStringService.fillPattern` (`helper.string.service.ts`).

## Constructors and fields

- Every constructor parameter is a parameter property, never plain, never `public`.
- In an exception (`*.exception.ts`), each is bare `readonly` (`constructor(readonly period: number)`, `readonly rawError: unknown = null`).
- Elsewhere, `private readonly` by default; `protected readonly` for a value forwarded to `super(...)` or a member a subclass reads (`queue` and `sentryService` on a `QueueBase` subclass, `sentryService` and `messageService` on a `QueueProcessorBase` subclass, `cache` and `reflector` on `ResponseCacheInterceptor`, `options`, `storageService`, and `reflector` on `RequestThrottleDefaultGuard`, `configService` on the two JWT strategies). A bare `readonly` parameter appears only in an exception.
- Values forwarded to `super(...)` come first, in `super`'s order, then the injected collaborators.
- A field assigned in the constructor is `private readonly`; one another class reads is a `readonly` field, never a parameter property (`DatabaseService.client`).
- The one mutable field is a third-party client an `onModuleInit` adapter creates: `AwsS3Service.s3Client`, `AwsSESService.sesClient`, `FirebaseService.app`, `FirebaseService.messaging`.

## Utility types

- `Omit`, `Pick`, `Partial`, `Required`, `Readonly`, `Extract`, `Exclude`, `NonNullable`, `ReturnType`, `Parameters`, and `Record<Enum, T>` appear only in a declaration under `interfaces/`: a named `I*` type or a member of an `I*` interface.
- A class field, a parameter, a return type, a local, a constant's annotation, and a type argument outside `interfaces/` name that `I*` (`naming.md`, Identifiers).
- `Record<string, T>` for an open map (`messageProperties`, `metadata`, a tokens bag) and a bare generic type parameter (`get<T>(key)`, `set<T>(key, value: T)`) stay anywhere. Outside `interfaces/` a generic is never wrapped in `Partial<T>`, `Pick<T, …>`, `Omit<T, …>`, or `Exclude<T, …>`: `RequestStoreService.merge` takes a named `I*` patch shape from `src/common/request/interfaces/`.

## Literal strings

- A string naming something this project declares is an enum member (`enum.md`, Literal unions).
- A literal a third-party contract defines keeps that contract's type: BullMQ `backoff.type: 'exponential'` and the `'failed'` worker event, redis `'PX'`, `'XX'`, `'OK'`, Prisma log levels, `PromiseSettledResult.status`. So does the key list of a utility type under `interfaces/` (`Pick<ApiKey, 'id' | 'name'>`).
- A log context line is a literal English sentence (`this.logger.error(error, 'Queue job failed')`, `logging.md`). Queue text that leaves through `IQueueResponse`, `QueueException`, or a side-effect description is i18n (`queue.md`, Messages).

## Types and comments

Import a shape that already has a name; a hand-written copy or structural subset is a mirror that drifts. Zero copy-paste logic (the `config.md` optional-env ternary excepted), one source per config value, connection, and constant; repeated declarative data (a doc error entry list, a decorator stack on a route) is not copy-paste logic, and logic stays single-source; duplication still beats the wrong abstraction. No helper taking a function parameter to share a loop: share the predicate, repeat the loop. No helper taking a function or a promise as a parameter to wrap its execution (try/catch, retry, cache-or-compute, a logging wrapper): the wrapping lives in the class that owns the call (`QueueBase.addSideEffect`). The one exception is `DatabaseService.withTransaction`, the kit adapter over Prisma's callback-taking `$transaction`. Sentry scope data rides in `SentryService.captureException(exception, captureContext)`.

No signature declares `asserts x is T` or `asserts x`. An assert that narrows a nullable input returns the narrowed value, `(value: T | null): T`, and the caller uses the return; a plain assert returns `void`.

Default zero comments; the one marker is `// Sequential by design: <case>` (`concurrency.md`). A comment states what the symbol is or does, present tense, no history. `TODO` and `FIXME` are work markers. Re-test every comment a change touched.

JSDoc lives in four places only; a name, a signature, and `docs/` explain everything else:

1. A `@Global()` module class: the one line `Shared module: <what it exports, for whom>.` (`layering.md`, `@Global()`).
2. Every export of `*.dto.ts`, `*.decorator.ts`, `*.enum.ts` (on the enum), `*.exception.ts`, `*.constant.ts`, `*.contract.ts`, `*.validation.ts`, and `src/common/doc/interfaces/doc.interface.ts`: the bare `/** @public */` (a knip directive), `/** @alias */` on an intentional alias, no description line. No other export carries it.
3. A public service, util, cache, or queue method whose signature hides its contract: what `null` or `false` means, a side effect the name omits (a counter, an enqueue, a cache eviction), or a precondition the caller owns. One line, present tense.
4. Nothing else: no class line, constant, field, property, enum member, interface field, constructor, private method, or controller, repository, guard, or service method; no `@param`, `@returns`, `@throws`, `@example`.

A JSDoc states what the body on disk does now: no history, no "now" or "new", no plan reference. A body change re-tests its JSDoc; one that no longer matches is a defect. `reviewer` reports a JSDoc outside the four places or one that does not match its body.
