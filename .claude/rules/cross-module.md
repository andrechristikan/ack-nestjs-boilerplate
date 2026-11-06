# Crossing a module boundary

## What you may reach for in another module

| From another module | From a feature domain | From an HTTP service, processor service, or aggregation domain |
| --- | --- | --- |
| its exported domain | no, except `FeatureFlagDomain` to assert a flag or sub-key the module owns (`layering.md`, Roles) | from an HTTP or processor service, through `<Module>DomainModule`; from the aggregation domain its analytic domain only |
| its exported queue class | no | from an HTTP or processor service, through `<Module>DomainModule` |
| its exported util | yes, through `<Module>DomainModule` | yes, through `<Module>DomainModule` |
| the aggregation domain | no | from `analytic`'s own HTTP service only |
| its cache, repository, or repository module | no | no; ask the owning domain |
| its HTTP service or processor service | no | no; those are leaves the router consumes |
| its enums, interfaces, constants, schemas | yes, compile-time only | yes, compile-time only |
| its exceptions | yes, when the failed subject is its entity | yes, when the failed subject is its entity |
| its Prisma model through your own `DatabaseService` | no | no |

A repository reaches another module's util only when the owner is `@Global()`. A util injects no `src/modules/` util, its own module's or another module's; the value arrives as an argument. Anything a `@Global()` module or the composed `src/common/` kit exports is reachable with no import by the callers `layering.md`, Tiers, names. That reach runs one way: `@Global()` widens who may inject a class, not what the class may inject.

`src/modules/analytic/` aggregates every feature's analytics, so a feature's analytic repository, its port, and its analytic domain import their shapes from `@modules/analytic/interfaces` (`src/modules/user/repositories/user.analytic.repository.ts:7`).

## A repository owns its model

A repository issues statements against the model it owns and satellite models with no repository of their own (`NotificationRepository` owns `Notification`, `NotificationDelivery`, and `TermPolicyRecipient`). Ownership is per class: `UserPasswordRepository` does not write `User`, and a `*.analytic.repository.ts` reads a model its module's write repository owns and writes nothing (`layering.md`). A nested write counts as a statement against the related model. A read may `include`, `select`, or filter on a relation. `ActivityLog` has one writer, `ActivityLogRepository`.

A repository does not inject or call another repository. Work spanning one module's repositories is its domain calling `this.databaseService.withTransaction` and each repository as `*InTx(tx, ...)`. Work spanning modules in one transaction is the HTTP or processor service calling `withTransaction` and each feature domain's `*InTx(tx, ...)` method, which forwards `tx` to its own repositories; the service maps a guarded transition's write conflict (`database.md`, Transactions). A method the owning domain lacks is added there, even three lines long.

## A repository module belongs to its own feature

`<Module>RepositoryModule` has one importer: the domain module beside it. Data another module needs goes through the owning domain, which holds that feature's invariants, called from an HTTP or processor service. `src/migration/` sits outside this file and `layering.md`: a seed writes models through `DatabaseService` directly, and `MigrationModule` imports no feature repository module; a feature domain module only for an injection `seeding.md` allows.

## Composition runs one way

The HTTP or processor service composes features; a feature never composes back. A feature domain module imports another feature domain module only for its util, and only `AnalyticDomainModule` imports one for its analytic domains. A circular import is a broken boundary; `forwardRef` hides it and is forbidden. The ways out:

1. Two features in one flow: the HTTP or processor service sequences the calls, one shared write transaction included.
2. A module-agnostic piece both need: extract it into `src/common/` (`layering.md`, Tiers).
3. A fire-and-forget hand-off: a queue job, enqueued by the service after commit (`queue.md`).

## An exception names the subject that failed

A missing workspace throws `WorkspaceNotFoundException` wherever the check runs: the workspace module owns that answer, its status code, and its i18n path. Do not allocate a second code in your own block for another module's entity.

## Registration lives outside the feature module

A controller file lives in its feature module; `src/router/http/router.http.<scope>.module.ts` registers it. A processor is provided by `<module>.processor.module.ts`, which `src/router/processor/router.processor.module.ts` aggregates.

## Workspace scoping follows the surface

A workspace-scoped route in any module resolves its subject from the `x-workspace-id` header through the workspace guards and carries `@FeatureFlagProtected(EnumFeatureFlagKey.workspace)` (`guards.md`).
