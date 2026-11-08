---
paths:
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/use-cases/**'
---

# Use cases

A use case holds the business logic of one user- or job-facing action: it assembles application logic from services across modules and writes none of it; its own feature's entry points call it. Its place in the layer chain and what it injects: `layering.md`, Roles.

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
- Injects no repository and writes no module's operation (`service.md`).
- Originates only these (a rethrow or wrap originates nothing: `exceptions.md`, The hierarchy); `UserSignUpUseCase` (`src/modules/user/use-cases/user.sign-up.use-case.ts`) shows the second and third:
    - a mapped write conflict: `DatabaseWriteConflictCode` through `DatabaseUtil.toException` to the guard's own exception (`database.md`, Transactions);
    - a mapped unique collision: a statement's `DatabaseUniqueConstraintCode` on a named column through `DatabaseUtil.isUniqueCollision`, inline or in the feature's util (`UserCreateUtil.mapCreateCollision`), to the feature's own exception;
    - the slug retry exhaustion `DatabaseUniqueValueGenerationFailedException` after the retry loop's last attempt (`database.md`, Generated unique values);
    - on a job, `QueueException` (`queue.md`).

## Transactions

- One cross-module transaction per flow, opened in `execute` or a private method of the same use case; each service joins as `*InTx(tx, ...)` (`database.md`, Transactions).
- A sequence two or more use cases share whose subject is the highest participating module's entity is one service method in that module (`service.md`, Shared transactions); each use case calls it and sequences only the calls of higher modules around it.
- When that subject belongs to a lower module, each use case opens its own transaction and sequences each module's `*InTx` call (`UserCreateByAdminUseCase`, `UserImportByAdminUseCase`).
- Duplication is a body written twice: two methods with the same statements. The body lives once, in the service of the module whose statements they are, or in a util when pure and shared (`service.md`, Methods). A call made twice is sequencing, not duplication: two use cases calling the same service method with the same arguments, or each sequencing the `*InTx` calls for a lower subject, copy nothing. A use case repeats calls; it never rewrites a body.

## Branches

- A branch picks the next service call on a service or util predicate or a service result: `const revokesSessions = this.userService.revokesSessionsOn(status)`, not `if (status === EnumUserStatus.active)`.
- Inline, a branch tests only:
    - a null or presence check of an input (`!inviteToken`, `revoked.length > 0`);
    - an enum comparison of a value a service returned (`cacheUpdate === EnumSessionCacheUpdate.mismatch`).
- A business-state check on an entity (`!user.isVerified`, `user.twoFactor.enabled`, `status === EnumUserStatus.active`) goes through a service or util predicate or a service assert (`service.md`, Methods).
