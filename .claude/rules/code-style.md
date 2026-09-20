# Code style

Mechanical style. Naming and casing are `rules/naming.md`. Layer placement is
`rules/architecture.md`.

## NestJS idiomatic — no hand-rolled substitutes

Use the framework the Nest way: modules, DI, providers, guards, pipes, interceptors,
decorators, lifecycle hooks. **If Nest already provides it, a hand-rolled version is a defect
regardless of how well it works.** No service locator, no manual instantiation of an
injectable, no bare `@UseGuards` where a `@<Feature>Protected()` decorator is the convention.

One service locator call is sanctioned: a `createParamDecorator` factory runs outside the
injection context, so a store-reading decorator reaches CLS through
`ClsServiceManager.getClsService()` (`rules/security.md`). Everything else injects
`RequestStoreService`.

## Path aliases — a relative import is a defect

The alias table is `tsconfig.json` `paths`, and it is the only one (Vitest and knip read it):

```
@app/*  @common/*  @configs/*  @modules/*  @router/*  @migration/*  @queues/*
@test/*  @generated/*  @instrument  @swagger  @main  @migration
```

- A `./` or `../` in an import is a defect, **including inside the same module**. The client
  under `src/generated/**` is generated code, not project code.
- An alias specifier carries no file extension (`@common/helper/services/helper.hash.service`).
- The Prisma client is imported from `@generated/prisma-client/client` (or `/enums`,
  `/models`, `/browser`, `/commonInputTypes`). `@generated/prisma-client/internal…` is never
  imported (ESLint-enforced).
- The config barrel is `@configs/index`; package fields come from
  `@generated/package/package`. `src/` has no JSON module import.

## Imports — native ESM

- `verbatimModuleSyntax` is on: an import used only as a type is `import type`. A class that
  Nest injects is a VALUE import, because a type-only import erases the constructor metadata
  and DI fails at boot while `tsc` stays green.
- Node built-ins use the `node:` specifier (`node:crypto`); a bare `'crypto'` is an ESLint error.
- lodash is used only through named imports from `lodash-es`; `lodash`, `lodash/*` and a
  default `lodash-es` import are ESLint errors.
- `crypto-js` and `Math.random` are ESLint errors. Randomness goes through `node:crypto`
  (`randomInt` / `randomBytes`) behind `HelperStringService` / `HelperNumberService`
  (`rules/security.md`).

## Private methods sit above public ones

Inside a class, every `private` method is declared ABOVE the public methods, directly under
the constructor. A reader meets the helpers before the code that calls them, and the public
surface of the class stays in one uninterrupted block instead of being cut apart by helpers.

This is a layout rule, not a visibility rule — it does not change what is private.

## A `this.` call lands in a `const` first (HARD)

A call rooted at `this` — `this.method()`, `this.dependency.method()`, awaited or not — is
assigned to a `const` before the value is used. The variable is what the next line reads. One
call, one named value: the argument list of the line below says what is being passed instead of
how it was computed, and a debugger stops on the result.

Restricted positions:

- an argument of any call, including `new X(this.y())` and `throw new E(this.z())`
- an object-literal property value
- an `if` / `else if` / `while` condition, and a ternary test or branch
- any compound expression containing the call — `!this.x()`, `a && this.x()`, `a ?? this.x()`,
  arithmetic — including inside a `return`
- a template literal, a spread, a `for…of` iterable, an element-access index
- a `throw` operand: `const exception = this.util.mapCollision(error); throw exception;`
- inside a callback's block body

Allowed, because the call is the whole expression and nothing reads it in place:

- `return this.x()` and `return await this.x()` — but `return this.x().y` is restricted
- an arrow whose entire body IS the call: `rows.map(row => this.map(row))`
- an array element, including `Promise.all([this.x(), this.y()])`
- a method reference: `this.logQuery.bind(this)`
- an assignment or an expression statement: `const row = await this.repo.find()`, `await this.flush()`

`await`, `!`, `as`, `satisfies` and optional chaining around the call do not lift the
restriction. A ternary branch becomes `if` / `else` over a typed `let`, so the call stays
lazy — hoisting an IO or database call out of a branch that may not run is a behaviour change,
while a pure synchronous call may be hoisted.

No linter enforces this: the positions are too many to express as selectors worth maintaining,
and a violation costs readability rather than correctness. `reviewer` checks it on every diff.

## A composed string is a template or a pattern (HARD)

`+` never joins strings. Two fragments are a template literal; a string carrying placeholders is
a `{token}` pattern, and how it is filled depends on how many tokens it has:

- **One token** — `String.prototype.replace` with a FUNCTION replacement whenever the value is
  not a literal in the same file (`rules/config.md` — the string form expands `$&`, `` $` ``,
  `$'`, `$$` and `$1` inside the value). A literal replacement stays a plain string: `''` is
  written `''`, never `() => ''`.
- **Two or more** — `HelperStringService.fillPattern(pattern, values)`, one pass over every
  token. Chained replaces fill left to right, so a value substituted first is rescanned by the
  next call: a value carrying the literal text of a later token forges the result. One pass
  reads the pattern before any substitution exists. A token the record does not supply throws
  `HelperPatternTokenMissingException`, because a half-filled key reads fine and collides
  silently.

```ts
const key = `${workspaceId}:${startToken}:${endToken}`;
const url = CdnUrlPattern.replace('{key}', () => key);
const sessionKey = this.helperStringService.fillPattern(SessionKeyPattern, {
    userId,
    sessionId,
});
```

A pattern constant is named for what it is (`rules/naming.md` reserves the `Pattern` suffix for
a placeholder string), so the token set is declared once and every filler reads the same name.

## Independent awaits run concurrently (HARD)

When two or more `await`s in the same scope do not depend on each other's result, they run in
one `Promise.all([...])`. Sequential `await`s there are not a style choice — they add every
call's latency together for no reason, and the cost is invisible in review because each line
looks correct on its own.

The exceptions are real, so name them when they apply: an await whose argument uses an earlier
result, a write that must not happen if an earlier step throws, and anything already inside
`DatabaseService.withTransaction` (which sequences by design). See `rules/concurrency.md`.

## Never mirror a type that already has a name

If a shape already exists as a named type, import it. A hand-written inline copy is a mirror:
it drifts silently because nothing makes the two move together. A structural SUBSET is still a
mirror — restating three fields of `IUser` inline means importing `IUser` and picking, not
retyping.

An inline object type is fine when it mirrors nothing. The test: does a named type for this
shape already exist, or is this a structural subset of one? Yes → import it and delete the
copy. No → inline is fine.

## Duplication

Zero copy-paste logic. Written twice is a signal, written three times is a defect. One source
of truth per config value, connection, and constant. **Duplication still beats the wrong
abstraction** — do not abstract to satisfy DRY against YAGNI (`rules/architecture.md`).

## Comments

**Default zero comments.** Types, names, and structure are the contract.

Every comment states FINAL STATE only — what the symbol IS or DOES, present tense. No
history, no decision, no changelog. Deprecation is the one exception, and only with a real
`@deprecated` marker.

`// @note:` is banned. Delete it on sight.

JSDoc is where a written explanation belongs. Optional one-line class JSDoc when the class
name does not say what the provider is. Method JSDoc is the exception. No JSDoc on
interfaces, except the kit surface below. Banned tags: `@example` `@param` `@returns`
`@template` `@throws` `@private` `@export` `@class` `@implements` `@constraint` `@remarks`.

### Kit surface carries `@public` (HARD)

`@public` and `@alias` are knip directives, not documentation. Every export of these files
carries a JSDoc whose first line states what the symbol IS or DOES, followed by `@public`
(and `@alias` for an intentional alias), in every tree under `src/`:

- `*.dto.ts` — the schema const and its `Dto` type
- `*.decorator.ts`
- `*.enum.ts` — the tag sits on the enum
- `*.exception.ts`
- `*.constant.ts`
- `*.contract.ts`
- `src/common/doc/interfaces/doc.interface.ts`

```ts
/**
 * Validated application environment variables, inferred from `AppEnvSchema`.
 * @public
 */
export type AppEnvDto = z.infer<typeof AppEnvSchema>;
```

No other export carries `@public`: modules, controllers, domains, repositories and their
interfaces, services, utils, caches, queues, guards, pipes, interceptors, middlewares,
factories, and the module doc factories under `docs/`. The tag keeps an unused export out of
the knip report; it does nothing for an unimported file (`rules/architecture.md`).

Inline `//` is rare: something a reader cannot see from that statement and that causes real
damage when missed. Zero per file is normal. No trailing comments.

`TODO` and `FIXME` are work markers and are allowed. `NOTE`, `XXX`, and `HACK` are not used.

After a change lands, re-test every comment it touched. Delete the ones whose subject is
gone.
