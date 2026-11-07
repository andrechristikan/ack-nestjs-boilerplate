# Crossing a module boundary

## What you may reach for in another module

| From another module | From a service | From a use case |
| --- | --- | --- |
| its exported service | yes when that module ranks lower (`layering.md`, Dependency order), through its `<Module>Module` | yes, through its `<Module>Module` |
| its exported util | yes when that module ranks lower, through its `<Module>Module` | yes, through its `<Module>Module` |
| its exported queue class | no | yes, through its `<Module>Module` |
| its cache or repository | no | no; ask the owning service |
| its use case, controller, or processor | no | no; those are leaves the router consumes |
| its enums, interfaces, constants, schemas | yes, compile-time only | yes, compile-time only |
| its exceptions | yes, when the failed subject is its entity | yes, when the failed subject is its entity |
| its Prisma model through your own `DatabaseService` | no | no |

A guard, strategy, interceptor, or decorator injects the exported services and utils of a `@Global()` module (`layering.md`, `@Global()`), and nothing else from another feature module.

A repository reaches another module's util only when the owner is `@Global()`. A util injects no `src/modules/` util, its own module's or another module's; the value arrives as an argument. Anything a `@Global()` module or the composed `src/common/` kit exports is reachable with no import by the callers this table allows. `@Global()` removes the import, never the dependency order.

`src/modules/analytic/` aggregates every feature's analytics, so a feature's analytic repository, its port, and its analytic service import their shapes from `@modules/analytic/interfaces` (`src/modules/user/repositories/user.analytic.repository.ts:7`).

## A repository owns its model

A repository issues statements against the model it owns and satellite models with no repository of their own (`NotificationRepository` owns `Notification`, `NotificationDelivery`, and `TermPolicyRecipient`). Ownership is per class: `UserPasswordRepository` does not write `User`, and a `*.analytic.repository.ts` reads a model its module's write repository owns and writes nothing (`layering.md`). A nested write counts as a statement against the related model. A read may `include`, `select`, or filter on a relation. `ActivityLog` has one writer, `ActivityLogRepository`.

A repository does not inject or call another repository. Work spanning one module's repositories is its service calling `this.databaseService.withTransaction` and each repository as `*InTx(tx, ...)`. Work spanning modules in one transaction is opened by the use case serving the flow, or by a service of the highest participating module when two or more use cases share the sequence (`service.md`, Shared transactions); every other participant joins through its service's `*InTx(tx, ...)` method, which forwards `tx` to its own repositories. Whoever opens it maps a guarded transition's write conflict (`database.md`, Transactions). A method the owning service lacks is added there, even three lines long.

## A repository stays inside its feature

`<Module>Module` provides its repositories and never exports them. Data another module needs goes through the owning service, which holds that feature's invariants. `src/migration/` sits outside this file and `layering.md`: a seed writes models through `DatabaseService` directly, and `MigrationModule` imports a feature `<Module>Module` only for an injection `seeding.md` allows.

## Composition follows the dependency order

Use cases compose features; services share downward. A `<Module>Module` imports only lower-ranked `<Module>Module`s, and only `src/router/` imports a `<Module>UseCaseModule` (`layering.md`, Module files). A module import cycle is a broken boundary; `forwardRef` hides it and is forbidden (`eslint.md`, Config blocks). When a service needs a higher-ranked module, the ways out:

1. Orchestration: the sequence moves up into a use case, which injects both modules' services, one shared write transaction included.
2. A shared piece: it moves down into the lower-ranked module's service, or into `src/common/` when module-agnostic (`layering.md`, Dependency order).
3. A fire-and-forget hand-off: a queue job, enqueued by the use case after commit (`queue.md`).

## An exception names the subject that failed

A missing workspace throws `WorkspaceNotFoundException` wherever the check runs: the workspace module owns that answer, its status code, and its i18n path. Do not allocate a second code in your own block for another module's entity.

## Registration lives outside the feature module

A controller file lives in its feature module; `src/router/http/router.http.<scope>.module.ts` declares it. A processor is provided by `<module>.use-case.module.ts`, which `src/router/processor/router.processor.module.ts` imports.

## Workspace scoping follows the surface

A workspace-scoped route in any module resolves its subject from the `x-workspace-id` header through the workspace guards and carries `@FeatureFlagProtected(EnumFeatureFlagKey.workspace)` (`guards.md`).
