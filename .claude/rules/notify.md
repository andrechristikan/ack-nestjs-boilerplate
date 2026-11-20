---
paths:
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/services/**'
    - 'test/unit/modules/*/use-cases/**'
    - 'src/modules/notification/**'
---

# Producing a notification

A notification is an outbox effect (`effects.md`). Recipient, fan-out, and send: `notification.md`.

- A use case or a service adds `NotificationQueue.notify(kind, context)`, the effect named `notify` on the main queue, inside the transaction of the write that causes it, or through `OutboxService.add` when it has no write. `context` is `INotificationContextMap[K]`: the subject's ids and the values the templates need, never a recipient, an address, or a token. A date in `context` is ISO; the producer never formats one for display (`code-style.md`, Dates).
- `NotificationQueue.notify` and `NotificationEmailQueue.notifyUnregisteredInvite` are the notification module's effect builders, each on the class of its effect's queue.
- An invitee with no account gets `NotificationEmailQueue.notifyUnregisteredInvite(email, payload)`: an effect on the email queue, skipping the main one, the address and the link encrypted against the invite reference, no `Notification` row.
- The key is a `notification.idempotencyKey.<name>Pattern` (`injectable.md`, Config) for a kind that sends once per subject: per reference, per user, per join request, per term policy. A kind that may repeat for one subject (`changePassword`, `loginLocked`, `newDeviceLogin`, `reauthenticationOtp`, and the three reset kinds: `temporaryPasswordByAdmin`, `resetPassword`, `resetMfaByAdmin`) passes `null`, and the row id is its key.
- An operator re-run (the term-policy resend) puts a fresh `DatabaseUtil.createId()` nonce in its key and in every batch key it adds.
- A producer passes `snapshot` on `temporaryPasswordByAdmin`, `resetPassword`, and `resetMfaByAdmin` only. A use case reads `NotificationService.getSnapshot(user)` before it opens its transaction, so before the revoke: the encrypted email and the encrypted tokens of the devices with a live session, read back only by the job that sends. The sealed context `notify` writes carries `snapshot` and `verificationId` on every kind, `null` where the producer passed none; a sealed `snapshot` that is not `null` skips the resolve. The three kinds are `isMandatory: true`.
