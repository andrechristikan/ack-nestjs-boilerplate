---
paths:
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/use-cases/**'
---

# Use cases

Its place in the layer chain and what it injects: `layering.md`, Roles.

## Shape

- The class `implements IAppUseCase<[<execute params>], <result>>` (`src/app/interfaces/app.use-case.interface.ts`); `execute` is `async`, its parameter types and result match the type arguments.
- A private method holds only this action's sequencing; a piece holding one module's statements is a service method.
- On HTTP, it translates the request DTO into service calls and the result into the envelope (`dto.md`); a method with no data returns `{}` or `{ metadata }`.
- On a job, it translates the payload into service calls and returns `IQueueResponse`.
- Composes in sequence:
    1. a cross-module gate (`RoleService.assertActorOutranks`);
    2. the subject service, or the cross-module write transaction it owns, its side effects and activity entries added inside it (`effects.md`).
- A use case taking the request takes its controller's contexts first, in the `http.md` order; it reads the actor's row as `userContext.user` and passes each service and effect builder `requestContext`, `apiKeyContext`, and `authContext` whole, `recordEffect` also `workspaceContext`; from `userContext`, `workspaceContext`, and `projectContext` a service takes the row or id it reads (the actor: `service.md`, Shape). A job use case passes on what its payload carries.
- Originates only these (a rethrow or wrap originates nothing: `exceptions.md`, The hierarchy); `UserSignUpUseCase` (`src/modules/user/use-cases/user.sign-up.use-case.ts`) shows the second and third:
    - a mapped write conflict: `DatabaseWriteConflictCode` through `DatabaseUtil.toException` to the guard's own exception (`transaction.md`, Transactions);
    - a mapped unique collision: a statement's `DatabaseUniqueConstraintCode` on a named column through `DatabaseUtil.isUniqueCollision`, inline or in the feature's util (`UserCreateUtil.mapCreateCollision`), to the feature's own exception;
    - the slug retry exhaustion `DatabaseUniqueValueGenerationFailedException` after the retry loop's last attempt (`transaction.md`, Generated unique values);
    - on a job, `QueueException` (`queue.md`).

## Transactions

- One cross-module transaction per flow, or per chunk in a job that pages an unbounded collection (`concurrency.md`), opened in `execute` or a private method of the same use case; each service joins as `*InTx(tx, ...)` (`transaction.md`, Transactions).
- A sequence several use cases share whose subject is the highest participating module's entity: `service.md`, Shared transactions; each use case sequences only the calls of higher modules around it.
- When that subject belongs to a lower module, each use case opens its own transaction and sequences each module's `*InTx` call (`UserCreateByAdminUseCase`, `UserProcessImportByAdminUseCase`).
- A call made twice is sequencing, not duplication (`code-style.md`, Types and comments): two use cases calling the same service method with the same arguments copy nothing. The same sequence of `*InTx` calls in two use cases, on a subject of the highest participating module, is one service method (`service.md`, Shared transactions).

## Branches

- A branch picks the next service call on a service or util predicate or a service result: `const revokesSessions = this.userService.revokesSessionsOn(status)`, not `if (status === EnumUserStatus.active)`.
- Inline, a branch tests only a null or presence check of an input (`!inviteToken`, `revoked.length > 0`).
- A business-state check on an entity (`!user.isVerified`, `status === EnumUserStatus.active`) goes through a service or util predicate or a service assert (`service.md`, Methods).
