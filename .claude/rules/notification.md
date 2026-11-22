---
paths:
    - 'src/modules/notification/**'
    - 'src/modules/term-policy/**/term-policy.recipient*'
    - 'src/modules/term-policy/use-cases/term-policy.process-publish.use-case.ts'
---

# Notifications

Three channels, email (`AwsSESService`), push (`FirebaseService`), and sms (`NotificationSmsDeliveryService`, the pending adapter of `layering.md`), each with its own queue and processor beside the main `EnumNotificationQueue.notification`. A request never sends inline. Every notification job is an outbox row (`effects.md`); every notification queue dedupes by its `jobId`, the row's key, never `deduplication`.

Producing a notification, its key, and the `snapshot`: `notify.md`.

## Recipient

- The processor passes the row id on: `execute(outboxId, data)`, `outboxId: string`, for every use case that records step state. A `null` id, a job with no row, is an `UnrecoverableError` in the processor.
- `NotificationProcessUseCase` resolves the recipient on the first attempt: user, address, settings, and live-session tokens through `UserService`, `NotificationService`, and `DeviceService`; a missing or inactive user writes no row and sends nothing. A kind whose channels hold `sms` takes the number from its verification row (`UserVerificationService.getOneActiveMobileRecipient`); a used or expired row gives none. It encrypts them and records them through `OutboxService.updateData`; a later attempt reuses the recorded recipient.
- A user's notification settings are one stored row per channel and type, created at registration (`UserRegistrationService`); an update changes that row, never stores an override of a default.
- Channels are `NotificationUtil.resolveChannels`: the contract's channels minus those the user disabled for a toggleable, non-mandatory type. Only `silent` left writes no row and sends nothing.

## Fan-out and send

- After the recipient, `NotificationProcessUseCase` opens one `OutboxService.withTransaction`: it creates the `Notification` row, its id generated and recorded beforehand, and adds one row per channel with `addManyInTx`, keyed by `notification.idempotencyKey.stepPattern`. Email goes when the channels hold `email` and the recipient has an address, push when the channels hold `push` and the recipient has tokens, sms when the channels hold `sms` and the recipient has a number; a recipient with none gets no channel row.
- One use case per channel step: `NotificationEmailProcessSendUseCase`, `NotificationEmailProcessSendUnregisteredUseCase`, `NotificationPushProcessSendUseCase`, `NotificationSmsProcessSendUseCase`. Each picks its values from the context by the kind's `NotificationKindContract` row: `templateFields` for the SES template data, `metadataFields` for the push title and body properties, `username` added to both; the SES template name is the kind. A contract row holds data only, no function.
- `NotificationEmailProcessSendUseCase` and `NotificationEmailProcessSendUnregisteredUseCase` check `AwsSESService.isInitialized()` first; unset, they return `{ message, result: null }`, the message from `notification.queue.email.error.sesNotInitialized`, and call no delivery stamp, no `OutboxService.updateData`, and no send.
- `dateFields` on the contract row names the context fields holding a date. `Notification.metadata` keeps them ISO; `NotificationUtil` formats them to RFC 2822 when it builds the SES template data, the push properties, and the message properties of the notification list's title and body.
- No service or use case exists per kind. A kind costs its enum member, its contract row, its messages, its context type, and its template.
- Step state between attempts lives in the row through `OutboxService.updateData`, never `job.updateData`: the recipient, the notification id, `completedSteps`, `encryptedPendingTokens`, `encryptedFailureTokens`. A retry skips a completed step.
- Ciphertext travels unchanged. A channel use case decrypts immediately before its SES or FCM call, an email value into `templateData` only.
- The channel processors map `HelperDecryptFailedException` and `NotificationEmailDeliveryUnknownException` to `UnrecoverableError` (`queue.md`, Processors).
- `FirebaseService.sendMulticast` returns `failureTokens` (invalid, purged by a `cleanupTokens` row) and `retryTokens` (a `FirebaseRetryableTokenCodes` code, no code, or a rejected chunk), kept as `encryptedPendingTokens`: a retry sends only to those, and push `sentAt` is stamped once none is pending.
- An email body is a seeded SES Handlebars template (`seeding.md`), one per kind, registered in `NotificationTemplateService`.

## Term-policy publish

- A broadcast keeps its own pipeline. A recipient set too large for a payload carries a fixed bound from a stable column, never the current time.
- The term-policy module owns `TermPolicyRecipient`, the fan-out, and the `publish` job on its `termPolicy` queue; a resend is a `publish` job keyed by `resendPublishPattern`, with no job name, process use case, or `execute` argument of its own. The notification module owns the `Notification` and `NotificationDelivery` rows, the batch job, and its SES send.
- The batch job runs on `notificationEmail`: no second email queue, and no batch send on the `termPolicy` queue. `NotificationService.emailPublishTermPolicyEffect` builds it (`termPolicyBatchPattern`, `termPolicyBatchResendPattern` with a resend nonce).
- `TermPolicyProcessPublishUseCase` opens one transaction per fresh batch: `NotificationService.createManyInTx`, `TermPolicyRecipientService.createManyInTx` under a batch id, and the batch row.
- `NotificationEmailProcessPublishTermPolicyUseCase` sequences the send: `TermPolicyRecipientService.claim` (`claimedAt`, `claimNonce`), which keeps delivery at most once per recipient; `NotificationEmailDeliveryService.sendPublishTermPolicy`; one transaction over `TermPolicyRecipientService.markSentInTx` and `NotificationService.markEmailSentInTx`; `TermPolicyRecipientService.release` for a definite SES failure.
- `NotificationEmailDeliveryService.assertSettled` throws a retrying `QueueException` for a definite failure and `NotificationEmailDeliveryUnknownException`, the claim kept, for an unknown outcome.
- When both happen, the `QueueException` wins.

## Live by design

- The recorded recipient and step state.
- `TermPolicyRecipient` `sentAt` and `claimedAt`.
- The idempotent `cleanupTokens` purge.

Procedure: `.claude/skills/ack-build/references/add-notification.md`.
