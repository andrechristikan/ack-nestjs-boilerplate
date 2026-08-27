# Nest wiring

What a module may reach for is `rules/cross-module.md`. This file is the mechanics: providers,
imports, exports, global modules, and the registration sites.

## The composition roots

There are exactly three, and no fourth is invented:

| Root | Owns |
|---|---|
| `src/app/app.module.ts` | the `APP_FILTER` chain; imports `CommonModule`, `QueueModule`, `RouterModule` |
| `src/common/common.module.ts` | every global infrastructure module and the app-wide feature modules |
| `src/queues/queue.module.ts` | every BullMQ processor provider |

`src/router/router.module.ts` mounts the five route-prefix modules (`rules/router.md`), and
`src/queues/queue.register.module.ts` is `@Global()` and holds every `BullModule.registerQueue`
with its job defaults (`rules/queue.md`).

## Global modules are imported once

`RedisCacheModule`, `CacheMainModule`, `QueueRegisterModule`, `DatabaseModule`, `MessageModule`,
`LoggerModule`, `RequestModule`, `ResponseModule`, `HelperModule`, `PaginationModule`,
`FileModule`, `FirebaseModule` are composed inside `common.module.ts` through their `forRoot()`
/ `forRootAsync()` and are `global: true`.

**A feature module never imports one of them.** Injecting `DatabaseService` or
`PaginationService` needs no `imports:` entry, and adding one is drift that reads as if the
module owned a second instance.

`forRoot()` is called ONCE, at the composition root. A `forRoot()` inside a feature module is a
second instance of something that is supposed to be shared.

## A feature module

```ts
@Module({
    controllers: [],                    // registered by src/router, not here
    providers: [UserService, UserRepository],
    exports: [UserService],             // what other modules consume
    imports: [WorkspaceModule],         // only what this module actually injects
})
export class UserModule {}
```

- **`controllers: []` stays empty.** A controller is registered by
  `routes.<scope>.module.ts` (`rules/router.md`). A feature module that registers its own
  controller mounts it OUTSIDE the route prefix, so the endpoint exists at the wrong path with
  nothing failing.
- **A processor is provided by `queue.module.ts`, not here** (`rules/queue.md`).
- **`exports` is a contract.** Export the service other modules consume, plus a guard-backing
  service where a guard in another module needs it. Internal helpers stay unexported.
- **`imports` lists what this module actually injects.** An import nobody uses is noise that
  makes a real cycle harder to see.

## Never `forwardRef` between feature modules (HARD)

A circular import is a broken boundary to re-architect, not a hazard to work around. See
`rules/cross-module.md` for the three ways out.

## Injection is by class

Inject services and repositories as CLASSES. No `@Inject`, no string token, no interface token
— a repository has exactly one implementation and a feature service has one too. A DI token is
only for a real swappable seam, and then it is PascalCase wrapped in `Symbol()`
(`rules/naming.md`).

A service still `implements I<Feature>Service`; a repository gets no header interface
(`rules/architecture.md`).

## A cycle surfaces only at boot

`tsc` and jest both pass with a circular `imports:` in place. The failure is a runtime
`ReferenceError` or `Cannot access '…' before initialization` during bootstrap. **Any change to
an `imports:`, `providers:`, or `exports:` array is verified by BOOTING the app**, not by a
green type-check.
