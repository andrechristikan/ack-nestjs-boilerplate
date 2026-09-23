# Crossing a module boundary

## What you may reach for in another module

| From another module | Allowed |
|---|---|
| its exported domain | yes: inject the class, import `<Module>DomainModule` |
| its exported queue class, from your domain or processor service | yes, through `<Module>DomainModule` |
| its exported util, from your domain, HTTP service, or processor service | yes, through `<Module>DomainModule` |
| its exported util, from your repository | only when the owner is `@Global()` |
| its exported util, from your util | no; the value arrives as an argument |
| its repository or repository module | no |
| its HTTP service or processor service | no; those are leaves the router consumes |
| its enums, interfaces, constants, schemas | yes, compile-time only |
| its exceptions | yes, when the failed subject is its entity |
| its Prisma model through your own `DatabaseService` | no |

Anything a `@Global()` module or the composed `src/common/` kit exports is reachable with no
import. That reach runs one way: `@Global()` widens who may inject a util, not what the util
may inject.

## A repository owns its model

A repository issues statements against the model it owns and satellite models with no
repository of their own (`NotificationRepository` owns `Notification` and
`NotificationDelivery`). Ownership is per class: `UserPasswordRepository` does not write
`User`. A nested write counts as a statement against the related model. A read may
`include`, `select`, or filter on a relation. `ActivityLog` has one writer,
`ActivityLogRepository`.

A repository does not inject or call another repository. Work spanning repositories is a
domain calling `this.databaseService.withTransaction` and each collaborator as
`*InTx(tx, ...)`; another module joins through its domain, which forwards `tx` to its own
`*InTx` method. A method the owning domain lacks is added there, even three lines long.

## A repository module belongs to its own feature

`<Module>RepositoryModule` has one importer: the domain module beside it. Data another
module needs goes through the owning domain, which holds that feature's invariants.
`src/migration/` is the exception: `MigrationModule` is its own composition root and imports
any repository module directly (`seeding.md`).

## No `forwardRef` between feature modules

A circular import is a broken boundary to re-architect. `forwardRef` makes it boot, hides
the cycle, and is not one of the ways out:

1. One direction is wrong: the reverse dependency is a convenience call on the caller's side.
2. The shared piece has a third owner: extract it and let both import that.
3. The coupling is event-shaped: a fire-and-forget hand-off is a queue job (`queue.md`).

## An exception names the subject that failed

The project domain throws `WorkspaceNotFoundException` when the workspace is missing: the
workspace module owns that answer, its status code, and its i18n path. Do not allocate a
second code in your own block for another module's entity.

## Registration lives outside the feature module

A controller file lives in its feature module; `src/router/http/router.http.<scope>.module.ts`
registers it. A processor is provided by `<module>.processor.module.ts`, which
`src/router/processor/router.processor.module.ts` aggregates.

## Workspace scoping follows the surface

A workspace-scoped route in any module resolves its subject from the `x-workspace-id` header
through the workspace guards and carries `@FeatureFlagProtected('workspace')` (`http.md`).
