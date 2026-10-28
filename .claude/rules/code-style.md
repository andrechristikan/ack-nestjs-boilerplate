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
- Elsewhere, `private readonly` by default; `protected readonly` for a value forwarded to `super(...)` or a member a subclass reads (`queue` and `sentryService` on a `QueueBase` subclass, `sentryService` on a `QueueProcessorBase` subclass, `cache` and `reflector` on `ResponseCacheInterceptor`, `options`, `storageService`, and `reflector` on `RequestThrottleDefaultGuard`, `configService` on the two JWT strategies). A bare `readonly` parameter appears only in an exception.
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

Import a shape that already has a name; a hand-written copy or structural subset is a mirror that drifts. Zero copy-paste logic (the `config.md` optional-env ternary excepted), one source per config value, connection, and constant; duplication still beats the wrong abstraction. No helper taking a function parameter to share a loop: share the predicate, repeat the loop. No helper taking a function or a promise as a parameter to wrap its execution (try/catch, retry, cache-or-compute, a logging wrapper): the wrapping lives in the class that owns the call (`QueueBase.addSideEffect`). The one exception is `DatabaseService.withTransaction`, the kit adapter over Prisma's callback-taking `$transaction`. Sentry scope data rides in `SentryService.captureException(exception, captureContext)`.

Default zero comments; the one marker is `// Sequential by design: <case>` (`concurrency.md`). A comment states what the symbol is or does, present tense, no history. JSDoc: optional one line on a class whose name does not say what it is; method JSDoc is the exception; none on interfaces except the kit surface. `TODO` and `FIXME` are work markers. Re-test every comment a change touched. Kit surface carries `@public` (a knip directive): every export of `*.dto.ts`, `*.decorator.ts`, `*.enum.ts` (on the enum), `*.exception.ts`, `*.constant.ts`, `*.contract.ts`, `*.validation.ts`, and `src/common/doc/interfaces/doc.interface.ts` has a JSDoc whose first line states what it is, then `@public` (`@alias` for an intentional alias). No other export carries it.

## ESLint

`eslint.config.mjs` is the source for rule names. Five blocks carry `files:`: `ts/default` (`src/**/*.ts`, the full project rule set), `ts/env-boundary` (on top of `ts/default`: `src/configs/**/*.ts`, `src/main.ts`, `src/instrument.ts`, `src/queues/decorators/queue.decorator.ts`), `ts/other` (`scripts/**/*.ts`, `vitest.config.ts`: typescript-eslint recommended only), `ts/test` (`test/**/*.ts`), and `ts/test-spec` (`test/**/*.spec.ts`, on top of `ts/test`).

- `ts/env-boundary` (the environment boundary, `config.md`) re-declares `no-restricted-properties` with `mathRandomRestriction` alone.
- A lint-clean env read outside the boundary (`Reflect.get(process, 'env')`) is a defect.
- No other `files:` block narrows a rule. Every file a `files:` block matches runs under `noInlineConfig: true`, so `pnpm lint` (`--max-warnings 0`) fails on an inline directive.
- A rule that fires is fixed in code; one that cannot hold everywhere is the owner's to remove, for every file.
- `ts/default` throw selectors: `throwNewErrorRestriction` (`throw new Error(...)`) and `throwIdentifierRestriction` (`eslint.config.mjs:172`: `throw <identifier>` outside an `if` branch testing `instanceof` a name ending `Exception` or `UnrecoverableError`, alone or `||`-joined up to three, so `HttpException` passes); `exceptions.md` says what to throw.
- `forEachRestriction` (`eslint.config.mjs:141`, joined to `codeStyleSyntaxRestrictions` and `testSyntaxRestrictions`) rejects `.forEach` in `src/` and `test/`: iterate with `for...of`, `for (const [index, item] of items.entries())` when the index is needed, and skip with `continue`.

## Move to ESLint

- `@typescript-eslint/parameter-properties` with `allow: ['readonly', 'private readonly', 'protected readonly']` and `@typescript-eslint/prefer-readonly` carry Constructors and fields; a `no-restricted-syntax` selector on the Utility types names outside `**/interfaces/**` carries Utility types.
- `ts/test` gains what `ts/default` enforces in `src/`, and a spec holds to it now: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/prefer-nullish-coalescing`, `prefer-template`, and the this-call selectors (`eslint.config.mjs:79`: a `this.` call, bare or under `await`, `as`, `!`, `satisfies`, or `?.`, as an argument, property value, `if`/`while` condition, ternary test or branch, operator or template operand, spread, member-access object, computed member access (`obj[this.x()]`), `throw` argument, or `for…of` right side goes in a `const`; an array element, a concise arrow body, and a `this.x.bind(this)` argument stay inline).
