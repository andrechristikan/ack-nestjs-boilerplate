---
title: Email Template Guide
description: Edit a Handlebars email template and sync it to SES.
---

# Email Template Guide

This guide shows how to change the look or the subject of a transactional email and push the change to SES, for a developer who customizes the HTML of the shipped templates.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Notification][ref-doc-concept-notification-email]: how the email channel picks a template and sends it
- [Notification Reference][ref-doc-reference-notification-templates]: every template file and the kind it serves
- [Seed Guide][ref-doc-guide-seed]: how the seed commands run
- [Dependencies][ref-doc-concept-dependencies]: the SES adapter and the answer while it is unset
- [Configuration Reference][ref-doc-reference-configuration-integrations]: the variables that turn SES on

## Prerequisites

- SES is configured: `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, `AWS_SES_REGION`, `EMAIL_NO_REPLY_ADDRESS`, and `EMAIL_SUPPORT_ADDRESS` are set ([Configuration Reference][ref-doc-reference-configuration-integrations]).
- The seed commands are built: `pnpm migration:build`.
- The template belongs to an existing kind. A new kind brings its own template ([Notification Guide][ref-doc-guide-notification]).

## Steps

1. Edit the template file in `src/modules/notification/templates/`. The file is named `notification.<kind-in-kebab-case>.template.hbs` (`notification.workspace-invite.template.hbs`), and the SES template name is the kind's `EnumNotificationKind` value in camelCase (`workspaceInvite`). The kind's row is `NotificationKindContract` in `src/modules/notification/contracts/notification.kind.contract.ts`.
    - A placeholder is a `templateFields` entry of the kind's row in `NotificationKindContract`, or `username`. A date field is already formatted for display.
    - Every email also receives `homeName`, `supportEmail`, and `homeUrl`.
    - The `processResult` template also receives `statusColor`.

2. To change the subject, edit the case of the kind in `getTemplateEmail` in `src/modules/notification/services/notification.template.service.ts`. The subject is a literal English string there (`processResult` alone takes `{{title}}`). The service reads the file from the `templates/` folder beside `services/`, resolved from `import.meta.dirname`, so the path holds under `src/` and under `dist/`.

3. Build the seed commands again, because they run from `dist/`:

    ```bash
    pnpm migration:build
    ```

4. Sync the templates. The sync stores each subject and HTML in SES, and the running application sends by template name, so a change reaches the next send with no restart and no rebuild of the application.
    - To import a template SES does not hold yet (a new kind), run `seed` alone. It reads each template from SES, imports only the missing ones, and logs `<Label> Email template missing, importing...` for each one it imports, which is how you tell which templates SES lacked:

        ```bash
        pnpm migration templateEmailNotification --type seed
        ```

    - To change a template SES already holds, take the replace path. `remove` deletes every template the command manages (all 20 kinds, not only the edited one), then `seed` imports them again. Run the two commands back to back, because a send in the gap fails: SES rejects the unknown template as a client fault, the email job throws and retries with its backoff, and the outbox row fails once the attempts run out:

        ```bash
        pnpm migration templateEmailNotification --type remove
        pnpm migration templateEmailNotification --type seed
        ```

    - If `remove` succeeded and `seed` then failed, run `seed` again: it imports only the missing templates.

    The command is not part of `pnpm migration:seed` or `pnpm migration:remove`. A failed SES call ends the command with exit code 1. With SES unset, `seed` logs `AWS SES is not configured. Skipping email template seed.` and exits 0, and `remove` logs `AWS SES is not configured. Skipping email template removal.` and exits 0 with nothing deleted.

## Check the result

1. The command logs `Emails seeded successfully.`, or `Emails removed successfully.` for `remove`.
2. Open the SES console and read the template of the kind. Its subject matches the kind's case in `getTemplateEmail`, and its HTML matches the `.hbs` file.
3. Trigger the action that sends the kind. Open BullBoard at `http://localhost:3010` ([Installation][ref-doc-installation]), where the `notificationEmail` queue shows the job completed, and the email arrives with the new content.

## Related tasks

- [Notification Guide][ref-doc-guide-notification]: add a kind with its template
- [Seed Guide][ref-doc-guide-seed]: run, add, and remove seeds

<!-- REFERENCES -->

[ref-doc-concept-notification-email]: ../concepts/notification.md#email-channel
[ref-doc-concept-dependencies]: ../concepts/dependencies.md#optional-adapters
[ref-doc-reference-notification-templates]: ../reference/notification.md#email-templates
[ref-doc-reference-configuration-integrations]: ../reference/configuration.md#integration-triggers
[ref-doc-guide-notification]: notification.md
[ref-doc-guide-seed]: seed.md#run-one-seed
[ref-doc-installation]: ../getting-started/installation.md
