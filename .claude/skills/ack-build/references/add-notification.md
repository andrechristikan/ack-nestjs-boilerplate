# Add a notification

Invariants: `.claude/rules/queue.md` (Enqueuing, Messages, Notifications). Queue mechanics: `add-queue.md`. Reference: `workspaceInvite`; a broadcast: step 8. The producing HTTP or processor service injects `AccountDomain` (`AccountDomainModule`) and `NotificationQueue` (`@Global()` `NotificationDomainModule`), reads the recipient snapshot, and calls `send<Kind>` with plaintext values after commit.

## 1. Name the kind

One camelCase name in `src/modules/notification/enums/notification.enum.ts`: `EnumNotificationKind` (`:50-69`, the stored kind), `EnumNotificationProcess` (`:5-26`, the main and email job name), `EnumNotificationPushProcess` (`:32-44`) when the kind has a push channel. A new step is an `EnumNotificationStep` member (`:75-85`).

## 2. Contract and messages

- Add the row to `NotificationKindContract` (`src/modules/notification/contracts/notification.kind.contract.ts:167-181`): Prisma-enum `type` and `priority`, `isMandatory` (`true` ignores user settings), `title` and `body` i18n paths, `pendingChannels` (fan-out sends), `deliveredChannels` (row records at once).
- Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/<lang>/notification.json` in every language, placeholders matching the domain's metadata; plus `queue.[<channel>.]<kind>`, `queue.[<channel>.]error.<descriptor>`, `queue.[<channel>.]error.enqueue<Kind>` per queue the kind uses (channel `email`, `push`, or none on the main queue) (`.claude/rules/i18n.md`).
- Each processor's `default` throws its queue's `error.unknownProcess` (`add-queue.md`, New queue step 6).
- A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts:11-24`).

## 3. Recipient snapshot

1. `AccountDomain.getNotificationRecipient(userId, kind)` (`src/modules/account/domains/account.domain.ts:35-51`, `null` unless active), or `getNotificationRecipientOfUser(user, kind)` (`:56-67`) for a user read as `IUserRecipient` (`UserRecipientSelect`, `src/modules/user/constants/user.constant.ts:85-89`), returns `INotificationRecipient` from `NotificationUtil.mapRecipient` (`src/modules/notification/utils/notification.util.ts:206-220`).
2. `channels` is `NotificationUtil.resolveChannels` (`:64-95`): the contract channels minus those the user disabled for a toggleable, non-mandatory type; `[]` when only `silent` survives (no row, no send).
3. Read before the transaction.
4. No account: call the unregistered email variant (`NotificationEmailQueue.sendWorkspaceInviteUnregistered`).

## 4. Payload shapes

In `src/modules/notification/interfaces/notification.interface.ts`, beside `workspaceInvite` (`:197-217`): `INotification<Kind>Payload` (plain), `INotification<Kind>EncryptedPayload` (secret as `encrypted<Field>`), `INotification<Kind>PushPayload` (plain minus every secret). A second row's id rides in the encrypted payload (`verificationNotificationId`, `:256-258`).

Reuse: `INotificationQueuePayload<T>` (`:265-272`, recipient `:41-46`), `INotificationPushQueuePayload<T>` (`:281-287`), `INotificationEmailQueuePayload<T>` (`:303-306`) and its bulk and unregistered variants, `INotificationStepResult` (`:336-340`), `INotificationPushSendOutcome` (`:342-346`), `INotificationPushStepResult` (`:348-351`).

## 5. Main queue and fan-out

1. `NotificationQueue.send<Kind>(recipient, data, proceedBy)` (`src/modules/notification/queues/notification.queue.ts:818-864`): `encryptRecipient` (`:103-121`) and `encryptValue` (`:94-101`) seal against `recipient.userId`; one `DatabaseUtil.createId()` per row (`:829`); `completedSteps: []`; `this.addSideEffect` with `priority`, the `notification.queue.error.enqueue<Kind>` description, and a fixed `jobId` from a `notification.jobId.*Pattern` constructor field (`:50-56`): `referencePattern` here (`:843-849`), `userPattern` for a once-per-user kind, `eventPattern` for a repeat kind.
2. `NotificationProcessor.handle` case (`src/modules/notification/processors/notification.processor.ts:158-165`).
3. `NotificationProcessorService.process<Kind>` (`src/modules/notification/services/notification.processor.service.ts:439-465`): pass `job.data` fields to the concern domain; return `recordSteps(job, result)` (`:49-69`), which throws `QueueException` with a `notification.queue.error.<descriptor>` message on a failed step.
4. `Notification<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.workspace.domain.ts:35-158`):
    - Empty `recipient.channels` returns the given `completedSteps`.
    - Unless `createNotification` is done, write the job's rows in one `notificationRepository.createMany` with `channels: recipient.channels` and the `metadata` the i18n body needs (`src/modules/notification/repositories/notification.repository.ts:119-145`). A failure returns at once.
    - Start each side-effect step not in `completedSteps`: email when `channels` holds `email`; push when it holds `push` and tokens exist. `Promise.allSettled` them; map each rejection through `NotificationUtil.toStepFailure`; return `INotificationStepResult`, `message` from `setMessage('notification.queue.<kind>')`.
5. A new concern gets its own domain, provided and exported in `notification.domain.module.ts`.

## 6. Email channel

1. `NotificationEmailQueue.send<Kind>` (`src/modules/notification/queues/notification.email.queue.ts:650-672`): `add` (a job calls it); `jobId` with `EnumNotificationStep.sendEmail`. The unregistered variant (a request calls it) uses `addSideEffect`, writes no row, and seals to the invite reference (`:675-725`).
2. `NotificationEmailProcessor.handle` case (`src/modules/notification/processors/notification.email.processor.ts:177-184`); its catch maps `HelperDecryptFailedException` and `NotificationEmailDeliveryUnknownException` to `UnrecoverableError` (`:227-236`).
3. `NotificationEmailProcessorService.process<Kind>` (`src/modules/notification/services/notification.email.processor.service.ts:206-217`).
4. `NotificationEmail<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.email.workspace.domain.ts:74-128`): decrypt against `userId` immediately before `awsSESService.send({ templateName: EnumNotificationProcess.<kind>, … })`, plaintext into `templateData` only.
5. Template: `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`, placeholders named as in `templateData`.
6. `NotificationTemplate<Concern>Domain` gets `emailImport<Kind>`, `emailGet<Kind>`, `emailDelete<Kind>` (`src/modules/notification/domains/notification.template.workspace.domain.ts:17-70`); the import reads `join(import.meta.dirname, '../templates', '<file>.hbs')`, which `nest-cli.json` `assets` copies.
7. Seed: in `src/migration/seeds/migration.template-notification.seed.ts`, add the get call (`:50-86`) and import branch (`:204-211`) to `seed()`, the delete call to `remove()` (`:260-278`). The owner runs `pnpm migration templateEmailNotification --type seed`.

## 7. Push channel

1. `NotificationPushQueue.send<Kind>` (`src/modules/notification/queues/notification.push.queue.ts:203-246`): no secret; `add`; `completedSteps: []`, both token lists `null`; `jobId` with `EnumNotificationStep.sendPush`.
2. `NotificationPushProcessor.handle` case (`src/modules/notification/processors/notification.push.processor.ts:91-98`).
3. `NotificationPushProcessorService.process<Kind>` (`src/modules/notification/services/notification.push.processor.service.ts:190-214`); its `recordSteps` (`:38-60`) also writes both lists.
4. `NotificationPush<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.push.workspace.domain.ts:135-266`):
    - Unset `firebaseService.isInitialized()` returns the given steps and lists.
    - Unless `updateProcessAt` is done, mark the push delivery processed.
    - Unless `sendMulticast` is done, run `sendMulticastStep` (`:81-133`); a pending token returns at once with both lists.
    - Nothing pending: mark `sendMulticast` done, then `cleanupTokens` (`NotificationPushQueue.sendCleanupTokens`, `notification.push.queue.ts:345-373`) and `updateSentAt` in `Promise.allSettled`, skipping completed steps; return `INotificationPushStepResult`.

## 8. Broadcast kind

A bulk email follows `publishTermPolicy`: no per-user snapshot or steps.

1. Producer: `NotificationQueue.sendPublishTermPolicy` (`notification.queue.ts:676-707`) adds `INotificationBulkQueuePayload` with a recipient bound and `resendNonce: null` through `addSideEffect`, from the publishing HTTP service after commit.
2. Fan-out: `NotificationProcessorService.processPublishTermPolicy` (`notification.processor.service.ts:349-416`) pages active recipients (`UserDomain.getListActiveRecipientCursor`, `email.batchSize` per page), passing each page to `NotificationTermPolicyDomain` `getPage`, `sendPendingBatches`, and `sendFreshBatch`; `UserDomain.getManyActiveRecipientsByIds` fills a pending batch's off-page recipients.
3. Markers: an unmarked user gets a `Notification` row and one `TermPolicyRecipient` (unique per subject and user, `prisma/schema.prisma:400`) under a new `batchId`, in one transaction (`createTermPolicyRecipients`, `notification.repository.ts:172-201`), then `NotificationEmailQueue.sendPublishTermPolicyBatch` (`notification.email.queue.ts:612-647`) adds the batch. A pending batch is re-added with only its sendable rows (`NotificationTermPolicyRecipientSendWhere`).
4. Send: `NotificationEmailTermPolicyDomain.processPublishTermPolicy` (`src/modules/notification/domains/notification.email.term-policy.domain.ts:92-220`):
    - Claim the rows (`claimedAt`, `claimNonce`); `sendBulk` to the rows read back; mark each success sent.
    - A definite SES failure releases its claim and throws a retrying `new QueueException(message, true)` (`notification.queue.email.error.<descriptor>`).
    - An unknown outcome keeps its claim and throws `NotificationEmailDeliveryUnknownException`, mapped to `UnrecoverableError` (step 6.2). When both happen, the `QueueException` wins.
5. Job ids: a fixed `jobId`. The operator re-run (`EnumNotificationProcess.resendPublishTermPolicy`, `NotificationQueue.sendResendPublishTermPolicy`, `notification.queue.ts:709-734`, a throwing `add`) draws `resendNonce` there and every job id carries it (`notification.jobId.termPolicyResendPattern`, `notification.jobId.termPolicyBatchResendPattern`, `notification.email.queue.ts:625-636`).

## 9. Verify

```bash
pnpm test notification
pnpm build
timeout 90 node --import ./dist/instrument.js dist/main.js > /tmp/ack-boot.log 2>&1; grep -n 'App Name:' /tmp/ack-boot.log
```

Read build and boot per `add-queue.md`, Verify; module line: `NotificationProcessorModule dependencies initialized`.

Specs:

- Each queue method asserts job name, payload with every encrypted field and generated id, and options with `jobId`; a re-run method, the nonce job ids.
- Each domain asserts the rows, fan-out, empty-channel skip, a skipped completed step, and a failed step.
- A push domain asserts a pending token keeps `sendMulticast` failed and `sentAt` unset.
- A broadcast send domain asserts the claim, the release on a definite failure, the claim kept on an unknown outcome, and the retry winning both.
- Each processor service asserts `job.updateData` and the `QueueException`.

Renames: `.claude/rules/queue.md`, Processors.
