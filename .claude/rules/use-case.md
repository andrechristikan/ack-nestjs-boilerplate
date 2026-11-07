---
paths:
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/use-cases/**'
---

# Use cases

A use case runs one user- or job-facing action: its own feature's entry points call it, it sequences services across modules, and it decides nothing a service decides. Its place in the layer chain and what it injects: `layering.md`, Roles.

## Shape

- Path: `use-cases/<module>[.<concern>].<action>.use-case.ts`, class `<Module>[<Concern>]<Action>UseCase`, one public method `execute` (`naming.md`).
- The class `implements IAppUseCase<[<execute params>], <result>>` (`src/app/interfaces/app.use-case.interface.ts`); `execute` is `async`, its parameter types and result match the type arguments.
- Called by one or more entry points of its own feature (controllers, processors; `http.md`, `queue.md`, Processors); never by another use case.
- A private method holds only this action's sequencing; a piece holding one module's statements is a service method.
- On HTTP, it translates the request DTO into service calls and the result into the envelope (`dto.md`); a method with no data returns `{}` or `{ metadata }`.
- On a job, it translates the payload into service calls and returns `IQueueResponse`; it stages no activity-log row (`activity-log.md`).
- Composes in sequence:
    1. a cross-module gate (`RoleService.assertActorOutranks`);
    2. the subject service, or the cross-module write transaction it owns;
    3. a queue class for a post-commit side effect, awaited (`QueueBase.addSideEffect`, `queue.md`).
- On HTTP, prepares and stages activity-log rows around the subject call (`activity-log.md`).
- Injects no repository and holds no business rule.
- Originates only these (a rethrow or wrap originates nothing: `exceptions.md`, The hierarchy); `UserCreateByAdminUseCase` (`src/modules/user/use-cases/user.create-by-admin.use-case.ts`) shows the second and third:
    - a mapped write conflict: `DatabaseWriteConflictCode` through `DatabaseUtil.toException` to the guard's own exception (`database.md`, Transactions);
    - a mapped unique collision: a statement's `DatabaseUniqueConstraintCode` on a named column through `DatabaseUtil.isUniqueCollision`, inline or in the feature's util (`UserCreateUtil.mapCreateCollision`), to the feature's own exception;
    - the slug retry exhaustion `DatabaseUniqueValueGenerationFailedException` after the retry loop's last attempt (`database.md`, Generated unique values);
    - on a job, `QueueException` (`queue.md`).

## Transactions

- One cross-module transaction per flow, opened in `execute` or a private method of the same use case; each service joins as `*InTx(tx, ...)` (`database.md`, Transactions).
- A sequence two or more use cases share is one service method in the highest participating module (`service.md`, Shared transactions); each use case calls it and sequences only the calls of higher-ranked modules around it.
- Logic copied across use cases is forbidden: a piece whose statements belong to one module lives once, in that module's service; an identical pure piece goes to a util.

## Branches

- A branch picks the next service call on a util predicate or a service result: `if (!this.userUtil.revokesSessionsOn(status))`, not `if (status === EnumUserStatus.active)`.
- Inline, a branch tests only:
    - a null or presence check of an input (`!inviteToken`, `revoked.length > 0`);
    - an enum comparison of a value a service returned (`cacheUpdate === EnumSessionCacheUpdate.mismatch`).
- A business-state check on an entity (`!user.isVerified`, `user.twoFactor.enabled`, `status === EnumUserStatus.active`) goes through a util predicate or a service assert (`service.md`, Methods).
