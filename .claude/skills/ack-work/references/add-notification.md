# Add a notification

Invariants: `.claude/rules/queue.md` (Enqueuing, Messages, Notifications). Queue mechanics: `add-queue.md`. Reference: `workspaceInvite`; a broadcast: step 8. The producing use case reads the recipient snapshot (step 3) and calls `NotificationQueue.send<Kind>` (`NotificationModule`, imported by its use-case module) with plaintext values after commit.

## 1. Name the kind

One camelCase name in `src/modules/notification/enums/notification.enum.ts`: `EnumNotificationKind` (`:50-69`, the stored kind), `EnumNotificationProcess` (`:5-26`, the main and email job name), `EnumNotificationPushProcess` (`:32-44`) when the kind has a push channel. A new step is an `EnumNotificationStep` member (`:75-85`).

## 2. Contract and messages

- Add the row to `NotificationKindContract` (`src/modules/notification/contracts/notification.kind.contract.ts:167-181`): Prisma-enum `type` and `priority`, `isMandatory` (`true` ignores user settings), `title` and `body` i18n paths, `pendingChannels` (fan-out sends), `deliveredChannels` (row records at once).
- Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/<lang>/notification.json` in every language, placeholders matching the service's metadata; plus `queue.[<channel>.]<kind>`, `queue.[<channel>.]error.<descriptor>`, `queue.[<channel>.]error.enqueue<Kind>` per queue the kind uses (channel `email`, `push`, or none on the main queue) (`.claude/rules/i18n.md`).
- Each processor's `default` throws its queue's `error.unknownProcess` (`add-queue.md`, New queue step 6).
- A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts:11-24`).

## 3. Recipient snapshot

1. The use case passes a user (`UserService.getOneActive`, `null` sends nothing, or one held as `IUserRecipient`, `UserRecipientSelect`, `src/modules/user/constants/user.constant.ts:36-40`) to `NotificationService.getRecipient(user, kind)`, which reads tokens (`DeviceService.getNotificationTokens`) and settings (`getListUserSetting`) and returns `NotificationUtil.mapRecipient` (`src/modules/notification/utils/notification.util.ts:281-295`). A user the write creates is `mapRecipient(created, kind, [], [])`.
2. `channels` is `NotificationUtil.resolveChannels` (`:94-125`): the contract channels minus those the user disabled for a toggleable, non-mandatory type; `[]` when only `silent` survives (no row, no send).
3. Read before the transaction.
4. No user: call the unregistered email variant (`NotificationEmailQueue.sendWorkspaceInviteUnregistered`).

## 4. Payload shapes

In `src/modules/notification/interfaces/notification.interface.ts`, beside `workspaceInvite` (`:204-224`): `INotification<Kind>Payload` (plain), `INotification<Kind>EncryptedPayload` (secret as `encrypted<Field>`), `INotification<Kind>PushPayload` (plain minus every secret). A second row's id rides in the encrypted payload (`verificationNotificationId`, `:263-265`).

Reuse: `INotificationQueuePayload<T>` (`:272-279`, recipient `:41-46`), `INotificationPushQueuePayload<T>` (`:288-294`), `INotificationEmailQueuePayload<T>` (`:310-313`) and its bulk and unregistered variants, `INotificationStepResult` (`:343-347`), `INotificationPushSendOutcome` (`:354-358`), `INotificationPushStepResult` (`:360-363`).

## 5. Main queue and fan-out

1. `NotificationQueue.send<Kind>(recipient, data, proceedBy)` (`src/modules/notification/queues/notification.queue.ts:824-870`): `encryptRecipient` (`:104-122`) and `encryptValue` (`:95-102`) seal against `recipient.userId`; one `DatabaseUtil.createId()` per row (`:835`); `completedSteps: []`; `this.addSideEffect` with `priority`, the `notification.queue.error.enqueue<Kind>` description, and a fixed `jobId` from a `notification.jobId.*Pattern` constructor field (`:51-57`): `referencePattern` here (`:849-855`), `userPattern` for a once-per-user kind, `eventPattern` for a repeat kind.
2. `NotificationProcessor.handle` case (`src/modules/notification/processors/notification.processor.ts`).
3. `NotificationProcess<Kind>UseCase.execute` (`src/modules/notification/use-cases/notification.process-workspace-invite.use-case.ts`): pass `job.data` fields to the concern service; return its `recordSteps(job, result)`, which throws `QueueException` with a `notification.queue.error.<descriptor>` message on a failed step.
4. `Notification<Concern>Service.process<Kind>` (`src/modules/notification/services/notification.workspace.service.ts`):
    - Empty `recipient.channels` returns the given `completedSteps`.
    - Unless `createNotification` is done, write the job's rows in one `notificationRepository.createMany` with `channels: recipient.channels` and the `metadata` the i18n body needs (`src/modules/notification/repositories/notification.repository.ts:119-145`). A failure returns at once.
    - Start each side-effect step not in `completedSteps`: email when `channels` holds `email`; push when it holds `push` and tokens exist. `Promise.allSettled` them; map each rejection through `NotificationUtil.toStepFailure`; return `INotificationStepResult`, `message` from `setMessage('notification.queue.<kind>')`.
5. A new concern gets its own service, provided and exported in `notification.module.ts`.

## 6. Email channel

1. `NotificationEmailQueue.send<Kind>` (`src/modules/notification/queues/notification.email.queue.ts:650-672`): `add` (job caller); `jobId` with `EnumNotificationStep.sendEmail`. The unregistered variant (request caller) uses `addSideEffect`, writes no row, and seals to the invite reference (`:675-725`).
2. `NotificationEmailProcessor.handle` case (`src/modules/notification/processors/notification.email.processor.ts`); its catch maps `HelperDecryptFailedException` and `NotificationEmailDeliveryUnknownException` to `UnrecoverableError`.
3. `NotificationEmailProcess<Kind>UseCase.execute` (`src/modules/notification/use-cases/notification.email.process-workspace-invite.use-case.ts`).
4. `NotificationEmail<Concern>Service.process<Kind>` (`src/modules/notification/services/notification.email.workspace.service.ts`): decrypt against `userId` immediately before `awsSESService.send` (`templateName: EnumNotificationProcess.<kind>`), plaintext into `templateData` only.
5. Template: `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`, placeholders named as in `templateData`.
6. `NotificationTemplate<Concern>Service` (`src/modules/notification/services/notification.template.workspace.service.ts`): add an `INotificationTemplate<Concern>Process` member, typing `process` on `emailImport`, `emailGet`, `emailDelete`, and a private `getTemplateEmail` case: subject and literal `../templates` filename.
7. Seed: in `src/migration/seeds/migration.template-notification.seed.ts`, add the get call (`:51-121`) and import branch (`:265-274`) to `seed()`, the delete call to `remove()` (`:329-381`). The owner runs `pnpm migration templateEmailNotification --type seed`.

## 7. Push channel

1. `NotificationPushQueue.send<Kind>` (`src/modules/notification/queues/notification.push.queue.ts`): no secret; `add`; `completedSteps: []`, both token lists `null`; `jobId` with `EnumNotificationStep.sendPush`.
2. `NotificationPushProcessor.handle` case (`src/modules/notification/processors/notification.push.processor.ts`).
3. `NotificationPushProcess<Kind>UseCase.execute` (`src/modules/notification/use-cases/notification.push.process-workspace-invite.use-case.ts`); its `recordSteps` also writes both lists.
4. `NotificationPush<Concern>Service.process<Kind>` (`src/modules/notification/services/notification.push.workspace.service.ts`):
    - Unset `firebaseService.isInitialized()` returns the given steps and lists.
    - Unless `updateProcessAt` is done, mark the push delivery processed.
    - Unless `sendMulticast` is done, run `sendMulticastStep`; a pending token returns at once with both lists.
    - Nothing pending: mark `sendMulticast` done, then `cleanupTokens` (`NotificationPushQueue.sendCleanupTokens`, `notification.push.queue.ts`) and `updateSentAt` in `Promise.allSettled`, skipping completed steps; return `INotificationPushStepResult`.

## 8. Broadcast kind

A bulk email follows `publishTermPolicy`: no per-user snapshot or steps.

1. Producer: `NotificationQueue.sendPublishTermPolicy` (`notification.queue.ts:677-708`) adds `INotificationBulkQueuePayload` with a recipient bound and `resendNonce: null` through `addSideEffect`, from the publishing use case after commit.
2. Fan-out: `NotificationProcessPublishTermPolicyUseCase` (`notification.process-publish-term-policy.use-case.ts`) pages active recipients (`UserService.getListActiveRecipientCursor`, `email.batchSize` per page), passing each page to `NotificationTermPolicyService` `getPage`, `sendPendingBatches`, and `sendFreshBatch`; `UserService.getManyActiveRecipientsByIds` fills a pending batch's off-page recipients.
3. Markers: an unmarked user gets a `Notification` row and one `TermPolicyRecipient` (unique per subject and user, `prisma/schema.prisma:403`) under a new `batchId`, in one transaction (`createTermPolicyRecipients`, `notification.repository.ts:172-201`), then `NotificationEmailQueue.sendPublishTermPolicyBatch` (`notification.email.queue.ts:612-647`) adds the batch. A pending batch is re-added with only its sendable rows (`NotificationTermPolicyRecipientSendWhere`).
4. Send: `NotificationEmailTermPolicyService.processPublishTermPolicy` (`src/modules/notification/services/notification.email.term-policy.service.ts`):
    - Claim the rows (`claimedAt`, `claimNonce`); `sendBulk` to the rows read back; mark each success sent.
    - A definite SES failure releases its claim and throws a retrying `new QueueException(message, true)` (`notification.queue.email.error.<descriptor>`).
    - An unknown outcome keeps its claim and throws `NotificationEmailDeliveryUnknownException`, mapped to `UnrecoverableError` (step 6.2). When both happen, the `QueueException` wins.
5. Job ids: a fixed `jobId`. The operator re-run (`EnumNotificationProcess.resendPublishTermPolicy`, `NotificationQueue.sendResendPublishTermPolicy`, `notification.queue.ts:710-735`, a throwing `add`) draws `resendNonce` there and every job id carries it (`notification.jobId.termPolicyResendPattern`, `notification.jobId.termPolicyBatchResendPattern`, `notification.email.queue.ts:625-636`).

## 9. Verify

```bash
pnpm test notification
pnpm typecheck
```

Boot and read it per `add-queue.md`, Verify; module line: `NotificationUseCaseModule dependencies initialized`.

Specs:

- Each queue method asserts job name, payload with every encrypted field and generated id, and options with `jobId`; a re-run method, the nonce job ids.
- Each service asserts the rows, fan-out, empty-channel skip, a skipped completed step, and a failed step.
- A push service asserts a pending token keeps `sendMulticast` failed and `sentAt` unset.
- A broadcast send service asserts the claim, the release on a definite failure, the claim kept on an unknown outcome, and the retry winning both.
- Each use case asserts `job.updateData` and the `QueueException`.

Renames: `.claude/rules/queue.md`, Processors.
