# Crossing a module boundary

## What you may reach for in another module

| From another module | From a service | From a use case |
| --- | --- | --- |
| its exported service | yes, when it sits on a lower level (`layering.md`, Levels) | yes, through its `<Module>Module` |
| its exported util | no | yes, through its `<Module>Module` |
| its queue class | yes, through its `<Module>Module` | yes, through its `<Module>Module` |
| its cache or repository | no | ask the owning service |
| its enums, interfaces, constants, schemas | yes, compile-time only | yes, compile-time only |
| its exceptions | yes, when the failed subject is its entity | yes, when the failed subject is its entity |
| its Prisma model through your own `DatabaseService` | no | no |

A guard, strategy, interceptor, or decorator injects the exported services of a `@Global()` module (`module-files.md`, `@Global()`), and nothing else from another feature module.

A repository reaches no other module's util. Anything a `@Global()` module exports is reachable with no import by the callers this table allows. `@Global()` removes the import, never the level.

`src/modules/analytic/` reads every feature's models in its own repositories, read-only (`layering.md`, Levels): the one exception to the table's last row and to model ownership below.

## A repository owns its model

A repository issues statements against the model it owns and satellite models with no repository of their own (`NotificationRepository` owns `Notification` and `NotificationDelivery`). Ownership is per class: `UserForgotPasswordRepository` does not write `User`. A nested write counts as a statement against the related model. A read may `include`, `select`, or filter on a relation. `ActivityLog` has one writer, `ActivityLogRepository`.

Who opens a transaction spanning repositories or modules, and how the others join: `transaction.md`, Transactions. A method the owning service lacks is added there, even three lines long. `src/migration/` sits outside this file (`seeding.md`).

## Composition follows the levels

A module import cycle is a broken boundary: the boot fails on one (`ReferenceError`). When a service needs a module on its own level or above, the ways out:

1. Orchestration: the sequence moves up into a use case, which injects both modules' services, one shared write transaction included.
2. A shared piece: it moves down into a lower level's service, or into `src/common/` when module-agnostic (`layering.md`, Levels).
3. A side effect: the owning module's queue class builds the effect and the caller adds it in its transaction (`effects.md`), a notification included.
4. Two queue classes: two modules that would each import the other for its queue class form a cycle, so the use case adds the effect, injecting both queue classes (a use-case module imports any `<Module>Module`).

## An exception names the subject that failed

A missing workspace throws `WorkspaceNotFoundException` wherever the check runs: the workspace module owns that answer, its status code, and its i18n path. Do not allocate a second code in your own block for another module's entity.

## Registration lives outside the feature module

Registration: `module-files.md`, Module files. A kit processor file lives in its kit module's `processors/` (`src/common/cache/processors/`).

## Workspace scoping follows the surface

A workspace-scoped route in any module carries the workspace guards and flag: `guards.md`, Decorator order.
