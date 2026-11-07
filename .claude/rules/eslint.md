---
paths:
    - 'src/**'
    - 'test/**'
    - 'scripts/**'
    - 'vitest.config.ts'
    - 'eslint.config.mjs'
---

# ESLint

## Config blocks

`eslint.config.mjs` is the source for rule names. Eight blocks carry `files:`: `ts/default` (`src/**/*.ts`, the full project rule set), `ts/env-boundary` (on top of `ts/default`: `src/configs/**/*.ts`, `src/main.ts`, `src/instrument.ts`), `ts/boundaries` (`src/**/*.ts`, `eslint-plugin-boundaries`), `ts/module-cycle` (`src/modules/*/*.module.ts`, `module-graph/no-cycle`), `ts/database-client` (on top of `ts/default`: `src/**/repositories/**/*.ts`, `src/modules/health/indicators/**/*.ts`, `src/migration/**/*.ts`, `src/common/database/**/*.ts`), `ts/other` (`scripts/**/*.ts`, `vitest.config.ts`: typescript-eslint recommended only), `ts/test` (`test/**/*.ts`), and `ts/test-spec` (`test/**/*.spec.ts`, on top of `ts/test`).

- `ts/env-boundary` (the environment boundary, `config.md`) re-declares `no-restricted-properties` with `mathRandomRestriction` alone.
- A lint-clean env read outside the boundary (`Reflect.get(process, 'env')`) is a defect.
- `eslint.config.mjs` names no feature module. At load, its inline `readModuleGraph` derives the module graph from each `src/modules/<feature>/<feature>.module.ts`: the `@Global()` flag and the feature `<Feature>Module`s in `imports:`.
- `ts/boundaries` runs `boundaries/dependencies` over element types captured per folder of `src/modules/<feature>/` (`controller`, `processor`, `use-case`, `service`, `repository`, `util`, `cache`, `queue`, `guard`, `interceptor`, `decorator`, `factory`, `indicator`; `shape` for `constants`, `dtos`, `enums`, `interfaces`, `exceptions`; `feature` for the rest) and two file categories (`use-case-module` for `*.use-case.module.ts`, `module` for every other `*.module.ts`): the layer matrix of `layering.md`, Roles, and the module graph.
- On top of the `layering.md`, Roles matrix, three layer policies hold, a module file being either category: a guard, interceptor, or decorator never reaches a repository, use case, controller, processor, or module file; a util never reaches a controller, processor, guard, decorator, interceptor, factory, indicator, or module file; a processor never reaches a util, cache, queue class, or module file, its own feature's included.
- Over the graph, a service reaches another feature's service or util only when its own `<feature>.module.ts` imports that feature's `<Feature>Module` or the feature is `@Global()`; a guard, strategy, interceptor, or decorator reaches only a `@Global()` feature's.
- `ts/module-cycle` runs `module-graph/no-cycle`, an inline plugin `createModuleCyclePlugin` builds from the graph: a cycle is a lint error on each module file in it, naming the path (`Feature module cycle: device -> notification -> device.`).
- `ts/default` restricts `forwardRef` from `@nestjs/common` (`no-restricted-imports`) and a `databaseService.client` access (`databaseClientRestriction`, `no-restricted-syntax`); `ts/database-client` re-declares `no-restricted-syntax` with every `ts/default` selector but that one.
- No other `files:` block narrows a rule. Every file a `files:` block matches runs under `noInlineConfig: true`, so `pnpm lint` (`--max-warnings 0`) fails on an inline directive.
- A rule that fires is fixed in code; one that cannot hold everywhere is the owner's to remove, for every file.
- `ts/default` throw selectors: `throwNewErrorRestriction` (`throw new Error(...)`) and `throwIdentifierRestriction` (`eslint.config.mjs`: `throw <identifier>` outside an `if` branch testing `instanceof` a name ending `Exception` or `UnrecoverableError`, alone or `||`-joined up to three, so `HttpException` passes); `exceptions.md` says what to throw.
- `@typescript-eslint/promise-function-async` (`checkArrowFunctions: false`) makes every function and method returning a promise `async`.
- `forEachRestriction` (`eslint.config.mjs`, joined to `codeStyleSyntaxRestrictions` and `testSyntaxRestrictions`) rejects `.forEach` in `src/` and `test/`: iterate with `for...of`, `for (const [index, item] of items.entries())` when the index is needed, and skip with `continue`.

## Move to ESLint

- `@typescript-eslint/parameter-properties` with `allow: ['readonly', 'private readonly', 'protected readonly']` and `@typescript-eslint/prefer-readonly` carry `code-style.md`, Constructors and fields; a `no-restricted-syntax` selector on the Utility types names outside `**/interfaces/**` carries `code-style.md`, Utility types; one on `TSTypePredicate[asserts=true]` carries the assertion-signature ban (`code-style.md`, Types and comments).
- `ts/test` gains what `ts/default` enforces in `src/`, and a spec holds to it now: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/prefer-nullish-coalescing`, `prefer-template`, and the this-call selectors (`thisCallRestrictions` in `eslint.config.mjs`: a `this.` call, bare or under `await`, `as`, `!`, `satisfies`, or `?.`, as an argument, property value, `if`/`while` condition, ternary test or branch, operator or template operand, spread, member-access object, computed member access (`obj[this.x()]`), `throw` argument, or `for…of` right side goes in a `const`; an array element, a concise arrow body, and a `this.x.bind(this)` argument stay inline).
