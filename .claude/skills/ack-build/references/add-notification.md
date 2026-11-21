# Add a notification

Invariants: `.claude/rules/notification.md`, `.claude/rules/notify.md`, `.claude/rules/effects.md`. Reference: `workspaceInvite`; a broadcast: step 7.

## 1. Name the kind

One member of `EnumNotificationKind` (`src/modules/notification/enums/notification.enum.ts`).

## 2. Contract and messages

- Add the row to `NotificationKindContract` (`src/modules/notification/contracts/notification.kind.contract.ts`, beside `workspaceInvite`): Prisma-enum `type` and `priority`, `isMandatory` (`true` ignores user settings), `title` and `body` i18n paths, `pendingChannels` (fan-out sends), `deliveredChannels` (row records at once), `metadataFields` (the context fields the row's metadata and push text use), `templateFields` (the context fields the SES template uses besides `username`), and `dateFields` (the context fields holding a date, formatted to RFC 2822 at render); `username` is added to the first two.
- Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/<lang>/notification.json` in every language, placeholders matching the row's metadata (`.claude/rules/i18n.md`).
- A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts`).

## 3. Context and key

- Add `[EnumNotificationKind.<kind>]` to `INotificationContextMap` in `src/modules/notification/interfaces/notification.interface.ts` (`.claude/rules/notify.md`).
- Pick the key in `notify` as `.claude/rules/notify.md` gives (`src/configs/notification.config.ts`); a new pattern only for a new subject shape.

## 4. Producer

1. The use case or service owning the write adds `this.notificationQueue.notify(EnumNotificationKind.<kind>, context)` as `.claude/rules/notify.md` gives: in the write's transaction, or in one holding the add alone with no write; the snapshot and the unregistered invitee included.
2. A caller in another module reaches `NotificationQueue` through `NotificationModule`, imported by its own module file (`.claude/rules/layering.md`, Levels).

## 5. Email template

1. `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`, placeholders named as the contract's `templateFields` plus `username`.
2. Register the kind in `NotificationTemplateService`: subject and the literal `../templates` filename.
3. Seed: `src/migration/seeds/migration.template-notification.seed.ts` imports, gets, and deletes the template through `NotificationTemplateService`. The owner runs `pnpm migration templateEmailNotification --type seed`.

## 6. Push

Push properties come from the contract row; `NotificationPushProcessSendUseCase` sends them. No other push code is per kind.

## 7. Broadcast kind

A bulk email follows `publishTermPolicy` (`.claude/rules/notification.md`, Term-policy publish):

1. `TermPolicyPublishByAdminUseCase`'s transaction adds the publish effect through `TermPolicyService.publishByAdminInTx`; the resend adds `TermPolicyQueue.resendPublishEffect` with a fresh nonce through `addManyInTx`, in a transaction its use case opens for it alone. Both add the `publish` job on the owning module's queue.
2. `TermPolicyProcessPublishUseCase` (`src/modules/term-policy/use-cases/term-policy.process-publish.use-case.ts`) pages active recipients up to the bound (`UserService.getListActiveRecipientCursor`, `email.batchSize` per page) and passes each page to `TermPolicyRecipientService`; `UserService.getManyActiveRecipientsByIds` fills a pending batch's off-page recipients.
3. Markers and batches: the use case opens one transaction per page over `TermPolicyRecipientService.sendPendingBatchesInTx`, then the fresh batch: `NotificationService.createManyInTx`, `TermPolicyRecipientService.createManyInTx` under a batch id, and the batch row from `NotificationEmailQueue.emailPublishTermPolicyEffect`. A page with neither opens none. A pending batch is re-added with only its sendable rows (`TermPolicyRecipientSendWhere`).
4. Send: `NotificationEmailProcessPublishTermPolicyUseCase` (`src/modules/notification/use-cases/notification.email.process-publish-term-policy.use-case.ts`) claims through the owning module's service, sends in bulk through `NotificationEmailDeliveryService.sendPublishTermPolicy`, and marks each success sent.

## 8. Verify

```bash
pnpm test notification
pnpm typecheck
```

Boot and read it per `add-queue.md`, Verify; module line: `NotificationUseCaseModule dependencies initialized`.

Specs:

- `notify` asserts the queue, the name, the data with every encrypted field, the key, and the priority for the kind.
- `NotificationProcessUseCase` asserts the resolve and its record, the reuse on a later attempt, the skip with `snapshot`, the row, and a channel row per allowed channel.
- A channel use case asserts the template data or push properties it picks from the context by the kind's field lists.
- A producer asserts the effect added on its `tx`.
