---
paths:
    - 'src/modules/notification/**'
    - 'src/modules/term-policy/**/term-policy.recipient*'
    - 'src/modules/term-policy/use-cases/term-policy.process-publish.use-case.ts'
---

# Notifications

Three channels, email (`AwsSesService`), push (`FirebaseService`), and sms (`NotificationSmsDeliveryService`, the pending adapter of `layering.md`), each with its own queue and processor beside the main `EnumNotificationQueue.notification`. A request never sends inline. Every notification job is an outbox row (`effects.md`); every notification queue dedupes by its `jobId`, the row's key, never `deduplication`.

Producing a notification, its key, and the `snapshot`: `notify.md`.

## Recipient

- A `null` id, a job with no row, is an `UnrecoverableError` in the processor; a push step whose delivery row is missing throws `NotificationPushDeliveryNotFoundException`, which the processor maps to one.
- `NotificationProcessUseCase` resolves the recipient on the first attempt: user, address, settings, and live-session tokens through `UserService`, `NotificationService`, and `DeviceService`; a missing or inactive user writes no row and sends nothing. A kind whose channels hold `sms` takes the number from its verification row (`UserVerificationService.getOneActiveMobileRecipient`); a used or expired row gives none. It encrypts them and records them through `OutboxService.updateData`; a later attempt reuses the recorded recipient.
- A user's notification settings are one stored row per channel and type, created with the user by each creating use case (`NotificationService.createDefaultsManyInTx`); an update changes that row, never stores an override of a default.
- Channels are `NotificationUtil.resolveChannels`: the contract's channels minus those the user disabled for a toggleable, non-mandatory type. Only `silent` left writes no row and sends nothing.

## Fan-out and send

- After the recipient, `NotificationProcessUseCase` opens one `DatabaseService.withTransaction`: it creates the `Notification` row, its id generated and recorded beforehand, and adds one row per channel with `addManyInTx`, keyed by `notification.idempotencyKey.stepPattern`. Email goes when the channels hold `email` (every recipient has an address), push when the channels hold `push` and the recipient has tokens, sms when the channels hold `sms` and the recipient has a number; a recipient with none gets no channel row.
- One use case per channel step: `NotificationEmailProcessSendUseCase`, `NotificationEmailProcessSendUnregisteredUseCase`, `NotificationPushProcessSendUseCase`, `NotificationSmsProcessSendUseCase`. Each picks its values from the context by the kind's `NotificationKindContract` row: `templateFields` for the SES template data, `metadataFields` for the push title and body properties, `username` added to both; the SES template name is the kind. A contract row holds data only, no function.
- `NotificationEmailProcessSendUseCase` and `NotificationEmailProcessSendUnregisteredUseCase` check `AwsSesService.isInitialized()` first; unset, they return `{ message, result: null }`, the message from `notification.queue.email.error.sesNotInitialized`, and call no delivery stamp, no `OutboxService.updateData`, and no send.
- `dateFields` on the contract row names the context fields holding a date. `Notification.metadata` keeps them ISO; `NotificationUtil` formats them to RFC 2822 when it builds the SES template data, the push properties, and the message properties of the notification list's title and body.
- No service or use case exists per kind. A kind costs its enum member, its contract row, its messages, its context type, and its template.
- Step state between attempts lives in the row through `OutboxService.updateData`, never `job.updateData`: the recipient, the notification id, `completedSteps`, `encryptedPendingTokens`, `encryptedFailureTokens`. A retry skips a completed step.
- Ciphertext travels unchanged. A channel use case decrypts immediately before its SES or FCM call, an email value into `templateData` only.
- The channel processors map `HelperDecryptFailedException`, `NotificationEmailDeliveryUnknownException`, and `NotificationPushDeliveryNotFoundException` to `UnrecoverableError` (`queue.md`, Processors).
- `FirebaseService.sendMulticast` returns `failureTokens` (invalid, cleared from the user's devices through `DeviceService.cleanupNotificationTokensInTx` in the transaction that stamps the push sent) and `retryTokens` (a `FirebaseRetryableTokenCodes` code, no code, or a rejected chunk), kept as `encryptedPendingTokens`: a retry sends only to those, and push `sentAt` is stamped once none is pending.
- An email body is a seeded SES Handlebars template (`seeding.md`), one per kind, registered in `NotificationTemplateService`.

## Term-policy publish

- A broadcast keeps its own pipeline. A recipient set too large for a payload carries a fixed bound from a stable column, never the current time.
- The term-policy module owns `TermPolicyRecipient`, the fan-out, and the `publish` job on its `termPolicy` queue; a resend is a `publish` job keyed by `resendPublishPattern`, with no job name, process use case, or `execute` argument of its own. The notification module owns the `Notification` and `NotificationDelivery` rows, the batch job, and its SES send.
- The batch job runs on `notificationEmail`: no second email queue, and no batch send on the `termPolicy` queue. `NotificationEmailQueue.emailPublishTermPolicyEffect` builds it (`termPolicyBatchPattern`, `termPolicyBatchResendPattern` with a resend nonce).
- `TermPolicyProcessPublishUseCase` opens one transaction per page, holding `TermPolicyRecipientService.sendPendingBatchesInTx` and then the fresh batch: `NotificationService.createManyInTx`, `TermPolicyRecipientService.createManyInTx` under a batch id, and the batch row. A page with neither opens none.
- `NotificationEmailProcessPublishTermPolicyUseCase` sequences the send: `TermPolicyRecipientService.claim` (`claimedAt`, `claimNonce`), which keeps delivery at most once per recipient; `NotificationEmailDeliveryService.sendPublishTermPolicy`; one transaction over `TermPolicyRecipientService.markSentInTx` and `NotificationService.markEmailSentInTx`; `TermPolicyRecipientService.release` for a definite SES failure.
- `NotificationEmailDeliveryService.assertSettled` throws a retrying `QueueException` for a definite failure and `NotificationEmailDeliveryUnknownException`, the claim kept, for an unknown outcome.
- When a failed recipient and an unknown status both happen, the `QueueException` wins; a rejected mark or release is an unknown outcome and wins over both.

## Live by design

- The recorded recipient and step state.
- `TermPolicyRecipient` `sentAt` and `claimedAt`.

Procedure: `.claude/skills/ack-build/references/add-notification.md`.
