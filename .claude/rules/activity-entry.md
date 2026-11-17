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

`ActivityLogService.recordEffect(requestContext, apiKeyContext, authContext, workspaceContext, input)` (`src/modules/activity-log/services/activity-log.service.ts`) validates one entry against `ActivityLogActionContract`, throwing `ActivityLogContractInvalidException`, and returns the `IActivityLogCreateManyEffect` for the activity-log queue's `createMany` (priority low, no business key). It takes the request log, the API key, the actor, and the workspace from those contexts alone, `authContext` and `workspaceContext` `null` where the route has none; an entry breaking its contract throws inside the caller's transaction, which rolls back. An action one user takes on another writes two rows: the actor's under the plain action with `targetUserId`, the affected user's under the paired `…ByAdmin`, `…ByOwner`, or `…ByInvitee` action with `actorUserId`, except a login that signs other users out of its device (`session.md`, Session invalidation).

- Whoever runs the write adds the entry: a service for its own action (the reach-max entries in `UserPasswordService.countFailedPasswordAttempt` and `MfaService.countFailedAttempt`, the login and revoke entries in `UserAuthService.createTokenAndSessionInTx`), a use case for a flow it sequences; each takes the contexts from its caller. A value only the write produces is drawn before it (`DatabaseUtil.createId()`).
- An action with no write (a failed login) adds its entry through `OutboxService.add` before it throws.
- A job payload carries `ActivityLogUtil.toPayload(...)` over the same four contexts (ids and the request log, never a row; `IUserImportByAdminPayload.activityLog`), and the job passes it to `ActivityLogService.recordEffectFromPayload`; the processor and its use case read only the payload.
