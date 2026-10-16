# Add a notification

Invariants: `.claude/rules/queue.md` (Enqueuing, Notifications). Queue mechanics: `add-queue.md`. Reference: `workspaceInvite`, traced below; a broadcast follows step 8. A feature domain injects `NotificationRecipientDomain` and `NotificationQueue` (exported by the `@Global()` `NotificationDomainModule`), reads the recipient snapshot, calls `send<Kind>` with plaintext values.

## 1. Name the kind

One camelCase name in `src/modules/notification/enums/notification.enum.ts`: `EnumNotificationKind` (`:50-69`, the stored kind), `EnumNotificationProcess` (`:5-26`, the main and email job name), `EnumNotificationPushProcess` (`:32-44`) when the kind has a push channel. A new step is an `EnumNotificationStep` member (`:75-85`).

## 2. Contract and messages

- Add the row to `NotificationKindContract` (`src/modules/notification/contracts/notification.kind.contract.ts:167-181`): Prisma-enum `type` and `priority`, `isMandatory` (`true` ignores user settings), `title` and `body` i18n paths, `pendingChannels` (what the fan-out sends), `deliveredChannels` (what the row records at once).
- Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/<lang>/notification.json` in every language; placeholders match the metadata the domain writes.
- A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts:11-24`).

## 3. Recipient snapshot

1. Read the user as `IUserRecipient` (`src/modules/user/interfaces/user.interface.ts:46-48`, `UserRecipientSelect` in `src/modules/user/constants/user.constant.ts:81-85`) or a `User`.
2. `NotificationRecipientDomain.getRecipient(user, kind)` (`src/modules/notification/domains/notification.recipient.domain.ts:20-41`) returns `INotificationRecipient`: identity, distinct device `notificationTokens`, `channels`.
3. `channels` is `NotificationUtil.resolveChannels` (`src/modules/notification/utils/notification.util.ts:33-67`): the contract channels minus each one the user disabled for a toggleable type unless `isMandatory`; `[]` when only `silent` survives, so the job writes no row and sends nothing.
4. Read it before any write not depending on it (`src/modules/user/domains/user.password.domain.ts:484`).
5. No account: call the unregistered email variant (`src/modules/workspace/domains/workspace.invite.domain.ts:215-228`).

## 4. Payload shapes

In `src/modules/notification/interfaces/notification.interface.ts`, beside the workspace-invite shapes (`:168-194`): `INotification<Kind>Payload` (plain), `INotification<Kind>EncryptedPayload` (secret as `encrypted<Field>`; rides in `job.data`), `INotification<Kind>PushPayload` (plain minus every secret). A second row's id rides in the encrypted payload (`verificationNotificationId`, `:226-228`).

Reuse the envelopes: `INotificationQueuePayload<T>` (`:235-242`, recipient `:36-41`), `INotificationPushQueuePayload<T>` (`:251-257`), `INotificationEmailQueuePayload<T>` (`:273-276`) and its bulk and unregistered variants, `INotificationStepResult` (`:301-305`), `INotificationPushSendOutcome` (`:307-311`), `INotificationPushStepResult` (`:313-316`).

## 5. Main queue and fan-out

1. `NotificationQueue.send<Kind>(recipient, data, proceedBy)` (`src/modules/notification/queues/notification.queue.ts:670-714`): `encryptRecipient` (`:79-97`) and `encryptValue` (`:70-77`) seal against `recipient.userId`; one `DatabaseUtil.createId()` per row (`sendWelcome`, `:156-157`); `completedSteps: []`; `add` with `priority` and `deduplication` (ttl `notification.dedupTtlInMs`), its id a `Notification*JobIdPattern` (`src/modules/notification/constants/notification.constant.ts`): `NotificationReferenceJobIdPattern` here (`:695-701`), `NotificationUserJobIdPattern` for a once-per-user kind.
2. `NotificationProcessor.handle` case (`src/modules/notification/processors/notification.processor.ts:158-165`).
3. `NotificationProcessorService.process<Kind>` (`src/modules/notification/services/notification.processor.service.ts:342-368`): pass the `job.data` fields to the concern domain; return `recordSteps(job, result)` (`:41-61`).
4. `Notification<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.workspace.domain.ts:33-157`) reads no user, device, or setting:
    - Empty `recipient.channels` returns the given `completedSteps`, no failure.
    - Unless `createNotification` is done, write the job's rows in one `notificationRepository.createMany` with `channels: recipient.channels` and the `metadata` the i18n body needs (`src/modules/notification/repositories/notification.repository.ts:111-137`). A failure returns at once.
    - Start each side-effect step not in `completedSteps`: email when `channels` holds `email`; push when it holds `push` and tokens exist. `Promise.allSettled` them; map each rejection through `NotificationUtil.toStepFailure`; return `INotificationStepResult`.
5. A new concern gets its own domain, provided and exported by `notification.domain.module.ts`.

Every channel job's `jobId` is `NotificationStepJobIdPattern` (`notification.constant.ts:67`), beside its `deduplication`.

## 6. Email channel

1. `NotificationEmailQueue.send<Kind>` (`src/modules/notification/queues/notification.email.queue.ts:800-838`): forward the ciphertext unchanged; `jobId` with `EnumNotificationStep.sendEmail`. The unregistered variant writes no row and seals to the invite reference (`:841-889`).
2. `NotificationEmailProcessor.handle` case (`src/modules/notification/processors/notification.email.processor.ts:177-184`); its catch maps `HelperDecryptFailedException` and `NotificationEmailDeliveryUnknownException` to `UnrecoverableError` (`:229-237`).
3. `NotificationEmailProcessorService.process<Kind>` (`src/modules/notification/services/notification.email.processor.service.ts:203-214`).
4. `NotificationEmail<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.email.workspace.domain.ts:67-112`): decrypt against `userId` immediately before `awsSESService.send({ templateName: EnumNotificationProcess.<kind>, … })`, plaintext into `templateData` only.
5. Template: `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`, placeholders named as in `templateData`.
6. `emailImport<Kind>`, `emailGet<Kind>`, `emailDelete<Kind>` on `NotificationTemplate<Concern>Domain` (`src/modules/notification/domains/notification.template.workspace.domain.ts:17-70`); the import reads `join(import.meta.dirname, '../templates', '<file>.hbs')`, which `nest-cli.json` `assets` copies.
7. Seed: in `src/migration/seeds/migration.template-notification.seed.ts`, add the get call (`:50-86`) and import branch (`:204-211`) to `seed()`, the delete call to `remove()` (`:260-278`). The owner runs `pnpm migration templateEmailNotification --type seed`.

## 7. Push channel

1. `NotificationPushQueue.send<Kind>` (`src/modules/notification/queues/notification.push.queue.ts:265-320`): no secret; `completedSteps: []`, both token lists `null`; `jobId` with `EnumNotificationStep.sendPush`.
2. `NotificationPushProcessor.handle` case (`src/modules/notification/processors/notification.push.processor.ts:91-98`).
3. `NotificationPushProcessorService.process<Kind>` (`src/modules/notification/services/notification.push.processor.service.ts:186-210`); its `recordSteps` (`:34-56`) also writes both lists.
4. `NotificationPush<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.push.workspace.domain.ts:104-227`):
    - Unset `firebaseService.isInitialized()` returns the given steps and lists.
    - Unless `updateProcessAt` is done, mark the push delivery processed.
    - Unless `sendMulticast` is done, run `sendMulticastStep` (`:53-102`); a pending token returns at once with both lists.
    - Nothing pending: mark `sendMulticast` done, then `cleanupTokens` (`NotificationPushQueue.sendCleanupTokens`, `notification.push.queue.ts:458-486`) and `updateSentAt` in `Promise.allSettled`, skipping completed steps; return `INotificationPushStepResult`.

## 8. Broadcast kind

A bulk email follows `publishTermPolicy`: no per-user snapshot, no steps.

1. Producer: `NotificationQueue.sendPublishTermPolicy` (`notification.queue.ts:537-563`) adds `INotificationBulkQueuePayload` with a recipient bound and `resendNonce: null`, after the producer's transaction commits (`.claude/rules/queue.md`, Enqueuing; `src/modules/term-policy/domains/term-policy.domain.ts:355`).
2. Fan-out: `NotificationTermPolicyDomain.processPublishTermPolicy` (`src/modules/notification/domains/notification.term-policy.domain.ts:175-264`) pages active recipients only (`UserDomain.getListActiveRecipientCursor`, `email.batchSize` per page); `getManyActiveRecipientsByIds` fills a pending batch's off-page recipients.
3. Markers: an unmarked user gets a `Notification` row and one `TermPolicyRecipient` (unique per subject and user, `prisma/schema.prisma:398`) under a new `batchId`, in one transaction (`createTermPolicyRecipients`, `notification.repository.ts:164-193`), then `NotificationEmailQueue.sendPublishTermPolicyBatch` (`notification.email.queue.ts:762-797`) adds the batch. A pending batch is re-added with only its sendable rows (`sentAt: null, claimedAt: null`, `NotificationTermPolicyRecipientSendWhere`).
4. Send: `NotificationEmailTermPolicyDomain.processPublishTermPolicy` (`src/modules/notification/domains/notification.email.term-policy.domain.ts:110-217`):
    - Claim the rows (`claimedAt`, `claimNonce`); `sendBulk` to the rows read back; mark each success sent.
    - A definite SES failure releases its claim and throws `QueueException(message, true)`, which retries.
    - An unknown outcome keeps its claim and throws `NotificationEmailDeliveryUnknownException`, mapped to `UnrecoverableError` (step 6.2). When both happen, the `QueueException` wins.
5. Job ids: a plain `add` under a fixed `jobId`. The operator re-run (`EnumNotificationProcess.resendPublishTermPolicy`, `NotificationQueue.sendResendPublishTermPolicy`, `:565-590`) draws `resendNonce` there and every job id carries it (`NotificationTermPolicyResendJobIdPattern`, `NotificationTermPolicyBatchResendJobIdPattern`, `notification.email.queue.ts:775-786`).

## 9. Verify

```bash
pnpm test notification
pnpm build
timeout 90 node --import ./dist/instrument.js dist/main.js > /tmp/ack-boot.log 2>&1; grep -n 'App Name:' /tmp/ack-boot.log   # three workers register
```

Read the build and boot as `add-queue.md`, Verify, says; the module line is `NotificationProcessorModule dependencies initialized`.

Specs:

- Each queue method asserts job name, payload with every encrypted field and generated id, and options with `jobId` and `deduplication`; a re-run method asserts the nonce job ids.
- Each domain asserts the rows, the fan-out, the empty-channel skip, a skipped completed step, and a failed step in the result.
- A push domain asserts a pending token keeps `sendMulticast` failed and `sentAt` unset.
- A broadcast send domain asserts the claim, the release on a definite failure, the claim kept on an unknown outcome, and the retry winning both.
- Each processor service asserts `job.updateData` and the `QueueException`; processors are excluded from coverage.

Renames: `.claude/rules/queue.md`, Processors.
