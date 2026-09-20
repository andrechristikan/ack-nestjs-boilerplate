# Email Documentation

Transactional email through AWS SES: Handlebars templates, the sync command, and how send jobs pick a template.

## Overview

Templates live as `.hbs` files under `src/modules/notification/templates/`. Four template domains import them into SES as named templates. Runtime sends go through the notification email queue and `AwsSESService`.

## Related Documents

- [Notification Documentation][ref-doc-notification] - Queues, channels, and delivery tracking
- [Third Party Integration][ref-doc-third-party] - SES credentials and no-op mode
- [Environment Documentation][ref-doc-environment] - `AWS_SES_*` and `HOME_*` / support email vars
- [Configuration Documentation][ref-doc-configuration] - Email and home config keys
- [Term Policy Documentation][ref-doc-term-policy] - Policy HTML on S3 (`templateTermPolicy`), not SES

## Table of Contents

- [Overview](#overview)
- [Related Documents](#related-documents)
- [Template System](#template-system)
- [Syncing templates to SES](#syncing-templates-to-ses)
- [Sending](#sending)

## Template System

The shipped Handlebars templates under `src/modules/notification/templates/` are plain HTML with light inline styles and no layout polish. This repo is the API backend; HTML look-and-feel is left for the integrator to edit in those `.hbs` files before or after SES sync.

Four domains own import / get / delete per template:

- `NotificationTemplateAccountDomain` - welcome and verification
- `NotificationTemplateSecurityDomain` - passwords, two-factor, new device login
- `NotificationTemplateTermPolicyDomain` - policy publication
- `NotificationTemplateWorkspaceDomain` - invite and join request

Available templates (one per `EnumNotificationProcess` that uses email):

| Template File | Process |
|---------------|---------|
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

Not part of `pnpm migration:seed` / `migration:remove`. Standalone command `templateEmailNotification` (`MigrationTemplateEmailNotificationSeed` in `MigrationModule`):

```bash
pnpm migration templateEmailNotification --type seed
pnpm migration templateEmailNotification --type remove
```

On `seed`, each owning domain's `emailImport*` runs (for example `NotificationTemplateAccountDomain.emailImportWelcome()`). On `remove`, the matching `emailDelete*` runs. The command refuses to run when SES reports itself uninitialized.

SES credentials and no-op mode: [Third Party Integration; SES][ref-doc-third-party-ses].

## Sending

`NotificationEmailProcessorService` routes each job to an email channel domain (`NotificationEmailAccountDomain`, `NotificationEmailSecurityDomain`, `NotificationEmailTermPolicyDomain`, `NotificationEmailWorkspaceDomain`). That domain calls `AwsSESService.send()` or `sendBulk()` with the named SES template and merges `defaultTemplateData` (`homeName`, `supportEmail`, `homeUrl`).

Queue names, rate limits, dedup, and payload encryption: [Notification Documentation][ref-doc-notification].


<!-- REFERENCES -->

[ref-doc-notification]: notification.md
[ref-doc-third-party]: third-party-integration.md
[ref-doc-third-party-ses]: third-party-integration.md#ses-email
[ref-doc-environment]: environment.md
[ref-doc-configuration]: configuration.md
[ref-doc-term-policy]: term-policy.md#migration--seeding
