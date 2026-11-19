# Crossing a module boundary

## What you may reach for in another module

A use case stays inside its feature: `<Module>UseCaseModule` exports it to `src/router/` only, and no service, use case, or module file of another feature reaches it.

| From another module | From a service | From a use case |
| --- | --- | --- |
| its exported service | yes, when your `<Module>Module` imports its `<Module>Module` or it is a lower `@Global()` module (`layering.md`, Dependency order) | yes, through its `<Module>Module` |
| its exported util | yes, when your `<Module>Module` imports its `<Module>Module` or it is a lower `@Global()` module (`layering.md`, Dependency order) | yes, through its `<Module>Module` |
| its cache or repository | no | no; ask the owning service |
| its use case, controller, or processor | no | no |
| its enums, interfaces, constants, schemas | yes, compile-time only | yes, compile-time only |
| its exceptions | yes, when the failed subject is its entity | yes, when the failed subject is its entity |
| its Prisma model through your own `DatabaseService` | no | no |

A guard, strategy, interceptor, or decorator injects the exported services and utils of a `@Global()` module (`module-files.md`, `@Global()`), and nothing else from another feature module.

A repository reaches another module's util only when the owner is `@Global()`. A util injects no `src/modules/` util, its own module's or another module's; the value arrives as an argument. Anything a `@Global()` module exports is reachable with no import by the callers this table allows. `@Global()` removes the import, never the dependency order.

`src/modules/analytic/` reads every feature's models in its own repositories, read-only (`layering.md`, Dependency order): the one exception to the table's last row and to model ownership below.

## A repository owns its model

A repository issues statements against the model it owns and satellite models with no repository of their own (`NotificationRepository` owns `Notification` and `NotificationDelivery`). Ownership is per class: `UserForgotPasswordRepository` does not write `User`. A nested write counts as a statement against the related model. A read may `include`, `select`, or filter on a relation. `ActivityLog` has one writer, `ActivityLogRepository`.

Who opens a transaction spanning repositories or modules, and how the others join: `transaction.md`, Transactions. A method the owning service lacks is added there, even three lines long.

## A repository stays inside its feature

`<Module>Module` provides its repositories and never exports them. `src/migration/` sits outside this file (`seeding.md`).

## Composition follows the dependency order

Use cases compose features; services share downward. A service's cross-feature reach follows its own module file's `imports:`, `@Global()` features aside. A module import cycle is a broken boundary: the boot fails on one (`ReferenceError`), and `forwardRef` hides one and is lint-forbidden. When a service needs a higher module, the ways out:

1. Orchestration: the sequence moves up into a use case, which injects both modules' services, one shared write transaction included.
2. A shared piece: it moves down into the lower module's service, or into `src/common/` when module-agnostic (`layering.md`, Dependency order).
3. A fire-and-forget hand-off: an outbox effect the use case adds in its transaction (`effects.md`), a notification included.

## An exception names the subject that failed

A missing workspace throws `WorkspaceNotFoundException` wherever the check runs: the workspace module owns that answer, its status code, and its i18n path. Do not allocate a second code in your own block for another module's entity.

## Registration lives outside the feature module

A controller file lives in its feature module; `src/router/http/router.http.<scope>.module.ts` declares it. A processor file lives in its feature module, a kit processor in its kit module's `processors/` (`src/common/cache/processors/`); `src/router/processor/router.processor.module.ts` provides it.

## Workspace scoping follows the surface

A workspace-scoped route in any module carries the workspace guards and flag: `guards.md`, Decorator order.
