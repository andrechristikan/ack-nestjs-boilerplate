---
paths:
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/services/**'
    - 'test/unit/modules/*/use-cases/**'
    - 'src/common/outbox/**'
---

# Side effects

A request's side effect (notification, activity entry, session cache purge, cache invalidation, S3 object delete) is an `Outbox` row written in its write's transaction and dispatched to its BullMQ queue after the commit. The job carries `{ outboxId }` only; the row keeps the payload, `status` (`EnumOutboxStatus`), `attempts`, and `lastError`, and is never deleted. A failed dispatch never changes the response. BullMQ through the outbox is the one async mechanism: no `@nestjs/event-emitter`, no `@nestjs/cqrs`. Dispatch and processing: `outbox.md`. Notifications: `notify.md`. Activity entries: `activity-entry.md`.

- An exception the request throws stays its answer.
- A route whose only work is a side effect (the term-policy resend) adds it through `OutboxService.add` or `addMany`: a failed insert answers as `database.md` maps it, and a failed dispatch leaves the row `pending` and the route answers 200.

## Effects

- An effect is an `IOutboxEffect`, the kit base in `src/common/outbox/interfaces/outbox.interface.ts`: `queue`, `name`, `data`, `priority` (`EnumQueuePriority`), and `idempotencyKey` (`string | null`), with no union. A new job declares its member `I<Module><Action>Effect extends IOutboxEffect` in its owner's interface file, with literal `queue` and `name` and its payload as `data` (`ISessionPurgeLoginsEffect`).
- The module owning the job builds the effect in a service method `<action>Effect` returning its member (`SessionService.purgeLoginsEffect`). A method forwarding another builder's effect, an `IOutboxEffect[]` return or local, a parameter, and every `OutboxService` method take the base. No call site writes an effect literal. A service adds the effects its own module's or a lower module's builder returns (`layering.md`, Dependency order).
- `idempotencyKey` is also the BullMQ `jobId`, unique per `(queue, name, idempotencyKey)` (`@@unique`); a business pattern carries the process, because the `jobId` space is per queue. It is filled from a `<namespace>.idempotencyKey.<name>Pattern` config key only when a duplicate the normal flow produces collapses into one job; any other effect passes `null`, and the row id becomes its key.

## Writing

- A transaction whose statements add a row opens through `OutboxService.withTransaction(fn, options?)`. It opens `DatabaseService.withTransaction`, collects every id added on that `tx`, and dispatches them after the commit. Who opens it: `transaction.md`, Transactions.
- Inside it, `OutboxService.addInTx(tx, effect)` and `addManyInTx(tx, effects)` write the rows and return their ids. An effect whose key already has a row, read on `tx` first, inserts nothing and returns that row's id; the unique index answers a race, and the loser's whole transaction aborts, business write included. A service `*InTx` method adds its own rows to the `tx` it joined and returns nothing for them. `addInTx` on a `tx` that `OutboxService.withTransaction` did not open throws.
- A statement whose effect must not be lost shares one transaction with its row, a single statement included. A statement followed by an add outside its transaction is the defect.
- `OutboxService.add(effect)` and `addMany(effects)` insert and dispatch at once, only for an effect with no business write.

## Payloads

Whoever builds a payload (an `<action>Effect` method, `NotificationService.notify`) encrypts a sensitive field (password, link, one-time code, recipient email, device tokens) with `HelperEncryptionService` (`security.md`, Cryptography), its context the id it belongs to: the recipient's user id, or the invite reference for an invitee with no account. Name it `encrypted<Field>`: job data is readable in BullBoard and `Outbox.data` in the database.

- BullMQ ignores a fixed-`jobId` enqueue while a job holding that id exists, until retention ages it out; a `jobId` never guards a race (`discipline.md`, Normal use).
- No producer calls `getJob`, `getState`, `retry`, or `remove`, the outbox reconcile aside; no caller branches on an `add` result.
- A fan-out from one request is one `addManyInTx` or one bulk job.

## Cache invalidation

- Every read-through cache is cache-aside: a write that changes or deletes a cached row never sets its keys. It opens `OutboxService.withTransaction` over its `*InTx` write and adds `CacheService.invalidateEffect(keys)`, the `invalidate` job on the kit `cache` queue (priority high, no business key); the next read after the job misses and `readThrough` sets the key (`ApiKeyService`, `FeatureFlagService`). A create adds none.
- `CacheService.invalidate` is called by `CacheProcessor` and `SessionService.isLoginActive` and `deleteLogins` only.
