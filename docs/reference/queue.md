---
title: Queue Reference
description: Every queue with its jobs, job id patterns, job options, processors, and the outbox statuses, priorities, and job states.
---

# Queue Reference

This page lists the facts of the queues, for a developer who looks up a job, its id, or its options.

## Table of Contents

- [Related Documents](#related-documents)
- [Queues](#queues)
- [Jobs](#jobs)
- [Job ids](#job-ids)
- [Job options](#job-options)
- [Priorities](#priorities)
- [Outbox statuses](#outbox-statuses)
- [Job states](#job-states)
- [Queue exceptions](#queue-exceptions)

## Related Documents

- [Queue][ref-doc-concept-queue]: the outbox, the dispatch, and the retries
- [Queue Guide][ref-doc-guide-queue]: add a queue, a processor, or a job
- [Cache][ref-doc-concept-cache]: the `cache` queue
- [Configuration Reference][ref-doc-reference-configuration-queue]: the `queue`, `outbox`, and cron keys
- [Status Codes][ref-doc-reference-status-codes]: the exceptions a job can throw

## Queues

Every queue name is the value of an `Enum<Module>Queue` member and is also the Redis queue name under the prefix `Queue` (`redis.queue.namespace`). The `Backoff key` column names the key that sets the exponential backoff delay of the queue, under the `queue` object of the owner's config namespace (`notification.queue.emailBackoffDelayInMs`).

| Queue | Owner | Queue class | Processor | Backoff key |
| --- | --- | --- | --- | --- |
| `activityLog` | `activity-log` | `ActivityLogQueue` | `ActivityLogProcessor` | `activityLog.queue.backoffDelayInMs` |
| `analytic` | `analytic` | `AnalyticQueue` | `AnalyticProcessor` | `analytic.queue.backoffDelayInMs` |
| `cache` | kit | `CacheQueue` | `CacheProcessor` | `cache.queue.backoffDelayInMs` |
| `mfa` | `mfa` | `MfaQueue` | `MfaProcessor` | `mfa.queue.backoffDelayInMs` |
| `outbox` | kit | `OutboxQueue` | `OutboxProcessor` | `outbox.queue.backoffDelayInMs` |
| `passwordHistory` | `password-history` | `PasswordHistoryQueue` | `PasswordHistoryProcessor` | `passwordHistory.queue.backoffDelayInMs` |
| `notification` | `notification` | `NotificationQueue` | `NotificationProcessor` | `notification.queue.backoffDelayInMs` |
| `notificationEmail` | `notification` | `NotificationEmailQueue` | `NotificationEmailProcessor` | `notification.queue.emailBackoffDelayInMs` |
| `notificationPush` | `notification` | `NotificationPushQueue` | `NotificationPushProcessor` | `notification.queue.pushBackoffDelayInMs` |
| `notificationSms` | `notification` | `NotificationSmsQueue` | `NotificationSmsProcessor` | `notification.queue.smsBackoffDelayInMs` |
| `session` | `session` | `SessionQueue` | `SessionProcessor` | `session.queue.backoffDelayInMs` |
| `termPolicy` | `term-policy` | `TermPolicyQueue` | `TermPolicyProcessor` | `termPolicy.queue.backoffDelayInMs` |
| `user` | `user` | `UserQueue` | `UserProcessor` | `user.queue.backoffDelayInMs` |
| `userAuth` | `user` | `UserAuthQueue` | `UserAuthProcessor` | `user.queue.authBackoffDelayInMs` |
| `workspace` | `workspace` | `WorkspaceQueue` | `WorkspaceProcessor` | `workspace.queue.backoffDelayInMs` |
| `health` | `health` | none | none | none |

No job enters the `health` queue. `HealthQueueIndicator` uses it to check that a queue client is ready, and its factory returns no job options.

## Jobs

The `Kind` column says how a job is added: `effect` is an outbox row built by an `<action>Effect` method of the queue class, and `scheduler` is a recurring job declared in `schedulers()`.

| Queue | Job | Kind | Priority | Producer or schedule |
| --- | --- | --- | --- | --- |
| `activityLog` | `createMany` | effect | low | `ActivityLogQueue.recordEffect` |
| `activityLog` | `purgeExpired` | scheduler | low | `activityLog.purgeExpiredCron`, in `app.timezone` |
| `analytic` | `refreshSnapshot` | scheduler | low | one scheduler per snapshot signal (`impossibleTravel`, `deviceProliferation`, `sharedFingerprint`, `riskScore`, `concurrentSessions`, `devicePerUser`, `workspaceMembership`, `mfaAdoption`), every `analytic.snapshot.refreshIntervalInMs`, also at once on boot |
| `cache` | `invalidate` | effect | high | `CacheQueue.invalidateEffect` |
| `mfa` | `purgeExpired` | scheduler | low | `mfa.purgeExpiredCron`, in `app.timezone` |
| `outbox` | `sweep` | scheduler | none | every `outbox.sweepIntervalInMs` |
| `outbox` | `scrubExpired` | scheduler | none | `outbox.scrubExpiredCron`, in `app.timezone` |
| `passwordHistory` | `purgeExpired` | scheduler | low | `passwordHistory.purgeExpiredCron`, in `app.timezone` |
| `notification` | `notify` | effect | by kind | `NotificationQueue.notify` |
| `notificationEmail` | `send` | effect | by kind | `NotificationEmailQueue.sendEffect` |
| `notificationEmail` | `sendUnregistered` | effect | by kind | `NotificationEmailQueue.notifyUnregisteredInvite` |
| `notificationEmail` | `publishTermPolicy` | effect | medium | `NotificationEmailQueue.emailPublishTermPolicyEffect` |
| `notificationPush` | `send` | effect | by kind | `NotificationPushQueue.sendEffect` |
| `notificationPush` | `cleanupStaleTokens` | scheduler | low | `notification.push.cleanupStaleTokensCron`, in `app.timezone` |
| `notificationSms` | `send` | effect | by kind | `NotificationSmsQueue.sendEffect` |
| `session` | `purgeLogins` | effect | high | `SessionQueue.purgeLoginsEffect` |
| `session` | `purgeExpired` | scheduler | low | `session.purgeExpiredCron`, in `app.timezone` |
| `termPolicy` | `publish` | effect | medium | `TermPolicyQueue.publishEffect`, `resendPublishEffect` |
| `termPolicy` | `deleteContent` | effect | low | `TermPolicyQueue.deleteContentEffect` |
| `user` | `deletePhoto` | effect | low | `UserQueue.deletePhotoEffect` |
| `user` | `importByAdmin` | effect | medium | `UserQueue.importByAdminEffect` |
| `user` | `exportByAdmin` | effect | medium | `UserQueue.exportByAdminEffect` |
| `user` | `deleteSelf` | effect | high | `UserQueue.deleteSelfEffect` |
| `userAuth` | `purgeExpired` | scheduler | low | `user.purgeExpiredCron`, in `app.timezone` |
| `workspace` | `expireStaleInvites` | scheduler | low | `workspace.invite.expirySweepCron`, in `app.timezone`, also at once on boot |
| `workspace` | `expireStaleJoinRequests` | scheduler | low | `workspace.invite.expirySweepCron`, in `app.timezone`, also at once on boot |
| `workspace` | `softDelete` | effect | high | `WorkspaceQueue.softDeleteEffect` |

The priority `none` means the job template sets no priority. The priority `by kind` is the `queuePriority` of the notification kind in `NotificationKindContract`:

| Kind | Priority | Job id pattern |
| --- | --- | --- |
| `welcome` | medium | `notification.idempotencyKey.userPattern` |
| `welcomeSocial` | medium | `notification.idempotencyKey.userPattern` |
| `welcomeByAdmin` | medium | `notification.idempotencyKey.userPattern` |
| `verificationEmail` | medium | `notification.idempotencyKey.referencePattern` |
| `verificationMobileNumber` | medium | `notification.idempotencyKey.referencePattern` |
| `reauthenticationOtp` | high | none, the row id |
| `verifiedEmail` | medium | `notification.idempotencyKey.referencePattern` |
| `verifiedMobileNumber` | medium | `notification.idempotencyKey.referencePattern` |
| `temporaryPasswordByAdmin` | high | none, the row id |
| `changePassword` | medium | none, the row id |
| `forgotPassword` | medium | `notification.idempotencyKey.referencePattern` |
| `resetPassword` | medium | none, the row id |
| `resetMfaByAdmin` | high | none, the row id |
| `loginLocked` | medium | none, the row id |
| `newDeviceLogin` | high | none, the row id |
| `publishTermPolicy` | medium | none, the row id |
| `userAcceptTermPolicy` | low | `notification.idempotencyKey.userTermPolicyPattern` |
| `processResult` | medium | `notification.idempotencyKey.referencePattern` |
| `workspaceInvite` | medium | `notification.idempotencyKey.referencePattern` |
| `workspaceJoinRequest` | medium | `notification.idempotencyKey.joinRequestPattern` |
| `workspaceJoinAccepted` | medium | `notification.idempotencyKey.joinRequestPattern` |
| `workspaceJoinRejected` | medium | `notification.idempotencyKey.joinRequestPattern` |

A scheduler has an id, repeat options, and a job template. Its job carries no `outboxId` and no outbox row. The scheduler id is the job name, except `refreshSnapshot:<signal>` on the `analytic` queue, whose job data is `{ signal }`.

## Job ids

The job id of an effect is its `idempotencyKey`. A key of `null` stores the outbox row's own id in the `idempotencyKey` column, and that id is the job id. A pattern is filled with `HelperStringService.fillPattern`.

The placeholders:

| Placeholder | Holds |
| --- | --- |
| `{process}` | The process name of the job: the notification kind for `notify`, the job name for a channel step, `publish` or `publishTermPolicy` for a term policy |
| `{userId}`, `{reference}`, `{joinRequestId}`, `{termPolicyId}`, `{notificationId}` | The string field of that name in the context the effect carries |
| `{batchId}` | The id of one batch of recipients of a term policy publication |
| `{resendNonce}` | A fresh id drawn for each resend |

| Job | Pattern key | Pattern |
| --- | --- | --- |
| `notification` / `notify`, kinds marked `userPattern` | `notification.idempotencyKey.userPattern` | `{process}-{userId}` |
| `notification` / `notify`, kinds marked `referencePattern` | `notification.idempotencyKey.referencePattern` | `{process}-{reference}` |
| `notification` / `notify`, kinds marked `joinRequestPattern` | `notification.idempotencyKey.joinRequestPattern` | `{process}-{joinRequestId}-{userId}` |
| `notification` / `notify`, kinds marked `userTermPolicyPattern` | `notification.idempotencyKey.userTermPolicyPattern` | `{process}-{userId}-{termPolicyId}` |
| a notification channel step (`send` on the email, push, and SMS queues) | `notification.idempotencyKey.stepPattern` | `{process}-{notificationId}` |
| `notificationEmail` / `sendUnregistered` | `notification.idempotencyKey.referencePattern` | `{process}-{reference}` |
| `notificationEmail` / `publishTermPolicy` | `notification.idempotencyKey.termPolicyBatchPattern` | `{process}-{termPolicyId}-{batchId}` |
| `notificationEmail` / `publishTermPolicy`, a resend | `notification.idempotencyKey.termPolicyBatchResendPattern` | `{process}-{termPolicyId}-{batchId}-{resendNonce}` |
| `termPolicy` / `publish` | `termPolicy.idempotencyKey.publishPattern` | `{process}-{termPolicyId}` |
| `termPolicy` / `publish`, a resend | `termPolicy.idempotencyKey.resendPublishPattern` | `{process}-{termPolicyId}-{resendNonce}` |

- A kind marked none in the kinds table passes `null`.
- Every other effect passes `null`: `activityLog` `createMany`, `cache` `invalidate`, `termPolicy` `deleteContent`, every `user` job, `session` `purgeLogins`, and `workspace` `softDelete`.
- `(queue, name, idempotencyKey)` is unique on the `Outbox` model.

## Job options

Each queue factory returns the `defaultJobOptions` of its queue from the `queue` object of its module's config namespace, written `<namespace>.queue.<key>` below.

| Option | Value | Config key |
| --- | --- | --- |
| `attempts` | `3` | `<namespace>.queue.maxAttempts` |
| `backoff` | exponential, with the queue's delay | the queue's `Backoff key` above |
| `keepLogs` | `20` | `<namespace>.queue.keepLogs` |
| `removeOnComplete.age` | `604800` seconds (7 days) | `<namespace>.queue.removeOnCompleteAgeInSeconds` |
| `removeOnFail.age` | `1209600` seconds (14 days) | `<namespace>.queue.removeOnFailAgeInSeconds` |

`QueueModule.forRoot()` supplies the shared defaults from `queue.job.maxAttempts`, `queue.job.removeOnCompleteAgeInSeconds`, `queue.job.removeOnFailAgeInSeconds`, and `queue.job.defaultBackoffDelayInMs` (3 seconds). They apply to a queue whose factory returns no job options, which is the `health` queue.

A processor passes worker options in the second argument of `@QueueProcessor`. Only the two limiters are set, so every other worker runs BullMQ's default of one job at a time. A limiter counts in a Redis key of the queue, so it applies to the whole queue across every worker and instance, not per worker.

| Processor | Option | Value |
| --- | --- | --- |
| `NotificationEmailProcessor` | `limiter` | `AwsSesRateLimitPerDuration` (10) jobs per `AwsSesRateLimitDurationInMs` (1000 ms) |
| `NotificationPushProcessor` | `limiter` | `FirebaseMaxRateLimitPerDuration` (500000) jobs per `FirebaseRateLimitDurationInMs` (60000 ms) |

The queue client options: the producer `RedisQueueClient` has `enableOfflineQueue: false`, `redis.queue.connectTimeoutInMs`, and `redis.queue.maxRetriesPerRequest`. The worker `RedisQueueWorkerClient` keeps the offline queue and sets `maxRetriesPerRequest: null`.

## Priorities

`EnumQueuePriority` sets the BullMQ priority of a job, and a lower number runs first.

| Name     | Value |
| -------- | ----- |
| `high`   | `1`   |
| `medium` | `5`   |
| `low`    | `10`  |

## Outbox statuses

| Status | Meaning |
| --- | --- |
| `pending` | The row is written and not yet enqueued |
| `enqueued` | The job is in the queue |
| `completed` | The job finished, stamped with `attempts` and `completedAt` |
| `failed` | The job ended on its last attempt or an unrecoverable error, stamped with `attempts`, `lastError`, and `failedAt` |

The sweep reads these config keys:

| Key | Value | What the sweep does with it |
| --- | --- | --- |
| `outbox.sweepIntervalInMs` | 1 minute | The repeat interval of the sweep scheduler |
| `outbox.pendingAfterInMs` | 30 seconds | A row `pending` for longer is re-dispatched |
| `outbox.enqueuedAfterInMs` | 1 hour | A row `enqueued` for longer has its job looked up and is stamped or re-dispatched |
| `outbox.sweepBatch` | 100 | The most rows each of the two reads returns |
| `outbox.sweepKeepCompleted` | 20 | The number of completed sweep jobs BullMQ keeps (`removeOnComplete.count`) |

The `scrubExpired` job reads these keys:

| Key | Value | What the job does with it |
| --- | --- | --- |
| `outbox.scrubExpiredCron` | `0 4 * * *` | The daily schedule of the job |
| `outbox.retentionInMs` | 30 days | A row `completed` or `failed` and last updated longer ago has `data` set to `{}`, `lastError` to `null`, and `scrubbedAt` stamped |

## Job states

`QueueBase.getJobState(jobId)` returns `{ state, attemptsMade, failedReason }`. It returns `null` when no job has that id, for instance after retention removed it. The state is `unknown` when the job exists and BullMQ reports no state for it. `EnumQueueJobState` holds `completed`, `failed`, `active`, `delayed`, `prioritized`, `waiting`, `waiting-children`, and `unknown`.

## Queue exceptions

| Class | Properties | Behavior |
| --- | --- | --- |
| `QueueException` | `message`, `isFatal` (default `false`), `rawError` (default `null`, also set as `cause`) | Retried until the last attempt. Reported to Sentry once the job will not retry, only when `isFatal` is `true` (itself or as the `cause` of an `UnrecoverableError`) |
| `QueueUnrecoverableException` | the same, with `isFatal` defaulting to `true` | Becomes BullMQ's `UnrecoverableError`, so the job ends with no further attempt. Reported to Sentry unless its `isFatal` is set to `false` |

`HelperDecryptFailedException` takes the same unrecoverable path.

<!-- REFERENCES -->

[ref-doc-concept-queue]: ../concepts/queue.md
[ref-doc-guide-queue]: ../guides/queue.md
[ref-doc-concept-cache]: ../concepts/cache.md
[ref-doc-reference-configuration-queue]: configuration.md#queue
[ref-doc-reference-status-codes]: status-codes.md
