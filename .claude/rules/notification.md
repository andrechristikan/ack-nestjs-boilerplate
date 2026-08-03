# Notification — channels, templates, payloads

Detail in `docs/notification.md`. Processor mechanics are governed by `rules/queue.md`; this file is the notification-specific rule set. Read `rules/queue.md` first — a notification processor is a BullMQ processor and every rule there applies.

## Channels

Two delivery channels, each with its own queue, processor, and processor-service:

- **Email** — SES via `AwsSESService`. Enqueued as an email job; sent by `NotificationEmailProcessorService`.
- **Push** — Firebase via `FirebaseService`. Enqueued as a push job; sent by `NotificationPushProcessorService`.

A channel is always **async through BullMQ** — a request never sends an email or push inline. The service enqueues; the processor sends. Delivery loss of a notification is loss-tolerable, which is exactly why it rides a durable queue rather than blocking the request.

## Payload naming — kind is `Queue`, and it is LAST (HARD)

A notification job payload is a BullMQ `job.data` shape, so its interface follows the queue-payload convention (`rules/naming.md`, `rules/queue.md`): `I<Module><Action>QueuePayload`, kind word **last**.

- The kind word is **`Queue`**. `Worker`, `Job`, and `Process` are FORBIDDEN as the kind — and any kind word placed before the action is forbidden. `INotificationEmailQueuePayload`, never `INotificationEmailWorkerPayload`.
- The **inner content** payload (the channel-agnostic data a template renders) is a plain data shape and keeps a descriptive suffix: `INotificationSendPushPayload`, `INotificationEmailSendPayload`, `INotificationVerificationEmailPayload`. The queue envelope WRAPS it: `INotificationEmailQueuePayload<T>` carries a `send` plus a generic `data?: T`.
- `Bulk` is part of the action, before the kind: `INotificationEmailBulkQueuePayload`, not `...QueueBulkPayload`.
- **Renaming a payload field is drain-before-deploy** (`rules/queue.md`, `rules/naming.md`): jobs already in Redis carry the old field names and reach a processor expecting the new ones. Drain the queue first and say so in the hand-back.

## Templates

- A rendered notification (email body, term-policy document) is a **Handlebars template** (`.hbs`, `EnumFileExtensionTemplate`) rendered through the template service — never string-concatenated in a service.
- Template content is **seeded initial data** (`rules/migration.md`): the `migration.template-notification.seed.ts` / `migration.template-term-policy.seed.ts` seeds populate it. Adding a template means adding it to the seed, not hardcoding it in a processor.
- The template service resolves and renders; the processor-service calls it and hands the result to the channel client (`AwsSESService` / `FirebaseService`). A processor does not build markup.

## Layering inside the module

The notification module carries more moving parts than most; keep the roles distinct:

- **`*.util.ts`** builds the typed queue payload from caller inputs and enqueues it. This is where a caller-facing "send X" entry point lives.
- **`*.processor.ts`** is the BullMQ dispatcher — `extends QueueProcessorBase`, switches on `job.name`, returns `IQueueResponse` (`rules/queue.md`). No sending logic inline.
- **`*.processor.service.ts`** does the real work for one channel: resolve tokens/recipients, render the template, call `AwsSesService` / `FirebaseService`.
- A recipient with no token/address is a no-op the processor-service handles, not an exception — a missing push token is not a failed job.

## Security

- **A notification never carries a credential in its payload or template** (`rules/security.md`). A temporary password or verification link is the one sanctioned secret-ish value and it rides the typed payload explicitly — never logged, never placed in activity metadata.
- Push tokens are per-user data resolved at send time from the repository, not passed around in logs. The cleanup path (`INotificationPushCleanupTokenQueuePayload`) prunes dead tokens; it reads failure tokens, it does not emit them to a log.
