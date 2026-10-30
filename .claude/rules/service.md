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
- Throws only a mapped write conflict (`database.md`, Transactions).

## Transactions

- One cross-module transaction per flow, opened in the method serving that flow; each feature domain joins as `*InTx(tx, ...)` (`database.md`, Transactions).
- No helper shared across flows switches on a mode or caller kind. An identical pure piece goes to a util or the owning domain.

## Branches

- A branch picks the next domain call on a util predicate or a domain result, never an inline business comparison: `if (!this.userUtil.revokesSessionsOn(status))`, not `if (status === EnumUserStatus.active)`.

## Processor service

- Path: `services/processor/<module>[.<concern>].processor.service.ts`.
- Follows the HTTP service's sequencing, Transactions, and Branches on the queue side; it stages no activity-log row (`security.md`, Activity log).
- Translates a job payload into domain calls and returns `IQueueResponse`.
- Throws only `QueueException` (`queue.md`) and a mapped write conflict.
