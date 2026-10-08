# Add a notification

Invariants: `.claude/rules/queue.md` (Notifications). Queue mechanics: `.claude/skills/ack-build/references/add-queue.md`. Reference: the `workspaceInvite` kind, traced below. The caller is a feature domain that injects `NotificationQueue` (exported by the `@Global()` `NotificationDomainModule`) and calls `send<Kind>` with plaintext values; the main processor writes the job's `Notification` rows and fans out to `NotificationEmailQueue` and `NotificationPushQueue`; each channel processor sends. A controller or HTTP service never enqueues.

## 1. Name the kind

One camelCase name in `src/modules/notification/enums/notification.enum.ts`: `EnumNotificationKind` (`:49-68`, the stored kind), `EnumNotificationProcess` (`:5-25`, the job name on the main and email queues), and `EnumNotificationPushProcess` (`:31-43`) when the kind has a push channel. A job's steps are `EnumNotificationStep` members (`:74-84`); a new step is a member there.

## 2. Contract and messages

- Add the row to `NotificationKindContract` (`src/modules/notification/contracts/notification.kind.contract.ts:153-166`): `type` and `priority` from the Prisma enums, `title` and `body` i18n paths, `pendingChannels` (what the fan-out sends), `deliveredChannels` (what the row records at once).
- Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/<lang>/notification.json` in every language directory; placeholders are `{username}`-style and match the metadata the domain writes.
- A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts:11-24`).

## 3. Payload shapes

In `src/modules/notification/interfaces/notification.interface.ts`, beside the workspace-invite shapes (`:140-166`): `INotification<Kind>Payload` (plain data, secret in plaintext), `INotification<Kind>EncryptedPayload` (the secret replaced by `encrypted<Field>`; this rides in `job.data`), `INotification<Kind>PushPayload` (the plain data minus every secret). A kind that writes a second row carries that row's id in its encrypted payload (`verificationNotificationId`, `:198-200`).

Envelopes and results, reused as they are:

- `INotificationQueuePayload<T>` (`:207-213`): `userId`, `notificationId`, `completedSteps: EnumNotificationStep[]`, plus `proceedBy` and `data` from the bulk envelope.
- `INotificationPushQueuePayload<T>` (`:222-227`): `send`, `data`, `completedSteps`, `failureTokens: string[] | null`.
- `INotificationEmailQueuePayload<T>` (`:243-246`), and the bulk and unregistered variants.
- `INotificationStepResult` (`:270-274`: `message`, `completedSteps`, `failedSteps`) and `INotificationPushStepResult` (`:276-278`, adds `failureTokens`).

## 4. Main queue and fan-out

1. `NotificationQueue.send<Kind>` (`src/modules/notification/queues/notification.queue.ts:581-622`): encrypt the secret with `encryptValue` (`:67-74`), generate `notificationId` with `DatabaseUtil.createId()`, plus one id per extra row (`sendWelcome`, `:128-129`), build `INotificationQueuePayload` with `completedSteps: []`, and `add` with `priority` and a `deduplication` id that names one logical send, with `notification.dedupTtlInMs`. The id is a `Notification*JobIdPattern` constant (`src/modules/notification/constants/notification.constant.ts`) filled through `HelperStringService.fillPattern`: `workspaceInvite` uses `NotificationReferenceJobIdPattern` (`notification.queue.ts:603-609`); a once-per-user kind uses `NotificationUserJobIdPattern`.
2. `NotificationProcessor.handle` case (`src/modules/notification/processors/notification.processor.ts:157-164`).
3. `NotificationProcessorService.process<Kind>` (`src/modules/notification/services/notification.processor.service.ts:309-328`): pass `notificationId` and `completedSteps` from `job.data` to the concern domain and return `recordSteps(job, result)` (`:41-61`). It calls `job.updateData({ ...job.data, completedSteps })`, then throws `QueueException(summary, true)` with `NotificationUtil.toStepSummary` when a step failed, else returns `NotificationUtil.toStepResponse(result)`.
4. `Notification<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.workspace.domain.ts:35-159`):
    - Load the user and devices; a gone user returns the given `completedSteps` and no failure.
    - Unless `createNotification` is done, write every row of the job in one `notificationRepository.createMany([{ kind: EnumNotificationKind.<kind>, payload: { id: notificationId, … } }])` with the metadata the i18n body needs (`src/modules/notification/repositories/notification.repository.ts:107-133`: creates only the missing ids, in its transaction). A failure there returns at once.
    - Start each side-effect step not in `completedSteps` (the email enqueue; the push enqueue only when devices carry tokens), `Promise.allSettled` them, and map each rejection through `NotificationUtil.toStepFailure`.
    - Return `INotificationStepResult`.
5. A new concern gets its own domain, provided and exported by `notification.domain.module.ts`.

Every channel job a step enqueues takes `jobId` from `NotificationStepJobIdPattern` (`{notificationId}-{step}`, `notification.constant.ts:53`) through `fillPattern`, beside its `deduplication` option.

## 5. Email channel

1. `NotificationEmailQueue.send<Kind>` (`src/modules/notification/queues/notification.email.queue.ts:773-811`): forward the ciphertext unchanged; `jobId` with `EnumNotificationStep.sendEmail`. An invitee with no account uses the unregistered variant, which writes no row and encrypts against the invite reference (`sendWorkspaceInviteUnregistered`, `:814-856`).
2. `NotificationEmailProcessor.handle` case (`src/modules/notification/processors/notification.email.processor.ts:173-180`); `HelperDecryptFailedException` already maps to `UnrecoverableError` (`:225-227`).
3. `NotificationEmailProcessorService.process<Kind>` (`src/modules/notification/services/notification.email.processor.service.ts:202-213`).
4. `NotificationEmail<Concern>Domain.process<Kind>` (`processWorkspaceInvite` in `src/modules/notification/domains/notification.email.workspace.domain.ts`): decrypt immediately before `awsSESService.send({ templateName: EnumNotificationProcess.<kind>, sender: this.noreplyEmail, templateData: { ...this.defaultTemplateData, … } })`; the plaintext goes into `templateData` only.
5. Template: `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`, Handlebars, placeholders named as in `templateData`.
6. Template domain: `emailImport<Kind>`, `emailGet<Kind>`, `emailDelete<Kind>` on `NotificationTemplate<Concern>Domain` (`src/modules/notification/domains/notification.template.workspace.domain.ts:17-70`); `emailImport<Kind>` reads `join(import.meta.dirname, '../templates', '<file>.hbs')`, which the `nest-cli.json` `assets` entry copies beside the build; the SES template name is the `EnumNotificationProcess` member.
7. Seed entry: in `src/migration/seeds/migration.template-notification.seed.ts`, add the get call (`:49-85`) and the import branch (`:203-210`) to `seed()`, and the delete call to `remove()` (`:257-275`). The owner runs `pnpm migration templateEmailNotification --type seed`.

## 6. Push channel

1. `NotificationPushQueue.send<Kind>` (`src/modules/notification/queues/notification.push.queue.ts:260-314`): the push payload carries no secret, `completedSteps: []`, and `failureTokens: null`; `jobId` with `EnumNotificationStep.sendPush`.
2. `NotificationPushProcessor.handle` case (`src/modules/notification/processors/notification.push.processor.ts:86-93`).
3. `NotificationPushProcessorService.process<Kind>` (`src/modules/notification/services/notification.push.processor.service.ts:153-170`): pass `completedSteps` and `failureTokens` to the domain; its `recordSteps` (`:34-55`) writes `failureTokens` into `job.updateData` too.
4. `NotificationPush<Concern>Domain.process<Kind>` (`src/modules/notification/domains/notification.push.workspace.domain.ts:30-140`): check `firebaseService.isInitialized()`, mark the push delivery processed, `sendMulticast` to the tokens unless that step is done, then run `cleanupTokens` (`sendCleanupTokens`) and `updateSentAt` in `Promise.allSettled`, skipping completed steps; return `INotificationPushStepResult` carrying the failure tokens.

## 7. Verify

```bash
pnpm typecheck
pnpm test notification
timeout 90 pnpm start:dev > /tmp/ack-boot.log 2>&1; grep -n 'App Name:' /tmp/ack-boot.log   # three workers register at boot
```

Check in the boot log for the `App Name:` block and the `NotificationProcessorModule dependencies initialized` line, BullMQ logging no line per worker; exit 124 is the expected end of the boot.

Specs: each queue class method asserts job name, payload with every encrypted field and generated id, and options with `jobId` and `deduplication`; each domain asserts the rows, the fan-out, the no-op branches, a skipped completed step, and a failed step in the result; each processor service asserts `job.updateData` and the `QueueException`; processors are excluded from coverage. Renaming a queue, a job name, or a payload field changes every producer, processor, and payload type in the same change (`.claude/rules/queue.md`, Processors).
