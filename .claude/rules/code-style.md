---
paths:
  - "src/**"
  - "test/**"
---

# Code style

Naming is `naming.md`; layering is `layering.md`; this file holds what ESLint, Prettier, and `tsc` do not enforce.

## NestJS idiomatic

A hand-rolled version of something Nest provides is a defect: no service locator, no manual `new` of an
injectable, no bare `@UseGuards` where a `@<Feature>Protected()` decorator exists. The one sanctioned
service-locator call is a `createParamDecorator` factory reading CLS through `ClsServiceManager.getClsService()`.

## Imports

- Aliases: `tsconfig.json` `paths`; the config barrel is `@configs/index`, package fields `@generated/package/package`.
- A class Nest injects is a value import: `import type` erases its constructor metadata; DI fails at boot, `tsc` green.

## Composed strings

A string with placeholders is a `{token}` pattern (`naming.md`): one token is `String.prototype.replace` with a
function replacement whenever the value is not a literal in the same file (the string form expands `$&`, `$1`,
and friends); two or more tokens go through one pass of `HelperStringService.fillPattern`
(`src/common/helper/services/helper.string.service.ts:66`).

## Concurrency and errors

Async-first is the priority, in `src/` and `test/` alike: independent operations always run concurrently. Start every
promise that does not wait on a pending result, each into a `const`, then await them together:
- `await Promise.all([...])` by default, where one failure fails the whole;
- `await Promise.allSettled([...])` where each outcome is handled on its own: a best-effort side effect, a fan-out
  notification, a cache clear.

```ts
const userPromise = this.userRepository.findOneById(userId);
const settingPromise = this.settingRepository.findByUser(userId);
const [user, setting] = await Promise.all([userPromise, settingPromise]);
```

A dependent chain (start, then use the result) is its own async function or private method, and its promise joins
the array beside the other independent work. A sequential `await` of independent work is a defect outside the cases
below; one still in the tree is a sweep finding, not a precedent.

A sequential `await` whose dependency is visible in the code carries no comment: the call takes an earlier result,
or it acts on the subject an earlier step changed (the same container, app, client, or loop iteration, as in a poll on its own probe;
the same `tx`, whose MongoDB session runs one operation at a time). Sequential awaits on different subjects whose
order matters occur only in these cases, each named at the site in a one-line `// Sequential by design: ...` comment:
- a write that must not happen if an earlier step throws;
- a gate that decides whether the request proceeds (a feature-flag gate, an existence or permission check) runs before
  the work it guards, so a closed gate starts no query and its exception is the one the caller sees;
- side effects whose order is part of the contract (a reset before a boot, seeds that read rows an earlier seed wrote);
- a fan-out over an unbounded collection: concurrent within a bounded chunk (as above), the chunks in turn; the chunk
  size is a config key (`config.md`), as `analytic.fraud.concurrency` and `file.importValidationConcurrency`.

A file holding a sanctioned awaiting loop is listed in the `code-style/await-in-loop-allowed` block of `eslint.config.mjs`.

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

- `ts/test` gains what `ts/default` enforces in `src/`, and a spec holds to it now: `@typescript-eslint/no-explicit-any`,
  `@typescript-eslint/prefer-nullish-coalescing`, `prefer-template`, the this-call `no-restricted-syntax` selectors
  (a `this.` call lands in a `const` first), `no-await-in-loop`, and the Prisma `internal/` import pattern.
