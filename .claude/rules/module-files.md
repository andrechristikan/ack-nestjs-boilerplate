---
paths:
    - '**/*.module.ts'
    - 'src/router/**'
---

# Module files

Roles and the dependency order: `layering.md`.

## `@Global()`

- A global module carries `@Global()` and a no-argument `forRoot()` with no `global` key; only `src/common/common.module.ts` imports it, once, as `<Module>.forRoot()`.
- A feature `<Module>Module` is global only when a guard, strategy, interceptor, or decorator injects its classes: `ApiKeyModule`, `AuthModule`, `FeatureFlagModule`, `PolicyModule`, `RoleModule`, `SessionModule`, `TermPolicyModule`. A use-case module is never global.
- Every kit module `common.module.ts` composes is global but `LoggerModule`, which exports nothing. `AwsModule` and `FirebaseModule` sit outside it, imported where used.
- Third-party root modules keep their own option (`ConfigModule` `isGlobal`, `ClsModule` `global`).

## Module files

- `<module>.module.ts`, `<Module>Module`: services, repositories, utils, caches, queue classes, factories, strategies, interceptors, indicators in `providers`; its services, utils, and caches in `exports`, never a repository or a queue class; imports the `<Module>Module` of each non-`@Global()` feature whose services or utils its services inject, plus one `BullModule.registerQueueAsync` for the queues it owns, each with its factory, nothing else.
- `<module>.use-case.module.ts`, `<Module>UseCaseModule`: the feature's use cases in `providers` and `exports`, never a processor; imports each non-`@Global()` `<Module>Module` its use cases inject, its own included. A leaf: only `src/router/` imports it.
- `src/router/http/router.http.<scope>.module.ts` declares the scope's controllers and imports each `<Module>UseCaseModule` whose use cases they inject, plus the `<Module>Module` of every non-`@Global()` feature whose guard they carry (`src/router/http/router.http.user.module.ts`).
- `src/router/processor/router.processor.module.ts` lists every processor in `providers` and imports each `<Module>UseCaseModule` whose use cases they inject.
- In `@Module({ imports: [...] })`, every `<Module>UseCaseModule` comes first, then one blank line, then every other module (`<Module>Module`, kit modules, `forRootAsync(...)` calls); a file with one group carries none.

Only files with something to provide exist. A `@Module({})`, or a global module's `forRoot()` after `module` with its `@Module({})` empty, lists `controllers` (`[]` in both), `providers`, `exports`, `imports`, in that order. `forRoot()` runs once, in a root module: `src/app/app.module.ts`, `src/common/common.module.ts`, `src/router/router.module.ts`. `tsc` and Vitest pass a broken `imports:`; boot to verify wiring (a cycle raises `ReferenceError`, a missing provider `UnknownDependenciesException`).
