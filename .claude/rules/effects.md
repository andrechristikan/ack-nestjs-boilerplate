---
paths:
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/services/**'
    - 'test/unit/modules/*/use-cases/**'
    - 'src/common/outbox/**'
---

# Side effects

A side effect is one of a closed list: a notification, an activity entry, a cache purge or invalidation (the session login cache, a read-through key), an S3 object delete. It is an `Outbox` row written in the transaction of the write that causes it, in a request or a job, and dispatched to its BullMQ queue after the commit; the one other row is a job a route hands its whole action to (`use-case.md`, Jobs). The job carries `{ outboxId }` only; the row keeps the payload, `status` (`EnumOutboxStatus`), `attempts`, and `lastError`, and is never deleted. BullMQ through the outbox is the one async mechanism: no `@nestjs/event-emitter`, no `@nestjs/cqrs`. A recurring job a queue class schedules is the one job with no row: a clock triggers it, not a write; a side effect of a write that job makes is an outbox row like any other. Dispatch and processing: `outbox.md`. Notifications: `notify.md`. Activity entries: `activity-entry.md`.

- An exception the request throws stays its answer.
- A write to another module's rows is that module's service call in the flow, never an outbox row: no flow, request or job, leaves part of its writes to a queued job.
- A flow adds its side effects side by side in one add, and no send queues another send (`NotificationService.createInTx` adds every channel send in one `addManyInTx`).
- A processor use case adds a notification, an activity entry, or a kit effect itself; an S3 object delete and the session login cache purge reach a job through the owning module's service method the job calls (`UserProfileService.deleteOwnedPhotoInTx`, the revoking `SessionService` `*InTx` methods).

## Effects

- An effect is an `IOutboxEffect`, the kit base in `src/common/outbox/interfaces/outbox.interface.ts`: `queue`, `name`, `data`, `priority` (`EnumQueuePriority`), and `idempotencyKey` (`string | null`), with no union. A new job declares its member `I<Module><Action>Effect extends IOutboxEffect` in its owner's interface file, with literal `queue` and `name` and its payload as `data` (`IUserPurgeLoginsEffect`).
- The module owning the job builds the effect in the queue class of the effect's queue, a method `<action>Effect` returning its member (`UserAuthQueue.purgeLoginsEffect`, `CacheQueue.invalidateEffect`). A method forwarding another builder's effect, an `IOutboxEffect[]` return or local, a parameter, and every `OutboxService` method take the base. No call site writes an effect literal. A service or a use case of any module injects that queue class and adds the effect it returns (`layering.md`, Levels).
- `idempotencyKey` is also the BullMQ `jobId`, unique per `(queue, name, idempotencyKey)` (`@@unique`); a business pattern carries the process, because the `jobId` space is per queue: a notification channel step is `notification.idempotencyKey.stepPattern`, `'{process}-{notificationId}'`. It is filled from a `<namespace>.idempotencyKey.<name>Pattern` config key only when a duplicate the normal flow produces collapses into one job; any other effect passes `null`, and the row id becomes its key.

## Writing

- A row joins the use case's `DatabaseService.withTransaction` (`transaction.md`, Transactions); `OutboxService` opens no transaction. `OutboxService.addInTx(tx, effect)` and `addManyInTx(tx, effects)` write the rows on that `tx` and return their ids. An effect whose key already has a row, read on `tx` first, inserts nothing and returns that row's id; the unique index answers a race, and the loser's whole transaction aborts, business write included.
- `addManyInTx`, which `addInTx` goes through, registers one `DatabaseService.afterCommit` callback per `tx` (`database.md`), dispatching the ids added on it: the enqueue comes last, after the commit, through the queue class that owns the row's queue (`outbox.md`, Dispatch). A service `*InTx` method adds its own rows to the `tx` it joined and returns no outbox id.
- A statement whose effect must not be lost shares one transaction with its row, a single statement included. A statement followed by an add outside its transaction is the defect.
- An effect with no business write (the term-policy resend, an action with no write recording its entry before it throws) is added the same way: its use case opens `DatabaseService.withTransaction` and calls `addInTx` or `addManyInTx`; a failed insert answers as `database.md` maps it.

## Payloads

Whoever builds a payload (an `<action>Effect` method, `NotificationQueue.notify`) encrypts a sensitive field (password, link, one-time code, recipient email, recipient mobile number, device tokens; a contact value an import row or a message carries as data included) with `HelperEncryptionService` (`security.md`, Cryptography), its context the id it belongs to: the recipient's user id, the invite reference for an invitee with no account, or the importing admin's id for an import row's contact value. Name it `encrypted<Field>`: `Outbox.data` is readable in the database.

- A field in a kind's `secrets` stays sealed in `Notification.metadata`, is opened at read, and is censored before a response carries it (`security.md`, Contact values).
- BullMQ ignores a fixed-`jobId` enqueue while a job holding that id exists, until retention ages it out; a `jobId` never guards a race (`discipline.md`, Normal use).
- No producer reads, retries, or removes a job; the outbox sweep reads one through `QueueBase.getJobState` alone; no caller branches on an `enqueue` result.
- A fan-out from one request is one `addManyInTx` or one bulk job, and the effects one method adds on its `tx` are one `addManyInTx`.

## Cache invalidation

- Every read-through cache is cache-aside: a write that changes or deletes a cached row never sets its keys. Its use case opens `DatabaseService.withTransaction` over the `*InTx` write, which adds `CacheQueue.invalidateEffect(keys)`, the `invalidate` job on the kit `cache` queue (priority high, no business key); the next read after the job misses and `readThrough` sets the key (`ApiKeyService`). A create adds none.
- `CacheService.invalidate` is called by `CacheProcessor` and `SessionService.isLoginActive` and `deleteLogins` only.
