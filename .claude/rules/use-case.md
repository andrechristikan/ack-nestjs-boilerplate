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
- On a job, it translates the payload into service calls and returns `IQueueResponse`; it is idempotent, since a failed job is retried: a retry repeats no committed chunk.
- Composes in sequence:
    1. the fail-fast checks (`transaction.md`, Transactions), the independent ones in one `Promise.all` (`concurrency.md`, Together and alone), a rank or permission assert on a row a check returned following it;
    2. the transaction it opens: each service's `*InTx` write, the side effects and activity entries added inside it (`effects.md`).
- A use case taking the request takes its controller's contexts in the `http.md` order, and passes each service, `ActivityLogQueue.recordEffect`, and `toPayload` `requestContext`, `apiKeyContext`, and `authContext` whole (the actor: `service.md`, Shape). A job use case passes on what its payload carries.
- A row a guard loaded is the fail-fast read, taken from its context (`guards.md`, Contexts).
- Originates only these (a rethrow or wrap originates nothing: `exceptions.md`, The hierarchy); `UserSignUpUseCase` (`src/modules/user/use-cases/user.sign-up.use-case.ts`) shows the first:
    - the slug retry exhaustion `AppUnknownException` after the retry loop's last attempt (`transaction.md`, Generated unique values);
    - on a job, `QueueException` (`queue.md`).

## Transactions

- One transaction per flow, a job's chunks aside (Jobs), opened in `execute` or a private method of the same use case; each service joins as `*InTx(tx, ...)` (`transaction.md`, Transactions).
- A sequence several use cases share over one module and the levels below it: `service.md`, Shared transactions.
- A sequence over two modules of one level is sequenced by each use case, in its own transaction, through each module's `*InTx` call (`UserCreateByAdminUseCase`, `UserProcessImportByAdminUseCase`).
- A call made twice is sequencing, not duplication (`code-style.md`, Types and comments): two use cases calling the same service method with the same arguments copy nothing. The same sequence of one module's `*InTx` calls in two use cases is one `*InTx` method of that module's service (`service.md`, Shared transactions), and each use case, a request's or a job's, composes its own sequence around it (`WorkspaceService.softDeleteManyInTx` in `WorkspaceProcessSoftDeleteUseCase` and `UserProcessDeleteSelfUseCase`).

## Jobs

- A job is one flow in its processor use case: it opens the transaction and calls each module's service inside it, as a route's use case does, and queues no job to finish its own work; what it adds is a side effect (`effects.md`).
- A failed business outcome (the import's collision) adds its `error` `processResult` (`notify.md`) in a transaction holding the add alone, then throws `QueueUnrecoverableException`.
- A part of the flow over an unbounded collection is paged by the same use case after the commit, the chunks in turn (`transaction.md`, Transactions; `concurrency.md`, Sequential by design).
- An action that pages an unbounded collection is a job its route queues: the route's use case validates and adds the job's effect in the transaction of its own writes, or in one holding the add alone when it has none (`UserDeleteSelfUseCase`, `TermPolicyPublishByAdminUseCase`); a route that writes nothing else answers the effect's `outboxId` (`WorkspaceSoftDeleteUseCase`, `UserImportByAdminUseCase`).

## Branches

- A branch picks the next service call on a service or util predicate or a service result: `const revokesSessions = this.userService.revokesSessionsOn(status)`, not `if (status === EnumUserStatus.active)`.
- Inline, a branch tests only a null or presence check of an input (`!inviteToken`, `revoked.length > 0`).
- A business-state check on an entity (`!user.isVerified`, `status === EnumUserStatus.active`) goes through a service or util predicate or a service assert (`service.md`, Methods).
