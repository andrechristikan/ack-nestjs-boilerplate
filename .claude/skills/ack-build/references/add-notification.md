# Add a notification

Invariants: `.claude/rules/notification.md`, `.claude/rules/outbox.md`. Reference: `workspaceInvite`; a broadcast: step 7. A kind adds no queue method, process, step, service, or use case.

## 1. Name the kind

One camelCase member of `EnumNotificationKind` (`src/modules/notification/enums/notification.enum.ts`).

## 2. Contract and messages

- Add the row to `NotificationKindContract` (`src/modules/notification/contracts/notification.kind.contract.ts`, beside `workspaceInvite`): Prisma-enum `type` and `priority`, `isMandatory` (`true` ignores user settings), `title` and `body` i18n paths, `pendingChannels` (fan-out sends), `deliveredChannels` (row records at once), `metadataFields` (the context fields the row's metadata and push text use), `templateFields` (the context fields the SES template uses besides `username`), and `dateFields` (the context fields holding a date, formatted to RFC 2822 at render); `username` is added to the first two.
- Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/<lang>/notification.json` in every language, placeholders matching the row's metadata (`.claude/rules/i18n.md`).
- A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts`).

## 3. Context and key

- Add `[EnumNotificationKind.<kind>]` to `INotificationContextMap` in `src/modules/notification/interfaces/notification.interface.ts`: the subject's ids and the template values. A date is ISO. A secret is sealed by `notify` as `encrypted<Field>`.
- Pick the key in `notify`: an existing `notification.idempotencyKey.<name>Pattern` (`src/configs/notification.config.ts`) for a kind sent once per subject, a new pattern only for a new subject shape, `null` for a kind that repeats for one subject.

## 4. Producer

1. The use case or service owning the write adds `this.notificationService.notify(EnumNotificationKind.<kind>, context)` with `OutboxService.addInTx(tx, ...)` inside the transaction it opened through `OutboxService.withTransaction`, or with `OutboxService.add(...)` when it writes nothing.
2. A kind sent after a credential reset reads `NotificationService.getSnapshot(user)` inside the same callback, before the revoke, and passes it as `context.snapshot`.
3. An invitee with no account: `notifyUnregisteredInvite(email, payload)` in the same place.
4. A caller in another module reaches `NotificationService` through `NotificationModule`, imported by its own module file (`.claude/rules/layering.md`, Dependency order).

## 5. Email template

1. `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`, placeholders named as the contract's `templateFields` plus `username`.
2. Register the kind in `NotificationTemplateService`: subject and the literal `../templates` filename.
3. Seed: `src/migration/seeds/migration.template-notification.seed.ts` imports, gets, and deletes the template through `NotificationTemplateService`. The owner runs `pnpm migration templateEmailNotification --type seed`.

## 6. Push

Push properties come from the contract row; `NotificationPushProcessSendUseCase` sends them. No other push code is per kind.

## 7. Broadcast kind

A bulk email follows `publishTermPolicy` (`.claude/rules/notification.md`, Term-policy publish):

1. The publishing transaction adds the publish effect; the resend adds its own with a fresh nonce through `OutboxService.add`.
2. `NotificationProcessPublishTermPolicyUseCase` (`src/modules/notification/use-cases/notification.process-publish-term-policy.use-case.ts`) pages active recipients up to the bound (`UserService.getListActiveRecipientCursor`, `email.batchSize` per page) and passes each page to `NotificationTermPolicyService`; `UserService.getManyActiveRecipientsByIds` fills a pending batch's off-page recipients.
3. Markers and batches: `NotificationRepository.createTermPolicyRecipientsInTx`, one transaction per batch, its batch row added on the same `tx`; a pending batch is re-added with only its sendable rows (`NotificationTermPolicyRecipientSendWhere`).
4. Send: `NotificationEmailTermPolicyService.processPublishTermPolicy` (`src/modules/notification/services/notification.email.term-policy.service.ts`) claims, sends in bulk, and marks each success sent.

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
