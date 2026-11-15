---
paths:
    - 'src/modules/notification/**'
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/services/**'
    - 'test/unit/modules/*/use-cases/**'
---

# Notifications

Two channels, email (`AwsSESService`) and push (`FirebaseService`), each with its own queue and processor beside the main `EnumNotificationQueue.notification`. A request never sends inline. Every notification job is an outbox row (`outbox.md`); every notification queue dedupes by its `jobId`, the row's key, never `deduplication`.

## Producing

- A use case, or a service of a module above `notification` (`layering.md`, Dependency order), adds `NotificationService.notify(kind, context)`, the effect named `notify` on the main queue, inside the transaction of the write that causes it, or through `OutboxService.add` when it has no write. `context` is `INotificationContextMap[K]`: the subject's ids and the values the templates need, never a recipient, an address, or a token. A date in `context` is ISO; the producer never formats one for display (`code-style.md`, Dates).
- `notify` and `notifyUnregisteredInvite` are the notification module's effect builders (`outbox.md`, Effects).
- `notify` encrypts a secret in `context` (a password, a link, a one-time code such as `reauthenticationOtp`'s) as `encrypted<Field>`, its context the recipient's user id (`security.md`).
- An invitee with no account gets `NotificationService.notifyUnregisteredInvite(email, payload)`: an effect on the email queue, skipping the main one, the address and the link encrypted against the invite reference, no `Notification` row.
- The key is a `notification.idempotencyKey.<name>Pattern` (`config.md`) for a kind that sends once per subject: per reference, per user, per join request, per term policy. A kind that may repeat for one subject (`changePassword`, `newDeviceLogin`, `reauthenticationOtp`, and the three reset kinds) passes `null`, and the row id is its key.
- An operator re-run (the term-policy resend) puts a fresh `DatabaseUtil.createId()` nonce in its key and in every batch key it adds.

## Recipient

- The processor passes the row id on: `execute(outboxId, data)`, `outboxId: string`, for every use case that records step state. A `null` id, a job with no row, is an `UnrecoverableError` in the processor.
- `NotificationProcessUseCase` resolves the recipient on the first attempt: user, address, settings, and live-session tokens through `UserService`, `NotificationService`, and `DeviceService`; a missing or inactive user writes no row and sends nothing. It encrypts them and records them through `OutboxService.updateData`; a later attempt reuses the recorded recipient.
- `snapshot` exists on `temporaryPasswordByAdmin`, `resetPassword`, and `resetTwoFactorByAdmin` only. The producer reads `NotificationService.getSnapshot(user)` inside the transaction's callback, before the revoke: the encrypted email and the encrypted tokens of the devices with a live session. A context holding `snapshot` skips the resolve. The three kinds are `isMandatory: true`.
- Channels are `NotificationUtil.resolveChannels`: the contract's channels minus those the user disabled for a toggleable, non-mandatory type. Only `silent` left writes no row and sends nothing.

## Fan-out and send

- After the recipient, `NotificationProcessUseCase` opens one `OutboxService.withTransaction`: it creates the `Notification` row, its id generated and recorded beforehand, and adds one row per channel with `addManyInTx`, keyed by `notification.idempotencyKey.stepPattern`. Email goes when the channels hold `email` and the recipient has an address, push when the channels hold `push` and the recipient has tokens; a recipient with neither gets no channel row.
- One use case per channel step: `NotificationEmailProcessSendUseCase`, `NotificationEmailProcessSendUnregisteredUseCase`, `NotificationPushProcessSendUseCase`. Each picks its values from the context by the kind's `NotificationKindContract` row: `templateFields` for the SES template data, `metadataFields` for the push title and body properties, `username` added to both; the SES template name is the kind. A contract row holds data only, no function.
- `dateFields` on the contract row names the context fields holding a date. `Notification.metadata` keeps them ISO; `NotificationUtil` formats them to RFC 2822 when it builds the SES template data, the push properties, and the message properties of the notification list's title and body.
- No service or use case exists per kind. A kind costs its enum member, its contract row, its messages, its context type, and its template.
- Step state between attempts lives in the row through `OutboxService.updateData`, never `job.updateData`: the recipient, the notification id, `completedSteps`, `encryptedPendingTokens`, `encryptedFailureTokens`. A retry skips a completed step.
- Ciphertext travels unchanged. A channel use case decrypts immediately before its SES or FCM call, an email value into `templateData` only.
- The channel processors map `HelperDecryptFailedException` and `NotificationEmailDeliveryUnknownException` to `UnrecoverableError` (`queue.md`, Processors).
- `FirebaseService.sendMulticast` returns `failureTokens` (invalid, purged by a `cleanupTokens` row) and `retryTokens` (a `FirebaseRetryableTokenCodes` code, no code, or a rejected chunk), kept as `encryptedPendingTokens`: a retry sends only to those, and push `sentAt` is stamped once none is pending.
- An email body is a seeded SES Handlebars template (`seeding.md`), one per kind, registered in `NotificationTemplateService`.

## Term-policy publish

- A broadcast keeps its own pipeline. A recipient set too large for a payload carries a fixed bound from a stable column, never the current time.
- Each page marks its unmarked users with a `Notification` row and one `TermPolicyRecipient` under a batch id, and adds the batch row (`termPolicyBatchPattern`) on the same `tx`.
- The send claims its rows (`claimedAt`, `claimNonce`), which keeps delivery at most once per recipient.
- A definite SES failure releases the claim and throws a retrying `QueueException`.
- An unknown outcome keeps the claim and throws `NotificationEmailDeliveryUnknownException`.
- When both happen, the `QueueException` wins.

## Live by design

- The recorded recipient and step state.
- `TermPolicyRecipient` `sentAt` and `claimedAt`.
- The idempotent `cleanupTokens` purge.

Procedure: `.claude/skills/ack-build/references/add-notification.md`.
