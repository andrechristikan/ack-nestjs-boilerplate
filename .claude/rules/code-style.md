---
paths:
    - 'src/**'
    - 'test/**'
    - 'eslint.config.mjs'
---

# Code style

## NestJS idiomatic

Hand-rolling what Nest provides is a defect: no service locator, no manual `new` of an injectable, no bare `@UseGuards` where a `@<Feature>Protected()` exists. Exceptions: `ClsServiceManager.getClsService()` in a `createParamDecorator` factory, and the per-class `new Logger(ClassName.name)` (`config.md`).

## Imports

- Aliases: `tsconfig.json` `paths`; the config barrel is `@configs/index`, package fields `@generated/package/package`.
- A class Nest injects is a value import: `import type` erases its constructor metadata; DI fails at boot, `tsc` green.

## Composed strings

A string with placeholders is a `{token}` pattern (`naming.md`): one token is `String.prototype.replace` with a function replacement whenever the value is not a literal in the same file (the string form expands `$&` and `$1`); two or more tokens go through one pass of `HelperStringService.fillPattern` (`helper.string.service.ts`).

## Concurrency and errors

Async-first in `src/` and `test/`: independent operations run concurrently, awaited together by `Promise.all` (the default: one failure fails the whole) or `Promise.allSettled` (each outcome handled on its own: a best-effort side effect, a fan-out notification, a cache clear). Write each call as an array element; a promise goes in a `const` only when it must start before another `await`, is used more than once, or joins an array built conditionally (`push`, or a `let` set in if/else). A `.map()` with a multi-statement callback goes in a named `const`; one with a one-expression callback stays inline, `Promise.all(ids.map(id => this.repo.find(id)))`. A dependent chain (start, then use the result) is its own async function or private method whose promise joins the array. A sequential `await` of independent work is a defect outside the cases below; one still in the tree is a sweep finding, not a precedent.

```ts
const [user, setting] = await Promise.all([
    this.userRepository.findOneById(userId),
    this.settingRepository.findByUser(userId),
]);
```

A sequential `await` whose dependency is visible in the code carries no comment: the call takes an earlier result, or it acts on the subject an earlier step changed (the same container, app, client, or loop iteration, as in a poll on its own probe; the same `tx`, whose MongoDB session runs one operation at a time). Sequential awaits on different subjects whose order matters occur only in these cases, each named at the site in a one-line `// Sequential by design: <case>` comment, in a loop too:

- a write that must not happen if an earlier step throws;
- a gate that decides whether the request proceeds (a feature-flag gate, an existence or permission check) runs before the work it guards, so a closed gate starts no query and its exception is the one the caller sees;
- side effects whose order is part of the contract (a reset before a boot, seeds that read rows an earlier seed wrote);
- a fan-out over an unbounded collection: bounded chunks in turn, each concurrent; the size is a config key (`config.md`).

`.catch()` belongs only to `bootstrap().catch` in `src/main.ts` and `src/migration.ts` and to a promise never awaited.

## Types and comments

Import a shape that already has a name; a hand-written copy or structural subset is a mirror that drifts. Zero copy-paste logic (the `config.md` optional-env ternary excepted), one source per config value, connection, and constant; duplication still beats the wrong abstraction. No helper taking a function parameter to share a loop: share the predicate, repeat the loop.

Default zero comments; the one marker is `// Sequential by design: <case>`. A comment states what the symbol is or does, present tense, no history. JSDoc: optional one line on a class whose name does not say what it is; method JSDoc is the exception; none on interfaces except the kit surface. `TODO` and `FIXME` are work markers. Re-test every comment a change touched. Kit surface carries `@public` (a knip directive): every export of `*.dto.ts`, `*.decorator.ts`, `*.enum.ts` (on the enum), `*.exception.ts`, `*.constant.ts`, `*.contract.ts`, `*.validation.ts`, and `src/common/doc/interfaces/doc.interface.ts` has a JSDoc whose first line states what it is, then `@public` (`@alias` for an intentional alias). No other export carries it; the tag keeps an unused export out of the knip report, and an unimported file still prints.

## ESLint

`eslint.config.mjs` is the source for rule names. Five blocks carry `files:`: `ts/default` (`src/**/*.ts`, the full project rule set), `ts/env-boundary` (on top of `ts/default`: `src/configs/**/*.ts`, `src/main.ts`, `src/instrument.ts`, `src/queues/decorators/queue.decorator.ts`), `ts/other` (`scripts/**/*.ts`, `vitest.config.ts`: typescript-eslint recommended only), `ts/test` (`test/**/*.ts`), and `ts/test-spec` (`test/**/*.spec.ts`, on top of `ts/test`).

- `ts/env-boundary` (the environment boundary, `config.md`) re-declares `no-restricted-properties` with `mathRandomRestriction` alone.
- A lint-clean env read outside the boundary (`Reflect.get(process, 'env')`) is a defect.
- No other `files:` block narrows a rule. Every file a `files:` block matches runs under `noInlineConfig: true`, so `pnpm lint` (`--max-warnings 0`) fails on an inline directive.
- A rule that fires is fixed in code; one that cannot hold everywhere is the owner's to remove, for every file.
- Two `ts/default` throw selectors: `throwNewErrorRestriction` (`throw new Error(...)`) and `throwIdentifierRestriction` (`throw <identifier>` outside an `instanceof` `if`); `exceptions.md` says what to throw.

## Move to ESLint

- `ts/test` gains what `ts/default` enforces in `src/`, and a spec holds to it now: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/prefer-nullish-coalescing`, `prefer-template`, and the this-call selectors (`eslint.config.mjs:73`: a `this.` call, bare or under `await`, `as`, `!`, `satisfies`, or `?.`, as an argument, property value, `if`/`while` condition, ternary test or branch, operator or template operand, spread, member-access object, computed member access (`obj[this.x()]`), `throw` argument, or `for…of` right side goes in a `const`; an array element, a concise arrow body, and a `this.x.bind(this)` argument stay inline).
