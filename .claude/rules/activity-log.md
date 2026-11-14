---
paths:
    - 'src/modules/activity-log/**'
    - 'src/modules/*/services/**'
    - 'src/modules/*/use-cases/**'
    - 'test/unit/modules/*/services/**'
    - 'test/unit/modules/*/use-cases/**'
    - 'src/languages/*/activityLog.json'
---

# Activity log

`ActivityLogService.recordEffect(requestContext, apiKeyContext, authContext, workspaceContext, input)` (`src/modules/activity-log/services/activity-log.service.ts`) validates one entry against `ActivityLogActionContract`, throwing `ActivityLogContractInvalidException`, and returns the `IActivityLogCreateManyEffect` for the activity-log queue's `createMany` (priority low, no business key). It draws the row id (`DatabaseUtil.createId()`) and `createdAt` and takes the request log, the API key, the actor, and the workspace from those contexts alone, `authContext` and `workspaceContext` `null` where the route has none; an entry breaking its contract throws inside the caller's transaction, which rolls back. Every `EnumActivityLogAction` member has a contract row and an `activityLog` i18n key. An action one user takes on another writes two rows: the actor's under the plain action with `targetUserId`, the affected user's under the paired `…ByAdmin`, `…ByOwner`, or `…ByInvitee` action with `actorUserId`, except a login that signs other users out of its device (`auth.md`, Session invalidation).

- An entry is an outbox row in the transaction of the write it records (`outbox.md`). Whoever runs the write adds it: a service for its own action (the lockout entries in `UserPasswordService.countPasswordAttempt` and `UserTwoFactorService.countAttempt`, the login and revoke entries in `UserAuthService.createTokenAndSession`), a use case for a flow it sequences; each takes the contexts from its caller. A value only the write produces is drawn before it (`DatabaseUtil.createId()`).
- An action with no write (a failed login) adds its entry through `OutboxService.add` before it throws.
- A job payload carries `ActivityLogUtil.toPayload(...)` over the same four contexts (ids and the request log, never a row; `IUserImportByAdminPayload.activityLog`), and the job passes it to `ActivityLogService.recordEffectFromPayload`.
- `ActivityLogProcessor` writes through `ActivityLogRepository.createMany`, a retry only the rows whose id is absent.
