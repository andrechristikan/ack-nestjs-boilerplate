---
title: Activity Log Guide
description: Log a new action with its contract row, message, metadata, and actor and target entries.
---

# Activity Log Guide

This guide shows how to record a new audited action, for a developer who adds an action that must appear in the audit trail.

## Table of Contents

- [Related Documents](#related-documents)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
- [Check the result](#check-the-result)
- [Related tasks](#related-tasks)

## Related Documents

- [Activity Log][ref-doc-concept-activity-log]: how an entry becomes a row and how actor and target rows pair
- [Activity Log Reference][ref-doc-reference-activity-log]: the existing actions, their rows, and their metadata
- [Queue][ref-doc-concept-queue]: the outbox row an entry is
- [I18n Guide][ref-doc-guide-i18n]: the message files
- [Schema Guide][ref-doc-guide-schema]: the zod schemas a metadata shape uses

## Prerequisites

- The audited write exists in a service or a use case. The use case opens `DatabaseService.withTransaction` around the write, because an entry is an outbox row and an action with an outbox row runs in a transaction ([Database][ref-doc-concept-database-transactions]).
- The action has a name: `<subject><PastVerb>`, with `By<Actor>` on the affected user's row and `admin<Subject><PastVerb>` on the platform admin surface. `<Actor>` is the acting role: `ByAdmin` for a platform admin or a workspace or project owner or admin, `ByOwner`, or `ByInvitee`. The name is past tense because an entry records what happened (`userProfileUpdated`, `userBlockedByAdmin`, `adminApiKeyCreated`).

## Steps

1. Add the action to the `EnumActivityLogAction` enum in `prisma/schema.prisma`, then apply the schema and regenerate the client:

    ```bash
    pnpm db:migrate
    pnpm generate
    ```

2. Add a metadata schema when the entry carries values. A schema is a strict zod object in `src/modules/activity-log/dtos/activity-log.<name>-metadata.dto.ts`, and an existing one fits when the keys match (`ActivityLogActorMetadataSchema` carries `targetUserId`, `ActivityLogTargetMetadataSchema` carries `actorUserId`). An action with no metadata takes `ActivityLogEmptyMetadataSchema`: every contract row names a schema. Declare each new key as optional in `ActivityLogMetadataResponseSchema` (`src/modules/activity-log/dtos/response/activity-log.metadata.response.dto.ts`) too, because the response strips a key it does not declare. Metadata holds no secret and no large object.

3. Add the contract row to `ActivityLogActionContract` in `src/modules/activity-log/contracts/activity-log.action.contract.ts`. A pair adds two actions, the actor action and its `By<Actor>` action, each with an enum member, a contract row, and a message. The `user` value is where the owner comes from. With `payload`, the owner and `createdBy` come from the request's JWT, and the entry fails without one. With `target`, the owner and `createdBy` come from the input, and a flow with no signed-in user uses it. The `workspace` value is `target` for the `workspaceId` the input carries, which every existing workspace and project action uses, or `none`, which stores `null`. This is the row of the actor action `workspaceMemberRemoved`:

    ```typescript
    [EnumActivityLogAction.workspaceMemberRemoved]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogActorMetadataSchema,
    },
    ```

    The affected user's row sits beside it:

    ```typescript
    [EnumActivityLogAction.workspaceMemberRemovedByAdmin]: {
        user: EnumActivityLogUser.target,
        workspace: EnumActivityLogWorkspace.target,
        metadata: ActivityLogTargetMetadataSchema,
    },
    ```

4. Add the message `<action>` to `src/languages/en/activityLog.json`, one per action of the pair, with placeholders written `{key}` that match the metadata keys (`"adminUserCreated": "Account of user {targetUsername} has been created"`). A target row uses fixed text, such as `You have been removed from a workspace`.

5. Write the unit spec first. It asserts the effect added on `tx` with the action, the owner, and the metadata, and it fails until the entry is recorded.

6. Record the entry in the transaction of the write. The code that runs the write builds the effect with `ActivityLogQueue.recordEffect` after the write, so the entry carries what the write returned, and adds it with `OutboxService.addInTx` or `addManyInTx`. A use case takes the four contexts from its controller (`@RequestContext()`, `@ApiKeyContext()`, `@AuthJwtAccessContext()`, `@WorkspaceContext()`), passing `null` for `authContext` or `workspaceContext` where the route has none, and a service takes them from the use case that calls it. The row's workspace is the `workspaceId` of the input, never the workspace context's. The remove-member use case in `src/modules/workspace/use-cases/workspace.remove-member.use-case.ts` writes a pair:

    ```typescript
    const actorEntry = this.activityLogQueue.recordEffect(
        requestContext,
        apiKeyContext,
        authContext,
        workspaceContext,
        {
            action: EnumActivityLogAction.workspaceMemberRemoved,
            userId: authContext.userId,
            createdBy: authContext.userId,
            workspaceId: removed.workspaceId,
            metadata: { targetUserId: removed.userId },
        }
    );
    const targetEntry = this.activityLogQueue.recordEffect(
        requestContext,
        apiKeyContext,
        authContext,
        workspaceContext,
        {
            action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
            userId: removed.userId,
            createdBy: authContext.userId,
            workspaceId: removed.workspaceId,
            metadata: { actorUserId: authContext.userId },
        }
    );
    await this.outboxService.addManyInTx(tx, [actorEntry, targetEntry]);
    ```

    - An action one user takes on another writes both rows. When the affected user is the actor, write the actor row only.
    - A `payload` action passes neither `userId` nor `createdBy`. With `none` as the workspace value, the input passes no `workspaceId`.
    - The caller enqueues nothing: the outbox dispatches the row to the `activityLog` queue after the commit. `OutboxService` is global, so it needs no import.
    - A caller in another module imports `ActivityLogModule` in its module file: `<module>.module.ts` when a service records the entry, `<module>.use-case.module.ts` when a use case does.

7. Cover the other places an entry is recorded:
    - A job records its entry from a payload. The request side builds it with `ActivityLogQueue.toPayload(...)` over the same four contexts and puts it in the job payload, and the job's use case calls `ActivityLogQueue.recordEffectFromPayload` and adds the rebuilt effect with `outboxService.addInTx` (or `addManyInTx`) on the transaction it opens.
    - An action with no write adds its entry in a transaction that holds the add alone, committed before the use case throws. A write that must survive the failure of its request, such as a failed-attempt count with its entry, commits in a transaction of its own before the use case throws.

## Check the result

1. Run the type check and the unit specs of the module that records the entry:

    ```bash
    pnpm typecheck
    pnpm test <module>
    ```

    The spec asserts the effect added on the `tx`, with the action, the owner, and the metadata.

2. Boot the application with `pnpm start:dev` and trigger the action.
3. Open BullBoard at `http://localhost:3010` ([Installation][ref-doc-installation]). The `activityLog` queue shows a `createMany` job that completes, and the `ActivityLogs` collection holds the row with the localized description.
4. Sign in as the affected user and call `GET /shared/user/activity-log/list`. The row the actor created shows no IP address, user agent, geo location, or `createdBy`, and no `actorUserId`.

## Related tasks

- [Notification Guide][ref-doc-guide-notification]: add a notification beside the entry
- [Queue Guide][ref-doc-guide-queue]: add a queue or a job

<!-- REFERENCES -->

[ref-doc-concept-activity-log]: ../concepts/activity-log.md
[ref-doc-concept-queue]: ../concepts/queue.md#outbox-row-in-the-transaction
[ref-doc-reference-activity-log]: ../reference/activity-log.md
[ref-doc-concept-database-transactions]: ../concepts/database.md#transactions
[ref-doc-installation]: ../getting-started/installation.md
[ref-doc-guide-i18n]: i18n.md
[ref-doc-guide-schema]: schema.md
[ref-doc-guide-notification]: notification.md
[ref-doc-guide-queue]: queue.md
