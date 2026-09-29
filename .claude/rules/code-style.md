---
paths:
  - "src/**"
  - "test/**"
---

# Code style

Naming is `naming.md`; layer placement is `layering.md`. `eslint.config.mjs`, Prettier, and `tsc` enforce what
they enforce; this file holds what they do not.

## NestJS idiomatic

A hand-rolled version of something Nest provides is a defect: no service locator, no manual `new` of an
injectable, no bare `@UseGuards` where a `@<Feature>Protected()` decorator exists. The one sanctioned
service-locator call is a `createParamDecorator` factory reading CLS through `ClsServiceManager.getClsService()`.

## Imports

- The alias table is `tsconfig.json` `paths`. An alias specifier carries no extension.
- `verbatimModuleSyntax`: a type-only import is `import type`. A class Nest injects is a value import; a
  type-only import erases the constructor metadata and DI fails at boot with `tsc` green.
- The Prisma client comes from `@generated/prisma-client/client` (or `/enums`, `/models`, `/browser`,
  `/commonInputTypes`); the config barrel is `@configs/index`; package fields from `@generated/package/package`.

## A `this.` call lands in a `const` first

A call rooted at `this` (`this.method()`, `this.dependency.method()`, awaited or not) is assigned to a `const`
before its value is used. A ternary branch that needs one becomes `if` / `else`.

## Composed strings

Two string variables join in a template literal. A string with placeholders is a `{token}` pattern
(`naming.md`): one token is `String.prototype.replace` with a function replacement whenever the value is not a
literal in the same file (the string form expands `$&`, `$1`, and friends); two or more tokens go through one
pass of `HelperStringService.fillPattern` (`src/common/helper/services/helper.string.service.ts:66`).

## Concurrency and errors

Async operations that do not depend on each other run concurrently, in `src/` and `test/` alike: `Promise.all` when
one failure fails the whole, `Promise.allSettled` when each outcome is handled on its own. A sequential `await` of
independent operations is a defect; one still in the tree is a sweep finding, not a precedent. Each call lands in a
`const` first, then the array:

```ts
const userPromise = this.userRepository.findOneById(userId);
const settingPromise = this.settingRepository.findByUser(userId);
const [user, setting] = await Promise.all([userPromise, settingPromise]);
```

Sequential stays only in these cases, each named in a one-line comment at the site (`// Sequential by design: ...`):
- the call consumes an earlier result;
- a write that must not happen if an earlier step throws;
- statements on one `tx` inside `DatabaseService.withTransaction` (a MongoDB session runs one operation at a time);
- side effects whose order is part of the contract;
- a fan-out over an unbounded collection, which runs in bounded chunks.

`.catch()` belongs only to `bootstrap().catch` in `src/main.ts` and `src/migration.ts` and to a promise never awaited.

## Types and comments

Import a shape that already has a name; a hand-written copy or structural subset is a mirror that drifts. Zero
copy-paste logic, one source per config value, connection, and constant; duplication still beats the wrong
abstraction. No helper taking a function parameter to share a loop: share the predicate, repeat the loop.

Default zero comments. A comment states what the symbol is or does, present tense, no history. JSDoc: optional
one line on a class whose name does not say what it is; method JSDoc is the exception; none on interfaces
except the kit surface. `TODO` and `FIXME` are work markers. After a change, re-test every comment it touched.
Kit surface carries `@public` (a knip directive): every export of `*.dto.ts`, `*.decorator.ts`, `*.enum.ts`
(on the enum), `*.exception.ts`, `*.constant.ts`, `*.contract.ts`, and `src/common/doc/interfaces/doc.interface.ts`
has a JSDoc whose first line states what it is, then `@public` (`@alias` for an intentional alias). No other
export carries it; the tag keeps an unused export out of the knip report, and an unimported file still prints.

## Move to ESLint

- `no-await-in-loop` for the concurrency rule, enabled once the sequential awaits in the tree are swept.
