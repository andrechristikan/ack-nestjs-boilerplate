# 0054. Every global module is `@Global()` with `forRoot()`

- Status: accepted
- Date: 2026-11-14

## Context

Global modules came in three shapes: a kit `forRoot()` returning `global: true`, a static `@Global() @Module({...})` feature module, and `RequestThrottleModule` imported inside `ThrottlerModule.forRootAsync`. `FirebaseModule` was global though only `HealthModule`, `NotificationModule`, and `NotificationUseCaseModule` inject it.

## Decision

Every global module carries `@Global()` and a no-argument `static forRoot(): DynamicModule` with no `global` key, and only `src/common/common.module.ts` imports it, once, as `<Module>.forRoot()`. A kit module is global when most features, or a guard, pipe, interceptor, or filter on every route, inject it; `FirebaseModule` is not.

## Considered options

- `@Global()` with `forRoot()`, imported only by `common.module.ts` (chosen)
- `global: true` in `forRoot()`: rejected, the scope hides in a return value instead of on the class.
- a static `@Global() @Module({...})`: rejected, two shapes for one kind of module.
- a global module re-imported by its use-case module or inside another `forRootAsync`: rejected, a global provider is already visible there.
- `FirebaseModule` global: rejected, three importers name it, as `AwsModule`'s importers do.

## Consequences

- Third-party root modules keep their own option (`ConfigModule` `isGlobal`, `ClsModule` `global`).
- `.claude/rules/layering.md`, `@Global()`, carries the list.
