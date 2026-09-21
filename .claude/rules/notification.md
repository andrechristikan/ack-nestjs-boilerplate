# Notification — channels, templates, payloads

Processor mechanics are `rules/queue.md` — read that first. This file is the
notification-specific rule set. Flow narrative: `docs/notification.md` — explorer or
planner.

## Channels

Two delivery channels, each with its own queue, processor, and processor-service:

- **Email** — SES via `AwsSESService`. Enqueued as an email job; sent by `NotificationEmailProcessorService`.
- **Push** — Firebase via `FirebaseService`. Enqueued as a push job; sent by `NotificationPushProcessorService`.

A channel is always **async through BullMQ** — a request never sends an email or push inline. The domain decides and calls the queue class, the queue class enqueues, and the processor sends. Delivery loss of a notification is loss-tolerable, which is exactly why it rides a durable queue rather than blocking the request.

## Payload naming — kind is `Queue`, and it is LAST (HARD)

A notification job payload is a BullMQ `job.data` shape, so its interface follows the queue-payload convention (`rules/naming.md`, `rules/queue.md`): `I<Module><Action>QueuePayload`, kind word **last**.

- The kind word is **`Queue`**. `Worker`, `Job`, and `Process` are FORBIDDEN as the kind — and any kind word placed before the action is forbidden. `INotificationEmailQueuePayload`, never `INotificationEmailWorkerPayload`.
- The **inner content** payload (the channel-agnostic data a template renders) is a plain data shape and keeps a descriptive suffix: `INotificationSendPushPayload`, `INotificationEmailSendPayload`, `INotificationVerificationEmailPayload`. The queue envelope WRAPS it: `INotificationEmailQueuePayload<T>` carries a `send` plus a generic `data?: T`.
- `Bulk` is part of the action, before the kind: `INotificationEmailBulkQueuePayload`, not `...QueueBulkPayload`.
- **Renaming a payload field is drain-before-deploy** (`rules/queue.md`, `rules/naming.md`): jobs already in Redis carry the old field names and reach a processor expecting the new ones. Drain the queue first and say so in the hand-back.

## Templates

- An email body is an **SES template**: a Handlebars file (`.hbs`) under
  `src/modules/notification/templates/`, uploaded to SES by the
  `NotificationTemplate<Concern>Domain` classes through `AwsSESService.createTemplate`. A send
  names the template and passes `templateData`; no service builds markup or concatenates a body.
- Uploading is seeded initial data (`rules/seeding.md`): `migration.template-notification.seed.ts`
  and `migration.template-term-policy.seed.ts` call those domains. Adding a template means
  adding the file and its seed entry, not hardcoding it in a sender.

## Layering inside the module

The notification module carries more moving parts than most; keep the roles distinct:

- **`*.queue.ts`** builds the typed queue payload from caller inputs, encrypts its sensitive
  fields, and enqueues it — `NotificationQueue`, `NotificationEmailQueue`,
  `NotificationPushQueue`, one per queue in `queues/`. This is where a caller-facing "send X"
  entry point lives, and `NotificationDomainModule` exports all three so a caller injects the
  class directly (`rules/queue.md`).
- **`*.processor.ts`** is the BullMQ dispatcher — `extends QueueProcessorBase`, switches on
  `job.name`, returns `IQueueResponse` (`rules/queue.md`). No sending logic inline.
- **`*.processor.service.ts`** translates the job for one queue and calls the domain that owns
  the work.
- **Domains** decide and send: `Notification<Concern>Domain` writes the `Notification` row and
  fans out to the channel queues; `NotificationEmail<Concern>Domain` sends through
  `AwsSESService`; `NotificationPush<Concern>Domain` sends through `FirebaseService`.
- A recipient with no token/address is a no-op the sender handles, not an exception — a
  missing push token is not a failed job.

## Security

- **A secret in a notification payload is encrypted by the queue class** (`rules/queue.md`):
  a generated password, and a verification, reset, invite-accept, sign-up or join-request
  review link. The producer passes plaintext to the queue class; the field in the job is named
  `encrypted<Field>` (`encryptedPassword`, `encryptedLink`, `encryptedInviteAcceptLink`,
  `encryptedJoinRequestReviewLink`). Encryption uses the app root secret,
  `NotificationPayloadEncryptionPurpose`, and the recipient user id as context — the invite
  reference for an invitee with no account (`rules/security.md`).
- **The main queue forwards ciphertext unchanged**; only the email domain that renders the value
  decrypts it, immediately before the SES call. The decrypted value goes into `templateData` and
  nowhere else — never a log, never activity metadata, never a job return value.
- **A push job carries no secret.** Its payload is built field by field from the non-secret
  data (dates, names).
- **A payload that fails to decrypt is unrecoverable**: `NotificationEmailProcessor` rethrows
  `HelperDecryptFailedException` as BullMQ's `UnrecoverableError`, so it is not retried.
- Push tokens are per-user data resolved at send time from the repository, not passed around in
  logs. The cleanup path (`INotificationPushCleanupTokenQueuePayload`) prunes dead tokens; it
  reads failure tokens, it does not emit them to a log.
