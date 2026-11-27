---
title: Notification Reference
description: Every notification kind with its type, priority, and channels, the types, priorities, and channels, the email templates with their placeholders, and the user settings.
---

# Notification Reference

This page lists the facts of the notification module, for a developer who looks up a kind, a template placeholder, or a setting.

## Table of Contents

- [Related Documents](#related-documents)
- [Types](#types)
- [Priorities](#priorities)
- [Channels](#channels)
- [Kinds](#kinds)
- [Email templates](#email-templates)
- [User settings](#user-settings)
- [Job payloads](#job-payloads)

## Related Documents

- [Notification][ref-doc-concept-notification]: how a kind becomes a recipient, a row, and a send
- [Notification Guide][ref-doc-guide-notification]: add a kind
- [Email Template Guide][ref-doc-guide-email-template]: edit a template and sync it to SES
- [Queue Reference][ref-doc-reference-queue]: the notification queues, jobs, job id patterns, and kind priorities
- [Configuration Reference][ref-doc-reference-configuration-notification]: the `notification` and `email` keys
- [Status Codes][ref-doc-reference-status-codes-notification]: the code and message of each exception named here

## Types

`EnumNotificationType` is a Prisma enum. `NotificationKindContract` gives each kind one type.

| Type | Holds |
| --- | --- |
| `userActivity` | Account and workspace events: welcome, verification, workspace invite and join request |
| `securityAlert` | Security events: password, MFA reset, login locked, new device login |
| `transactional` | System events: term policy published or accepted, process result |
| `marketing` | Promotional messages. A setting can address the type, and no kind uses it |

## Priorities

`EnumNotificationPriority` is a Prisma enum stored on the `Notification` row.

| Priority | Used by |
| --- | --- |
| `low` | No kind |
| `normal` | The welcome, workspace, term-policy, and process-result kinds, and `verifiedEmail` and `verifiedMobileNumber` |
| `high` | `verificationEmail` (a link), `verificationMobileNumber`, and `reauthenticationOtp` (a code) |
| `critical` | Every `securityAlert` kind |

The queue priority of a job is a separate value, the `queuePriority` of the kind ([Queue Reference][ref-doc-reference-queue-kinds]).

## Channels

`EnumNotificationChannel` is a Prisma enum. A `Notification` row has one `NotificationDelivery` row per resolved channel.

| Channel | Delivery | `processedAt` and `sentAt` |
| --- | --- | --- |
| `email` | SES, through the `notificationEmail` queue | `processedAt` before the send, `sentAt` after it |
| `push` | Firebase, through the `notificationPush` queue | `processedAt` before the first send, `sentAt` once no token awaits a retry. `failureTokenCount` stores the number of tokens Firebase rejected as invalid; the email and sms stamps write 0 |
| `sms` | A stub adapter with no provider, through the `notificationSms` queue: it logs the kind and the masked number and sends nothing | `processedAt` before the adapter call, `sentAt` after it, as for email |
| `inApp` | The in-app list of the user | Both stamped at creation |
| `silent` | No external delivery: the record only | Both stamped at creation |

## Kinds

`NotificationKindContract` holds one entry per `EnumNotificationKind`. A mandatory kind ignores the user's settings. A pending channel is one a job sends, and a delivered channel is recorded at creation. A kind whose type is `securityAlert` or `transactional` keeps every channel whatever its Mandatory value, because `NotificationSettingContract` lists neither type.

| Kind | Type | Priority | Pending channels | Delivered channels | Mandatory |
| --- | --- | --- | --- | --- | --- |
| `welcome` | `userActivity` | `normal` | email | silent, inApp | no |
| `welcomeSocial` | `userActivity` | `normal` | email | silent, inApp | no |
| `welcomeByAdmin` | `userActivity` | `normal` | email | silent, inApp | no |
| `verificationEmail` | `userActivity` | `high` | email | silent | yes |
| `verificationMobileNumber` | `userActivity` | `high` | sms | silent | yes |
| `reauthenticationOtp` | `userActivity` | `high` | email | silent | yes |
| `verifiedEmail` | `userActivity` | `normal` | email | silent | no |
| `verifiedMobileNumber` | `userActivity` | `normal` | email | silent | no |
| `temporaryPasswordByAdmin` | `securityAlert` | `critical` | email, push | silent | yes |
| `changePassword` | `securityAlert` | `critical` | email | silent | no |
| `forgotPassword` | `securityAlert` | `critical` | email, push | silent | no |
| `resetPassword` | `securityAlert` | `critical` | email, push | silent | yes |
| `resetMfaByAdmin` | `securityAlert` | `critical` | email, push | silent | yes |
| `loginLocked` | `securityAlert` | `critical` | email | silent | yes |
| `newDeviceLogin` | `securityAlert` | `critical` | email, push | silent | no |
| `publishTermPolicy` | `transactional` | `normal` | email | silent | no |
| `userAcceptTermPolicy` | `transactional` | `normal` | none | silent, inApp | no |
| `processResult` | `transactional` | `normal` | email | silent, inApp | no |
| `workspaceInvite` | `userActivity` | `normal` | email, push | silent, inApp | no |
| `workspaceJoinRequest` | `userActivity` | `normal` | email, push | silent, inApp | no |
| `workspaceJoinAccepted` | `userActivity` | `normal` | email, push | silent, inApp | no |
| `workspaceJoinRejected` | `userActivity` | `normal` | email, push | silent, inApp | no |

- A kind whose channels hold `email` sends the SES template of its name. `verificationMobileNumber` sends SMS and has no template. `userAcceptTermPolicy` has no pending channel and no template.
- The invite to an address with no account is not a kind of its own: it sends the `workspaceInvite` template through `NotificationEmailQueue.notifyUnregisteredInvite`.

## Email templates

A template file is `src/modules/notification/templates/notification.<kind-in-kebab-case>.template.hbs`, and the SES template name is the kind. Every email also receives `homeName`, `supportEmail`, and `homeUrl`. `secrets` are the context fields of the kind sealed as `encrypted<Field>` in the job payload and in `Notification.metadata`. The sealed column lists them, and the job opens them before it builds the template data.

| Kind | File | Subject | Placeholders | Sealed |
| --- | --- | --- | --- | --- |
| `welcome` | `notification.welcome.template.hbs` | `Welcome` | none | none |
| `welcomeSocial` | `notification.welcome-social.template.hbs` | `Welcome Social` | none | none |
| `welcomeByAdmin` | `notification.welcome-by-admin.template.hbs` | `Welcome By Admin` | `password`, `passwordExpiredAt`, `passwordCreatedAt` | `password` |
| `verificationEmail` | `notification.verification-email.template.hbs` | `Email Verification` | `link`, `reference`, `expiredAt`, `expiredInMinutes` | `link` |
| `reauthenticationOtp` | `notification.reauthentication-otp.template.hbs` | `Confirmation Code` | `otp`, `action`, `expiredInMinutes` | `otp` |
| `verifiedEmail` | `notification.verified-email.template.hbs` | `Email Verified` | `reference` | none |
| `verifiedMobileNumber` | `notification.verified-mobile-number.template.hbs` | `Mobile Number Verified` | `reference`, `mobileNumber` | `mobileNumber` |
| `temporaryPasswordByAdmin` | `notification.temporary-password-by-admin.template.hbs` | `Temporary Password By Admin` | `password`, `passwordExpiredAt`, `passwordCreatedAt` | `password` |
| `changePassword` | `notification.change-password.template.hbs` | `Change Password` | none | none |
| `forgotPassword` | `notification.forgot-password.template.hbs` | `Forgot Password` | `link`, `reference`, `expiredAt`, `expiredInMinutes` | `link` |
| `resetPassword` | `notification.reset-password.template.hbs` | `Reset Password` | none | none |
| `resetMfaByAdmin` | `notification.reset-mfa-by-admin.template.hbs` | `Reset Two Factor By Admin` | none | none |
| `loginLocked` | `notification.login-locked.template.hbs` | `Login Locked` | `methodLabel`, `lockedUntil` | none |
| `newDeviceLogin` | `notification.new-device-login.template.hbs` | `Device Login` | `loginFrom`, `loginWith`, `loginAt`, `browser`, `deviceDetail`, `os`, `ipAddress` | none |
| `publishTermPolicy` | `notification.publish-term-policy.template.hbs` | `Publish Term Policy` | `type`, `version` | none |
| `processResult` | `notification.process-result.template.hbs` | `{{title}}` | `status`, `statusColor`, `title`, `description`, `link`, `linkExpiredAt` | `link` |
| `workspaceInvite` | `notification.workspace-invite.template.hbs` | `Workspace Invitation` | `workspaceName`, `inviterName`, `workspaceMemberRole`, `inviteAcceptLink`, `reference`, `expiredAt` | `inviteAcceptLink` |
| `workspaceJoinRequest` | `notification.workspace-join-request.template.hbs` | `New Workspace Join Request` | `workspaceName`, `requesterName`, `joinRequestReviewLink` | `joinRequestReviewLink` |
| `workspaceJoinAccepted` | `notification.workspace-join-accepted.template.hbs` | `Workspace Join Request Accepted` | `workspaceName` | none |
| `workspaceJoinRejected` | `notification.workspace-join-rejected.template.hbs` | `Workspace Join Request Rejected` | `workspaceName`, `rejectReasonLabel` | none |

- Every template also receives `username`: the recipient's username, and the invitee's address for an invite to an address with no account.
- Every date placeholder in the table is in its kind's `dateFields` and arrives formatted to RFC 2822: `passwordExpiredAt` and `passwordCreatedAt` for `welcomeByAdmin` and `temporaryPasswordByAdmin`, `expiredAt` for `verificationEmail`, `forgotPassword`, and `workspaceInvite`, `lockedUntil` for `loginLocked`, `loginAt` for `newDeviceLogin`, and `linkExpiredAt` for `processResult`.
- The publication email carries `type` and `version` as template data of one bulk send, and `username` per recipient.

## User settings

A user holds one `NotificationUserSetting` row for every channel and type pair (5 channels by 4 types), with `isActive` `true`, created with the user. `NotificationSettingContract` lists the pairs a user may toggle:

| Type           | Channels to switch       |
| -------------- | ------------------------ |
| `userActivity` | `email`, `inApp`, `push` |
| `marketing`    | `email`, `push`          |

- The settings list returns only the pairs the contract lists.
- An update names a type and a channel and sets `isActive`. A type outside the contract answers `NotificationInvalidTypeException`, a channel outside its type `NotificationInvalidChannelException`, and a pair with no stored row `NotificationSettingInvalidException`.
- Disabling `inApp` for a type gives later notifications of that type no `inApp` delivery row and hides the type's earlier notifications from the list.
- A mandatory kind, and a kind whose type the contract does not list, ignore the settings. A pair the contract does not list is not switchable: every `sms` pair, `marketing` with `inApp`, every `securityAlert` and `transactional` pair, and `silent`.

## Job payloads

A job carries `{ outboxId }` and the outbox row keeps the payload. Every field named `encrypted<Field>` is sealed ([Payload encryption][ref-doc-concept-notification-encryption]). A queue's jobs, job ids, and options are in the [Queue Reference][ref-doc-reference-queue].

- `notify` on the `notification` queue: `kind`, `context` (the kind's fields with its secrets sealed, plus `userId`, `proceedBy`, `snapshot`, and `verificationId`), `recipient` (`null` until the use case records it), and `notificationId` (`null` until then).
- `send` on the `notificationEmail` queue: `kind`, `notificationId`, `userId`, `username`, `encryptedEmail`, `context`, and `completedSteps`.
- `send` on the `notificationSms` queue: `kind`, `notificationId`, `userId`, `username`, `encryptedMobileNumber`, `context`, and `completedSteps`.
- `send` on the `notificationPush` queue: `kind`, `notificationId`, `userId`, `username`, `encryptedTokens`, `context`, `completedSteps`, `encryptedPendingTokens`, and `encryptedFailureTokens`.
- `sendUnregistered` on the `notificationEmail` queue: `encryptedEmail` and `context`, whose `reference` is the invite reference and whose other fields are sealed.
- `publishTermPolicy` on the `notificationEmail` queue: `data` (`termPolicyId`, `type`, `version`, `recipientCutoffAt`, and `resendNonce`), `batchId`, `proceedBy`, and `recipients`, each with `userId`, `notificationId`, `encryptedEmail`, and `username`.

<!-- REFERENCES -->

[ref-doc-concept-notification]: ../concepts/notification.md
[ref-doc-concept-notification-encryption]: ../concepts/notification.md#payload-encryption
[ref-doc-guide-notification]: ../guides/notification.md
[ref-doc-guide-email-template]: ../guides/email-template.md
[ref-doc-reference-queue]: queue.md
[ref-doc-reference-queue-kinds]: queue.md#jobs
[ref-doc-reference-configuration-notification]: configuration.md#notification
[ref-doc-reference-status-codes-notification]: status-codes.md#notification
