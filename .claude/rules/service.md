---
paths:
    - 'src/modules/*/services/**'
    - 'test/unit/modules/*/services/**'
---

# Services

An HTTP service and a processor service sequence domain calls for one entry point; neither decides what a domain decides. Their place in the layer chain and their sole ownership of a cross-module transaction: `layering.md`, Roles.

## HTTP service

- Path: `services/http/<module>[.<concern>].http.service.ts` (`naming.md`).
- The controller's only collaborator (`http.md`).
- Translates a request DTO into domain calls and the result into the envelope (`dto.md`); a method with no data returns `{}` or `{ metadata }`.
- Composes in sequence:
    1. a cross-module gate (`RoleDomain.assertActorOutranks`);
    2. the subject domain, or the cross-module write transaction it owns;
    3. another module's queue class for a post-commit side effect, awaited (`QueueBase.addSideEffect`, `queue.md`).
- Prepares and stages activity-log rows around the subject call (`security.md`, Activity log).
- Injects no repository and holds no business rule.
- Originates only these (a rethrow or wrap originates nothing: `exceptions.md`, The hierarchy); `src/modules/user/services/http/user.registration.http.service.ts:203-220` shows the last two:
    - a mapped write conflict: `DatabaseWriteConflictCode` through `DatabaseUtil.toException` to the guard's own exception (`database.md`, Transactions);
    - a mapped unique collision: a statement's `DatabaseUniqueConstraintCode` on a named column through `DatabaseUtil.isUniqueCollision`, inline or in the feature's util (`UserCreateUtil.mapCreateCollision`), to the feature's own exception;
    - the slug retry exhaustion `DatabaseUniqueValueGenerationFailedException` after the retry loop's last attempt (`database.md`, Generated unique values).

## Transactions

- One cross-module transaction per flow, opened in the method serving that flow or in a private helper of the same service; each feature domain joins as `*InTx(tx, ...)` (`database.md`, Transactions).
- A private helper may open that transaction for several flows of its own service when it takes no mode or caller-kind parameter: `UserAuthHttpService` `createTokenAndSession` serves `loginCredential`, `loginWithSocial`, and `loginVerifyTwoFactor`; `UserRegistrationHttpService` `createByAdmin` and `importByAdmin` share one.
- No helper is shared across services: an HTTP service injects no other HTTP service. An identical pure piece goes to a util or the owning domain.

## Branches

- A branch picks the next domain call on a util predicate or a domain result: `if (!this.userUtil.revokesSessionsOn(status))`, not `if (status === EnumUserStatus.active)`.
- Inline, a branch tests only:
    - a null or presence check of an input (`!inviteToken`, `revoked.length > 0`);
    - an enum comparison of a value a domain returned (`cacheUpdate === EnumSessionCacheUpdate.mismatch`).
- A business-state check on an entity (`!user.isVerified`, `user.twoFactor.enabled`, `status === EnumUserStatus.active`) goes through a util predicate or a domain assert (`layering.md`, Roles).

## Processor service

- Path: `services/processor/<module>[.<concern>].processor.service.ts`.
- Follows the HTTP service's sequencing, Transactions, and Branches on the queue side; it stages no activity-log row (`security.md`, Activity log).
- Translates a job payload into domain calls and returns `IQueueResponse`.
- Originates only `QueueException` (`queue.md`) and a mapped write conflict.
