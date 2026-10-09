# Email Documentation

Transactional email through AWS SES: Handlebars templates, the sync command, and how send jobs pick a template.

## Overview

- Templates live as `.hbs` files under `src/modules/notification/templates/`.
- Four template domains import them into SES as named templates.
- A template domain reads a file from the `templates/` folder beside `domains/`, resolved from `import.meta.dirname`, so the path holds under `src/` and under `dist/`.
- Runtime sends go through the notification email queue and `AwsSESService`.

## Related Documents

- [Notification Documentation][ref-doc-notification]: Queues, channels, and delivery tracking
- [Third Party Integration][ref-doc-third-party]: SES credentials and the unconfigured state
- [Environment Documentation][ref-doc-environment]: `AWS_SES_*` and `HOME_*` / support email vars
- [Configuration Documentation][ref-doc-configuration]: Email and home config keys
- [Term Policy Documentation][ref-doc-term-policy]: Policy HTML on S3 (`templateTermPolicy`), not SES

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Template System](#template-system)
- [Syncing templates to SES](#syncing-templates-to-ses)
- [Sending](#sending)

## Template System

The shipped Handlebars templates under `src/modules/notification/templates/` are plain HTML with light inline styles and no layout polish.

- This repo is the API backend.
- The integrator edits the HTML look-and-feel in those `.hbs` files, before or after SES sync.

Four domains own import / get / delete per template:

- `NotificationTemplateAccountDomain`: welcome and verification
- `NotificationTemplateSecurityDomain`: passwords, two-factor, new device login
- `NotificationTemplateTermPolicyDomain`: policy publication
- `NotificationTemplateWorkspaceDomain`: invite and join request

Available templates (one per `EnumNotificationProcess` that uses email):

| Template File | Process |
| --- | --- |
| `notification.welcome.template.hbs` | `welcome` |
| `notification.welcome-social.template.hbs` | `welcomeSocial` |
| `notification.welcome-by-admin.template.hbs` | `welcomeByAdmin` |
| `notification.temporary-password-by-admin.template.hbs` | `temporaryPasswordByAdmin` |
| `notification.change-password.template.hbs` | `changePassword` |
| `notification.forgot-password.template.hbs` | `forgotPassword` |
| `notification.new-device-login.template.hbs` | `newDeviceLogin` |
| `notification.reset-password.template.hbs` | `resetPassword` |
| `notification.verification-email.template.hbs` | `verificationEmail` |
| `notification.verified-email.template.hbs` | `verifiedEmail` |
| `notification.verified-mobile-number.template.hbs` | `verifiedMobileNumber` |
| `notification.reset-two-factor-by-admin.template.hbs` | `resetTwoFactorByAdmin` |
| `notification.publish-term-policy.template.hbs` | `publishTermPolicy` |
| `notification.workspace-invite.template.hbs` | `workspaceInvite`, `workspaceInviteUnregistered` |
| `notification.workspace-join-request.template.hbs` | `workspaceJoinRequest` |
| `notification.workspace-join-accepted.template.hbs` | `workspaceJoinAccepted` |
| `notification.workspace-join-rejected.template.hbs` | `workspaceJoinRejected` |

## Syncing templates to SES

The standalone command `templateEmailNotification` (`MigrationTemplateEmailNotificationSeed` in `MigrationModule`) syncs the templates. It is not part of `pnpm migration:seed` / `migration:remove`:

```bash
pnpm migration templateEmailNotification --type seed
pnpm migration templateEmailNotification --type remove
```

- On `seed`, the command reads every template from SES through the owning domain's `emailGet*`.
    - It runs `emailImport*` only for the ones missing (for example `NotificationTemplateAccountDomain.emailImportWelcome()`).
    - A template already in SES stays as it is.
- On `remove`, the matching `emailDelete*` runs for all of them.
- When SES is unconfigured, `seed` logs a warning and skips.
- A failed SES call throws, and the command exits with code `1` (see [Logger Documentation][ref-doc-logger]).

SES credentials and the unconfigured state: [Third Party Integration: SES][ref-doc-third-party-ses].

## Sending

`NotificationEmailProcessor` dispatches each job by its `EnumNotificationProcess` name to `NotificationEmailProcessorService`, which calls an email channel domain (`NotificationEmailAccountDomain`, `NotificationEmailSecurityDomain`, `NotificationEmailTermPolicyDomain`, `NotificationEmailWorkspaceDomain`). That domain:

- calls `AwsSESService.send()` (or `sendBulk()` for `publishTermPolicy`) with the SES template named after the job's `EnumNotificationProcess` value (`workspaceInviteUnregistered` sends the `workspaceInvite` template)
- sends from `EMAIL_NO_REPLY`
- merges `defaultTemplateData` (`homeName`, `supportEmail` from `EMAIL_SUPPORT`, `homeUrl`) into the template data

Send behavior:

- A job carries `cc` and `bcc` as arrays, empty when there is no copy recipient.
- The channel domain passes a non-empty list on to the send call.
- When `AWS_SES_IDENTITY_ARN` is set, both calls pass it as `SourceArn`.
- When SES is unconfigured, both calls log a warning and return an empty output.
- The job then completes and no email leaves.

Queue names, rate limits, dedup, and payload encryption: [Notification Documentation][ref-doc-notification].

<!-- REFERENCES -->

[ref-doc-notification]: notification.md
[ref-doc-third-party]: third-party-integration.md
[ref-doc-third-party-ses]: third-party-integration.md#ses-email
[ref-doc-environment]: environment.md
[ref-doc-configuration]: configuration.md
[ref-doc-logger]: logger.md#migration-command-failure
[ref-doc-term-policy]: term-policy.md#migration--seeding
