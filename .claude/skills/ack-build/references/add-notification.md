# Add a notification

Invariants: `.claude/rules/queue.md` (Enqueuing, Notifications). Queue mechanics: `.claude/skills/ack-build/references/add-queue.md`. Reference: `workspaceInvite`, traced below. The producer is a feature domain injecting `NotificationRecipientDomain` and `NotificationQueue` (exported by the `@Global()` `NotificationDomainModule`): it reads the recipient snapshot, then calls `send<Kind>` with plaintext values. The main processor writes the job's `Notification` rows and fans out to `NotificationEmailQueue` and `NotificationPushQueue`; each channel processor sends.

## 1. Name the kind

One camelCase name in `src/modules/notification/enums/notification.enum.ts`: `EnumNotificationKind` (`:49-68`, the stored kind), `EnumNotificationProcess` (`:5-25`, the main and email job name), and `EnumNotificationPushProcess` (`:31-43`) when the kind has a push channel. A new step is an `EnumNotificationStep` member (`:74-84`).

## 2. Contract and messages

- Add the row to `NotificationKindContract` (`src/modules/notification/contracts/notification.kind.contract.ts:167-181`): Prisma-enum `type` and `priority`, `isMandatory` (`true` ignores user settings), `title` and `body` i18n paths, `pendingChannels` (what the fan-out sends), `deliveredChannels` (what the row records at once).
- Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/<lang>/notification.json` in every language; `{username}`-style placeholders match the metadata the domain writes.
- A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts:11-24`).

## 3. Recipient snapshot

1. Read the user as `IUserRecipient` (`src/modules/user/interfaces/user.interface.ts:46-48`, `UserRecipientSelect` in `src/modules/user/constants/user.constant.ts:81-85`) or a `User`.
2. `NotificationRecipientDomain.getRecipient(user, kind)` (`src/modules/notification/domains/notification.recipient.domain.ts:20-41`) returns `INotificationRecipient`: `userId`, `email`, `username`, distinct device `notificationTokens`, `channels`.
3. `channels` is `NotificationUtil.resolveChannels` (`src/modules/notification/utils/notification.util.ts:33-67`): the row's pending and delivered channels, minus each one the user disabled for a toggleable type unless `isMandatory`. When only `silent` is left it is `[]`: the job writes no row and sends nothing.
4. Read it before any write that does not depend on it (`forgotPassword`, `src/modules/user/domains/user.password.domain.ts:484`).
5. No account, no snapshot: the producer calls the unregistered email variant (`src/modules/workspace/domains/workspace.invite.domain.ts:215-228`).

## 4. Payload shapes

In `src/modules/notification/interfaces/notification.interface.ts`, beside the workspace-invite shapes (`:166-192`): `INotification<Kind>Payload` (plain, secret in plaintext), `INotification<Kind>EncryptedPayload` (secret as `encrypted<Field>`; rides in `job.data`), `INotification<Kind>PushPayload` (plain minus every secret). A second row's id rides in the encrypted payload (`verificationNotificationId`, `:224-226`).

Reused as they are:

- `INotificationQueuePayload<T>` (`:233-240`): `userId`, `notificationId`, `completedSteps`, `recipient` (`INotificationRecipientEncryptedPayload`, `:36-41`: `encryptedEmail`, `username`, `encryptedNotificationTokens`, `channels`), `proceedBy`, `data`.
- `INotificationPushQueuePayload<T>` (`:249-255`): `send` (`INotificationSendPushEncryptedPayload`), `data`, `completedSteps`, `encryptedFailureTokens` and `encryptedPendingTokens`, each `string[] | null`.
- `INotificationEmailQueuePayload<T>` (`:271-274`, `send` is `INotificationEmailSendEncryptedPayload`), and the bulk and unregistered variants.
- `INotificationStepResult` (`:299-303`: `message`, `completedSteps`, `failedSteps`); `INotificationPushStepResult` (`:311-314`) adds both token lists; a push send step returns `INotificationPushSendOutcome` (`:305-309`: both lists, `failure`).

## 5. Main queue and fan-out

1. `NotificationQueue.send<Kind>(recipient, data, proceedBy)` (`src/modules/notification/queues/notification.queue.ts:686-730`): `encryptRecipient` (`:84-102`) seals the email and tokens and `encryptValue` (`:75-82`) the secret, both against `recipient.userId`; one `DatabaseUtil.createId()` per row (`sendWelcome`, `:161-162`); `completedSteps: []`; `add` with `priority` and `deduplication` (one logical send, ttl `notification.dedupTtlInMs`). The id is a `Notification*JobIdPattern` (`src/modules/notification/constants/notification.constant.ts`) through `HelperStringService.fillPattern`: `NotificationReferenceJobIdPattern` for `workspaceInvite` (`:711-717`), `NotificationUserJobIdPattern` for a once-per-user kind.
2. `NotificationProcessor.handle` case (`src/modules/notification/processors/notification.processor.ts:157-164`).
3. `NotificationProcessorService.process<Kind>` (`src/modules/notification/services/notification.processor.service.ts:342-368`): pass the `job.data` fields to the concern domain; return `recordSteps(job, result)` (`:41-61`): `job.updateData` with `completedSteps`, then `QueueException(summary, true)` (`NotificationUtil.toStepSummary`) on a failed step, else `NotificationUtil.toStepResponse(result)`.
4. `Notification<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.workspace.domain.ts:33-157`) reads no user, device, or setting:
    - Empty `recipient.channels` returns the given `completedSteps` and no failure.
    - Unless `createNotification` is done, write every row of the job in one `notificationRepository.createMany([{ kind, payload: { id: notificationId, channels: recipient.channels, metadata, … } }])`, `metadata` being what the i18n body needs (`src/modules/notification/repositories/notification.repository.ts:111-137`: creates only the missing ids, in its transaction, one delivery per contract channel in `channels`). A failure returns at once.
    - Start each side-effect step not in `completedSteps`: email when `channels` holds `email`, from `recipient.encryptedEmail`; push when it holds `push` and `encryptedNotificationTokens` is non-empty. `Promise.allSettled` them; map each rejection through `NotificationUtil.toStepFailure`.
    - Return `INotificationStepResult`.
5. A new concern gets its own domain, provided and exported by `notification.domain.module.ts`.

Every channel job takes `jobId` from `NotificationStepJobIdPattern` (`{notificationId}-{step}`, `notification.constant.ts:53`) through `fillPattern`, beside its `deduplication`.

## 6. Email channel

1. `NotificationEmailQueue.send<Kind>` (`src/modules/notification/queues/notification.email.queue.ts:795-833`): forward the ciphertext unchanged; `jobId` with `EnumNotificationStep.sendEmail`. The unregistered variant writes no row and seals the address and link to the invite reference (`sendWorkspaceInviteUnregistered`, `:836-884`).
2. `NotificationEmailProcessor.handle` case (`src/modules/notification/processors/notification.email.processor.ts:176-183`); `HelperDecryptFailedException` already maps to `UnrecoverableError` (`:228-230`).
3. `NotificationEmailProcessorService.process<Kind>` (`src/modules/notification/services/notification.email.processor.service.ts:203-214`).
4. `NotificationEmail<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.email.workspace.domain.ts:67`): decrypt `encryptedEmail` and the secret against `userId` immediately before `awsSESService.send({ templateName: EnumNotificationProcess.<kind>, recipients: [email], sender: this.noreplyEmail, templateData: { ...this.defaultTemplateData, … } })`; the plaintext goes into `templateData` only.
5. Template: `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`, Handlebars, placeholders named as in `templateData`.
6. Template domain: `emailImport<Kind>`, `emailGet<Kind>`, `emailDelete<Kind>` on `NotificationTemplate<Concern>Domain` (`src/modules/notification/domains/notification.template.workspace.domain.ts:17-70`); `emailImport<Kind>` reads `join(import.meta.dirname, '../templates', '<file>.hbs')`, which `nest-cli.json` `assets` copies beside the build.
7. Seed entry: in `src/migration/seeds/migration.template-notification.seed.ts`, add the get call (`:50-86`) and the import branch (`:204-211`) to `seed()`, and the delete call to `remove()` (`:260-278`). The owner runs `pnpm migration templateEmailNotification --type seed`.

## 7. Push channel

1. `NotificationPushQueue.send<Kind>` (`src/modules/notification/queues/notification.push.queue.ts:265-320`): push data carries no secret; `completedSteps: []`, both token lists `null`; `jobId` with `EnumNotificationStep.sendPush`.
2. `NotificationPushProcessor.handle` case (`src/modules/notification/processors/notification.push.processor.ts:91-98`).
3. `NotificationPushProcessorService.process<Kind>` (`src/modules/notification/services/notification.push.processor.service.ts:161-180`): pass the `job.data` fields; its `recordSteps` (`:34-56`) also writes both lists.
4. `NotificationPush<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.push.workspace.domain.ts:104-227`):
    - Unset `firebaseService.isInitialized()` returns the given steps and lists.
    - Unless `updateProcessAt` is done, mark the push delivery processed.
    - Unless `sendMulticast` is done, `sendMulticastStep` (`:53-102`) decrypts `encryptedPendingTokens` when set, else `send.encryptedNotificationTokens`, against `userId`, calls `FirebaseService.sendMulticast`, and maps `failureTokens` (merged with earlier ones) and `retryTokens` back to ciphertext as `encryptedFailureTokens` and `encryptedPendingTokens`.
    - Any token pending fails `sendMulticast`: return at once with both lists, so the retry sends only to pending tokens and `sentAt` stays unset.
    - Nothing pending: mark `sendMulticast` done, then run `cleanupTokens` (`NotificationPushQueue.sendCleanupTokens`, `notification.push.queue.ts:458-486`, with the encrypted failure tokens) and `updateSentAt` in `Promise.allSettled`, skipping completed steps.
    - Return `INotificationPushStepResult`.

## 8. Verify

```bash
pnpm test notification
pnpm build
timeout 90 node --import ./dist/instrument.js dist/main.js > /tmp/ack-boot.log 2>&1; grep -n 'App Name:' /tmp/ack-boot.log   # three workers register
```

Read the build and boot as `add-queue.md`, Verify, says; the module line is `NotificationProcessorModule dependencies initialized`.

Specs: each queue class method asserts job name, payload with every encrypted field (the recipient's included) and generated id, and options with `jobId` and `deduplication`; each domain asserts the rows, the fan-out, the empty-channel skip, a skipped completed step, and a failed step in the result; each push domain asserts a pending token keeps `sendMulticast` failed and `sentAt` unset; each processor service asserts `job.updateData` and the `QueueException`; processors are excluded from coverage. Renames: `.claude/rules/queue.md`, Processors.
