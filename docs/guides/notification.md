---
title: Notification Guide
description: Add a notification kind with its contract row, messages, context type, producer, and email template.
---

# Notification Guide

This guide shows how to add a notification kind that a use case or service produces, for a developer who knows how the outbox and the notification queues work. `workspaceInvite` is the reference kind.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Notification][ref-doc-concept-notification]: the recipient, the steps, and the channels a kind goes through
- [Queue][ref-doc-concept-queue]: the outbox row a producer adds
- [Notification Reference][ref-doc-reference-notification]: the existing kinds, types, channels, and templates
- [Queue Reference][ref-doc-reference-queue]: the job id pattern of each kind
- [Email Template Guide][ref-doc-guide-email-template]: edit a template and sync it to SES
- [I18n Guide][ref-doc-guide-i18n]: the message files

## Prerequisites

- The write that causes the notification already exists in a use case or a service. The use case opens the transaction an outbox row needs, and a write that runs without one gets one in its use case ([Queue Guide][ref-doc-guide-queue]).
- The kind needs an email, a push, or an in-app record. A kind that needs none of them is a plain activity entry ([Activity Log Guide][ref-doc-guide-activity-log]).

## Steps

1. Write the specs first: the `notify` case in `test/unit/modules/notification/queues/notification.queue.spec.ts` and the producer's spec asserting the effect added on `tx`. They fail until the steps below are done.

2. Name the kind. Add one member to `EnumNotificationKind` in `src/modules/notification/enums/notification.enum.ts`.

3. Add the contract row to `NotificationKindContract` in `src/modules/notification/contracts/notification.kind.contract.ts`. This is the `workspaceInvite` row:

    ```typescript
    [EnumNotificationKind.workspaceInvite]: {
        type: EnumNotificationType.userActivity,
        priority: EnumNotificationPriority.normal,
        isMandatory: false,
        title: 'notification.notify.workspaceInvite.title',
        body: 'notification.notify.workspaceInvite.body',
        pendingChannels: [
            EnumNotificationChannel.email,
            EnumNotificationChannel.push,
        ],
        deliveredChannels: [
            EnumNotificationChannel.silent,
            EnumNotificationChannel.inApp,
        ],
        queuePriority: EnumQueuePriority.medium,
        secrets: ['inviteAcceptLink'],
        keyPattern: EnumNotificationKeyPattern.referencePattern,
        metadataFields: ['workspaceId', 'workspaceName', 'inviterName'],
        templateFields: [
            'workspaceName',
            'inviterName',
            'workspaceMemberRole',
            'inviteAcceptLink',
            'reference',
            'expiredAt',
        ],
        dateFields: ['expiredAt'],
    },
    ```

    - `type` and `priority` are the Prisma enums, and `priority` is stored on the `Notification` row. `isMandatory: true` makes the kind ignore the user's settings.
    - `queuePriority` is the BullMQ priority of the kind's jobs (`EnumQueuePriority`), apart from `priority`, the notification's own priority.
    - `pendingChannels` are the channels a job sends. `deliveredChannels` are recorded at once and need no job.
    - `secrets` lists the context fields that are encrypted in the job. `metadataFields` are the context fields the row's metadata and the push text use. `templateFields` are the fields the SES template uses besides `username`. `dateFields` are the fields that hold an ISO date, which render as RFC 2822.
    - `keyPattern` is an `EnumNotificationKeyPattern` member (`userPattern`, `referencePattern`, `joinRequestPattern`, or `userTermPolicyPattern`) naming the business key of the job for a kind that sends once per subject: per user, per reference, per join request, or per term policy. A kind that may repeat for one subject sets `null`, and the outbox row's id becomes the key.

4. Add the messages. Add `notify.<kind>.title` and `notify.<kind>.body` to `src/languages/en/notification.json`. The title and body placeholders are `metadataFields` and `username`; the `processResult` title is `{title}`. A type a user may toggle is listed in `NotificationSettingContract` (`src/modules/notification/contracts/notification.setting.contract.ts`).

5. Add the context type. Declare `INotification<Kind>Context` in `src/modules/notification/interfaces/notification.interface.ts`, then map the kind in `INotificationContextMap`. The context holds `userId`, `proceedBy`, and the kind's metadata and template fields, dates as ISO strings. It names the recipient by `userId` and never carries the recipient's address or a device token, which the job resolves. A field that carries a token, such as `inviteAcceptLink`, is listed in `secrets`, and `notify` seals it. This is the `workspaceInvite` pair:

    ```typescript
    export interface INotificationWorkspaceInviteContext
        extends INotificationContextBase, INotificationWorkspaceInviteFields {}

    [EnumNotificationKind.workspaceInvite]: INotificationWorkspaceInviteContext;
    ```

6. Add the producer. `NotificationQueue.notify` builds the effect and adds nothing. The use case or the service that owns the write adds the effect in the transaction of that write, beside its other outbox rows, with `this.outboxService.addManyInTx(tx, [effect, ...entries])`. A caller in another module imports `NotificationModule` in its module file. This is the `workspaceInvite` effect in `src/modules/workspace/services/workspace.invite.service.ts`:

    ```typescript
    return this.notificationQueue.notify(EnumNotificationKind.workspaceInvite, {
        userId: inviteeUserId,
        proceedBy: actorId,
        ...fields,
        inviteAcceptLink: claimLink,
    });
    ```

    The producer calls nothing else: the outbox enqueues the row after the commit ([Queue][ref-doc-concept-queue]).

    - A request whose purpose is the email (a sign-up, a forgot password, an invite) calls `assertEmailDeliverable` on its own module's service as the first statement that can throw (`UserService`, `WorkspaceInviteService`, or `TermPolicyService`, and `UserImportService.assertExportByAdminDeliverable` for the export). The assert throws `AwsSesNotConfiguredException` (501) before any read while SES is unset.
    - A producer passes `snapshot` only for a flow that revokes the user's sessions in the same transaction. The use case reads the tokens with `DeviceService.getNotificationTokens` before its transaction opens, builds the snapshot with `NotificationUtil.sealSnapshot(user, tokens)`, and passes it as the context's `snapshot` field (`INotificationSnapshot`). `notify` copies it into the row ([Recipient and snapshot][ref-doc-concept-notification-recipient]).

7. Add the email template when `email` is a pending channel:
    1. Create `src/modules/notification/templates/notification.<kind-in-kebab-case>.template.hbs`. Its placeholders are the `templateFields` plus `username`.
    2. Register the kind in `NotificationTemplateService` in `src/modules/notification/services/notification.template.service.ts`: a case in `getTemplateEmail` that returns a literal English subject and the `.hbs` file. `processResult` alone takes `{{title}}`.
    3. Add the kind to the get, import, and delete lists of `src/migration/seeds/migration.template-email-notification.seed.ts`.
    4. Sync the template to SES ([Email Template Guide][ref-doc-guide-email-template]).

8. Push and in-app need no code. `NotificationPushProcessSendUseCase` builds the title and body from the contract row, and `inApp` is a delivered channel, recorded when the notification is created.

9. For a bulk email to every user, follow the `publishTermPolicy` kind instead: the owning module pages the recipients and each page adds one batch job on the `notificationEmail` queue ([Term-policy publication][ref-doc-concept-notification-publication]).

## Check the result

1. Run the type check and the unit specs of the notification module and of the producer's module:

    ```bash
    pnpm typecheck
    pnpm test notification
    pnpm test <producer-module>
    ```

    A `notify` spec asserts the queue, the name, the data with every encrypted field, the key, and the priority for the kind. A channel use case spec asserts the template data or the push properties it picks from the context.

2. Boot the application with `pnpm start:dev` and trigger the action.
3. Open BullBoard at `http://localhost:3010`. The `notification` queue shows a `notify` job. A `notificationEmail` job follows, and a `notificationPush` job when the user has a device with a live session and a push token. The jobs complete.
4. The `Notifications` collection holds the row, `NotificationDeliveries` holds one row per resolved channel, and the `Outboxes` rows reach `completed`.

## Related tasks

- [Email Template Guide][ref-doc-guide-email-template]: sync the template to SES
- [Queue Guide][ref-doc-guide-queue]: add a queue or a job to an existing queue
- [I18n Guide][ref-doc-guide-i18n]: add the messages in another language

<!-- REFERENCES -->

[ref-doc-concept-notification]: ../concepts/notification.md
[ref-doc-concept-notification-recipient]: ../concepts/notification.md#recipient-and-snapshot
[ref-doc-concept-notification-publication]: ../concepts/notification.md#term-policy-publication
[ref-doc-concept-queue]: ../concepts/queue.md#outbox-row-in-the-transaction
[ref-doc-reference-notification]: ../reference/notification.md
[ref-doc-reference-queue]: ../reference/queue.md#job-ids
[ref-doc-guide-email-template]: email-template.md
[ref-doc-guide-queue]: queue.md
[ref-doc-guide-i18n]: i18n.md
[ref-doc-guide-activity-log]: activity-log.md
