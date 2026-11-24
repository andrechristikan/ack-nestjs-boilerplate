---
paths:
    - 'src/**'
    - 'test/**'
    - 'eslint.config.mjs'
---

# Code style

## Lint

A lint rule that cannot hold everywhere is the owner's to remove, for every file.

- `pnpm spell` exits 1 on a misspelling.
- `pnpm deadcode` is knip, every rule at `error`: an unused file, export, type, enum member, or dependency exits 1.

## Imports

- The config barrel is `@configs/index`, package fields `@generated/package/package`.
- A class Nest injects is a value import: `import type` erases its constructor metadata; DI fails at boot, `tsc` green.

## Composed strings

A config string with placeholders is a `{token}` pattern (`naming.md`): one token is `String.prototype.replace` with a function replacement whenever the value is not a literal in the same file (the string form expands `$&` and `$1`); two or more tokens go through one pass of `HelperStringService.fillPattern` (`helper.string.service.ts`). Under `test/`, a value composed inside one method is a template literal.

## Functions and parameters

Contexts run in the `http.md` order.

## Utility types

- `Omit`, `Pick`, `Partial`, `Required`, `Readonly`, `Extract`, `Exclude`, `NonNullable`, `ReturnType`, `Parameters`, and `Record<Enum, T>` appear only in a declaration under `interfaces/`: a named `I*` type or a member of an `I*` interface.
- A class field, a parameter, a return type, a local, a constant's annotation, and a type argument outside `interfaces/` name that `I*` (`naming.md`, Identifiers).
- `Record<string, T>` for an open map (`messageProperties`, `metadata`, a tokens bag) and a bare generic type parameter (`get<T>(key)`, `set<T>(key, value: T)`) stay anywhere. Outside `interfaces/` a generic is never wrapped in `Partial<T>`, `Pick<T, …>`, `Omit<T, …>`, or `Exclude<T, …>`: `RequestStoreService.merge` takes a named `I*` patch shape from `src/common/request/interfaces/`.

## Literal strings

- Project-declared strings: `enum.md`, Literal unions.
- A literal a third-party contract defines keeps that contract's type: BullMQ `backoff.type: 'exponential'` and the `'failed'` worker event, redis `'PX'`, `'XX'`, `'OK'`, Prisma log levels, `PromiseSettledResult.status`. So does the key list of a utility type under `interfaces/` (`Pick<ApiKey, 'id' | 'name'>`).
- A log context line is a literal English sentence (`this.logger.error(error, 'Queue job failed')`, `injectable.md`, Logger). Queue text that leaves through `IQueueResponse`, `QueueException`, or a side-effect description is i18n (`queue.md`, Messages).
- A regex holds the allowed characters and format, never the length of the whole value: that length is `.min()`, `.max()`, or `.length()` on the schema, or a `length` comparison against a constant where no schema reads the value (`RequestIdMaxLength`). A quantifier on part of a value (an email TLD, an ARN account id) is format.

## Collections

- A list searched by a key inside a loop is a `Map` (a value read) or a `Set` (a presence read) built once before the loop (`new Map(roles.map(role => [role.name, role.id]))`); a `find` or `some` over the array on every iteration is the defect. A compound key is one string (`${type}:${version}`).
- A constant list read only for membership is a `ReadonlySet` checked with `has` (`AppRefusalLogStatuses`). It stays an array where its order or an index is read, where it is joined or iterated, or where zod, Prisma, or a third party takes it.
- A config list stays an array in its `IConfig*` interface; the class that checks membership reads it once into a `private readonly` constructor field typed `ReadonlySet<T>`, named as `injectable.md`, Config, gives.
- A lookup built at runtime from a list or rows is a `Map`; an open map stays `Record<string, T>` (Utility types).

## Dates

- A date stored or passed inside the system (a Prisma column, a Redis value, a job or outbox payload, `Notification.metadata`, a response body) is a `Date` or an ISO 8601 string (`HelperDateService.formatToIso`; a pipeline `$date`, a cursor token, and a cache key token use `toISOString`, UTC).
- RFC 2822 (`HelperDateService.formatToRfc2822`) appears only in text rendered for a person: an email template's data, a push or in-app notification title or body, a generated document. Persistence: `transaction.md`, Dates.
- `HelperDateService.now()` reads the clock; `create(date)` takes a given date and never falls back to the clock.

## Types and comments

Import a shape that already has a name; a hand-written copy or structural subset is a mirror that drifts. Zero copy-paste logic (the `config.md` optional-env ternary and a queue factory's option block (`queue.md`) excepted), one source per config value, connection, and constant; repeated declarative data (a doc error entry list, a decorator stack on a route) and a call repeated at two sites are not copy-paste logic; a body repeated is, and logic stays single-source (two subjects whose rule can change apart keep their own copy, `service.md`, Methods); duplication still beats the wrong abstraction. No helper taking a function parameter to share a loop: share the predicate, repeat the loop. Sentry scope data rides in `SentryService.captureException(exception, captureContext)`.

No signature declares `asserts x is T` or `asserts x`. An assert that narrows a nullable input returns the narrowed value, `(value: T | null): T`, and the caller uses the return; a plain assert returns `void`.

Default zero comments; the one marker is `// Sequential by design: <case>` (`concurrency.md`). A comment states what the symbol is or does, present tense, no history. `TODO` and `FIXME` are work markers. Re-test every comment a change touched.

JSDoc lives in eight places only; a name, a signature, and `docs/` explain everything else:

1. A `@Global()` module class: the one line `Shared module: <what it exports, for whom>.` (`module-files.md`, `@Global()`).
2. Every export of `*.dto.ts`, `*.decorator.ts`, `*.enum.ts` (on the enum), `*.exception.ts`, `*.constant.ts`, `*.contract.ts`, `*.validation.ts`, and `src/common/doc/interfaces/doc.interface.ts`: the bare `/** @public */` (a knip directive), `/** @alias */` on an intentional alias, no description line. No other export carries it.
3. A public service, util, cache, or queue method whose signature hides its contract: what `null` or `false` means, a side effect the name omits (a counter, an enqueue, a cache eviction), or a precondition the caller owns. One line, present tense.
4. Nothing else, places 5 to 8 aside: no class line, constant, field, property, enum member, interface field, constructor, private method, or controller, repository, guard, or service method.
5. A piece kept until a named later change: `/** Temporary: <what replaces it>. */` on the method, private included, deleted with the piece.
6. A bulk seed list cut from a public list (`seeding.md`): one line on the export naming how many entries it keeps, the filter applied, and the source URL that holds the full list.
7. `eslint.config.mjs`: each section opens with a one-line JSDoc naming the section and what it holds, and each top-level constant carries a one-line JSDoc saying what it holds.
8. A symbol whose code hides a constraint (a framework reading `this`, a factory running before config resolves, a third-party value of two types): one line saying what breaks if it changes.

A JSDoc states what the body on disk does now: no history, no "now" or "new", no plan reference, the Temporary line (place 5) excepted. A body change re-tests its JSDoc; one that no longer matches is a defect. `reviewer` reports a JSDoc outside the eight places or one that does not match its body.
