# Add a notification

Invariants: `.claude/rules/queue.md` (Notifications). Queue mechanics:
`.claude/skills/ack-build/references/add-queue.md`.
Reference: the `workspaceInvite` kind, traced below. The caller is a feature domain that
injects `NotificationQueue` (exported by the `@Global()` `NotificationDomainModule`) and
calls `send<Kind>` with plaintext values; the main processor writes the `Notification` row
and fans out to `NotificationEmailQueue` and `NotificationPushQueue`; each channel
processor sends. A controller or HTTP service never enqueues.

## 1. Name the kind

One camelCase name in `src/modules/notification/enums/notification.enum.ts`:
`EnumNotificationKind` (`:48-67`, the stored kind), `EnumNotificationProcess` (`:5-25`,
the job name on the main and email queues), and `EnumNotificationPushProcess` (`:31-42`)
when the kind has a push channel.

## 2. Contract and messages

- Add the row to `NotificationKindContract`
  (`src/modules/notification/contracts/notification.kind.contract.ts:153-165`): `type`
  and `priority` from the Prisma enums, `title` and `body` i18n paths, `pendingChannels`
  (what the fan-out sends), `deliveredChannels` (what the row records at once).
- Add `notify.<kind>.title` and `notify.<kind>.body` to
  `src/languages/<lang>/notification.json` in every language directory; placeholders are
  `{username}`-style and match the metadata the domain writes.
- A type a user may toggle is listed in `NotificationSettingContract`
  (`src/modules/notification/contracts/notification.setting.contract.ts:11-24`).

## 3. Payload shapes

In `src/modules/notification/interfaces/notification.interface.ts`, after `:119-145`:
`INotification<Kind>Payload` (plain data, secret in plaintext),
`INotification<Kind>EncryptedPayload` (the secret replaced by `encrypted<Field>`; this
rides in `job.data`), `INotification<Kind>PushPayload` (the plain data minus every secret).

Envelopes stay as they are: `INotificationQueuePayload<T>` (`:182-186`),
`INotificationEmailQueuePayload<T>` (`:216-219`), `INotificationPushQueuePayload<T>`
(`:195-198`), and the bulk and unregistered variants.

## 4. Main queue and fan-out

1. `NotificationQueue.send<Kind>` (`src/modules/notification/queues/notification.queue.ts:
   437-468`): encrypt the secret with `encryptValue` (`:55-62`), build
   `INotificationQueuePayload`, `add` with `priority` and a `deduplication` id that names
   one logical send, with `notification.dedupTtlInMs`. `workspaceInvite` dedups on
   `<process>-<reference>` (`:463`); a once-per-user kind dedups on `<process>-<userId>`.
2. `NotificationProcessor.handle` case
   (`src/modules/notification/processors/notification.processor.ts:155-162`).
3. `NotificationProcessorService.process<Kind>`
   (`src/modules/notification/services/notification.processor.service.ts:208-220`) calls
   the concern domain.
4. `Notification<Concern>Domain.process<Kind>`
   (`src/modules/notification/domains/notification.workspace.domain.ts:31-100`): load the
   user and devices, return a no-op message when the user is gone, create the row with
   `notificationRepository.create(EnumNotificationKind.<kind>, …)` and the metadata the
   i18n body needs, enqueue the email, enqueue the push only when devices carry tokens,
   `Promise.allSettled` the lot. A new concern gets its own domain, provided and exported
   by `notification.domain.module.ts`.

## 5. Email channel

1. `NotificationEmailQueue.send<Kind>`
   (`src/modules/notification/queues/notification.email.queue.ts:518-539`): forward the
   ciphertext unchanged. An invitee with no account uses the unregistered variant and
   encrypts against the invite reference (`:542-576`).
2. `NotificationEmailProcessor.handle` case
   (`src/modules/notification/processors/notification.email.processor.ts:173-180`);
   `HelperDecryptFailedException` already maps to `UnrecoverableError` (`:224-230`).
3. `NotificationEmailProcessorService.process<Kind>`
   (`src/modules/notification/services/notification.email.processor.service.ts:200-211`).
4. `NotificationEmail<Concern>Domain.process<Kind>`
   (`src/modules/notification/domains/notification.email.workspace.domain.ts:56-95`):
   decrypt immediately before `awsSESService.send({ templateName:
   EnumNotificationProcess.<kind>, templateData })` (`:77-92`); the plaintext goes into
   `templateData` only.
5. Template: `src/modules/notification/templates/notification.<kind-kebab>.template.hbs`,
   Handlebars, placeholders named as in `templateData`.
6. Template domain: `emailImport<Kind>`, `emailGet<Kind>`, `emailDelete<Kind>` on
   `NotificationTemplate<Concern>Domain`
   (`src/modules/notification/domains/notification.template.workspace.domain.ts:21-72`);
   the SES template name is the `EnumNotificationProcess` member.
7. Seed entry: add the get, import, and delete calls to
   `src/migration/seeds/migration.template-notification.seed.ts:49-80` and its `remove()`.
   The owner runs `pnpm migration templateEmailNotification --type seed`.

## 6. Push channel

1. `NotificationPushQueue.send<Kind>`
   (`src/modules/notification/queues/notification.push.queue.ts:135-165`): the push
   payload carries no secret.
2. `NotificationPushProcessor.handle` case
   (`src/modules/notification/processors/notification.push.processor.ts:78-85`).
3. `NotificationPushProcessorService.process<Kind>`
   (`src/modules/notification/services/notification.push.processor.service.ts:92`).
4. `NotificationPush<Concern>Domain.process<Kind>`
   (`src/modules/notification/domains/notification.push.workspace.domain.ts:26-90`):
   check `firebaseService.isInitialized()`, `sendMulticast` to the tokens, hand failure
   tokens to the cleanup job.

## 7. Verify

```bash
pnpm typecheck
pnpm test notification
pnpm start:dev        # three workers register at boot; stop it once the routes mount
```

Specs: each queue class method asserts job name, payload with every encrypted field, and
options; each domain asserts the row, the fan-out, and the no-op branches; processors are
excluded from coverage. A renamed job name or payload field is drain-before-deploy.
