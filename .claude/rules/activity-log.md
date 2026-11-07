---
paths:
    - 'src/modules/activity-log/**'
    - 'src/modules/*/use-cases/**'
    - 'src/languages/*/activityLog.json'
---

# Activity log

`ActivityLogService.prepare` (`src/modules/activity-log/services/activity-log.service.ts`) validates one entry against `ActivityLogActionContract`; `stagePrepared` puts it on the CLS queue. The use case prepares before the service write and stages after its commit (`use-case.md`); a service returns the stages its action records as data; a value only the write produces is drawn before it (`DatabaseUtil.createId()`) or prepared after. Every `EnumActivityLogAction` member has a contract row and an `activityLog` i18n key. An action one user takes on another writes two rows: the actor's under the plain action with `targetUserId`, the affected user's under the paired `…ByAdmin`, `…ByOwner`, or `…ByInvitee` action with `actorUserId`, except a login that signs other users out of its device (`auth.md`, Session invalidation).

- The activity log is HTTP-only: a job stages no entry. `ActivityLogService.flushStaged` runs when an HTTP request settles (`ActivityLogInterceptor`), error path included, while the store holds `RequestLogStoreKey` and `WorkspaceStoreKey`. It draws each row id (`DatabaseUtil.createId()`) and enqueues every row in one `ActivityLogQueue.createMany` job (`QueueBase.addSideEffect`).
- Its processor writes through `ActivityLogRepository.createMany`, a retry only the rows whose id is absent.
