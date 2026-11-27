---
paths:
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/services/**'
    - 'test/unit/modules/*/use-cases/**'
    - 'src/modules/activity-log/**'
---

# Recording an activity entry

An entry is an outbox effect (`effects.md`).

`ActivityLogQueue.recordEffect(requestContext, apiKeyContext, authContext, input)` (`src/modules/activity-log/queues/activity-log.queue.ts`) validates one entry against `ActivityLogActionContract`, throwing `ActivityLogContractInvalidException`, and returns the `IActivityLogCreateManyEffect` for the activity-log queue's `createMany` (priority low, no business key). It takes the request log, the API key, and the actor from those contexts alone, `authContext` `null` where the route has none; the row's workspace is the input's `workspaceId`, required under `workspace: target`, `null` under `none`; an entry is built after the write it records, inside that write's transaction, in every flow, so it carries what the write returned. Every action is `<subject><PastVerb>[By<Actor>]`, past tense because an entry records what happened (`userProfileUpdated`, `userBlockedByAdmin`, `adminApiKeyCreated`). An action one user takes on another writes two rows, except a login that signs other users out of its device (`session.md`, Session invalidation): the actor's, with `targetUserId`, is the plain action in a workspace or project and `admin<Subject><PastVerb>` on the platform admin surface; the affected user's, with `actorUserId`, always carries `By<Actor>`.

- Whoever runs the write adds the entry: a service for its own action (the reach-max entries in `UserPasswordService.countFailedPasswordAttemptInTx` and `MfaService.countFailedAttemptInTx`, `userReauthenticationFailed` in `UserAuthService.countFailedReauthenticationInTx`, the login entry in `UserAuthService.createTokenAndSessionInTx`, the device-login revoke entries in `SessionService.revokeByDeviceOwnershipIdsInTx`, a re-authentication's `userMfaVerified` in `MfaService.completeReauthenticationInTx`), a use case for a flow it sequences; each takes the contexts from its caller.
- An action with no write adds its entry in a transaction holding the add alone, committed before it throws (`effects.md`, Writing).
- A job payload carries `ActivityLogQueue.toPayload(...)` over the same three contexts (ids and the request log, never a row; `IUserImportByAdminPayload.activityLog`, and `IWorkspaceSoftDeletePayload.activityLog`, from which the `workspace` queue's `softDelete` job records `workspaceDeleted`), and the job passes it to `ActivityLogQueue.recordEffectFromPayload`; the processor and its use case read only the payload.
- An admin ownership transfer records three entries: `adminWorkspaceOwnershipTransferred` (the admin), `workspaceOwnershipRemovedByAdmin` (the previous owner), `workspaceOwnershipTransferredByAdmin` (the new owner).
