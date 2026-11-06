---
paths:
    - 'src/modules/activity-log/**'
    - 'src/modules/*/services/**'
    - 'src/languages/*/activityLog.json'
---

# Activity log

`ActivityLogDomain.prepare` (`activity-log.domain.ts:182`) validates one entry against `ActivityLogActionContract`; `stagePrepared` (`:219`) puts it on the CLS queue. The HTTP service prepares before the domain write and stages after its commit (`service.md`); a value only the write produces is drawn before it (`DatabaseUtil.createId()`) or prepared after. Every `EnumActivityLogAction` member has a contract row and an `activityLog` i18n key. An action one user takes on another writes two rows: the actor's under the plain action with `targetUserId`, the affected user's under the paired `…ByAdmin`, `…ByOwner`, or `…ByInvitee` action with `actorUserId`.

- The activity log is HTTP-only: a job stages no entry. `ActivityLogDomain.flushStaged` (`:233`) runs when an HTTP request settles (`ActivityLogInterceptor`), error path included, while the store holds `RequestLogStoreKey` and `WorkspaceStoreKey`. It draws each row id (`DatabaseUtil.createId()`) and enqueues every row in one `ActivityLogQueue.createMany` job (`QueueBase.addSideEffect`).
- Its processor writes through `ActivityLogRepository.createMany`, a retry only the rows whose id is absent.
